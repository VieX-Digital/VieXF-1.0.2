import { memo, useCallback, useMemo, useState } from "react"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import { PackageX, CheckCircle2, RefreshCw, Sparkles } from "lucide-react"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"

// Static list of bloatware IDs to iterate
const bloatwareApps = [
    "cortana",
    "edge",
    "onedrive",
    "xbox",
    "maps",
    "weather",
    "news",
    "telemetry",
]

const AppCard = memo(({
    appId,
    description,
    selected,
    onToggle
}: {
    appId: string
    description: string
    selected: boolean
    onToggle: (id: string) => void
}) => {
    return (
        <button
            type="button"
            onClick={() => onToggle(appId)}
            aria-pressed={selected}
            className={`
                group relative w-full text-left p-4 rounded-2xl transition-all
                glass-liquid-soft border border-white/10 shadow-[0_10px_36px_rgba(0,0,0,0.35)]
                ${selected ? "border-vie-danger/40 bg-vie-danger/5 ring-1 ring-vie-danger/30" : "hover:border-vie-border-hover hover:bg-white/5"}
            `}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/5 via-transparent to-white/5 rounded-2xl" />
            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-white font-medium capitalize">{appId}</h3>
                    <p className="text-xs text-vie-text-muted mt-1">{description}</p>
                </div>
                <div className={`
                    w-6 h-6 rounded-full border flex items-center justify-center transition-colors shrink-0
                    ${selected ? "bg-vie-danger border-vie-danger text-white" : "border-vie-border bg-transparent"}
                `}>
                    {selected && <CheckCircle2 size={12} />}
                </div>
            </div>
        </button>
    )
})

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

export default function Apps() {
    const { t } = useTranslation()
    const [selected, setSelected] = useState<string[]>([])
    const [isRemoving, setIsRemoving] = useState(false)

    const toggleApp = useCallback((id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }, [])

    const handleRemove = useCallback(async () => {
        setIsRemoving(true)
        try {
            await invoke({ channel: "apps:remove", payload: selected })
            toast.success(t("apps.success"))
            setSelected([])
        } catch (err) {
            toast.error(t("apps.failed"))
        } finally {
            setIsRemoving(false)
        }
    }, [selected, t])

    const selectedCount = selected.length
    const appDescriptions = useMemo(() => {
        return Object.fromEntries(bloatwareApps.map(appId => [appId, t(`apps.items.${appId}`)]))
    }, [t])

    return (
        <RootDiv style={{}}>
            <div className="relative h-full">
                <div className="relative max-w-6xl mx-auto px-6 py-8 h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 glass-liquid rounded-3xl p-6 border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.3em] text-vie-text-dim">Bloatware</p>
                                    <h1 className="text-3xl font-light text-white mt-2">{t("apps.title")}</h1>
                                    <p className="text-vie-text-muted text-sm mt-2 max-w-xl">{t("apps.subtitle")}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                    <Sparkles size={20} className="text-vie-primary" />
                                </div>
                            </div>
                            <div className="mt-5 flex items-center gap-3 text-xs text-vie-text-muted">
                                <span className="w-2 h-2 rounded-full bg-vie-primary animate-pulse" />
                                {selectedCount} / {bloatwareApps.length} selected
                            </div>
                        </div>

                        <div className="lg:col-span-4 glass-liquid-strong rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-vie-danger/15 text-vie-danger border border-vie-danger/20">
                                    <PackageX size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-vie-text-dim uppercase tracking-widest">Actions</p>
                                    <p className="text-sm text-white font-medium">Remove selected apps</p>
                                </div>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <Button variant="secondary" onClick={() => setSelected([])} disabled={selectedCount === 0}>
                                    {t("apps.clear")}
                                </Button>
                                <Button
                                    variant="danger"
                                    disabled={selectedCount === 0 || isRemoving}
                                    onClick={handleRemove}
                                    className="gap-2"
                                >
                                    {isRemoving ? <RefreshCw className="animate-spin" size={16} /> : <PackageX size={16} />}
                                    {t("apps.remove")} {selectedCount > 0 ? `(${selectedCount})` : ""}
                                </Button>
                            </div>
                            <p className="text-xs text-vie-text-dim mt-4">
                                Remove bloatware to free disk space and reduce background services.
                            </p>
                        </div>
                    </div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        variants={gridVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {bloatwareApps.map(appId => (
                            <motion.div key={appId} variants={cardVariants}>
                                <AppCard
                                    appId={appId}
                                    description={appDescriptions[appId] || ""}
                                    selected={selected.includes(appId)}
                                    onToggle={toggleApp}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </RootDiv>
    )
}
