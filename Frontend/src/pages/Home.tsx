import React, { useEffect, memo, useRef } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"
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

const TAB_COLORS = {
  cpu: "#22d3ee",
  ram: "#3b82f6",
  gpu: "#10b981",
}

type ActiveTab = (typeof TABS)[number]["id"]

const AnimatedCounter = memo(({ value, label }: { value: number; label: string }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 20 })
  const ref = useRef<HTMLDivElement>(null)

  useMotionValueEvent(spring, "change", (latest) => {
    if (ref.current) {
      ref.current.textContent = `${Math.round(latest)}%`
    }
  })

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

