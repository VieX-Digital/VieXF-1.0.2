import { useState } from "react"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import { toast } from "react-toastify"
import { Globe, ShieldCheck, CheckCircle2, Zap } from "lucide-react"
import { invoke } from "@/lib/electron"
import { useTranslation } from "react-i18next"

const dnsProviders = [
    { id: "google", label: "Google DNS", primary: "8.8.8.8", secondary: "8.8.4.4" },
    { id: "cloudflare", label: "Cloudflare", primary: "1.1.1.1", secondary: "1.0.0.1" },
    { id: "quad9", label: "Quad9", primary: "9.9.9.9", secondary: "149.112.112.112" },
    { id: "adguard", label: "AdGuard", primary: "94.140.14.14", secondary: "94.140.15.15" },
]

export default function DNS() {
    const { t } = useTranslation()
    const [currentDns, setCurrentDns] = useState("google") // Mock current
    const [applying, setApplying] = useState(false)

    const applyDns = async (id: string) => {
        setApplying(true)
        try {
            const provider = dnsProviders.find(d => d.id === id)
            if (!provider) return

            await invoke({
                channel: "dns:apply",
                payload: {
                    dnsType: "custom",
                    primaryDNS: provider.primary,
                    secondaryDNS: provider.secondary
                }
            })
            setCurrentDns(id)
            toast.success(t("dns.updated"))
        } catch (err) {
            toast.error(t("dns.failed"))
            console.error(err)
        } finally {
            setApplying(false)
        }
    }

    const resetDns = async () => {
        setApplying(true)
        try {
            await invoke({ channel: "dns:reset", payload: null })
            setCurrentDns("dhcp")
            toast.success(t("dns.reset_toast"))
        } catch (err) {
            toast.error(t("dns.failed"))
        } finally {
            setApplying(false)
        }
    }

    const flushDns = async () => {
        try {
            await invoke({ channel: "dns:flush-cache", payload: null })
            toast.success(t("dns.flushed"))
        } catch (err) {
            toast.error(t("dns.failed"))
        }
    }

    return (
        <RootDiv style={{}}>
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display text-white">{t("dns.title")}</h1>
                        <p className="text-vie-text-muted text-sm mt-1">{t("dns.subtitle")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-xs text-vie-text-muted">{t("dns.current")}</p>
                            <p className="text-sm font-medium text-vie-primary uppercase">{currentDns === "dhcp" ? "Automatic (DHCP)" : dnsProviders.find(d => d.id === currentDns)?.label || "Custom"}</p>
                        </div>
                        <Button variant="secondary" onClick={resetDns} disabled={applying}>{t("dns.reset")}</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dnsProviders.map(dns => {
                        const isActive = currentDns === dns.id
                        return (
                            <div
                                key={dns.id}
                                className={`p-5 flex items-start justify-between cursor-pointer transition-all rounded-2xl border border-vie-border bg-vie-card/50 ${isActive ? "border-vie-primary ring-1 ring-vie-primary/20 bg-vie-primary/5" : "hover:border-vie-border-hover"}`}
                                onClick={() => applyDns(dns.id)}
                            >
                                <div className="flex gap-4">
                                    <div className={`p-2.5 rounded-lg ${isActive ? "bg-vie-primary text-white" : "bg-white/5 text-vie-text-dim"}`}>
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">{dns.label}</h3>
                                        <p className="text-xs text-vie-text-muted mt-0.5">{t(`dns.providers.${dns.id}`)}</p>
                                        <div className="flex gap-3 mt-3">
                                            <code className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-xs text-vie-text-dim">{dns.primary}</code>
                                            <code className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-xs text-vie-text-dim">{dns.secondary}</code>
                                        </div>
                                    </div>
                                </div>
                                {isActive && <CheckCircle2 className="text-vie-primary" size={20} />}
                            </div>
                        )
                    })}
                </div>

                <div className="p-4 rounded-xl border border-vie-border bg-vie-card/50 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-vie-accent/10 text-vie-accent">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">{t("dns.flush")}</h3>
                        <p className="text-xs text-vie-text-muted">{t("dns.flush_desc")}</p>
                    </div>
                    <Button className="ml-auto" variant="secondary" onClick={flushDns}>{t("dns.flush_btn")}</Button>
                </div>
            </div>
        </RootDiv>
    )
}
