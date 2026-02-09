import React, { useEffect, memo } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"
import {
  Cpu,
  Activity,
  Zap,
  Download,
  shieldCheck,
  Eraser,
  Rocket,
  RotateCw,
  Users,
  Crown,
  Ghost,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
  Grid
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { pageContainerVariants, itemVariants } from "@/lib/animations"
import useSystemMetricsStore, { useSystemMetricsSubscription } from "@/store/systemMetrics"

// --- Constants & Config ---

const TABS = [
  { id: "cpu", label: "CPU", icon: Cpu, color: "#22d3ee" },
  { id: "ram", label: "RAM", icon: Activity, color: "#3b82f6" },
  { id: "gpu", label: "GPU", icon: Zap, color: "#10b981" },
] as const

const TAB_COLORS = {
  cpu: "#22d3ee",
  ram: "#3b82f6",
  gpu: "#10b981",
}

type ActiveTab = (typeof TABS)[number]["id"]

// --- Components ---

const AnimatedCounter = memo(({ value, label, subLabel }: { value: number; label: string; subLabel?: string }) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2">
        <div className="text-5xl lg:text-6xl font-display text-white tabular-nums leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          {value}%
        </div>
        {subLabel && <span className="text-sm font-medium text-emerald-400 flex items-center gap-0.5"><ArrowUpRight size={14} /> {subLabel}</span>}
      </div>

      <p className="text-xs text-vie-text-muted font-bold uppercase tracking-widest mt-2 opacity-60 pl-1">{label}</p>
    </div>
  )
})

const HistoryChart = memo(
  ({ data, color, dataKey }: { data: Array<Record<string, any>>; color: string; dataKey: string }) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip content={() => null} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 4" }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fillOpacity={1}
            fill={`url(#gradient-${dataKey})`}
            strokeWidth={3}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  },
  (prev, next) => prev.data === next.data && prev.dataKey === next.dataKey && prev.color === next.color
)

