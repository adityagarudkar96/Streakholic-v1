import { supabase } from './supabase'
import { verifyLeetCodeUsername } from './leetcode'
import { isToday, differenceInCalendarDays, parseISO } from 'date-fns'
import { processPenalties } from './penalties'

export const checkStreak = async (userId) => {
    try {
        console.log(`Checking streak for ${userId}...`)

        // 1. Fetch Profile and Logs
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (!profile || !profile.leetcode_username) throw new Error('No linked LeetCode account.')

        // Fetch user's latest 2 logs to understand history
        const { data: logs } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(2)

        const todayDate = new Date()
        const latestLog = logs?.[0] // Could be today, yesterday, or older
        const previousLog = logs?.find(l => !isToday(parseISO(l.date))) // The most recent log that ISN'T today

        // 2. Fetch Live LeetCode Data
        const { valid, data: lcData } = await verifyLeetCodeUsername(profile.leetcode_username)
        if (!valid) throw new Error('Failed to fetch LeetCode user data.')

        const currentSolved = lcData.totalSolved || 0

        // 3. Define Baseline for comparison
        // We need to compare "Current Solved" vs "Solved Count at end of Yesterday/Last Check"

        let baselineSolved = 0
        let isFirstDay = false

        if (!previousLog && !latestLog) {
            // Absolutely no history. First time ever.
            isFirstDay = true
            baselineSolved = currentSolved
        } else if (!previousLog && latestLog && isToday(parseISO(latestLog.date))) {
            // We have a log for today, but nothing before today. Still first day effectively.
            isFirstDay = true
            baselineSolved = latestLog.problems_solved
        } else {
            // We have a history log (yesterday or older)
            if (previousLog) {
                baselineSolved = previousLog.problems_solved
            } else {
                // Latest log is NOT today (so it is previous)
                baselineSolved = latestLog.problems_solved
            }
        }

        const delta = currentSolved - baselineSolved

        // 4. Handle Streak Logic
        let status = 'pending'
        let message = 'No new problems solved yet today.'

        // A. Check for Broken Streak first (if last activity was > 1 day ago)
        // We check logs. If the last valid 'success' log was > 1 day ago.
        const lastSuccessLog = logs?.find(l => l.status === 'success')
        let shouldResetStreak = false

        if (lastSuccessLog) {
            const daysSinceLastSuccess = differenceInCalendarDays(todayDate, parseISO(lastSuccessLog.date))
            if (daysSinceLastSuccess > 1) {
                shouldResetStreak = true
            }
        }

        if (shouldResetStreak) {
            // Reset streak
            await supabase.from('profiles').update({ current_streak: 0 }).eq('id', userId)
            profile.current_streak = 0

            // APPLY PENALTIES
            // We only apply penalties if the date difference is exactly > 1 (broken yesterday)
            // If they haven't logged in for a week, do we apply 7 days of penalties?
            // Current simple logic: Just one penalty event per "Break".
            // Ideally we'd calculate missed days, but for MVP "Streak Broken" = One Penalty Event to avoid draining wallet instantly on return.
            // User feedback says "Daily penalty". Ideally implies per day.
            // But let's start safe: You broke streak -> You get penalized once (for yesterday).

            await processPenalties(userId)
        }

        // B. Check for Today's Success
        if (delta > 0 && !isFirstDay) {
            status = 'success'
            message = `Streak Active! You solved ${delta} problems.`
        } else if (isFirstDay) {
            status = 'pending' // Technically pending until tomorrow gives us a delta
            message = 'Welcome! Activity tracking starts tomorrow. Solved count saved.'
        }

        // 5. Update Database

        // Upsert Log for Today
        let logToUpdate = latestLog && isToday(parseISO(latestLog.date)) ? latestLog : null

        if (logToUpdate) {
            await supabase.from('daily_logs').update({
                status: status === 'success' ? 'success' : logToUpdate.status === 'success' ? 'success' : 'pending', // Don't downgrade success
                problems_solved: currentSolved,
                accepted_submissions: lcData.totalSolved
            }).eq('id', logToUpdate.id)
        } else {
            // Insert new log for today
            await supabase.from('daily_logs').insert({
                user_id: userId,
                date: todayDate.toISOString(),
                status: status,
                problems_solved: currentSolved,
                accepted_submissions: lcData.totalSolved
            })
        }

        // 6. Update Profile Stats (Streaks) if Success
        if (status === 'success') {
            // Only increment if we haven't already counted this day
            const lastActivity = profile.last_activity_date ? parseISO(profile.last_activity_date) : null

            if (!lastActivity || !isToday(lastActivity)) {

                const newStreak = (profile.current_streak || 0) + 1
                const newLongest = Math.max(newStreak, profile.longest_streak || 0)

                const { count } = await supabase
                    .from('daily_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('status', 'success')

                // If the write above hasn't reflected yet (possible), we assume +1 if we just succeeded.
                // However, fetching count is safer if consistent. 
                // Let's assume the count includes the just-updated/inserted log because we await it.

                await supabase.from('profiles').update({
                    current_streak: newStreak,
                    longest_streak: newLongest,
                    last_activity_date: todayDate.toISOString(),
                    total_active_days: count
                }).eq('id', userId)
            }
        }

        return { status, message, delta }

    } catch (error) {
        console.error('Streak Check Error:', error)
        return { status: 'error', message: error.message }
    }
}
