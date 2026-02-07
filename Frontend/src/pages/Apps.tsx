import { useState } from "react"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import { PackageX, CheckCircle2, RefreshCw } from "lucide-react"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import { useTranslation } from "react-i18next"

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

export default function Apps() {
    const { t } = useTranslation()
    const [selected, setSelected] = useState<string[]>([])
    const [isRemoving, setIsRemoving] = useState(false)

    const toggleApp = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleRemove = async () => {
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
    }

    return (
        <RootDiv style={{}}>
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-light text-white">{t("apps.title")}</h1>
                        <p className="text-vie-text-muted text-sm mt-1">{t("apps.subtitle")}</p>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setSelected([])} disabled={selected.length === 0}>
                            {t("apps.clear")}
                        </Button>
                        <Button
                            variant="danger"
                            disabled={selected.length === 0 || isRemoving}
                            onClick={handleRemove}
                            className="gap-2"
                        >
                            {isRemoving ? <RefreshCw className="animate-spin" size={16} /> : <PackageX size={16} />}
                            {t("apps.remove")} {selected.length > 0 ? `(${selected.length})` : ""}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bloatwareApps.map(appId => (
                        <div
                            key={appId}
                            className={`p-4 rounded-xl border border-vie-border bg-vie-card/50 hover:bg-white/5 transition-colors cursor-pointer ${selected.includes(appId) ? "border-vie-danger/40 bg-vie-danger/5" : ""}`}
                            onClick={() => toggleApp(appId)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-white font-medium capitalize">{appId}</h3>
                                    <p className="text-xs text-vie-text-muted mt-1">{t(`apps.items.${appId}`)}</p>
                                </div>
                                <div className={`
                            w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                            ${selected.includes(appId) ? "bg-vie-danger border-vie-danger text-white" : "border-vie-border bg-transparent"}
                        `}>
                                    {selected.includes(appId) && <CheckCircle2 size={12} />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </RootDiv>
    )
}
