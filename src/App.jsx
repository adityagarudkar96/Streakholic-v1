import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import LinkLeetCode from './pages/LinkLeetCode'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Groups from './pages/Groups'
import GroupDetails from './pages/GroupDetails'
import Wallet from './pages/Wallet'
import { Loader2 } from 'lucide-react'

function App() {
    const [session, setSession] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session) fetchProfile(session.user.id)
            else setLoading(false)
        })

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (session) {
                fetchProfile(session.user.id)
            } else {
                setProfile(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error)
            }
            setProfile(data)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
        )
    }

    return (
        <Routes>
            <Route
                path="/auth"
                element={!session ? <Auth /> : <Navigate to="/" replace />}
            />
            <Route
                path="/link-leetcode"
                element={
                    session ? (
                        // If already linked, go to dashboard. If not, stay here.
                        profile?.leetcode_username ? <Navigate to="/" replace /> : <LinkLeetCode session={session} setProfile={setProfile} />
                    ) : (
                        <Navigate to="/auth" replace />
                    )
                }
            />
            <Route
                path="/"
                element={
                    session ? (
                        // If linked, show dashboard. If not, force link page.
                        profile?.leetcode_username ? (
                            <Dashboard profile={profile} />
                        ) : (
                            <Navigate to="/link-leetcode" replace />
                        )
                    ) : (
                        <Navigate to="/auth" replace />
                    )
                }
            />
            <Route
                path="/profile"
                element={
                    session && profile?.leetcode_username ? (
                        <Profile profile={profile} setProfile={setProfile} />
                    ) : (
                        <Navigate to="/" replace />
                    )
                }
            />
            <Route
                path="/groups"
                element={
                    session && profile?.leetcode_username ? (
                        <Groups profile={profile} />
                    ) : (
                        <Navigate to="/" replace />
                    )
                }
            />
            <Route
                path="/groups/:id"
                element={
                    session && profile?.leetcode_username ? (
                        <GroupDetails profile={profile} />
                    ) : (
                        <Navigate to="/" replace />
                    )
                }
            />
            <Route
                path="/wallet"
                element={
                    session && profile?.leetcode_username ? (
                        <Wallet profile={profile} />
                    ) : (
                        <Navigate to="/" replace />
                    )
                }
            />
        </Routes>
    )
}

export default App
