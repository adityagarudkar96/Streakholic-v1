import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { Loader2, Trophy, ArrowLeft, Users, Crown } from 'lucide-react'

export default function GroupDetails({ profile }) {
    const { id } = useParams()
    const navigate = useNavigate()
    const [group, setGroup] = useState(null)
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchGroupDetails()
    }, [id])

    const fetchGroupDetails = async () => {
        try {
            // 1. Fetch Group Info
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .select('*')
                .eq('id', id)
                .single()

            if (groupError) throw groupError
            setGroup(groupData)

            // 2. Fetch Members with their profiles
            // We join group_members with profiles
            const { data: memberData, error: memberError } = await supabase
                .from('group_members')
                .select(`
                role,
                joined_at,
                profiles (
                    id,
                    username,
                    leetcode_username,
                    current_streak,
                    longest_streak,
                    last_activity_date
                )
            `)
                .eq('group_id', id)
                .order('current_streak', { foreignTable: 'profiles', ascending: false }) // This sorting might need raw SQL or JS sort

            if (memberError) throw memberError

            // Sort manually because declaring foreign table order in Supabase JS client is tricky sometimes
            const sortedMembers = memberData?.map(m => ({
                ...m,
                profile: m.profiles
            })).sort((a, b) => (b.profile.current_streak || 0) - (a.profile.current_streak || 0))

            setMembers(sortedMembers || [])

        } catch (error) {
            console.error('Error fetching group details:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <Layout profile={profile}>
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-indigo-500 h-8 w-8" />
            </div>
        </Layout>
    )

    if (!group) return (
        <Layout profile={profile}>
            <div className="text-center p-10">Group not found</div>
        </Layout>
    )

    return (
        <Layout profile={profile}>
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/groups')} className="flex items-center text-slate-400 hover:text-white mb-6 text-sm transition-colors">
                    <ArrowLeft size={16} className="mr-1" /> Back to Squads
                </button>

                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{group.name}</h1>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full flex items-center gap-2 border border-slate-700">
                                <Users size={14} /> {members.length} Members
                            </span>
                            <span className="text-slate-500 font-mono">CODE: <span className="text-slate-300 select-all">{group.invite_code}</span></span>
                        </div>
                    </div>
                    {/* Admin actions could go here */}
                </div>

                {/* Leaderboard */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                    <div className="p-6 border-b border-slate-800 flex items-center gap-2">
                        <Trophy className="text-yellow-500" />
                        <h2 className="text-xl font-bold text-white">Leaderboard</h2>
                    </div>

                    <div className="divide-y divide-slate-800">
                        {members.map((member, index) => (
                            <div key={member.profile.id} className="p-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                                <div className={`w-8 h-8 flex items-center justify-center font-bold text-lg ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                                    {index === 0 ? <Crown size={20} /> : `#${index + 1}`}
                                </div>

                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                                    {member.profile.username?.[0]?.toUpperCase()}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-medium">{member.profile.username}</h3>
                                        {member.role === 'admin' && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>}
                                        {member.profile.id === profile.id && <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                                    </div>
                                    <p className="text-slate-500 text-xs">@{member.profile.leetcode_username}</p>
                                </div>

                                <div className="text-right">
                                    <p className="text-lg font-bold text-white">{member.profile.current_streak} <span className="text-sm font-normal text-slate-500">🔥</span></p>
                                    <p className="text-xs text-slate-500">Current Streak</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </Layout>
    )
}
