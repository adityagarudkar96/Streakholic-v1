import { eachDayOfInterval, subDays, format, isSameDay, getDay, startOfWeek, endOfWeek, differenceInCalendarDays, startOfYear } from 'date-fns'
import { useState } from 'react'

export default function ActivityHeatmap({ logs, createdAt }) {
    // Determine start date: Use createdAt, but align to start of week.
    // If createdAt is missing or invalid, default to 1 month ago? Or 1 year.
    // Let's default to start of current year if data missing, or 30 days.

    const today = new Date()
    let startDate = subDays(today, 364) // Default fallback

    if (createdAt) {
        const createdDate = new Date(createdAt)
        // Ensure we don't go into the future if created today (startOfWeek handles it)
        // Also ensure we show at least a few weeks if they just joined today?
        // User request: "only show ... after its profile created date"
        startDate = startOfWeek(createdDate)
    }

    // Generate days from startDate to today
    const allDays = eachDayOfInterval({ start: startDate, end: today })

    // Group into weeks
    const weeks = []
    let currentWeek = []

    allDays.forEach(day => {
        if (getDay(day) === 0 && currentWeek.length > 0) {
            weeks.push(currentWeek)
            currentWeek = []
        }
        currentWeek.push(day)
    })
    if (currentWeek.length > 0) weeks.push(currentWeek)

    // Helper to find log using robust string comparison
    const getLog = (day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        return logs.find(log => log.date === dayStr || log.date.startsWith(dayStr))
    }

    const getColor = (day) => {
        const log = getLog(day)
        if (!log) return 'bg-slate-900 border-slate-800 hover:border-slate-600'
        if (log.status === 'success') return 'bg-green-500 border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
        if (log.status === 'miss') return 'bg-red-900/50 border-red-800'
        return 'bg-slate-800 border-slate-700'
    }

    const [hoveredDay, setHoveredDay] = useState(null)
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

    const handleMouseEnter = (e, day) => {
        const rect = e.target.getBoundingClientRect()
        setTooltipPos({
            x: rect.left + window.scrollX - 60,
            y: rect.top + window.scrollY - 80
        })
        setHoveredDay(day)
    }

    // Month labels logic
    const monthLabels = []
    let lastMonth = -1
    weeks.forEach((week, i) => {
        const firstDay = week[0]
        const month = firstDay.getMonth()
        if (month !== lastMonth) {
            // Only add if not too close to the end (optional, but good for UI)
            monthLabels.push({ index: i, label: format(firstDay, 'MMM') })
            lastMonth = month
        }
    })

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm relative">
            <div className="flex justify-between items-center mb-6">
                <div></div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">Less <div className="w-3 h-3 bg-slate-900 border border-slate-800 rounded-[2px]"></div></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-900/50 border border-green-900 rounded-[2px]"></div></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 border border-green-400 rounded-[2px]"></div> More</div>
                </div>
            </div>

            <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className="flex flex-col gap-1 min-w-max">
                    {/* Month Labels */}
                    <div className="flex text-xs text-slate-500 mb-2 h-4 relative">
                        {monthLabels.map((m) => (
                            <span
                                key={m.label + m.index}
                                style={{ left: `${m.index * 16}px` }} // Fixed spacing multiplier (12px width + 4px gap = 16px)
                                className="absolute top-0 text-[10px] font-medium uppercase tracking-wider"
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-1">
                        {/* Days of week labels */}
                        <div className="flex flex-col gap-1 mr-2 pt-[0px]">
                            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                                <span key={i} className="text-[9px] text-slate-600 h-3 leading-3">{d}</span>
                            ))}
                        </div>

                        {/* The Grid */}
                        <div className="flex gap-1">
                            {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col gap-1">
                                    {week.map((day, dayIndex) => {
                                        const log = getLog(day)
                                        return (
                                            <div
                                                key={dayIndex}
                                                onMouseEnter={(e) => handleMouseEnter(e, day)}
                                                onMouseLeave={() => setHoveredDay(null)}
                                                className={`w-3 h-3 rounded-[2px] border ${getColor(day)} transition-all duration-300 hover:scale-125 hover:z-10`}
                                            ></div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Tooltip */}
            {hoveredDay && (
                <div
                    className="absolute z-50 pointer-events-none transition-opacity duration-200"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <div className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-3 shadow-xl whitespace-nowrap min-w-[120px]">
                        <p className="font-bold text-slate-300 mb-1">{format(hoveredDay, 'EEEE, MMM d, yyyy')}</p>
                        {(() => {
                            const log = getLog(hoveredDay)
                            if (!log) return <span className="text-slate-500">No activity recorded</span>
                            if (log.status === 'success') return (
                                <div className="text-green-400 font-medium flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                    Success ({log.problems_solved || 0} solved)
                                </div>
                            )
                            if (log.status === 'miss') return (
                                <div className="text-red-400 font-medium flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                    Missed Day
                                </div>
                            )
                            return <span className="text-slate-400">{log.status}</span>
                        })()}
                    </div>
                    {/* Triangle pointer */}
                    <div className="w-3 h-3 bg-slate-950 border-r border-b border-slate-700 transform rotate-45 absolute left-1/2 -ml-1.5 -bottom-1.5 -z-10"></div>
                </div>
            )}
        </div>
    )
}
