import { memo, useCallback, useMemo, useState } from "react"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import { toast } from "react-toastify"
import { Globe, CheckCircle2, Zap, Activity } from "lucide-react"
import { invoke } from "@/lib/electron"
import { useTranslation } from "react-i18next"
import { motion } from "framer-motion"

const dnsProviders = [
    { id: "google", label: "Google DNS", primary: "8.8.8.8", secondary: "8.8.4.4" },
    { id: "cloudflare", label: "Cloudflare", primary: "1.1.1.1", secondary: "1.0.0.1" },
    { id: "quad9", label: "Quad9", primary: "9.9.9.9", secondary: "149.112.112.112" },
    { id: "adguard", label: "AdGuard", primary: "94.140.14.14", secondary: "94.140.15.15" },
]

const DnsCard = memo(({
    dns,
    isActive,
    onSelect,
    description
}: {
    dns: { id: string, label: string, primary: string, secondary: string }
    isActive: boolean
    onSelect: (id: string) => void
    description: string
}) => {
    return (
        <button
            type="button"
            onClick={() => onSelect(dns.id)}
            className={`
                group relative w-full text-left p-5 flex items-start justify-between transition-all rounded-2xl
                glass-liquid-soft border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.35)]
                ${isActive ? "border-vie-primary ring-1 ring-vie-primary/30 bg-vie-primary/5" : "hover:border-vie-border-hover"}
            `}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/5 via-transparent to-white/10 rounded-2xl" />
            <div className="relative flex gap-4">
                <div className={`p-3 rounded-xl ${isActive ? "bg-vie-primary text-white" : "bg-white/5 text-vie-text-dim"} border border-white/10`}>
                    <Globe size={22} />
                </div>
                <div>
                    <h3 className="font-medium text-white">{dns.label}</h3>
                    <p className="text-xs text-vie-text-muted mt-0.5">{description}</p>
                    <div className="flex gap-3 mt-3">
                        <code className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-xs text-vie-text-dim">{dns.primary}</code>
                        <code className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-xs text-vie-text-dim">{dns.secondary}</code>
                    </div>
                </div>
            </div>
            {isActive && <CheckCircle2 className="text-vie-primary relative" size={20} />}
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

export default function DNS() {
    const { t } = useTranslation()
    const [currentDns, setCurrentDns] = useState("google") // Mock current
    const [applying, setApplying] = useState(false)

    const applyDns = useCallback(async (id: string) => {
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
    }, [t])

    const resetDns = useCallback(async () => {
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
    }, [t])

    const flushDns = useCallback(async () => {
        try {
            await invoke({ channel: "dns:flush-cache", payload: null })
            toast.success(t("dns.flushed"))
        } catch (err) {
            toast.error(t("dns.failed"))
        }
    }, [t])

    const currentLabel = useMemo(() => {
        if (currentDns === "dhcp") return "Automatic (DHCP)"
        return dnsProviders.find(d => d.id === currentDns)?.label || "Custom"
    }, [currentDns])

    return (
        <RootDiv style={{}}>
            <div className="relative h-full">
                <div className="relative max-w-6xl mx-auto px-6 py-8 h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 glass-liquid rounded-3xl p-6 border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-vie-text-dim">Connectivity</p>
                            <h1 className="text-3xl font-light text-white mt-2">{t("dns.title")}</h1>
                            <p className="text-vie-text-muted text-sm mt-2 max-w-xl">{t("dns.subtitle")}</p>
                        </div>
                        <div className="lg:col-span-4 glass-liquid-strong rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-vie-primary/15 text-vie-primary border border-vie-primary/20">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-vie-text-dim uppercase tracking-widest">{t("dns.current")}</p>
                                    <p className="text-sm font-medium text-vie-primary uppercase">{currentLabel}</p>
                                </div>
                            </div>
                            <Button variant="secondary" onClick={resetDns} disabled={applying} className="justify-center">
                                {t("dns.reset")}
                            </Button>
                            <p className="text-xs text-vie-text-dim">Switch to automatic if you experience issues.</p>
                        </div>
                    </div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        variants={gridVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {dnsProviders.map(dns => (
                            <motion.div key={dns.id} variants={cardVariants}>
                                <DnsCard
                                    dns={dns}
                                    isActive={currentDns === dns.id}
                                    description={t(`dns.providers.${dns.id}`)}
                                    onSelect={applyDns}
                                />
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="p-5 rounded-2xl border border-vie-border glass-liquid-soft flex items-center gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                        <div className="p-3 rounded-2xl bg-vie-accent/10 text-vie-accent border border-vie-accent/20">
                            <Zap size={22} />
                        </div>
                        <div>
                            <h3 className="font-medium text-white">{t("dns.flush")}</h3>
                            <p className="text-xs text-vie-text-muted">{t("dns.flush_desc")}</p>
                        </div>
                        <Button className="ml-auto" variant="secondary" onClick={flushDns}>{t("dns.flush_btn")}</Button>
                    </div>
                </div>
            </div>
        </RootDiv>
    )
}
