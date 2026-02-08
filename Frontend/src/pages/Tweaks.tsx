import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import { Zap, Wrench, RefreshCcw, Monitor, Shield, Star, Rocket } from "lucide-react"
import { motion } from "framer-motion"
import { Virtuoso } from "react-virtuoso"
import { pageContainerVariants, itemVariants } from "@/lib/animations"

interface Tweak {
  id: string
  label: string
  description: string
  category: "performance" | "network" | "privacy" | "ui" | "remember"
}

type CategoryId = "remember" | "performance" | "network" | "privacy" | "ui"

type ToggleResult = {
  id: string
  success: boolean
  state: boolean
  changed: boolean
  message?: string
  error?: string
}

const TOGGLE_THROTTLE_MS = 350
const BATCH_WINDOW_MS = 120
const VIRTUALIZE_THRESHOLD = 50

const categories: { id: CategoryId; labelKey: string; icon: any }[] = [
  { id: "remember", labelKey: "Remember", icon: Star },
  { id: "performance", labelKey: "tweaks.performance", icon: Zap },
  { id: "network", labelKey: "tweaks.network", icon: RefreshCcw },
  { id: "privacy", labelKey: "tweaks.privacy", icon: Shield },
  { id: "ui", labelKey: "tweaks.interface", icon: Monitor },
]

