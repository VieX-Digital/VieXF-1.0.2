import { useState, useEffect } from "react"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import { toast } from "react-toastify"
import { ArchiveRestore, Save, RotateCcw, RefreshCw, Trash2, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { invoke } from "@/lib/electron"

interface RestorePoint {
    SequenceNumber: number
    Description: string
    CreationTime: string
    EventType: number
    RestorePointType: number
}

export default function Backup() {
    const { t } = useTranslation()
    const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [restoringId, setRestoringId] = useState<number | null>(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    const fetchRestorePoints = async () => {
        setLoading(true)
        try {
            const res = await invoke({ channel: "get-restore-points", payload: null })
            if (res?.success && Array.isArray(res.points)) {
                setRestorePoints(res.points)
            } else {
                setRestorePoints([])
            }
        } catch (err) {
            console.error(err)
            setRestorePoints([])
            toast.error(t("backup.create_failed"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRestorePoints()
    }, [])

    const handleCreate = async () => {
        setCreating(true)
        try {
            const res = await invoke({ channel: "create-restore-point", payload: null })
            if (res?.success) {
                toast.success(t("backup.created"))
                setCreateOpen(false)
                await fetchRestorePoints()
            } else {
                toast.error(res?.error || t("backup.create_failed"))
            }
        } catch (err) {
            console.error(err)
            toast.error(t("backup.create_failed"))
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteAllBackups = async () => {
        setDeleting(true)
        try {
            const res = await invoke({ channel: "delete-all-restore-points", payload: null })
            if (res?.success) {
                toast.success(t("toast_backup_deleted"))
                setDeleteOpen(false)
                await fetchRestorePoints()
            } else {
                toast.error(res?.error || t("backup.delete_failed"))
            }
        } catch (err) {
            console.error(err)
            toast.error(t("backup.delete_failed"))
        } finally {
            setDeleting(false)
        }
    }

    const handleDeleteSingleBackup = async (seq: number) => {
        setDeleting(true)
        try {
            const res = await invoke({ channel: "delete-restore-point", payload: seq })
            if (res?.success) {
                toast.success(t("backup.deleted"))
                setDeleteOpen(false)
                setDeletingId(null)
                await fetchRestorePoints()
            } else {
                toast.error(res?.error || t("backup.delete_failed"))
            }
        } catch (err) {
            console.error(err)
            toast.error(t("backup.delete_failed"))
        } finally {
            setDeleting(false)
        }
    }

    const handleRestore = async (seq: number) => {
        if (!confirm(t("backup.restore_confirm"))) return
        setRestoringId(seq)
        try {
            const res = await invoke({ channel: "restore-restore-point", payload: seq })
            if (res?.success) {
                toast.info(t("backup.restoring"))
            } else {
                toast.error(res?.error || t("backup.restore_failed"))
            }
        } catch (err) {
            console.error(err)
            toast.error(t("backup.restore_failed"))
        } finally {
            setRestoringId(null)
        }
    }

    const formatType = (type: number) => {
        if (type === 0) return "APPLICATION_INSTALL"
        if (type === 1) return "APPLICATION_UNINSTALL"
        if (type === 10) return "DEVICE_DRIVER_INSTALL"
        if (type === 12) return "MODIFY_SETTINGS"
        return "MANUAL"
    }

    return (
        <RootDiv style={{}}>
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-light text-white">{t("backup.title")}</h1>
                        <p className="text-vie-text-muted text-sm mt-1">{t("backup.subtitle")}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={fetchRestorePoints}
                            disabled={loading}
                            className="gap-2"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            {t("backup.refresh")}
                        </Button>
                        <Button variant="secondary" className="gap-2" onClick={() => setDeleteOpen(true)}>
                            <Trash2 size={16} /> {t("clear_backup")}
                        </Button>
                        <Button variant="primary" className="gap-2" onClick={() => setCreateOpen(true)}>
                            <Save size={16} /> {t("backup.create")}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-medium text-vie-text-dim uppercase tracking-wider">{t("backup.available")}</h2>

                    {loading ? (
                        <div className="text-center py-12 border border-dashed border-vie-border rounded-xl">
                            <p className="text-vie-text-muted">{t("backup.loading")}</p>
                        </div>
                    ) : (
                        <>
                            {restorePoints.map(rp => (
                                <div
                                    key={rp.SequenceNumber}
                                    className="p-4 flex items-center justify-between group rounded-2xl border border-vie-border bg-vie-card/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                            <ArchiveRestore size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">{rp.Description || `Restore Point #${rp.SequenceNumber}`}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-vie-text-muted">
                                                <span className="flex items-center gap-1">{rp.CreationTime}</span>
                                                <span className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                                                    {formatType(rp.RestorePointType)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => {
                                                setDeletingId(rp.SequenceNumber)
                                                setDeleteOpen(true)
                                            }}
                                            disabled={deleting || restoringId !== null}
                                        >
                                            <X size={14} className="mr-2" />
                                            {t("delete")}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleRestore(rp.SequenceNumber)}
                                            disabled={restoringId !== null || deleting}
                                        >
                                            <RotateCcw size={14} className="mr-2" />
                                            {restoringId === rp.SequenceNumber ? t("backup.restoring") : t("backup.restore")}
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {restorePoints.length === 0 && (
                                <div className="text-center py-12 border border-dashed border-vie-border rounded-xl">
                                    <p className="text-vie-text-muted">{t("backup.no_backups")}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Create Backup Modal */}
                <Modal open={createOpen} onClose={() => !creating && setCreateOpen(false)}>
                    <div className="p-6 rounded-2xl border border-vie-border bg-vie-card/50 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-vie-primary/10 text-vie-primary">
                                <Save size={24} />
                            </div>
                            <h3 className="text-lg font-medium text-white">{t("backup.modal_create_title")}</h3>
                        </div>

                        <p className="text-sm text-vie-text-muted">{t("backup.modal_create_desc")}</p>

                        <div className="pt-2 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
                                {t("settings.cancel")}
                            </Button>
                            <Button variant="primary" onClick={handleCreate} disabled={creating}>
                                {creating ? t("backup.creating") : t("backup.create_now")}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Delete Backup Modal */}
                <Modal open={deleteOpen} onClose={() => !deleting && (setDeleteOpen(false), setDeletingId(null))}>
                    <div className="p-6 rounded-2xl border border-vie-border bg-vie-card/50 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-medium text-white">
                                {deletingId !== null ? t("modal_delete_single_title") : t("modal_delete_title")}
                            </h3>
                        </div>

                        <p className="text-sm text-vie-text-muted">
                            {deletingId !== null 
                                ? t("modal_delete_single_desc", { description: restorePoints.find(rp => rp.SequenceNumber === deletingId)?.Description || `Restore Point #${deletingId}` })
                                : t("modal_delete_desc")
                            }
                        </p>

                        <div className="pt-2 flex justify-end gap-2">
                            <Button 
                                variant="secondary" 
                                onClick={() => { setDeleteOpen(false); setDeletingId(null) }} 
                                disabled={deleting}
                            >
                                {t("cancel")}
                            </Button>
                            <Button 
                                variant="danger" 
                                onClick={() => deletingId !== null ? handleDeleteSingleBackup(deletingId) : handleDeleteAllBackups()} 
                                disabled={deleting}
                            >
                                {deleting ? t("deleting") : t("confirm_delete")}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </RootDiv>
    )
}
