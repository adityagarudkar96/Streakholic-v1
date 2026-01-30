import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { verifyLeetCodeUsername } from '../lib/leetcode'
import { Link2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function LinkLeetCode({ session, setProfile }) {
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Verify existence
            const verification = await verifyLeetCodeUsername(username)
            if (!verification.valid) {
                throw new Error(verification.message || 'Invalid LeetCode username')
            }

            // 2. Check for duplicates
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('leetcode_username', username)
                .single()

            if (existing) {
                throw new Error('This LeetCode account is already linked to another user.')
            }

            // 3. Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    leetcode_username: username,
                    last_activity_date: new Date().toISOString() // helper init
                })
                .eq('id', session.user.id)

            if (updateError) throw updateError

            // Update local state and redirect
            // fetch fresh profile to be sure
            const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
            if (setProfile) setProfile(newProfile)

            navigate('/')

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl">
                <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
                        <Link2 className="h-6 w-6 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Link LeetCode</h1>
                    <p className="text-slate-400 text-sm">
                        We need to verify your LeetCode account to track your streaks automatically.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            LeetCode Username
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. aditya123"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify & Link'}
                    </button>
                </form>
            </div>
        </div>
    )
}
