import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { clsx } from "clsx"
import { motion, AnimatePresence } from "framer-motion"
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
    const [hoveredTab, setHoveredTab] = useState<string | null>(null)

    // Helper to get translated label (still used for a11y/tooltip)
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
    }, [location, t])

    return (
        // Floating bottom-centered nav with rich hover effects
        <nav className="fixed bottom-6 left-0 right-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto inline-flex items-center gap-1 px-2 py-2 rounded-2xl bg-white/5 border border-vie-border backdrop-blur-lg shadow-[0_0_20px_-5px_rgba(255,255,255,0.1),0_12px_40px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
                {tabs.map((tab, idx) => {
                    const isActive = activeTab === tab.id
                    const Icon = tab.icon
                    return (
                        <div key={tab.id} className="relative flex items-center">
                            <motion.button
                                aria-label={tab.label}
                                onClick={() => navigate(tab.path)}
                                onHoverStart={() => setHoveredTab(tab.id)}
                                onHoverEnd={() => setHoveredTab(null)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={clsx(
                                    "relative grid place-items-center w-11 h-11 rounded-xl transition-all duration-200 outline-none z-10",
                                    isActive ? "text-white" : "text-vie-text-dim hover:text-white"
                                )}
                            >
                                {/* Active Background */}
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-active"
                                        className="absolute inset-0 bg-vie-primary/90 rounded-xl shadow-[0_8px_28px_-8px_var(--color-vie-primary)]"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                {/* Hover Background (only if not active) */}
                                {hoveredTab === tab.id && !isActive && (
                                    <motion.div
                                        layoutId="nav-hover"
                                        className="absolute inset-0 bg-white/10 rounded-xl"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}

                                {/* Icon */}
                                <div className="relative z-10">
                                    <Icon size={18} className={clsx(
                                        "transition-colors duration-200",
                                        isActive ? "text-white" : "text-vie-text-muted group-hover:text-white"
                                    )} />
                                </div>
                            </motion.button>

                            {/* Divider after Apps like the reference */}
                            {tab.id === "apps" && idx !== tabs.length - 1 && (
                                <div className="mx-1 my-0.5 w-px h-6 bg-white/10" />
                            )}
                        </div>
                    )
                })}
            </div>
        </nav>
    )
}

export default Nav