const StatCard = memo(({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendValue,
  colorClass
}: {
  title: string;
  value: string;
  subtext?: string;
  icon: any;
  trend?: "up" | "down";
  trendValue?: string;
  colorClass: string
}) => {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)" }}
      className="relative overflow-hidden rounded-2xl bg-[#09090b]/40 backdrop-blur-xl border border-white/[0.06] p-5 group transition-all duration-300 transform-gpu"
    >
      {/* Glow Effect */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 ${colorClass} group-hover:opacity-30 transition-opacity duration-500`} />

      <div className="relative z-10 flex flex-col justify-between h-full gap-4">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-white/90 shadow-inner`}>
            <Icon size={24} strokeWidth={1.5} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} border border-white/[0.05]`}>
              {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trendValue}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-3xl font-display text-white tracking-tight mb-1">{value}</h3>
          <p className="text-sm text-white/50 font-medium tracking-wide uppercase flex items-center gap-2">
            {title}
            {subtext && <span className="opacity-50 lowercase font-normal normal-case tracking-normal">({subtext})</span>}
          </p>
        </div>
      </div>
    </motion.div>
  )
})

const TweakItem = memo(({
  label,
  value,
  percent,
  color
}: {
  label: string;
  value: string;
  percent: string;
  color: string
}) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.03] transition-colors border-b border-white/[0.02] last:border-0 group cursor-default">
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${color} shadow-[0_0_8px_currentColor]`} />
        <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{label}</span>
      </div>

      <div className="flex items-center gap-6">
        <span className="text-sm font-medium text-white/90">{value}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-md bg-white/[0.04] ${color.replace('bg-', 'text-')} border border-white/[0.05]`}>
          {percent}
        </span>
      </div>
    </div>
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
    }

    void initData()

    return () => {
      mounted = false
    }
  }, [])

  const activeValue = activeTab === "cpu" ? current.cpu : activeTab === "ram" ? current.ram : current.gpu
  // Simulated trend for the chart based on value
  const trendLabel = activeValue > 80 ? "High Load" : activeValue > 50 ? "Moderate" : "Optimal"

  return (
    <RootDiv style={{}}>
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        variants={pageContainerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8 h-full"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-display text-white tracking-tight flex items-center gap-3">
              Dashboard
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                REL 1.0.0
              </span>
            </h1>
            <p className="text-vie-text-muted text-sm mt-1">Welcome back, <span className="text-white font-medium">{userName}</span></p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <button className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors border border-white/[0.05]">
              <Search size={18} />
            </button>
            <button className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors border border-white/[0.05]">
              <Grid size={18} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/20 shadow-[0_0_15px_-5px_rgba(244,63,94,0.4)]">
              <Sparkles size={16} fill="currentColor" />
              <span className="text-sm font-bold">15 TWEAKS</span>
            </button>
          </motion.div>
        </div>

        {/* Top Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Note: Values are static placeholders as requested */}
          <StatCard
            title="Members"
            value="6165"
            icon={Users}
            colorClass="bg-cyan-500"
            trend="up"
            trendValue="+12.5%"
          />
          <StatCard
            title="Lượt tải bản miễn phí"
            value="11,098"
            icon={Ghost}
            colorClass="bg-purple-500"
            trend="down"
            trendValue="-5.2%"
          />
          <StatCard
            title="Lượt tải bản trả phí"
            value="1,721"
            icon={Crown}
            colorClass="bg-emerald-500"
            trend="up"
            trendValue="+39.69%"
          />
        </div>

        {/* Main Content Area - Chart & Tweaks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

          {/* Chart Section */}
          <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col gap-6">
            {/* Tabs */}
            <div className="flex items-center gap-8 px-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative group py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${activeTab === tab.id ? '' : 'bg-white/20 group-hover:bg-white/40'}`} style={{ backgroundColor: activeTab === tab.id ? tab.color : undefined, boxShadow: activeTab === tab.id ? `0 0 8px ${tab.color}` : 'none' }} />
                    <span className={`text-sm font-medium transition-colors duration-300 ${activeTab === tab.id ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                      {tab.label}
                    </span>
                  </div>
                  {activeTab === tab.id && (
                    <motion.div layoutId="tab-indicator" className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: tab.color, boxShadow: `0 0 10px ${tab.color}` }} />
                  )}
                </button>
              ))}
            </div>

            {/* Glass Chart Container */}
            <div className="relative h-[400px] w-full rounded-[2rem] bg-[#09090b]/60 backdrop-filter backdrop-blur-md border border-white/[0.08] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Inner Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

              {/* Floating Info */}
              <div className="absolute top-8 left-8 z-20">
                <AnimatedCounter value={activeValue} label={`${activeTab} Load`} subLabel={trendLabel} />
              </div>

              {/* Chart Area */}
              <div className="absolute inset-x-0 bottom-0 top-0 pt-24 pb-0">
                <HistoryChart data={history} dataKey={activeTab} color={TAB_COLORS[activeTab]} />
              </div>
            </div>
          </motion.div>

          {/* Tweaks / Sysinfo Section */}
          <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col h-full">
            <div className="rounded-[2rem] bg-[#09090b]/60 backdrop-blur-md border border-white/[0.08] p-6 h-full flex flex-col shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />

              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-lg font-medium text-white tracking-tight">Active Optimizations</h3>
                <button
                  onClick={() => navigate('/tweaks')}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider py-1.5 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20"
                >
                  Manage
                </button>
              </div>

              <div className="flex flex-col gap-1 relative z-10 overflow-auto no-scrollbar mask-gradient-b">
                <TweakItem label="System Responsiveness" value="Ultra" percent="+24%" color="bg-rose-500" />
                <TweakItem label="Network Latency" value="Low" percent="-12ms" color="bg-cyan-500" />
                <TweakItem label="Micro-stutter Fix" value="Active" percent="100%" color="bg-amber-500" />
                <TweakItem label="Background Services" value="Optimized" percent="-45%" color="bg-emerald-500" />
                <TweakItem label="VRAM Allocation" value="High Priority" percent="+1.2GB" color="bg-purple-500" />

                <div className="mt-4 pt-4 border-t border-white/[0.05] flex flex-col gap-3">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <h4 className="text-sm font-medium text-white/90 mb-1">Quick Action</h4>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button variant="outline" className="h-9 text-xs border-white/10 hover:bg-white/5 hover:text-white text-white/60" onClick={() => navigate('/clean')}>
                        Clean Temp
                      </Button>
                      <Button variant="outline" className="h-9 text-xs border-white/10 hover:bg-white/5 hover:text-white text-white/60" onClick={() => navigate('/utilities')}>
                        Verify Integrity
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </RootDiv>
  )
}
