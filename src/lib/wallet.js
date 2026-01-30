import { supabase } from './supabase'

/**
 * Get current wallet state for a user
 */
export const getWallet = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('coins_balance, coins_locked')
        .eq('id', userId)
        .single()

    if (error) throw error
    return data
}

/**
 * Create a coin transaction (Debit or Credit)
 * @param {string} userId 
 * @param {number} amount - Positive for credit, Negative for debit
 * @param {string} type - 'initial_grant', 'penalty', 'reward', 'lock', 'unlock', 'adjustment'
 * @param {string} description 
 * @param {string} groupId - Optional
 */
export const createTransaction = async (userId, amount, type, description, groupId = null) => {
    try {
        // 1. Fetch current balance to validate sufficiency for deductions
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('coins_balance, coins_locked')
            .eq('id', userId)
            .single()

        if (profileError) throw new Error('User not found')

        if (amount < 0 && (profile.coins_balance + amount < 0)) {
            throw new Error('Insufficient coins')
        }

        // 2. Insert Transaction
        const { error: txError } = await supabase
            .from('coin_transactions')
            .insert({
                user_id: userId,
                amount,
                type,
                description,
                group_id: groupId
            })

        if (txError) throw txError

        // 3. Update Profile Balance
        // Note: In a real high-concurrency app we'd use an RPC or atomic increment.
        // For MVP, this two-step read-write is acceptable but has race conditions.
        // Better: supabase .rpc('increment_balance', { amount }) if we created a function.
        // We'll stick to simple update for now, or just calculate from old balance.

        const newBalance = profile.coins_balance + amount

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ coins_balance: newBalance })
            .eq('id', userId)

        if (updateError) throw updateError

        return { success: true, newBalance }

    } catch (error) {
        console.error('Transaction Error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Fetch transaction history
 */
export const getTransactions = async (userId) => {
    const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}
