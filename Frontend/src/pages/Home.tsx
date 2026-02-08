import React, { useEffect, memo, useRef } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"
<<<<<<< HEAD
import {
    Cpu,
    Activity,
    Zap,
    Download,
    ShieldCheck,
    Eraser,
    Rocket,
    RotateCw,
    CheckCircle2
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
import { motion, useSpring, useMotionValueEvent, AnimatePresence } from "framer-motion"
import { pageContainerVariants, itemVariants } from "@/lib/animations"

const MAX_HISTORY_POINTS = 30 // Increased for smoother chart
=======
import { Cpu, Activity, Zap, Download, ShieldCheck, Eraser, Rocket, RotateCw } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useNavigate } from "react-router-dom"
import { motion, useSpring, useMotionValueEvent } from "framer-motion"
import { pageContainerVariants, itemVariants } from "@/lib/animations"
import useSystemMetricsStore, { useSystemMetricsSubscription } from "@/store/systemMetrics"

const TABS = [
  { id: "cpu", label: "CPU", icon: Cpu },
  { id: "ram", label: "RAM", icon: Activity },
  { id: "gpu", label: "GPU", icon: Zap },
] as const
>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)

const TAB_COLORS = {
  cpu: "#22d3ee",
  ram: "#3b82f6",
  gpu: "#10b981",
}

<<<<<<< HEAD
// 1. Framer Motion Counter
const AnimatedCounter = memo(({ value, label }: { value: number, label: string }) => {
    const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 20 }) // Smoother spring
    const ref = useRef<HTMLDivElement>(null)

    useMotionValueEvent(spring, "change", (latest) => {
        if (ref.current) {
            ref.current.textContent = Math.round(latest) + "%"
        }
    })
=======
type ActiveTab = (typeof TABS)[number]["id"]

const AnimatedCounter = memo(({ value, label }: { value: number; label: string }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 20 })
  const ref = useRef<HTMLDivElement>(null)
>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)

  useMotionValueEvent(spring, "change", (latest) => {
    if (ref.current) {
      ref.current.textContent = `${Math.round(latest)}%`
    }
  })

<<<<<<< HEAD
    return (
        <div className="flex flex-col">
            <div ref={ref} className="text-6xl md:text-7xl font-light tracking-tighter text-white tabular-nums leading-none">
                {value}%
            </div>
            <p className="text-xs text-vie-text-muted font-bold uppercase tracking-widest mt-2 opacity-60 pl-1">{label}</p>
        </div>
    )
})

// 2. Memoized Chart
const HistoryChart = memo(({ data, color, dataKey }: { data: any[], color: string, dataKey: string }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={() => null} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    fillOpacity={1}
                    fill={`url(#gradient-${dataKey})`}
                    strokeWidth={3}
                    isAnimationActive={false} // Disable Recharts internal animation for smoother real-time updates
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}, (prev, next) => {
    return prev.data === next.data && prev.dataKey === next.dataKey && prev.color === next.color
})

const QuickAction = memo(({ title, desc, icon: Icon, color, onClick }: any) => {
    // Determine icon color based on background color prop to ensure contrast
    // Using white for maximum visibility on colored backgrounds
    const iconColorClass = "text-white";

    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-2xl bg-vie-card/50 backdrop-blur-lg p-5 cursor-pointer border border-white/5 hover:border-white/10 transition-colors shadow-sm"
            onClick={onClick}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-xl ${color} bg-opacity-20 ${iconColorClass} ring-1 ring-inset ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={22} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="font-medium text-white text-[15px] leading-tight group-hover:text-vie-primary transition-colors">{title}</h3>
                        <p className="text-white/70 text-sm mt-1 leading-relaxed group-hover:text-white/90 transition-colors">{desc}</p>
                    </div>
                </div>
                <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-vie-text-muted">
                    <Icon size={16} className="-rotate-45" />
                </div>
            </div>
        </motion.div>
    )
=======
  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  return (
    <div className="flex flex-col">
      <div
        ref={ref}
        className="text-6xl md:text-7xl font-light tracking-tighter text-white tabular-nums leading-none"
      >
        {value}%
      </div>
      <p className="text-xs text-vie-text-muted font-bold uppercase tracking-widest mt-2 opacity-70 pl-1">{label}</p>
    </div>
  )
>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)
})

