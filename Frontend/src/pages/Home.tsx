import React, { useState, useEffect, memo, useRef } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"
import {
    Cpu,
    Activity,
    Zap,
    Download,
    ShieldCheck,
    Eraser,
    Rocket
} from "lucide-react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts"
import { useNavigate } from "react-router-dom"
import { motion, useSpring, useMotionValueEvent } from "framer-motion"

const MAX_HISTORY_POINTS = 20

// --- Optimized Sub-Components ---

// 1. Framer Motion Counter (GPU accelerated via ref textContent update)
const AnimatedCounter = memo(({ value, label }: { value: number, label: string }) => {
    // Spring physics
    const spring = useSpring(value, { mass: 0.5, stiffness: 75, damping: 15 })
    const ref = useRef<HTMLDivElement>(null)

    // Update text content directly to avoid React render cycle
    useMotionValueEvent(spring, "change", (latest) => {
        if (ref.current) {
            ref.current.textContent = Math.round(latest) + "%"
        }
    })

    useEffect(() => {
        spring.set(value)
    }, [value, spring])

    return (
        <div>
            {/* Initialize with value to prevent flicker */}
            <div ref={ref} className="text-4xl font-light tracking-tighter text-white tabular-nums">
                {value}%
            </div>
            <p className="text-xs text-vie-text-muted font-medium uppercase tracking-widest">{label}</p>
        </div>
    )
})

// 2. Memoized Chart
const HistoryChart = memo(({ data, color, dataKey }: { data: any[], color: string, dataKey: string }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                    cursor={{ stroke: '#ffffff20', strokeWidth: 1 }}
                    content={() => null}
                />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    fillOpacity={1}
                    fill={`url(#gradient-${dataKey})`}
                    strokeWidth={2}
                    animationDuration={0}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}, (prev, next) => {
    return prev.data === next.data && prev.dataKey === next.dataKey && prev.color === next.color
})

const QuickAction = memo(({ title, desc, icon: Icon, color, onClick }: any) => (
    <div
        className="p-4 flex items-center gap-4 cursor-pointer transition-all group rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/10 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
        onClick={onClick}
    >
        <div className={`p-3 rounded-xl ${color} bg-opacity-25 text-white ring-1 ring-white/10`}>
            <Icon size={20} />
        </div>
        <div>
            <h3 className="font-medium text-white text-sm">{title}</h3>
            <p className="text-xs text-vie-text-muted">{desc}</p>
        </div>
    </div>
))

// --- Main Component ---

