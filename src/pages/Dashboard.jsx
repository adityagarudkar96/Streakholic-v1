import Layout from '../components/Layout'
import { Flame, Trophy, Calendar, Target, RefreshCw, Layers, Zap, Award, Hash } from 'lucide-react'
import { checkStreak } from '../lib/streak'
import { syncHistory } from '../lib/history'
import { verifyLeetCodeUsername } from '../lib/leetcode'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${colorClass}`}></div>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-lg bg-slate-800/50 ${colorClass.replace('bg-', 'text-')}`}>
                <Icon size={24} />
            </div>
        </div>
    </div>
)

const DifficultyCard = ({ label, count, total, color }) => (
    <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800 flex flex-col items-center">
        <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${color}`}>{label}</span>
        <span className="text-2xl font-bold text-white">{count}</span>
        <span className="text-xs text-slate-500">of {total}</span>
    </div>
)

export default function Dashboard({ profile }) {
    const [loading, setLoading] = useState(true)
    const [logs, setLogs] = useState([])
    const [lcStats, setLcStats] = useState(null)
    const [syncMessage, setSyncMessage] = useState(null)

    // Real derived state
    const stats = {
        currentStreak: profile.current_streak || 0,
        longestStreak: profile.longest_streak || 0,
        totalActive: profile.total_active_days || logs.filter(l => l.status === 'success').length,
        lastActivity: profile.last_activity_date ? new Date(profile.last_activity_date).toLocaleDateString() : 'Never'
    }

    useEffect(() => {
        let mounted = true

        const initializeDashboard = async () => {
            if (!profile.leetcode_username) return

            try {
                // 1. Fetch Live LeetCode Stats (Direct API)
                const { valid, data } = await verifyLeetCodeUsername(profile.leetcode_username)
                if (mounted && valid) setLcStats(data)

                // 2. Auto-Sync Logic (Run in background)
                // We run checkStreak AND syncHistory
                // We do not wait for them to render the UI, but we trigger them.

                // Fire and forget streak check (it updates DB)
                const streakPromise = checkStreak(profile.id).then(res => {
                    if (res.status === 'success' && mounted) {
                        setSyncMessage({ type: 'success', text: `Streak updated: ${res.message}` })
                        // Reload data after update
                        refreshLogs()
                    }
                })

                // Fire and forget history sync
                const historyPromise = syncHistory(profile.id, profile.leetcode_username).then(res => {
                    if (res.status === 'success' && res.count > 0 && mounted) {
                        // refresh logs if history changed
                        refreshLogs()
                    }
                })

                await refreshLogs()
                setLoading(false)

            } catch (error) {
                console.error('Dashboard init error:', error)
                if (mounted) setLoading(false)
            }
        }

        const refreshLogs = async () => {
            const { data } = await supabase
                .from('daily_logs')
                .select('*')
                .eq('user_id', profile.id)
                .order('date', { ascending: false })
            if (mounted && data) setLogs(data)
        }

        initializeDashboard()

        return () => { mounted = false }
    }, [profile.id, profile.leetcode_username])

    return (
        <Layout profile={profile}>
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Helper Banner */}
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-indigo-100 mb-1">Welcome to the Arena</h2>
                        <p className="text-indigo-200/60 text-sm">
                            Your stats are automatically synced live.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 font-bold">
                            <div className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center text-[10px]">$</div>
                            <span>{profile.coins_balance?.toLocaleString() || 0}</span>
                        </div>

                        <a
                            href={`https://leetcode.com/${profile.leetcode_username}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-2"
                        >
                            Solve on LeetCode <Target size={16} />
                        </a>
                    </div>
                </div>

                {/* Sync Notification Area */}
                {syncMessage && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg flex items-center gap-2">
                        <RefreshCw size={16} className="animate-spin" />
                        {syncMessage.text}
                    </div>
                )}

                {/* Core Streak Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Current Streak"
                        value={stats.currentStreak}
                        subtitle="Days in a row"
                        icon={Flame}
                        colorClass="bg-orange-500"
                    />
                    <StatCard
                        title="Longest Streak"
                        value={stats.longestStreak}
                        subtitle="All-time best"
                        icon={Trophy}
                        colorClass="bg-yellow-500"
                    />
                    <StatCard
                        title="Total Active Days"
                        value={stats.totalActive}
                        subtitle="Consistency score"
                        icon={Calendar}
                        colorClass="bg-green-500"
                    />
                    <StatCard
                        title="Last Activity"
                        value={stats.lastActivity}
                        subtitle="UTC Time"
                        icon={Target}
                        colorClass="bg-blue-500"
                    />
                </div>

                {/* LeetCode Stats Section */}
                {lcStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Solved Problems */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm md:col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Layers size={20} /></div>
                                <h3 className="text-lg font-bold text-white">Problems Solved</h3>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="flex flex-col">
                                    <span className="text-slate-400 text-xs uppercase mb-1">Total</span>
                                    <span className="text-3xl font-bold text-white">{lcStats.totalSolved}</span>
                                    <span className="text-xs text-slate-500">/ {lcStats.totalQuestions}</span>
                                </div>
                                <DifficultyCard label="Easy" count={lcStats.easySolved} total={lcStats.totalEasy} color="text-teal-400" />
                                <DifficultyCard label="Medium" count={lcStats.mediumSolved} total={lcStats.totalMedium} color="text-yellow-400" />
                                <DifficultyCard label="Hard" count={lcStats.hardSolved} total={lcStats.totalHard} color="text-red-400" />
                            </div>
                        </div>

                        {/* Ranking & Reputation */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-between space-y-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Hash size={16} className="text-slate-500" />
                                    <span className="text-sm font-medium text-slate-400">Global Ranking</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{lcStats.ranking?.toLocaleString() || 'N/A'}</div>
                            </div>

                            <div className="h-px bg-slate-800 w-full"></div>

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Award size={16} className="text-slate-500" />
                                    <span className="text-sm font-medium text-slate-400">Acceptance Rate</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{lcStats.acceptanceRate}%</div>
                            </div>
                        </div>

                    </div>
                )}

                {/* Activity Heatmap Removed by user request */}

            </div>
        </Layout>
    )
}
