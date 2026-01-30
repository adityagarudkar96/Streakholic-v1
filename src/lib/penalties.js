import { supabase } from './supabase'

/**
 * Process penalties for a user who missed a day.
 * Iterates through all coin-enabled groups and applies deductions.
 * @param {string} userId 
 */
export const processPenalties = async (userId) => {
    console.log(`Processing penalties for user ${userId}...`)

    // 1. Fetch User's Coin-Enabled Group Memberships
    const { data: memberships, error: fetchError } = await supabase
        .from('group_members')
        .select(`
            id,
            locked_balance,
            group_id,
            groups (
                id,
                name,
                is_coin_enabled,
                daily_penalty,
                stake_amount
            )
        `)
        .eq('user_id', userId)

    if (fetchError) {
        console.error('Error fetching memberships for penalty:', fetchError)
        return
    }

    // Filter relevant groups (enabled and has penalty)
    const activeMemberships = memberships.filter(m =>
        m.groups &&
        m.groups.is_coin_enabled &&
        m.groups.daily_penalty > 0 &&
        m.locked_balance > 0
    )

    if (activeMemberships.length === 0) {
        console.log('No applicable penalties found.')
        return
    }

    // 2. Apply Penalty for each group
    for (const membership of activeMemberships) {
        await applyGroupPenalty(userId, membership)
    }
}

const applyGroupPenalty = async (userId, membership) => {
    const group = membership.groups
    // Deduction is the lesser of the penalty or what they have left locked
    const deduction = Math.min(group.daily_penalty, membership.locked_balance)

    if (deduction <= 0) return

    try {
        console.log(`Applying penalty of ${deduction} coins for group ${group.name}`)

        // A. Update Group Member (Reduce Locked Balance)
        const { error: memberError } = await supabase
            .from('group_members')
            .update({ locked_balance: membership.locked_balance - deduction })
            .eq('id', membership.id)
        if (memberError) throw memberError

        // B. Update Group (Add to Reward Pool)
        // We need to fetch current pool first to be safe (or use RPC increment)
        // For MVP, simple read-modify-write on group
        const { data: currentGroup } = await supabase.from('groups').select('reward_pool').eq('id', group.id).single()
        const newPool = (currentGroup?.reward_pool || 0) + deduction

        await supabase
            .from('groups')
            .update({ reward_pool: newPool })
            .eq('id', group.id)

        // C. Update Profile (Reduce Total Balance and Locked Balance)
        const { data: profile } = await supabase.from('profiles').select('coins_balance, coins_locked').eq('id', userId).single()

        await supabase
            .from('profiles')
            .update({
                coins_balance: profile.coins_balance - deduction,
                coins_locked: profile.coins_locked - deduction
            })
            .eq('id', userId)

        // D. Log Transaction
        await supabase
            .from('coin_transactions')
            .insert({
                user_id: userId,
                amount: -deduction,
                type: 'penalty',
                description: `Missed streak in ${group.name}`,
                group_id: group.id
            })

    } catch (error) {
        console.error(`Failed to apply penalty for group ${group.id}:`, error)
    }
}
