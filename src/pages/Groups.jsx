import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { createGroup, joinGroup } from '../lib/groups'
import { Users, Plus, UserPlus, ArrowRight, Loader2, Copy, Check } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

export default function Groups({ profile }) {
    const [groups, setGroups] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('list') // list, create, join

    // Create Form State
    const [newGroupName, setNewGroupName] = useState('')
    const [coinSettings, setCoinSettings] = useState({ enabled: false, stake: 50, penalty: 10 })
    const [creating, setCreating] = useState(false)

    // Join Form State
    const [joinCode, setJoinCode] = useState('')
    const [joining, setJoining] = useState(false)
    const [joinError, setJoinError] = useState(null)

    const navigate = useNavigate()

    useEffect(() => {
        fetchGroups()
    }, [profile.id])

    const fetchGroups = async () => {
        try {
            const { data, error } = await supabase
                .from('group_members')
                .select(`
            role,
            groups (
                id,
                name,
                invite_code,
                created_by,
                is_coin_enabled,
                stake_amount
            )
        `)
                .eq('user_id', profile.id)

            if (error) throw error
            setGroups(data || [])
        } catch (error) {
            console.error('Error fetching groups:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateGroup = async (e) => {
        e.preventDefault()
        setCreating(true)
        try {
            await createGroup(profile.id, newGroupName, coinSettings)
            setNewGroupName('')
            setCoinSettings({ enabled: false, stake: 50, penalty: 10 })
            setActiveTab('list')
            fetchGroups()
        } catch (error) {
            console.error('Error creating group:', error)
            alert('Failed to create group: ' + error.message)
        } finally {
            setCreating(false)
        }
    }

    const handleJoinGroup = async (e) => {
        e.preventDefault()
        setJoining(true)
        setJoinError(null)
        try {
            await joinGroup(profile.id, joinCode)
            setJoinCode('')
            setActiveTab('list')
            fetchGroups()
        } catch (error) {
            setJoinError(error.message)
        } finally {
            setJoining(false)
        }
    }

    return (
        <Layout profile={profile}>
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            Squads <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30">Beta</span>
                        </h1>
                        <p className="text-slate-400">Compete with friends, stake coins, and keep each other accountable.</p>
                    </div>

                    {/* Primary Actions */}
                    <div className="flex gap-4 w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('join')}
                            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border shadow-lg ${activeTab === 'join'
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/20'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                                }`}
                        >
                            <UserPlus size={18} />
                            Join Squad
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border shadow-lg ${activeTab === 'create'
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/20'
                                : 'bg-white text-slate-900 border-white hover:bg-slate-200'
                                }`}
                        >
                            <Plus size={18} />
                            Create Squad
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {activeTab === 'create' && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 max-w-lg mx-auto backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Plus className="text-indigo-500" /> Create a New Squad
                        </h2>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Squad Name</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    placeholder="e.g. LeetCode Grinders"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            {/* Coin Settings */}
                            <div className={`p-4 rounded-lg border transition-all ${coinSettings.enabled ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
                                <div className="flex items-center justify-between cursor-pointer" onClick={() => setCoinSettings({ ...coinSettings, enabled: !coinSettings.enabled })}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${coinSettings.enabled ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                            🪙
                                        </div>
                                        <div>
                                            <span className={`block font-medium ${coinSettings.enabled ? 'text-indigo-200' : 'text-slate-400'}`}>High Stakes Mode</span>
                                            <span className="text-xs text-slate-500">Require coins to join and punish missed days</span>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={coinSettings.enabled}
                                        onChange={e => setCoinSettings({ ...coinSettings, enabled: e.target.checked })}
                                        className="accent-indigo-500 h-5 w-5"
                                    />
                                </div>

                                {coinSettings.enabled && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Stake to Join</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={coinSettings.stake}
                                                onChange={e => setCoinSettings({ ...coinSettings, stake: parseInt(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Daily Penalty</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={coinSettings.penalty}
                                                onChange={e => setCoinSettings({ ...coinSettings, penalty: parseInt(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>


                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setActiveTab('list')} className="text-slate-400 hover:text-white text-sm font-medium">Cancel</button>
                                <button type="submit" disabled={creating} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                                    {creating ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create Squad'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'join' && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 max-w-lg mx-auto backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <UserPlus className="text-indigo-500" /> Join a Squad
                        </h2>
                        <form onSubmit={handleJoinGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Invite Code</label>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value)}
                                    placeholder="ENTER CODE"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300">
                                If the group requires a stake, it will be locked from your balance automatically upon joining.
                            </div>
                            {joinError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {joinError}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setActiveTab('list')} className="text-slate-400 hover:text-white text-sm font-medium">Cancel</button>
                                <button type="submit" disabled={joining} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                                    {joining ? <Loader2 className="animate-spin h-4 w-4" /> : 'Join Squad'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'list' && (
                    loading ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div>
                    ) : (
                        groups.length === 0 ? (
                            <div className="text-center py-20 bg-slate-900/30 border border-slate-800/50 rounded-xl border-dashed">
                                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="text-indigo-400 h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">No Squads Yet</h3>
                                <p className="text-slate-400 max-w-xs mx-auto mb-6">Create a squad to challenge friends or join one with an invite code.</p>
                                <button onClick={() => setActiveTab('create')} className="text-indigo-400 hover:text-indigo-300 font-medium text-sm">Create your first squad &rarr;</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groups.map((membership) => (
                                    <GroupCard key={membership.groups.id} group={membership.groups} role={membership.role} />
                                ))}
                            </div>
                        )
                    )
                )}
            </div>
        </Layout>
    )
}

function GroupCard({ group, role }) {
    const [copied, setCopied] = useState(false)
    const copyCode = () => {
        navigator.clipboard.writeText(group.invite_code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors group relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-4 right-4 text-xs font-mono text-slate-500 flex items-center gap-2 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-600 select-none">CODE:</span>
                <span className="text-slate-300">{group.invite_code}</span>
                <button onClick={copyCode} className="text-indigo-400 hover:text-white transition-colors">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
            </div>

            <h3 className="text-lg font-bold text-white mb-1 pr-24 truncate" title={group.name}>{group.name}</h3>

            <div className="flex items-center gap-3 mb-6">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold bg-slate-800 px-2 py-0.5 rounded">
                    {role}
                </span>
                {group.is_coin_enabled && (
                    <span className="text-xs text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        🪙 {group.stake_amount} Stake
                    </span>
                )}
            </div>

            <div className="mt-auto">
                <Link to={`/groups/${group.id}`} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                    View Details <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    )
}
