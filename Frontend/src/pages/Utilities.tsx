import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import { toast } from "react-toastify"
import { Terminal, Keyboard, Monitor, Wifi, HardDrive, KeyRound } from "lucide-react"
import { invoke } from "@/lib/electron"
import { useTranslation } from "react-i18next"

// Mock utilities list
const utilities = [
    { id: "activation", icon: KeyRound },
    { id: "keyboard", icon: Keyboard },
    { id: "display", icon: Monitor },
    { id: "network", icon: Wifi },
    { id: "disk", icon: HardDrive },
    { id: "cmd", icon: Terminal },
]

export default function Utilities() {
    const { t } = useTranslation()

    const runUtility = async (id: string) => {
        try {
            await invoke({ channel: "utility:run", payload: id })
        } catch (err) {
            toast.error(t("utilities.failed") + " " + id)
        }
    }

    return (
        <RootDiv style={{}}>
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                <div>
                    <h1 className="text-3xl font-display text-white">{t("utilities.title")}</h1>
                    <p className="text-vie-text-muted text-sm mt-1">{t("utilities.subtitle")}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {utilities.map(tool => {
                        const Icon = tool.icon
                        return (
                            <div
                                key={tool.id}
                                className="p-6 rounded-2xl border border-vie-border bg-vie-card/50 flex flex-col items-center text-center gap-4 cursor-pointer hover:bg-white/5 group transition-colors"
                                onClick={() => runUtility(tool.id)}
                            >
                                <div className="p-3 rounded-full bg-vie-card border border-vie-border group-hover:border-vie-primary/50 group-hover:text-vie-primary transition-all">
                                    <Icon size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-medium text-white">{t(`utilities.items.${tool.id}.title`)}</h3>
                                    <p className="text-xs text-vie-text-muted">{t(`utilities.items.${tool.id}.desc`)}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </RootDiv>
    )
}
