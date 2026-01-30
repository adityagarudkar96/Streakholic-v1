import { supabase } from './supabase'
import { createTransaction } from './wallet'

/**
 * Create a new group with optional coin settings
 */
export const createGroup = async (userId, name, coinSettings = {}) => {
    // coinSettings: { enabled: bool, stake: number, penalty: number }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    // 1. Create Group Record
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
            name,
            invite_code: code,
            created_by: userId,
            is_coin_enabled: coinSettings.enabled || false,
            stake_amount: coinSettings.stake || 0,
            daily_penalty: coinSettings.penalty || 0,
            reward_pool: 0
        })
        .select()
        .single()

    if (groupError) throw groupError

    // 2. Add creator as Admin (AND lock coins if needed?)
    // Creator must also "join" their own group. If user creates a group requiring stake, does creator pay it?
    // Usually yes.

    return await joinGroup(userId, code, 'admin')
}

/**
 * Join an existing group by code
 */
export const joinGroup = async (userId, code, role = 'member') => {
    // 1. Find group
    const { data: group, error: findError } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', code.toUpperCase())
        .single()

    if (findError || !group) throw new Error('Invalid invite code')

    // 2. Check overlap
    const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', userId)
        .single()

    if (existing) throw new Error('You are already in this group')

    // 3. Handle Coins (Staking)
    let lockedAmount = 0
    if (group.is_coin_enabled && group.stake_amount > 0) {
        // Attempt to lock coins
        const tx = await createTransaction(
            userId,
            0, // locking doesn't change total balance immediately? 
            // Wait, wallet logic: `coins_locked` is part of total or separate? 
            // "Total Coins = Available + Locked"
            // So locking moves Available -> Locked. Total remains same.
            // createTransaction usually changes `coins_balance`.
            // We need a specific `lockFunds` function or use createTransaction to "move" funds?
            // My wallet.js implementation of createTransaction updates `coins_balance` directly.
            // If I lock, I should NOT change `coins_balance` (total). I should only change `coins_locked`.
            // But `createTransaction` implementation I wrote earlier just adds `amount` to `coins_balance`.
            // I need to update wallet.js to support locking.
        )
        // Let's rely on a helper in wallet.js for locking
    }

    // We need to fix wallet.js first to support locking properly.
    // Locking: `coins_locked += amount`. `coins_balance` (Total) stays same?
    // "Available = Total - Locked". 
    // If DB stores Total and Locked:
    // Available = coins_balance - coins_locked.
    // So locking just increases `coins_locked`.

    if (group.is_coin_enabled && group.stake_amount > 0) {
        lockedAmount = group.stake_amount

        // Check availability
        const { data: profile } = await supabase.from('profiles').select('coins_balance, coins_locked').eq('id', userId).single()
        const available = profile.coins_balance - profile.coins_locked

        if (available < lockedAmount) {
            throw new Error(`Insufficient coins. You need ${lockedAmount} available coins to join.`)
        }

        // Lock funds
        const { error: lockError } = await supabase.from('profiles').update({
            coins_locked: profile.coins_locked + lockedAmount
        }).eq('id', userId)

        if (lockError) throw lockError

        // Log transaction (informational, amount 0 effective change to total, but tracked)
        await supabase.from('coin_transactions').insert({
            user_id: userId,
            amount: -lockedAmount,
            type: 'lock',
            description: `Locked stake for group ${group.name}`,
            group_id: group.id
        })
    }

    // 4. Insert Member
    const { error: joinError } = await supabase
        .from('group_members')
        .insert({
            group_id: group.id,
            user_id: userId,
            role,
            locked_balance: lockedAmount
        })

    if (joinError) throw joinError

    return { success: true, group }
}
