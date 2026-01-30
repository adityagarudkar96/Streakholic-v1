import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogOut, User, LayoutDashboard, Zap, Users, Coins } from 'lucide-react'

export default function Layout({ children, profile }) {
    const navigate = useNavigate()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        navigate('/auth')
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 hidden md:flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Zap className="text-indigo-400 fill-current" />
                        Streakholic
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <Link to="/" className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                        <LayoutDashboard size={20} />
                        <span className="font-medium">Dashboard</span>
                    </Link>
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-lg transition-colors">
                        <User size={20} />
                        <span className="font-medium">Profile</span>
                    </Link>
                    <Link to="/groups" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-lg transition-colors">
                        <Users size={20} />
                        <span className="font-medium">Squads</span>
                    </Link>
                    <Link to="/wallet" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-lg transition-colors">
                        <Coins size={20} />
                        <span className="font-medium">Wallet</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                            {profile.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{profile.username}</p>
                            <p className="text-xs text-slate-500 truncate">@{profile.leetcode_username}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg w-full transition-colors"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header (visible on small screens) */}
            <div className="md:hidden fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50 p-4 flex justify-between items-center">
                <span className="font-bold text-lg text-indigo-400">Streakholic</span>
                <button onClick={handleSignOut} className="p-2 text-slate-400"><LogOut size={20} /></button>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 pt-20 md:pt-10 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}
