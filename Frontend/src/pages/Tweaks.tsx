import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import { Zap, Wrench, RefreshCcw, Monitor, Shield, Bookmark, Star, Rocket } from "lucide-react"
import { motion } from "framer-motion"
import { pageContainerVariants, itemVariants } from "@/lib/animations"

interface Tweak {
    id: string
    label: string
    description: string
    category: "performance" | "network" | "privacy" | "ui" | "remember"
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

    const loadTweaks = async () => {
        try {
            setLoading(true)
            const [allTweaks, active] = await Promise.all([
                invoke({ channel: "tweaks:fetch", payload: null }),
                invoke({ channel: "tweak:active", payload: null }),
            ])

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

    const toggleTweak = async (id: string) => {
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
    }

    const categories: { id: string, labelKey: string, icon: any }[] = [
        { id: "remember", labelKey: "Remember", icon: Star },
        { id: "performance", labelKey: "tweaks.performance", icon: Zap },
        { id: "network", labelKey: "tweaks.network", icon: RefreshCcw },
        { id: "privacy", labelKey: "tweaks.privacy", icon: Shield },
        { id: "ui", labelKey: "tweaks.interface", icon: Monitor },
    ]

    const getTweaksByCategory = (cat: string) => tweaks.filter(t => t.category === cat)

    const getLocalized = (content: any, lang: string) => {
        if (typeof content === "object" && content !== null) {
            return content[lang] || content["en"] || content["vi"] || ""
        }
        return content
    }

    // Special handling for VieX 1.0.2 button state
    const isVieXActive = activeTweaks.includes("vie-amx")
    const isVieXProcessing = processing === "vie-amx"

    return (
        <RootDiv style={{}}>
            <div className="relative h-full">
                <div className="pointer-events-none absolute inset-0">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5 }}
                        className="absolute top-24 left-6 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
                    />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="absolute bottom-10 right-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl"
                    />
                </div>

                <motion.div
                    variants={pageContainerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative max-w-6xl mx-auto px-6 py-8 space-y-8"
                >

                    {/* Header with VieXF 1.0.2 Button */}
                    <motion.div variants={itemVariants} className="flex items-center justify-between">
                        <div className="rounded-2xl bg-vie-card/50 ring-1 ring-white/10 px-5 py-4 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                            <h1 className="text-3xl font-light text-white">{t("tweaks.title")}</h1>
                            <p className="text-white/70 text-sm mt-1">{t("tweaks.subtitle")}</p>
                        </div>
                    </motion.div>

                    {/* Hero Button for VieXF 1.0.2 */}
                    <motion.div variants={itemVariants} className="relative overflow-hidden group rounded-2xl bg-white/5 ring-1 ring-cyan-400/20 hover:ring-cyan-300/40 transition-all p-1 backdrop-blur-lg shadow-[0_12px_50px_rgba(0,0,0,0.4)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-transparent to-fuchsia-500/10 opacity-100" />
                        <div className="relative flex items-center justify-between p-6 bg-white/5 backdrop-blur-lg rounded-xl">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
                                    <Rocket size={32} className="text-white fill-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-medium text-white mb-1">VieXF 1.0.2</h2>
                                    <p className="text-white/80 text-sm max-w-xl">
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
                                        ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                        : "bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-500/20"
                                    }
                            `}
                            >
                                {isVieXProcessing ? (
                                    <RefreshCcw size={20} className="animate-spin mr-2" />
                                ) : isVieXActive ? (
                                    i18n.language === 'vi' ? "Hoàn tác" : "Revert"
                                ) : (
                                    i18n.language === 'vi' ? "Áp dụng" : "Apply"
                                )}
                            </Button>
                        </div>
                    </motion.div>

                    {/* Categories */}
                    {categories.map(cat => {
                        const catTweaks = getTweaksByCategory(cat.id)
                        if (catTweaks.length === 0) return null

                        const Icon = cat.icon
                        const isRemember = cat.id === "remember"

                        return (
                            <motion.div variants={itemVariants} key={cat.id} className="space-y-4">
                                <div className={`flex items-center gap-2 border-b pb-2 ${isRemember ? "text-yellow-400 border-yellow-500/30" : "text-white/80 border-vie-border"}`}>
                                    <Icon size={18} className={isRemember ? "text-yellow-400 fill-yellow-400" : "text-vie-primary"} />
                                    <h2 className="text-lg font-medium capitalize">
                                        {cat.labelKey === "Remember" ? "Remember" : t(cat.labelKey)}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {catTweaks.map(tweak => (
                                        <div key={tweak.id} className={`
                                        p-4 flex flex-col justify-between gap-4 h-full rounded-xl transition-all cursor-pointer bg-vie-card/50 backdrop-blur-lg border border-white/5 hover:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]
                                        ${tweak.id === 'vie-amx'
                                                ? "ring-1 ring-cyan-400/30 hover:ring-cyan-300/50"
                                                : "hover:bg-white/5"
                                            }
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
                                                <p className="text-xs text-white/70 leading-relaxed line-clamp-3">
                                                    {getLocalized(tweak.description, i18n.language)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )
                    })}

                    {!loading && tweaks.length === 0 && (
                        <motion.div variants={itemVariants} className="text-center py-20 text-vie-text-dim">
                            <Wrench size={48} className="mx-auto mb-4 opacity-20" />
                            <p>{t("tweaks.no_tweaks")}</p>
                        </motion.div>
                    )}

                </motion.div>
            </div>
        </RootDiv>
    )
}