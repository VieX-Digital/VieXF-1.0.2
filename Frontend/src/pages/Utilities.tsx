import { memo, useCallback } from "react"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import { toast } from "react-toastify"
import { Terminal, Keyboard, Monitor, Wifi, HardDrive, KeyRound, WandSparkles } from "lucide-react"
import { invoke } from "@/lib/electron"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"

// Mock utilities list
const utilities = [
    { id: "activation", icon: KeyRound },
    { id: "keyboard", icon: Keyboard },
    { id: "display", icon: Monitor },
    { id: "network", icon: Wifi },
    { id: "disk", icon: HardDrive },
    { id: "cmd", icon: Terminal },
]

const UtilityCard = memo(({
    id,
    title,
    desc,
    icon: Icon,
    onRun
}: {
    id: string
    title: string
    desc: string
    icon: any
    onRun: (id: string) => void
}) => {
    return (
        <button
            type="button"
            onClick={() => onRun(id)}
            className="group relative w-full min-h-[170px] p-6 rounded-2xl glass-liquid-soft border border-white/10 flex flex-col items-center text-center gap-3 cursor-pointer hover:bg-white/5 transition-colors shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/5 via-transparent to-white/10 rounded-2xl" />
            <div className="relative p-3 rounded-full bg-vie-card border border-vie-border group-hover:border-vie-primary/50 group-hover:text-vie-primary transition-all">
                <Icon size={24} />
            </div>
            <div className="relative space-y-1">
                <h3 className="text-sm font-medium text-white">{title}</h3>
                <p className="text-[11px] text-vie-text-muted leading-snug">{desc}</p>
            </div>
        </button>
    )
})

const gridVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.07,
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

export default function Utilities() {
    const { t } = useTranslation()

    const runUtility = useCallback(async (id: string) => {
        try {
            await invoke({ channel: "utility:run", payload: id })
        } catch (err) {
            toast.error(t("utilities.failed") + " " + id)
        }
    }, [t])

    return (
        <RootDiv style={{}}>
            <div className="relative h-full">
                <div className="relative max-w-6xl mx-auto px-6 py-8 h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 glass-liquid rounded-3xl p-6 border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-vie-text-dim">Utilities</p>
                            <h1 className="text-3xl font-light text-white mt-2">{t("utilities.title")}</h1>
                            <p className="text-vie-text-muted text-sm mt-2 max-w-xl">{t("utilities.subtitle")}</p>
                        </div>
                        <div className="lg:col-span-4 glass-liquid-strong rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-vie-primary/15 text-vie-primary border border-vie-primary/20">
                                    <WandSparkles size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-vie-text-dim uppercase tracking-widest">Tools</p>
                                    <p className="text-sm text-white font-medium">One-click launches</p>
                                </div>
                            </div>
                            <p className="text-xs text-vie-text-dim">Fast access to system utilities and diagnostics.</p>
                        </div>
                    </div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                        variants={gridVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {utilities.map(tool => (
                            <motion.div key={tool.id} variants={cardVariants}>
                                <UtilityCard
                                    id={tool.id}
                                    icon={tool.icon}
                                    title={t(`utilities.items.${tool.id}.title`)}
                                    desc={t(`utilities.items.${tool.id}.desc`)}
                                    onRun={runUtility}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </RootDiv>
    )
}
