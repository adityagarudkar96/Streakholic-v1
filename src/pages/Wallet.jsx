import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { getTransactions, getWallet } from '../lib/wallet'
import { Coins, ArrowDownLeft, ArrowUpRight, Lock, Unlock, History, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function Wallet({ profile }) {
    const [transactions, setTransactions] = useState([])
    const [balance, setBalance] = useState({ coins_balance: 0, coins_locked: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [profile.id])

    const fetchData = async () => {
        try {
            const [txs, wallet] = await Promise.all([
                getTransactions(profile.id),
                getWallet(profile.id)
            ])
            setTransactions(txs || [])
            if (wallet) setBalance(wallet)
        } catch (error) {
            console.error('Error fetching wallet data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (type) => {
        switch (type) {
            case 'initial_grant': return <Coins className="text-yellow-400" />
            case 'reward': return <ArrowDownLeft className="text-green-400" />
            case 'penalty': return <ArrowUpRight className="text-red-400" />
            case 'lock': return <Lock className="text-slate-400" />
            case 'unlock': return <Unlock className="text-slate-400" />
            default: return <History className="text-slate-400" />
        }
    }

    return (
        <Layout profile={profile}>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header / Balance Card */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                            <h2 className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-2">Total Balance</h2>
                            <div className="text-5xl font-bold text-white flex items-center gap-3">
                                <span className="text-yellow-400">🪙</span>
                                {balance.coins_balance.toLocaleString()}
                            </div>
                            <p className="text-slate-400 mt-2 text-sm">Streakholic Coins (STC)</p>
                        </div>

                        <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm">
                                <Lock size={14} /> Locked for Stakes
                            </div>
                            <div className="text-2xl font-mono text-white">
                                {balance.coins_locked.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Initial Grant Info */}
                {transactions.length === 0 && !loading && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                        <Coins className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Transactions Yet</h3>
                        <p className="text-slate-400">Your initial grant should appear here shortly via system sync.</p>
                    </div>
                )}

                {/* Transaction List */}
                {transactions.length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
                            <History className="text-indigo-400" size={20} />
                            <h3 className="text-lg font-bold text-white">Transaction History</h3>
                        </div>

                        <div className="divide-y divide-slate-800">
                            {transactions.map(tx => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 border border-slate-700`}>
                                            {getIcon(tx.type)}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium capitalize">
                                                {tx.type === 'lock' ? 'Staked' : tx.type.replace('_', ' ')}
                                            </p>
                                            <p className="text-slate-500 text-xs">
                                                {tx.description || 'No description'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className={`font-mono font-bold ${tx.type === 'lock' ? 'text-amber-400' :
                                            tx.amount > 0 ? 'text-green-400' :
                                                tx.amount < 0 ? 'text-red-400' : 'text-slate-400'
                                            }`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                                        </p>
                                        <p className="text-slate-600 text-xs">
                                            {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}