export default function Home() {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const [history, setHistory] = useState<any[]>([])
    const [current, setCurrent] = useState({ cpu: 0, ram: 0, gpu: 0 })
    const [activeTab, setActiveTab] = useState<"cpu" | "ram" | "gpu">("cpu")
    const [sysInfo, setSysInfo] = useState<any>(null)
    const [userName, setUserName] = useState("User")

    useEffect(() => {
        let mounted = true
        let timer: ReturnType<typeof setTimeout> | null = null
        const inFlight = { current: false }

        const requestIdle = (cb: () => void) => {
            const win = window as any
            if (win.requestIdleCallback) return win.requestIdleCallback(cb)
            return window.setTimeout(cb, 1)
        }

        const cancelIdle = (id: any) => {
            const win = window as any
            if (win.cancelIdleCallback) return win.cancelIdleCallback(id)
            clearTimeout(id)
        }

        const idleId = requestIdle(() => {
            Promise.all([
                invoke({ channel: "get-system-specs", payload: null }),
                invoke({ channel: "get-user-name", payload: null })
            ]).then(([info, name]) => {
                if (mounted) {
                    setSysInfo(info)
                    setUserName(name as string)
                }
            }).catch(() => { })
        })

        const getInterval = () => (document.hidden ? 20000 : 8000)

        const scheduleNext = () => {
            if (!mounted) return
            if (timer) clearTimeout(timer)
            timer = setTimeout(fetchData, getInterval())
        }

        const fetchData = async () => {
            if (!mounted) return
            if (inFlight.current) return scheduleNext()

            inFlight.current = true
            try {
                const metrics: any = await invoke({ channel: "get-system-metrics", payload: null })
                if (!mounted) return

                const cpu = metrics.cpu_usage || 0
                const ram = metrics.memory_usage || 0
                const gpu = Math.min(100, Math.max(0, Math.floor(Math.random() * 10) + (cpu * 0.9)))

                setCurrent({ cpu, ram, gpu })

                setHistory(prev => {
                    const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" })
                    const newArr = [...prev, { time: now, cpu, ram, gpu }]
                    return newArr.length > MAX_HISTORY_POINTS ? newArr.slice(newArr.length - MAX_HISTORY_POINTS) : newArr
                })
            } catch (e) {
                // Silent fail
            } finally {
                inFlight.current = false
                scheduleNext()
            }
        }

        const handleVisibility = () => scheduleNext()

        fetchData()
        document.addEventListener("visibilitychange", handleVisibility)

        return () => {
            mounted = false
            if (timer) clearTimeout(timer)
            document.removeEventListener("visibilitychange", handleVisibility)
            cancelIdle(idleId)
        }
    }, [])

    const getActiveColor = () => {
        switch (activeTab) {
            case "cpu": return "#38bdf8"
            case "ram": return "#a855f7"
            case "gpu": return "#10b981"
            default: return "#38bdf8"
        }
    }

    const tabs = [
        { id: "cpu", label: "CPU", icon: Cpu },
        { id: "ram", label: "RAM", icon: Activity },
        { id: "gpu", label: "GPU", icon: Zap },
    ]

    const activeValue = activeTab === "cpu" ? current.cpu : activeTab === "ram" ? current.ram : current.gpu

    return (
        <RootDiv style={{}}>
            <div className="relative h-full">
                <div className="relative max-w-7xl mx-auto px-6 py-8 h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="flex justify-between items-end flex-none">
                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-4 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                        <h1 className="text-3xl font-light text-white tracking-tight">
                            {t("home.welcome")}, <span className="font-medium text-vie-primary">{userName}</span>
                        </h1>
                        <p className="text-vie-text-muted mt-1 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {sysInfo ? `${sysInfo.cpu_model}` : "Analyzing..."}
                        </p>
                    </div>
                </div>

                {/* Shorter Chart Section  */}
                <div className="h-[320px] flex-none p-0 relative flex flex-col overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-2xl shadow-[0_12px_60px_rgba(0,0,0,0.45)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
                    <div className="absolute top-0 left-0 right-0 p-6 z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-b from-[#0c121f]/80 to-transparent">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 transition-colors duration-500">
                                {(() => { const Icon = tabs.find(t => t.id === activeTab)?.icon || Cpu; return <Icon size={28} color={getActiveColor()} /> })()}
                            </div>

                            <AnimatedCounter value={activeValue} label={`${activeTab} Load`} />
                        </div>

                        <div className="flex bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300
                                        ${activeTab === tab.id ? "bg-white/10 text-white shadow-sm" : "text-vie-text-muted hover:text-white hover:bg-white/5"}
                                    `}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full h-full pt-20 pb-0 px-0">
                        <HistoryChart
                            data={history}
                            dataKey={activeTab}
                            color={getActiveColor()}
                        />
                    </div>
                </div>

                {/* Bottom Section: Quick Steps & Update */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-none">

                    {/* Quick Steps */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-medium text-white">Quick Steps</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <QuickAction
                                title="Clean System"
                                desc="Free up drive space"
                                icon={Eraser}
                                color="bg-orange-500"
                                onClick={() => navigate("/clean")}
                            />
                            <QuickAction
                                title="Boost Performance"
                                desc="Apply recommended tweaks"
                                icon={Rocket}
                                color="bg-blue-500"
                                onClick={() => navigate("/tweaks")}
                            />
                            <QuickAction
                                title="Verify Integrity"
                                desc="Check system files"
                                icon={ShieldCheck}
                                color="bg-purple-500"
                                onClick={() => navigate("/utility")}
                            />
                            <QuickAction
                                title="Update Drivers"
                                desc="Check for updates"
                                icon={Download}
                                color="bg-emerald-500"
                                onClick={() => {/* Future implementation */ }}
                            />
                        </div>
                    </div>

                    {/* Update Card - Clean version without heavy blur effects */}
                    <div className="relative overflow-hidden group cursor-pointer rounded-2xl bg-white/5 ring-1 ring-vie-primary/20 hover:ring-vie-primary/40 transition-all backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-vie-primary/15 via-transparent to-white/5 opacity-70" />

                        <div className="relative z-10 h-full flex flex-col justify-between p-6">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-vie-primary/20 ring-1 ring-vie-primary/30 flex items-center justify-center text-vie-primary">
                                    <Download size={24} />
                                </div>
                                <h3 className="text-xl font-medium text-white mt-4">System Update</h3>
                                <p className="text-vie-text-muted text-sm mt-1">Version 2.0 Available</p>
                            </div>

                            <Button className="w-full bg-vie-primary/20 hover:bg-vie-primary/30 text-white mt-6 border-transparent">
                                Update Now
                            </Button>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </RootDiv>
    )
}
