export async function verifyLeetCodeUsername(username) {
    try {
        const response = await fetch(`https://leetcode-stats-api.herokuapp.com/${username}`)
        const data = await response.json()

        // The API returns status: 'error' if user not found or other issues
        if (data.status === 'error' || data.message === 'user does not exist') {
            return { valid: false, message: 'User not found' }
        }

        return { valid: true, data }
    } catch (error) {
        console.error('LeetCode verification error:', error)
        // In case the API is down, for MVP we might want to warn but allow? 
        // No, instructions say "Verification of LeetCode account existence".
        // We will fail safe.
        return { valid: false, message: 'Could not verify user. API might be down.' }
    }
}
