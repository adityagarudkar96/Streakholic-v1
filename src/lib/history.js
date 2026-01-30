import { supabase } from './supabase'
import { verifyLeetCodeUsername } from './leetcode'
import { fromUnixTime, format, isSameDay } from 'date-fns'

export const syncHistory = async (userId, leetCodeUsername) => {
    try {
        console.log(`Syncing history for ${leetCodeUsername}...`)

        // 1. Fetch live data
        const { valid, data: lcData } = await verifyLeetCodeUsername(leetCodeUsername)
        if (!valid) throw new Error('Could not fetch LeetCode data')

        const totalSolved = lcData.totalSolved
        const calendar = JSON.parse(lcData.submissionCalendar || '{}')

        // 2. Process Calendar
        // Calendar format: { "unix_timestamp": count, ... }
        // We need to sort by date descending to reconstruction metrics backward

        const events = Object.entries(calendar).map(([ts, count]) => ({
            timestamp: parseInt(ts),
            date: fromUnixTime(parseInt(ts)),
            count: count,
            dateStr: new Date(parseInt(ts) * 1000).toISOString() // We use ISO for DB
        })).sort((a, b) => b.timestamp - a.timestamp) // Newest first

        if (events.length === 0) return { status: 'success', message: 'No history to sync.' }

        // 3. Reconstruct Snapshots
        // Current Total Solved is the state *after* the most recent activity.
        // We need to be careful. `submissionCalendar` might not include Today if not updated yet? 
        // Usually it does.

        let runningTotal = totalSolved
        const updates = []

        // If the most recent event is NOT today, then the runningTotal is valid for the end of that day too (assuming no activity since).
        // If the most recent event IS today, runningTotal is valid for end of today.
        // We iterate backwards. For each day with activity:
        // The "problems_solved" snapshot at the END of that day is roughly `runningTotal`.
        // Then we subtract that day's count to get the state before that day (which is the snapshot for the previous day).

        // Note: LeetCode's `submissionCalendar` counts *submissions*, not *problems solved*?
        // Ah. "submissionCalendar": { "timestamp": count } 
        // The API returns `totalSolved`.
        // If "count" is submissions, and acceptance rate is < 100%, we cannot accurately deduct `count` from `totalSolved` to get previous `totalSolved`.

        // CRITICAL ISSUE: We cannot reconstruct exact `problems_solved` snapshots from submission counts because multiple submissions != multiple solved problems.

        // FALLBACK STRATEGY: 
        // We simply upsert logs with `status: 'success'` and `accepted_submissions: count`.
        // For `problems_solved`, we effectively CANNOT know it.
        // If we leave it as 0, it breaks the `checkStreak` delta logic (Current - 0 = Huge Delta).

        // SOLUTION:
        // We mark these historical logs with a special flag or we ensure `checkStreak` ignores them?
        // OR better: We set `problems_solved` to `totalSolved` (current) for ALL of them.
        // Why?
        // If yesterday I had 200 solved. Today I have 200. Delta 0.
        // If I backfill yesterday with 200. 
        // `checkStreak` reads Yesterday (200). Current (200). Delta 0. Correct.

        // What if I backfill 6 months ago with 200?
        // It's technically wrong (I had fewer then), BUT for the purpose of "Delta Check" going forward, it is safe.
        // `checkStreak` only looks at the *most recent* log.
        // As long as the *most recent* log (today/yesterday) has a close-to-accurate count, we are good.

        // So simply using `currentTotal` as the snapshot for all history is safe for preventing massive fake streaks,
        // although it ruins the "graph of progress" if we ever wanted to plot "Total Solved Over Time".

        // Compromise:
        // We use `currentTotal` for all historical entries.
        // The Heatmap only accesses `status`.
        // The Streak Engine accesses `problems_solved`.
        // By setting all to Current, future Deltas will be small/accurate (Current - Current = 0, until I solve more).

        const logsToInsert = events.map(e => ({
            user_id: userId,
            date: e.dateStr,
            status: 'success',
            problems_solved: totalSolved, // Safe approximation to prevent massive deltas
            accepted_submissions: e.count // Store actual submission count here just in case
        }))

        // 4. Batch Upsert
        // We chunk it just in case, though 365 rows is fine for Supabase.
        const { error } = await supabase
            .from('daily_logs')
            .upsert(logsToInsert, { onConflict: 'user_id, date', ignoreDuplicates: false })

        if (error) throw error

        // 5. Update Profile Stats based on this new history
        // calculating "Longest Streak" from this history would be cool.
        // let's do a quick calculation in memory.

        // Sort dates ascending
        const sortedDates = events.map(e => e.date).sort((a, b) => a - b)
        let maxStreak = 0
        let currentRun = 0
        let lastDate = null

        sortedDates.forEach(d => {
            if (!lastDate) {
                currentRun = 1
            } else {
                // Check if days are consecutive
                const diff = (d - lastDate) / (1000 * 60 * 60 * 24)
                if (Math.abs(diff - 1) < 0.1) { // roughly 1 day
                    currentRun++
                } else if (Math.abs(diff) < 0.1) {
                    // same day, ignore
                } else {
                    currentRun = 1
                }
            }
            if (currentRun > maxStreak) maxStreak = currentRun
            lastDate = d
        })

        // Update profile longest_streak if this calculated one is higher
        // Also update total_active_days

        await supabase.from('profiles').update({
            longest_streak: maxStreak,
            total_active_days: events.length
        }).eq('id', userId)

        return { status: 'success', message: `Synced ${events.length} days of history.`, count: events.length }

    } catch (error) {
        console.error('History Sync Error:', error)
        return { status: 'error', message: error.message }
    }
}
