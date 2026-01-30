import { useState } from 'react'
import Layout from '../components/Layout'
import { User, Calendar, Award, Zap, Edit2, Check, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Profile({ profile, setProfile }) {
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(profile.username || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ username: editName })
                .eq('id', profile.id)

            if (error) throw error

            // Update parent state
            setProfile({ ...profile, username: editName })
            setIsEditing(false)
        } catch (error) {
            console.error('Error updating profile:', error)
            alert('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <Layout profile={profile}>
            <div className="max-w-4xl mx-auto">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-indigo-500/20">
                            {profile.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="text-center md:text-left flex-1">
                            {isEditing ? (
                                <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-xs"
                                        autoFocus
                                    />
                                    <button onClick={handleSave} disabled={saving} className="bg-green-500/20 text-green-400 p-2 rounded hover:bg-green-500/30">
                                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    </button>
                                    <button onClick={() => { setIsEditing(false); setEditName(profile.username) }} className="bg-slate-800 text-slate-400 p-2 rounded hover:bg-slate-700">
                                        <X size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 justify-center md:justify-start mb-2 group">
                                    <h1 className="text-3xl font-bold text-white max-w-[250px] md:max-w-md truncate" title={profile.username}>
                                        {profile.username}
                                    </h1>
                                    <button
                                        onClick={() => { setIsEditing(true); setEditName(profile.username || '') }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-indigo-400 p-1"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            )}

                            <p className="text-slate-400 font-mono bg-slate-800 py-1 px-3 rounded-md inline-block">
                                @{profile.leetcode_username}
                            </p>
                        </div>

                        <div className="text-center md:text-right">
                            <p className="text-slate-500 text-sm">Member since</p>
                            <p className="text-slate-300 font-medium">{formatDate(profile.created_at)}</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                                <Zap size={16} />
                                <span className="text-xs font-medium uppercase tracking-wider">Current Streak</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{profile.current_streak} <span className="text-slate-500 text-sm font-normal">days</span></p>
                        </div>
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                                <Award size={16} />
                                <span className="text-xs font-medium uppercase tracking-wider">Best Streak</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{profile.longest_streak} <span className="text-slate-500 text-sm font-normal">days</span></p>
                        </div>
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                                <Calendar size={16} />
                                <span className="text-xs font-medium uppercase tracking-wider">Total Active</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{profile.total_active_days || 0} <span className="text-slate-500 text-sm font-normal">days</span></p>
                        </div>
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                                <span className="text-yellow-400">🪙</span>
                                <span className="text-xs font-medium uppercase tracking-wider">Coins</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{profile.coins_balance?.toLocaleString() || 0}</p>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8">
                        <h3 className="text-lg font-semibold text-white mb-4">Account Settings</h3>
                        <p className="text-slate-500 text-sm">
                            Your LeetCode username is permanently linked to this account to ensure streak integrity.
                            It cannot be changed manually.
                        </p>
                    </div>

                </div>
            </div>
        </Layout>
    )
}
