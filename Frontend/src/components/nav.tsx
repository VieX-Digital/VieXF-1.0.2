import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { clsx } from "clsx"
import {
    Gauge,
    Wrench,
    Sparkles,
    ArchiveRestore,
    Box,
    EthernetPort,
    LayoutGrid,
    Settings
} from "lucide-react"

function Nav() {
    const { t } = useTranslation()
    const location = useLocation()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState("home")

    // Helper to get translated label
    const getTabs = () => [
        { id: "home", label: t("nav.home"), path: "/", icon: Gauge },
        { id: "tweaks", label: t("nav.tweaks"), path: "/tweaks", icon: Wrench },
        { id: "clean", label: t("nav.clean"), path: "/clean", icon: Sparkles },
        { id: "backup", label: t("nav.backup"), path: "/backup", icon: ArchiveRestore },
        { id: "utilities", label: t("nav.utilities"), path: "/utilities", icon: Box },
        { id: "dns", label: t("nav.dns"), path: "/dns", icon: EthernetPort },
        { id: "apps", label: t("nav.apps"), path: "/apps", icon: LayoutGrid },
        { id: "settings", label: t("nav.settings"), path: "/settings", icon: Settings },
    ]

    const tabs = getTabs()

    useEffect(() => {
        const current = tabs.find(tab => tab.path === location.pathname)
        if (current) setActiveTab(current.id)
        else if (location.pathname === "/") setActiveTab("home")
    }, [location, t]) // Add t to dependency to re-render on language change

    return (
        <nav className="h-[50px] fixed top-[40px] left-0 right-0 z-40 shell-bar flex items-center justify-center">
            <div className="flex items-center gap-1 p-1">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className={clsx(
                                "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 outline-none group",
                                isActive
                                    ? "text-white bg-white/10 shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)]"
                                    : "text-vie-text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon size={16} className={clsx(isActive ? "text-vie-primary" : "text-vie-text-dim group-hover:text-vie-text transition-colors")} />
                            <span>{tab.label}</span>
                            {isActive && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-vie-primary rounded-full shadow-[0_0_8px_var(--color-vie-primary)]" />
                            )}
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}

export default Nav
