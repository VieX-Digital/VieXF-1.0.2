import { memo, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import { Trash2, Sparkles, AlertTriangle, Play, ShieldCheck } from "lucide-react"
import { motion } from "framer-motion"

interface CleanupItem {
    id: string
    labelKey: string
    dangerous?: boolean
    script: string
}

const cleanupsData: CleanupItem[] = [
    {
        id: "temp", labelKey: "clean.temp",
        script: ""
    },
    {
        id: "prefetch", labelKey: "clean.prefetch",
        script: ""
    },
    {
        id: "update", labelKey: "clean.update",
        script: ""
    },
    {
        id: "recycle", labelKey: "clean.recycle",
        script: "",
        dangerous: true
    },
]

const CleanupCard = memo(({
    item,
    selected,
    onToggle,
    label,
    warningLabel
}: {
    item: CleanupItem
    selected: boolean
    onToggle: (id: string) => void
    label: string
    warningLabel: string
}) => {
    return (
        <button
            type="button"
            onClick={() => onToggle(item.id)}
            className={`
                group relative w-full text-left p-4 flex items-center justify-between rounded-2xl transition-all
                glass-liquid-soft border border-white/10 shadow-[0_10px_36px_rgba(0,0,0,0.35)]
                ${item.dangerous ? "border-vie-danger/30 hover:border-vie-danger/50" : "hover:border-vie-border-hover"}
                ${selected ? "ring-1 ring-vie-primary/30 bg-white/5" : ""}
            `}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/5 via-transparent to-white/10 rounded-2xl" />
            <div className="relative flex items-center gap-4">
                <div className={`p-3 rounded-xl ${item.dangerous ? "bg-vie-danger/10 text-vie-danger border border-vie-danger/20" : "bg-vie-primary/10 text-vie-primary border border-vie-primary/20"}`}>
                    {item.dangerous ? <AlertTriangle size={20} /> : <Trash2 size={20} />}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{label}</h3>
                        {item.dangerous && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-vie-danger/20 text-vie-danger uppercase font-bold tracking-wider">
                                {warningLabel}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative">
                <Toggle checked={selected} readOnly />
            </div>
        </button>
    )
})

const listVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.05
        }
    }
}

const rowVariants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
    }
}

export default function Clean() {
    const { t } = useTranslation()
    const [selected, setSelected] = useState<string[]>([])
    const [cleaning, setCleaning] = useState(false)

    const toggleSelect = useCallback((id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }, [])

    const runCleanup = useCallback(async () => {
        if (selected.length === 0) return
        setCleaning(true)

        try {
            await invoke({ channel: "clean:run", payload: selected })
            toast.success(t("clean.success"))
            setSelected([])
        } catch (err) {
            toast.error(t("clean.failed"))
            console.error(err)
        } finally {
            setCleaning(false)
        }
    }, [selected, t])

    const selectedCount = selected.length

    return (
        <RootDiv style={{}}>
            <div className="relative h-full">
                <div className="relative max-w-6xl mx-auto px-6 py-8 h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 glass-liquid rounded-3xl p-6 border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-vie-text-dim">Cleanup</p>
                            <h1 className="text-3xl font-light text-white mt-2">{t("clean.title")}</h1>
                            <p className="text-vie-text-muted text-sm mt-2 max-w-xl">{t("clean.subtitle")}</p>
                            <div className="mt-4 flex items-center gap-3 text-xs text-vie-text-muted">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {selectedCount} items selected
                            </div>
                        </div>
                        <div className="lg:col-span-4 glass-liquid-strong rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-emerald-400/15 text-emerald-300 border border-emerald-400/20">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-vie-text-dim uppercase tracking-widest">Quick Run</p>
                                    <p className="text-sm text-white font-medium">Smart cleanup</p>
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                onClick={runCleanup}
                                disabled={selectedCount === 0 || cleaning}
                                className="gap-2 px-6 justify-center"
                            >
                                {cleaning ? <Sparkles className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
                                {cleaning ? t("clean.cleaning") : t("clean.start")}
                            </Button>
                            <p className="text-xs text-vie-text-dim">Removes temporary files and unused caches.</p>
                        </div>
                    </div>

                    <motion.div
                        className="space-y-3"
                        variants={listVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {cleanupsData.map(item => (
                            <motion.div key={item.id} variants={rowVariants}>
                                <CleanupCard
                                    item={item}
                                    label={t(item.labelKey)}
                                    warningLabel={t("clean.warning")}
                                    selected={selected.includes(item.id)}
                                    onToggle={toggleSelect}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </RootDiv>
    )
}
