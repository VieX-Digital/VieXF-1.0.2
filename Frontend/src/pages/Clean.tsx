import { useState } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import { Trash2, Sparkles, AlertTriangle, Play } from "lucide-react"

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

export default function Clean() {
    const { t } = useTranslation()
    const [selected, setSelected] = useState<string[]>([])
    const [cleaning, setCleaning] = useState(false)

    const toggleSelect = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const runCleanup = async () => {
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
    }

    return (
        <RootDiv style={{}}>
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display text-white">{t("clean.title")}</h1>
                        <p className="text-vie-text-muted text-sm mt-1">{t("clean.subtitle")}</p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={runCleanup}
                        disabled={selected.length === 0 || cleaning}
                        className="gap-2 px-6"
                    >
                        {cleaning ? <Sparkles className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
                        {cleaning ? t("clean.cleaning") : t("clean.start")}
                    </Button>
                </div>

                <div className="space-y-3">
                    {cleanupsData.map(item => (
                        <div
                            key={item.id}
                            className={`
                        p-4 flex items-center justify-between transition-colors rounded-2xl border border-vie-border bg-vie-card/50
                        ${item.dangerous ? "border-vie-danger/20 hover:border-vie-danger/40" : ""}
                    `}
                            onClick={() => toggleSelect(item.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-lg ${item.dangerous ? "bg-vie-danger/10 text-vie-danger" : "bg-vie-primary/10 text-vie-primary"}`}>
                                    {item.dangerous ? <AlertTriangle size={20} /> : <Trash2 size={20} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-white">{t(item.labelKey)}</h3>
                                        {item.dangerous && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-vie-danger/20 text-vie-danger uppercase font-bold tracking-wider">
                                                {t("clean.warning")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Toggle checked={selected.includes(item.id)} readOnly />
                        </div>
                    ))}
                </div>
            </div>
        </RootDiv>
    )
}
