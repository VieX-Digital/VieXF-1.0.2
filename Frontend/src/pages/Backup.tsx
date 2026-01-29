import { memo, useCallback, useState } from "react"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import { toast } from "react-toastify"
import { ArchiveRestore, Save, RotateCcw, Clock, Database } from "lucide-react"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"

// Mock backups
const backups = [
    { id: "1", name: "Before Optimization", date: "2024-05-20 10:30 AM", type: "Full" },
    { id: "2", name: "Pre-Update", date: "2024-05-18 09:15 PM", type: "Registry" },
]

const BackupCard = memo(({
    backup,
    onRestore,
    restoreLabel
}: {
    backup: { id: string, name: string, date: string, type: string }
    onRestore: (id: string) => void
    restoreLabel: string
}) => {
    return (
        <div className="group relative p-5 flex items-center justify-between rounded-2xl glass-liquid-soft border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/5 via-transparent to-white/10 rounded-2xl" />
            <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ArchiveRestore size={20} />
                </div>
                <div>
                    <h3 className="font-medium text-white">{backup.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-vie-text-muted">
                        <span className="flex items-center gap-1"><Clock size={12} /> {backup.date}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{backup.type}</span>
                    </div>
                </div>
            </div>

            <Button
                variant="secondary"
                size="sm"
                onClick={() => onRestore(backup.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <RotateCcw size={14} className="mr-2" /> {restoreLabel}
            </Button>
        </div>
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

export default function Backup() {
    const { t } = useTranslation()
    const [createOpen, setCreateOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleCreate = useCallback(async () => {
        setLoading(true)
        await new Promise(r => setTimeout(r, 2000))
        setLoading(false)
        setCreateOpen(false)
        toast.success(t("backup.created"))
    }, [t])

    const handleRestore = useCallback((id: string) => {
        toast.info(`${t("backup.restoring")} (${id})...`)
    }, [t])

    return (
        <RootDiv style={{}}>
            <div className="relative h-full">
                <div className="relative max-w-6xl mx-auto px-6 py-8 h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 glass-liquid rounded-3xl p-6 border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-vie-text-dim">Recovery</p>
                            <h1 className="text-3xl font-light text-white mt-2">{t("backup.title")}</h1>
                            <p className="text-vie-text-muted text-sm mt-2 max-w-xl">{t("backup.subtitle")}</p>
                        </div>
                        <div className="lg:col-span-4 glass-liquid-strong rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-vie-primary/15 text-vie-primary border border-vie-primary/20">
                                    <Database size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-vie-text-dim uppercase tracking-widest">Backup</p>
                                    <p className="text-sm text-white font-medium">Create a restore point</p>
                                </div>
                            </div>
                            <Button variant="primary" className="gap-2 justify-center" onClick={() => setCreateOpen(true)}>
                                <Save size={16} /> {t("backup.create")}
                            </Button>
                            <p className="text-xs text-vie-text-dim">Recommended before applying aggressive tweaks.</p>
                        </div>
                    </div>

                    <motion.div
                        className="space-y-4"
                        variants={listVariants}
                        initial="hidden"
                        animate="show"
                    >
                        <h2 className="text-sm font-medium text-vie-text-dim uppercase tracking-wider">{t("backup.available")}</h2>

                        {backups.map(backup => (
                            <motion.div key={backup.id} variants={rowVariants}>
                                <BackupCard
                                    backup={backup}
                                    onRestore={handleRestore}
                                    restoreLabel={t("backup.restore")}
                                />
                            </motion.div>
                        ))}

                        {backups.length === 0 && (
                            <div className="text-center py-12 border border-dashed border-vie-border rounded-2xl glass-liquid-soft">
                                <p className="text-vie-text-muted">{t("backup.no_backups")}</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Create Backup Modal */}
            <Modal open={createOpen} onClose={() => !loading && setCreateOpen(false)}>
                <div className="p-6 rounded-2xl border border-vie-border bg-vie-card/50 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-vie-primary/10 text-vie-primary">
                            <Save size={24} />
                        </div>
                        <h3 className="text-lg font-medium text-white">{t("backup.modal_create_title")}</h3>
                    </div>

                    <p className="text-sm text-vie-text-muted">
                        {t("backup.modal_create_desc")}
                    </p>

                    <div className="pt-2 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={loading}>{t("settings.cancel")}</Button>
                        <Button variant="primary" onClick={handleCreate} disabled={loading}>
                            {loading ? t("backup.creating") : t("backup.create_now")}
                        </Button>
                    </div>
                </div>
            </Modal>
        </RootDiv>
    )
}
