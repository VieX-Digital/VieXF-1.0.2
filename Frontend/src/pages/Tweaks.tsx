import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import { Zap, Wrench, RefreshCcw, Monitor, Shield, Bookmark, Star, Rocket } from "lucide-react"
import { motion } from "framer-motion"

interface Tweak {
    id: string
    label: string
    description: string
    category: "performance" | "network" | "privacy" | "ui" | "remember"
}

const LOCAL_TWEAKS_KEY = "vie:tweak-states"
const LOCAL_TWEAK_HISTORY_KEY = "vie:tweak-history"

const gridVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.05
        }
    }
}

const cardVariants = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
    }
}

export default function Tweaks() {
    const { t, i18n } = useTranslation()
    const [tweaks, setTweaks] = useState<Tweak[]>([])
    const [activeTweaks, setActiveTweaks] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const inFlightRef = useRef<Set<string>>(new Set())
    const mountedRef = useRef(true)

    useEffect(() => {
        let mounted = true
        mountedRef.current = true
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
            if (mounted) loadTweaks()
        })
        return () => {
            mounted = false
            mountedRef.current = false
            cancelIdle(idleId)
        }
    }, [])

    const normalizeCategory = (cat: string | string[] | undefined): "performance" | "network" | "privacy" | "ui" | "remember" => {
        if (!cat) return "performance"
        const cats = Array.isArray(cat) ? cat : [cat]
        const lowerCats = cats.map(c => c.toString().toLowerCase())

        if (lowerCats.some(c => c.includes("remember"))) return "remember"
        if (lowerCats.some(c => c.includes("network") || c.includes("wifi") || c.includes("internet"))) return "network"
        if (lowerCats.some(c => c.includes("privacy") || c.includes("security") || c.includes("telemetry") || c.includes("defender"))) return "privacy"
        if (lowerCats.some(c => c.includes("ui") || c.includes("appearance") || c.includes("general") || c.includes("context"))) return "ui"

        return "performance"
    }

    const readLocalActiveTweaks = () => {
        try {
            const raw = localStorage.getItem(LOCAL_TWEAKS_KEY)
            const parsed = raw ? JSON.parse(raw) : []
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }

    const writeLocalActiveTweaks = (list: string[]) => {
        try {
            localStorage.setItem(LOCAL_TWEAKS_KEY, JSON.stringify(list))
        } catch {
            // ignore storage errors
        }
    }

    const pushLocalHistory = (id: string, action: "apply" | "unapply") => {
        try {
            const raw = localStorage.getItem(LOCAL_TWEAK_HISTORY_KEY)
            const parsed = raw ? JSON.parse(raw) : []
            const history = Array.isArray(parsed) ? parsed : []
            history.unshift({ id, action, timestamp: Date.now() })
            if (history.length > 200) history.length = 200
            localStorage.setItem(LOCAL_TWEAK_HISTORY_KEY, JSON.stringify(history))
        } catch {
            // ignore storage errors
        }
    }

    const loadTweaks = async () => {
        try {
            setLoading(true)
            const [allTweaksResult, activeResult] = await Promise.allSettled([
                invoke({ channel: "tweaks:fetch", payload: null }),
                invoke({ channel: "tweak:active", payload: null }),
            ])

            const allTweaks = allTweaksResult.status === "fulfilled" ? allTweaksResult.value : []
            const active = activeResult.status === "fulfilled" ? activeResult.value : readLocalActiveTweaks()

            // Normalize categories
            const normalized = (allTweaks as any[]).map(t => ({
                ...t,
                label: t.title || t.name, // Fallback if title missing
                category: normalizeCategory(t.category)
            }))

            if (!mountedRef.current) return
            setTweaks(normalized as Tweak[])
            setActiveTweaks(Array.isArray(active) ? active as string[] : [])
        } catch (err) {
            log.error("Failed to load tweaks", err)
        } finally {
            if (mountedRef.current) setLoading(false)
        }
    }

    useEffect(() => {
        writeLocalActiveTweaks(activeTweaks)
    }, [activeTweaks])

    const toggleTweak = useCallback(async (id: string) => {
        if (processing || inFlightRef.current.has(id)) return
        const isActive = activeTweaks.includes(id)
        inFlightRef.current.add(id)
        setProcessing(id)

        if (isActive) {
            setActiveTweaks(prev => prev.filter(t => t !== id))
        } else {
            setActiveTweaks(prev => [...prev, id])
        }

        try {
            await invoke({
                channel: "tweak:toggle",
                payload: { id, state: !isActive }
            })
            toast.success(isActive ? t("tweaks.disabled") : t("tweaks.enabled"), { autoClose: 1000 })
            pushLocalHistory(id, isActive ? "unapply" : "apply")
        } catch (err) {
            if (isActive) {
                setActiveTweaks(prev => [...prev, id])
            } else {
                setActiveTweaks(prev => prev.filter(t => t !== id))
            }
            toast.error(t("tweaks.failed"))
        } finally {
            inFlightRef.current.delete(id)
            setProcessing(null)
        }
    }, [activeTweaks, processing, t])

    const categories: { id: string, labelKey: string, icon: any }[] = [
        { id: "remember", labelKey: "Remember", icon: Star },
        { id: "performance", labelKey: "tweaks.performance", icon: Zap },
        { id: "network", labelKey: "tweaks.network", icon: RefreshCcw },
        { id: "privacy", labelKey: "tweaks.privacy", icon: Shield },
        { id: "ui", labelKey: "tweaks.interface", icon: Monitor },
    ]

    const tweaksByCategory = useMemo(() => {
        const grouped: Record<string, Tweak[]> = {
            remember: [],
            performance: [],
            network: [],
            privacy: [],
            ui: [],
        }
        for (const tweak of tweaks) {
            grouped[tweak.category]?.push(tweak)
        }
        return grouped
    }, [tweaks])

    const getLocalized = (content: any, lang: string) => {
        if (typeof content === "object" && content !== null) {
            return content[lang] || content["en"] || content["vi"] || ""
        }
        return content
    }

    // Special handling for VieX 1.0.0 button state
    const isVieXActive = activeTweaks.includes("vie-amx")
    const isVieXProcessing = processing === "vie-amx"

    return (
        <RootDiv style={{}}>
            <div className="relative h-full">
                <div className="relative max-w-6xl mx-auto px-6 py-8 space-y-8 overflow-y-auto custom-scrollbar">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 glass-liquid rounded-3xl p-6 border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-vie-text-dim">Tweaks</p>
                        <h1 className="text-3xl font-light text-white mt-2">{t("tweaks.title")}</h1>
                        <p className="text-vie-text-muted text-sm mt-2 max-w-xl">{t("tweaks.subtitle")}</p>
                    </div>
                    <div className="lg:col-span-4 glass-liquid-strong rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-vie-primary/15 text-vie-primary border border-vie-primary/20">
                                <Bookmark size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-vie-text-dim uppercase tracking-widest">Active</p>
                                <p className="text-sm text-white font-medium">{activeTweaks.length} tweaks enabled</p>
                            </div>
                        </div>
                        <p className="text-xs text-vie-text-dim">Apply only what you understand and can revert.</p>
                    </div>
                </div>

                {/* Hero Button for VieX 1.0.0 */}
                <div className="relative overflow-hidden group rounded-3xl p-1 neon-ring">
                    <div className="relative flex items-center justify-between p-6 rounded-[1.1rem] bg-[#140f1f]/70">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-400 to-amber-300 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
                                <Rocket size={32} className="text-white fill-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-medium text-white mb-1">VieX 1.0.0</h2>
                                <p className="text-vie-text-muted text-sm max-w-xl">
                                    {i18n.language === 'vi'
                                        ? "Tối ưu hóa toàn diện hệ thống chỉ với 1 click. Bao gồm Debloat, Network, Input Lag và hơn thế nữa."
                                        : "Comprehensive system optimization in just 1 click. Includes Debloat, Network, Input Lag and more."
                                    }
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => toggleTweak("vie-amx")}
                            disabled={isVieXProcessing}
                            className={`
                                h-12 px-8 text-base font-medium transition-all duration-300
                                ${isVieXActive
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                                    : "bg-cyan-300 hover:bg-cyan-200 text-black shadow-lg shadow-cyan-500/30"
                                }
                            `}
                        >
                            {isVieXProcessing ? (
                                <RefreshCcw size={20} className="animate-spin mr-2" />
                            ) : isVieXActive ? (
                                i18n.language === 'vi' ? "Hoàn tác" : "Revert"
                            ) : (
                                i18n.language === 'vi' ? "Kích hoạt ngay" : "Activate Now"
                            )}
                        </Button>
                    </div>
                </div>

                {/* Categories */}
                {categories.map(cat => {
                    const catTweaks = tweaksByCategory[cat.id] || []
                    if (catTweaks.length === 0) return null

                    const Icon = cat.icon
                    const isRemember = cat.id === "remember"

                    return (
                        <div key={cat.id} className="space-y-4 glass-liquid rounded-3xl p-6 border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.4)]">
                            <div className={`flex items-center gap-2 border-b pb-3 ${isRemember ? "text-yellow-400 border-yellow-500/30" : "text-white/80 border-vie-border"}`}>
                                <Icon size={18} className={isRemember ? "text-yellow-400 fill-yellow-400" : "text-vie-primary"} />
                                <h2 className="text-lg font-medium capitalize">
                                    {cat.labelKey === "Remember" ? "Remember" : t(cat.labelKey)}
                                </h2>
                            </div>

                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                variants={gridVariants}
                                initial="hidden"
                                animate="show"
                            >
                                {catTweaks.map(tweak => (
                                    <motion.div key={tweak.id} variants={cardVariants}>
                                        <div className={`
                                            p-4 flex flex-col justify-between gap-4 h-full rounded-2xl transition-all cursor-pointer
                                            ${tweak.id === 'vie-amx'
                                                ? "glass-liquid-strong bg-white/[0.04] border-white/10 ring-1 ring-fuchsia-400/30 hover:ring-fuchsia-300/50"
                                                : "glass-liquid-soft bg-white/[0.03] border-white/5 hover:ring-white/15"
                                            }
                                            shadow-[0_8px_30px_rgba(0,0,0,0.3)]
                                        `}>
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className={`text-sm font-medium leading-tight ${tweak.id === 'vie-amx' ? "text-cyan-400" : "text-white"}`}>
                                                        {getLocalized(tweak.label, i18n.language)}
                                                    </h3>
                                                    <Toggle
                                                        checked={activeTweaks.includes(tweak.id)}
                                                        onChange={() => toggleTweak(tweak.id)}
                                                        disabled={!!processing}
                                                    />
                                                </div>
                                                <p className="text-xs text-vie-text-muted leading-relaxed line-clamp-3">
                                                    {getLocalized(tweak.description, i18n.language)}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    )
                })}

                {!loading && tweaks.length === 0 && (
                    <div className="text-center py-20 text-vie-text-dim">
                        <Wrench size={48} className="mx-auto mb-4 opacity-20" />
                        <p>{t("tweaks.no_tweaks")}</p>
                    </div>
                )}

                </div>
            </div>
        </RootDiv>
    )
}