const HistoryChart = memo(
  ({ data, color, dataKey }: { data: Array<Record<string, any>>; color: string; dataKey: string }) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip content={() => null} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 4" }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fillOpacity={1}
            fill={`url(#gradient-${dataKey})`}
            strokeWidth={2.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  },
  (prev, next) => prev.data === next.data && prev.dataKey === next.dataKey && prev.color === next.color
)

const QuickAction = memo(({ title, desc, icon: Icon, color, onClick }: any) => {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="group relative overflow-hidden rounded-2xl bg-vie-card/55 backdrop-blur-lg p-5 cursor-pointer border border-cyan-400/10 hover:border-cyan-300/25 transition-colors shadow-[0_10px_28px_rgba(0,0,0,0.3)]"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-cyan-300/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-xl ${color} bg-opacity-25 text-white ring-1 ring-inset ring-cyan-200/20`}>
            <Icon size={22} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-medium text-white text-[15px] leading-tight group-hover:text-cyan-200 transition-colors">{title}</h3>
            <p className="text-white/70 text-sm mt-1 leading-relaxed">{desc}</p>
          </div>
        </div>
        <div className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-cyan-200/70">
          <Icon size={16} className="-rotate-45" />
        </div>
      </div>
    </motion.div>
  )
})

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("cpu")
  const [sysInfo, setSysInfo] = React.useState<any>(null)
  const [userName, setUserName] = React.useState("User")

  useSystemMetricsSubscription()

  const current = useSystemMetricsStore((state) => state.current)
  const history = useSystemMetricsStore((state) => state.history)

<<<<<<< HEAD
        // Initial Data Fetch
        const initData = async () => {
            try {
                const [info, name] = await Promise.all([
                    invoke({ channel: "get-system-specs", payload: null }).catch(() => null),
                    invoke({ channel: "get-user-name", payload: null }).catch(() => "User")
                ])
                if (mounted) {
                    setSysInfo(info)
                    setUserName(name as string)
                }
            } catch (e) { console.error(e) }
        }
        initData()

        const getInterval = () => (document.hidden ? 5000 : 2000) // Faster updates when visible

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
                // Simulated GPU for demo/fallback if not available
                const gpu = Math.min(100, Math.max(0, Math.floor(Math.random() * 5) + (cpu * 0.8)))

                setCurrent({ cpu, ram, gpu })

                setHistory(prev => {
                    const now = new Date().toLocaleTimeString()
                    // Keep history array size manageable but large enough for smooth lines
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

        const handleVisibility = () => {
            if (!document.hidden) fetchData()
        }

        fetchData()
        document.addEventListener("visibilitychange", handleVisibility)

        return () => {
            mounted = false
            if (timer) clearTimeout(timer)
            document.removeEventListener("visibilitychange", handleVisibility)
        }
    }, [])

    const getActiveColor = () => {
        switch (activeTab) {
            case "cpu": return "#38bdf8" // Sky 400
            case "ram": return "#a855f7" // Purple 500
            case "gpu": return "#10b981" // Emerald 500
            default: return "#38bdf8"
        }
=======
  useEffect(() => {
    let mounted = true

    const initData = async () => {
      try {
        const [info, name] = await Promise.all([
          invoke({ channel: "get-system-specs", payload: null }).catch(() => null),
          invoke({ channel: "get-user-name", payload: null }).catch(() => "User"),
        ])

        if (!mounted) return
        setSysInfo(info)
        setUserName(name as string)
      } catch {
        // keep silent, fallback UI already exists
      }
>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)
    }

    void initData()

    return () => {
      mounted = false
    }
  }, [])

<<<<<<< HEAD
    return (
        <RootDiv style={{}}>
            <div className="relative min-h-full">
                <motion.div
                    variants={pageContainerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative max-w-7xl mx-auto px-6 py-6 lg:py-10 flex flex-col gap-8"
                >

                    {/* Header Section with Welcome Card */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <motion.div
                            variants={itemVariants}
                            className="relative w-full md:w-auto flex-1 max-w-2xl"
                        >
                            <div className="relative z-10">
                                <h1 className="text-4xl lg:text-5xl font-extralight text-white tracking-tight leading-tight">
                                    {t("home.welcome")}, <br />
                                    <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-vie-primary to-vie-accent">
                                        {userName}
                                    </span>
                                </h1>
                                <div className="mt-4 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-vie-card border border-white/10">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-xs font-medium text-white/70 tracking-wide">
                                        {sysInfo ? sysInfo.cpu_model : "System Monitor Active"}
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Modern Tab Switcher */}
                        <motion.div variants={itemVariants} className="flex bg-vie-card rounded-2xl p-1.5 border border-white/5 self-start md:self-end shadow-inner">
                            {tabs.map(tab => {
                                const isActive = activeTab === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`
                                            relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                                            ${isActive ? "text-white" : "text-vie-text-muted hover:text-white hover:bg-white/5"}
                                        `}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabBg"
                                                className="absolute inset-0 bg-white/10 rounded-xl shadow-sm border border-white/5"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center gap-2">
                                            <tab.icon size={18} className={isActive ? "text-vie-primary" : ""} />
                                            {tab.label}
                                        </span>
                                    </button>
                                )
                            })}
                        </motion.div>
                    </div>

                    {/* Main Chart Section - Cleaner, Glassmorphism */}
                    <motion.div variants={itemVariants} className="relative h-[400px] w-full flex flex-col rounded-[2rem] bg-vie-card/50 border border-white/[0.06] shadow-2xl overflow-hidden backdrop-blur-lg">
                        {/* Chart Header Overlay */}
                        <div className="absolute top-0 left-0 w-full p-8 z-20 flex justify-between items-start pointer-events-none">
                            <div className="flex flex-col gap-1">
                                <AnimatedCounter value={activeValue} label={`Total ${activeTab} Usage`} />
                            </div>
                            {/* Decorative Grid Pattern */}
                            <div className="w-32 h-32 opacity-0 pointer-events-none" />
                        </div>

                        {/* Chart Area */}
                        <div className="absolute inset-0 pt-20">
                            <HistoryChart
                                data={history}
                                dataKey={activeTab}
                                color={getActiveColor()}
                            />
                        </div>

                        {/* Bottom fade for smooth blend */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A0A]/80 to-transparent pointer-events-none" />
                    </motion.div>

                    {/* Dashboard Grid - Refined Spacing */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* Quick Actions - Spans 8 cols */}
                        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                onClick={() => navigate("/utilities")}
                            />
                            <QuickAction
                                title="Update Drivers"
                                desc="Check for updates"
                                icon={Download}
                                color="bg-emerald-500"
                                onClick={() => {/* Future implementation */ }}
                            />
                        </div>

                        {/* Update/Status Card - Spans 4 cols */}
                        <motion.div
                            variants={itemVariants}
                            className="lg:col-span-4 relative overflow-hidden group cursor-pointer rounded-2xl bg-vie-card/50 backdrop-blur-lg border border-vie-primary/20 hover:border-vie-primary/40 transition-all duration-500"
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] bg-no-repeat animate-[shine_3s_infinite] opacity-0 group-hover:opacity-10 transition-opacity" />

                            <div className="relative z-10 h-full flex flex-col p-6 justify-between min-h-[180px]">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 rounded-xl bg-vie-primary/10 text-vie-primary ring-1 ring-vie-primary/20">
                                        <RotateCw size={24} className={sysInfo ? "" : "animate-spin"} />
                                    </div>
                                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                                        Stable
                                    </span>
                                </div>

                                <div className="mt-6">
                                    <h3 className="text-lg font-medium text-white group-hover:text-vie-primary transition-colors">VieXF Status</h3>
                                    <p className="text-white/70 text-sm mt-1 mb-4">System is running optimally. No critical updates required.</p>

                                    <Button className="w-full bg-white/5 hover:bg-vie-primary/20 hover:text-vie-primary border border-white/10 text-sm font-medium transition-all">
                                        Check for Updates
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </RootDiv>
    )
}
=======
  const activeValue = activeTab === "cpu" ? current.cpu : activeTab === "ram" ? current.ram : current.gpu

  return (
    <RootDiv style={{}}>
      <div className="relative min-h-full">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
          <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.06)_50%)] bg-[length:100%_3px]" />
        </div>

        <motion.div
          variants={pageContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative max-w-7xl mx-auto px-6 py-6 lg:py-10 flex flex-col gap-8"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div variants={itemVariants} className="relative w-full md:w-auto flex-1 max-w-2xl">
              <div className="relative z-10">
                <h1 className="text-4xl lg:text-5xl font-extralight text-white tracking-tight leading-tight">
                  {t("home.welcome")}, <br />
                  <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-cyan-500">{userName}</span>
                </h1>
                <div className="mt-4 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-vie-card border border-cyan-400/20">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.55)]" />
                  <span className="text-xs font-medium text-white/70 tracking-wide">
                    {sysInfo ? sysInfo.cpu_model : "System Monitor Active"}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex bg-vie-card rounded-2xl p-1.5 border border-cyan-400/10 self-start md:self-end shadow-inner">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                      ${isActive ? "text-white" : "text-vie-text-muted hover:text-white hover:bg-white/5"}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 bg-cyan-400/15 rounded-xl shadow-sm border border-cyan-300/20"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <tab.icon size={18} className={isActive ? "text-cyan-200" : ""} />
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </motion.div>
          </div>

          <motion.div
            variants={itemVariants}
            className="relative h-[400px] w-full flex flex-col rounded-[2rem] bg-vie-card/55 border border-cyan-400/15 shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden backdrop-blur-lg"
          >
            <div className="absolute top-0 left-0 w-full p-8 z-20 flex justify-between items-start pointer-events-none">
              <div className="flex flex-col gap-1">
                <AnimatedCounter value={activeValue} label={`Total ${activeTab} Usage`} />
              </div>
              <div className="w-32 h-32 opacity-0 pointer-events-none" />
            </div>

            <div className="absolute inset-0 pt-20">
              <HistoryChart data={history} dataKey={activeTab} color={TAB_COLORS[activeTab]} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#05070d]/85 to-transparent pointer-events-none" />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuickAction title="Clean System" desc="Free up drive space" icon={Eraser} color="bg-orange-500" onClick={() => navigate("/clean")} />
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
                onClick={() => navigate("/utilities")}
              />
              <QuickAction title="Update Drivers" desc="Check for updates" icon={Download} color="bg-emerald-500" onClick={() => {}} />
            </div>

            <motion.div
              variants={itemVariants}
              className="lg:col-span-4 relative overflow-hidden group cursor-pointer rounded-2xl bg-vie-card/55 backdrop-blur-lg border border-cyan-400/20 hover:border-cyan-300/35 transition-colors"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/8 via-transparent to-transparent opacity-70" />

              <div className="relative z-10 h-full flex flex-col p-6 justify-between min-h-[180px]">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/30">
                    <RotateCw size={24} className={sysInfo ? "" : "animate-spin"} />
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                    Stable
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-white group-hover:text-cyan-200 transition-colors">VieXF Status</h3>
                  <p className="text-white/70 text-sm mt-1 mb-4">System is running optimally. No critical updates required.</p>

                  <Button className="w-full bg-white/5 hover:bg-cyan-400/20 hover:text-cyan-100 border border-cyan-300/20 text-sm font-medium transition-colors">
                    Check for Updates
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </RootDiv>
  )
}

>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)