const TweakCard = memo(
  ({
    tweak,
    isActive,
    isProcessing,
    onToggle,
    getLocalized,
    language,
  }: {
    tweak: Tweak
    isActive: boolean
    isProcessing: boolean
    onToggle: (id: string, state?: boolean) => void
    getLocalized: (content: any, lang: string) => string
    language: string
  }) => {
    return (
      <div
        className={`
          p-4 flex flex-col justify-between gap-4 h-full rounded-xl transition-colors cursor-pointer
          bg-vie-card/55 backdrop-blur-lg border border-cyan-400/10 hover:border-cyan-300/25
          shadow-[0_8px_24px_rgba(0,0,0,0.3)]
          ${tweak.id === "vie-amx" ? "ring-1 ring-cyan-400/35" : "hover:bg-white/5"}
        `}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-sm font-medium leading-tight ${tweak.id === "vie-amx" ? "text-cyan-300" : "text-white"}`}>
              {getLocalized(tweak.label, language)}
            </h3>
            <Toggle checked={isActive} onChange={() => onToggle(tweak.id)} disabled={isProcessing} />
          </div>
          <p className="text-xs text-white/70 leading-relaxed line-clamp-3">{getLocalized(tweak.description, language)}</p>
        </div>
      </div>
    )
  }
)

export default function Tweaks() {
  const { t, i18n } = useTranslation()
  const [tweaks, setTweaks] = useState<Tweak[]>([])
  const [activeTweaks, setActiveTweaks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const mountedRef = useRef(true)
  const inFlightRef = useRef<Set<string>>(new Set())
  const pendingStateRef = useRef<Map<string, boolean>>(new Map())
  const throttleUntilRef = useRef<Map<string, number>>(new Map())
  const confirmedActiveRef = useRef<Set<string>>(new Set())
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushQueueRef = useRef<() => void>(() => undefined)

  const normalizeCategory = (cat: string | string[] | undefined): CategoryId => {
    if (!cat) return "performance"

    const cats = Array.isArray(cat) ? cat : [cat]
    const lowerCats = cats.map((c) => c.toString().toLowerCase())

    if (lowerCats.some((c) => c.includes("remember"))) return "remember"
    if (lowerCats.some((c) => c.includes("network") || c.includes("wifi") || c.includes("internet"))) return "network"
    if (lowerCats.some((c) => c.includes("privacy") || c.includes("security") || c.includes("telemetry") || c.includes("defender"))) {
      return "privacy"
    }
    if (lowerCats.some((c) => c.includes("ui") || c.includes("appearance") || c.includes("general") || c.includes("context"))) {
      return "ui"
    }

    return "performance"
  }

  const getLocalized = useCallback((content: any, lang: string) => {
    if (typeof content === "object" && content !== null) {
      return content[lang] || content.en || content.vi || ""
    }
    return String(content || "")
  }, [])

  const groupedTweaks = useMemo(() => {
    const grouped = new Map<CategoryId, Tweak[]>()

    for (const category of categories) {
      grouped.set(category.id, [])
    }

    for (const tweak of tweaks) {
      const bucket = grouped.get(tweak.category) || []
      bucket.push(tweak)
      grouped.set(tweak.category, bucket)
    }

    return grouped
  }, [tweaks])

  const scheduleFlush = useCallback((delayMs: number = BATCH_WINDOW_MS) => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
    }

    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      flushQueueRef.current()
    }, Math.max(0, delayMs))
  }, [])

  const flushQueue = useCallback(async () => {
    if (!mountedRef.current) return

    const now = Date.now()
    const readyChanges: Array<{ id: string; state: boolean }> = []
    let nextDelay = Number.POSITIVE_INFINITY

    for (const [id, state] of pendingStateRef.current.entries()) {
      if (inFlightRef.current.has(id)) continue

      const throttleUntil = throttleUntilRef.current.get(id) || 0
      if (throttleUntil <= now) {
        readyChanges.push({ id, state })
      } else {
        nextDelay = Math.min(nextDelay, throttleUntil - now)
      }
    }

    if (readyChanges.length === 0) {
      if (nextDelay !== Number.POSITIVE_INFINITY) {
        scheduleFlush(nextDelay)
      }
      return
    }

    for (const change of readyChanges) {
      pendingStateRef.current.delete(change.id)
      inFlightRef.current.add(change.id)
      throttleUntilRef.current.set(change.id, now + TOGGLE_THROTTLE_MS)
    }

    setProcessingIds((prev) => {
      const next = new Set(prev)
      for (const change of readyChanges) {
        next.add(change.id)
      }
      return next
    })

    try {
      let results: ToggleResult[] = []

      if (readyChanges.length > 1) {
        const batchRes = await invoke({
          channel: "tweak:set-batch",
          payload: { changes: readyChanges },
        })
        results = Array.isArray(batchRes?.results) ? batchRes.results : []
      } else {
        const singleRes = await invoke({
          channel: "tweak:set",
          payload: readyChanges[0],
        })
        results = singleRes ? [singleRes] : []
      }

      const nextConfirmed = new Set(confirmedActiveRef.current)
      const failed = results.filter((result) => !result?.success)

      for (const result of results) {
        if (!result?.id || !result.success) continue
        if (result.state) {
          nextConfirmed.add(result.id)
        } else {
          nextConfirmed.delete(result.id)
        }
      }

      confirmedActiveRef.current = nextConfirmed
      setActiveTweaks(new Set(nextConfirmed))

      if (failed.length > 0) {
        toast.error(failed[0].error || t("tweaks.failed"))
      } else if (results.length === 1) {
        const only = results[0]
        if (only?.changed) {
          toast.success(only.state ? t("tweaks.enabled") : t("tweaks.disabled"), { autoClose: 1000 })
        } else if (only?.message) {
          toast.info(only.message, { autoClose: 1200 })
        }
      }
    } catch (error) {
      log.error("Failed to flush tweak queue", error)
      setActiveTweaks(new Set(confirmedActiveRef.current))
      toast.error(t("tweaks.failed"))
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        for (const change of readyChanges) {
          next.delete(change.id)
          inFlightRef.current.delete(change.id)
        }
        return next
      })

      if (pendingStateRef.current.size > 0) {
        scheduleFlush(0)
      }
    }
  }, [scheduleFlush, t])

  flushQueueRef.current = () => {
    void flushQueue()
  }

  const queueToggle = useCallback(
    (id: string, explicitState?: boolean) => {
      const queuedState = pendingStateRef.current.has(id) ? pendingStateRef.current.get(id) : activeTweaks.has(id)
      const targetState = typeof explicitState === "boolean" ? explicitState : !queuedState
      pendingStateRef.current.set(id, targetState)

      setActiveTweaks((prev) => {
        const next = new Set(prev)
        if (targetState) {
          next.add(id)
        } else {
          next.delete(id)
        }
        return next
      })

      scheduleFlush(BATCH_WINDOW_MS)
    },
    [activeTweaks, scheduleFlush]
  )

  const loadTweaks = useCallback(async () => {
    try {
      setLoading(true)
      const [allTweaks, active] = await Promise.all([
        invoke({ channel: "tweaks:fetch", payload: null }),
        invoke({ channel: "tweak:active", payload: null }),
      ])

      const normalized = (allTweaks as any[]).map((tweak) => ({
        ...tweak,
        label: tweak.title || tweak.name,
        category: normalizeCategory(tweak.category),
      }))

      if (!mountedRef.current) return

      const activeSet = new Set(Array.isArray(active) ? (active as string[]) : [])
      setTweaks(normalized as Tweak[])
      confirmedActiveRef.current = activeSet
      setActiveTweaks(new Set(activeSet))
    } catch (error) {
      log.error("Failed to load tweaks", error)
      toast.error(t("tweaks.failed"))
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [t])

  useEffect(() => {
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
      if (mountedRef.current) {
        void loadTweaks()
      }
    })

    return () => {
      mountedRef.current = false
      cancelIdle(idleId)

      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
    }
  }, [loadTweaks])

  const isVieXActive = activeTweaks.has("vie-amx")
  const isVieXProcessing = processingIds.has("vie-amx")

  return (
    <RootDiv style={{}}>
      <div className="relative h-full">
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="absolute top-24 left-6 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.25 }}
            className="absolute bottom-10 right-1/3 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
          />
        </div>

        <motion.div
          variants={pageContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative max-w-6xl mx-auto px-6 py-8 space-y-8"
        >
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div className="rounded-2xl bg-vie-card/55 ring-1 ring-cyan-400/15 px-5 py-4 backdrop-blur-lg shadow-[0_10px_32px_rgba(0,0,0,0.35)]">
              <h1 className="text-3xl font-light text-white">{t("tweaks.title")}</h1>
              <p className="text-white/70 text-sm mt-1">{t("tweaks.subtitle")}</p>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden group rounded-2xl bg-white/5 ring-1 ring-cyan-400/20 hover:ring-cyan-300/35 transition-colors p-1 backdrop-blur-lg shadow-[0_12px_42px_rgba(0,0,0,0.4)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-transparent to-emerald-400/10 opacity-100" />
            <div className="relative flex items-center justify-between p-6 bg-white/5 backdrop-blur-lg rounded-xl gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
                  <Rocket size={32} className="text-white fill-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-medium text-white mb-1">VieXF 1.0.2</h2>
                  <p className="text-white/80 text-sm max-w-xl">
                    {i18n.language === "vi"
                      ? "Tối ưu hóa chỉ bằng 1 click. Bao gồm Debloat, Network, Input Lag và hơn thế nữa."
                      : "Comprehensive system optimization in just 1 click. Includes Debloat, Network, Input Lag and more."}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => queueToggle("vie-amx", !isVieXActive)}
                disabled={isVieXProcessing}
                className={`
                  h-12 px-8 text-base font-medium transition-colors
                  ${isVieXActive
                    ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                    : "bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-500/20"
                  }
                `}
              >
                {isVieXProcessing ? (
                  <RefreshCcw size={20} className="animate-spin mr-2" />
                ) : isVieXActive ? (
                  i18n.language === "vi" ? "Hoàn tác" : "Revert"
                ) : i18n.language === "vi" ? (
                  "Áp d?ng"
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          </motion.div>

          {categories.map((cat) => {
            const catTweaks = groupedTweaks.get(cat.id) || []
            if (catTweaks.length === 0) return null

            const Icon = cat.icon
            const isRemember = cat.id === "remember"

            return (
              <motion.div variants={itemVariants} key={cat.id} className="space-y-4">
                <div className={`flex items-center gap-2 border-b pb-2 ${isRemember ? "text-yellow-400 border-yellow-500/30" : "text-white/80 border-cyan-400/20"}`}>
                  <Icon size={18} className={isRemember ? "text-yellow-400 fill-yellow-400" : "text-cyan-300"} />
                  <h2 className="text-lg font-medium capitalize">{cat.labelKey === "Remember" ? "Remember" : t(cat.labelKey)}</h2>
                </div>

                {catTweaks.length > VIRTUALIZE_THRESHOLD ? (
                  <Virtuoso
                    style={{ height: Math.min(640, catTweaks.length * 118) }}
                    totalCount={catTweaks.length}
                    itemContent={(index) => {
                      const tweak = catTweaks[index]
                      return (
                        <div className="pb-4">
                          <TweakCard
                            tweak={tweak}
                            isActive={activeTweaks.has(tweak.id)}
                            isProcessing={processingIds.has(tweak.id)}
                            onToggle={queueToggle}
                            getLocalized={getLocalized}
                            language={i18n.language}
                          />
                        </div>
                      )
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catTweaks.map((tweak) => (
                      <TweakCard
                        key={tweak.id}
                        tweak={tweak}
                        isActive={activeTweaks.has(tweak.id)}
                        isProcessing={processingIds.has(tweak.id)}
                        onToggle={queueToggle}
                        getLocalized={getLocalized}
                        language={i18n.language}
                      />
                    ))}
                  </div>
                )}
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

