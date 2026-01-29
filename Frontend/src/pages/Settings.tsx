import { memo, useCallback, useEffect, useState } from "react"
import type { ChangeEvent } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import Modal from "@/components/ui/modal"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import jsonData from "../../../package.json"
import {
    Settings2,
    Palette,
    ShieldAlert,
    Trash2,
    Rocket,
    SlidersHorizontal
} from "lucide-react"

export default function Settings() {
    const { t, i18n } = useTranslation()
    const [lang, setLang] = useState(i18n.language)
    const [primaryColor, setPrimaryColor] = useState("#38bdf8")
    const [runAsAdmin, setRunAsAdmin] = useState(false)

    const [compactMode, setCompactMode] = useState(
        () => localStorage.getItem("vie:ui-compact") === "true"
    )
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)

    // Sync state with i18next
    useEffect(() => {
        setLang(i18n.language)
    }, [i18n.language])

    useEffect(() => {
        document.documentElement.style.setProperty("--color-vie-primary", primaryColor)
        document.documentElement.style.setProperty("--color-vie-primary-hover", primaryColor)
    }, [primaryColor])

    useEffect(() => {
        const savedColor = localStorage.getItem("vie:primaryColor")
        if (savedColor) setPrimaryColor(savedColor)
    }, [])

    useEffect(() => {
        localStorage.setItem("vie:ui-compact", String(compactMode))
        if (compactMode) document.body.classList.add("vie-compact")
        else document.body.classList.remove("vie-compact")
    }, [compactMode])

    const handleColorChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value
        setPrimaryColor(color)
        localStorage.setItem("vie:primaryColor", color)
    }, [])

    const handleLangToggle = useCallback(() => {
        const newLang = lang === "vi" ? "en" : "vi"
        i18n.changeLanguage(newLang)
        setLang(newLang)
        localStorage.setItem("vie:lang", newLang)
        toast.info(t("settings.toast_lang_changed"))
    }, [i18n, lang, t])

    return (
        <RootDiv style={{}}>
            <div className="relative h-full">
                <div className="relative max-w-6xl mx-auto px-6 py-8 h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 glass-liquid rounded-3xl p-6 border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-vie-text-dim">Settings</p>
                            <h1 className="text-2xl md:text-3xl font-light text-white mt-2 leading-tight">{t("settings.title")}</h1>
                            <p className="text-vie-text-muted text-sm mt-2 max-w-xl">{t("settings.subtitle")}</p>
                        </div>
                        <div className="lg:col-span-4 glass-liquid-strong rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-vie-primary/15 text-vie-primary border border-vie-primary/20">
                                    <SlidersHorizontal size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-vie-text-dim uppercase tracking-widest">Build</p>
                                    <p className="text-sm text-white font-medium">v{jsonData.version}</p>
                                </div>
                            </div>
                            <p className="text-xs text-vie-text-dim">Fine-tune performance, language, and UI details.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <Section
                            className="lg:col-span-7"
                            title={t("settings.personalization")}
                            icon={<Palette size={18} className="text-vie-primary" />}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SettingItem
                                    label={t("settings.accent_color")}
                                    desc={t("settings.accent_desc")}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-white/10"
                                            style={{ backgroundColor: primaryColor }}
                                        />
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={handleColorChange}
                                            className="bg-transparent border-0 w-8 h-8 p-0 cursor-pointer opacity-0 absolute w-8 h-8"
                                        />
                                        <Button size="sm" variant="secondary" className="relative">
                                            {t("settings.pick_color")}
                                            <input
                                                type="color"
                                                value={primaryColor}
                                                onChange={handleColorChange}
                                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                            />
                                        </Button>
                                    </div>
                                </SettingItem>

                                <SettingItem
                                    label={t("settings.language")}
                                    desc={t("settings.language_desc")}
                                >
                                    <Button onClick={handleLangToggle} variant="secondary" className="min-w-[90px]">
                                        {lang === "vi" ? "Tiếng Việt" : "English"}
                                    </Button>
                                </SettingItem>

                                <SettingItem
                                    label={t("settings.compact_mode")}
                                    desc={t("settings.compact_desc")}
                                >
                                    <Toggle checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} />
                                </SettingItem>
                            </div>
                        </Section>

                        <Section
                            className="lg:col-span-5"
                            title={t("settings.system")}
                            icon={<ShieldAlert size={18} className="text-vie-secondary" />}
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                                            <ShieldAlert size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-white">{t("settings.run_admin")}</h4>
                                            <p className="text-xs text-vie-text-muted">{t("settings.run_admin_desc")}</p>
                                        </div>
                                    </div>
                                    <Toggle checked={runAsAdmin} onChange={(e) => setRunAsAdmin(e.target.checked)} />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                            <Rocket size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-white">{t("settings.unlock_fps_title")}</h4>
                                            <p className="text-xs text-vie-text-muted">{t("settings.unlock_fps_desc")}</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => window.open("https://discord.gg/wsphWPp7Zr", "_blank")}
                                    >
                                        {t("settings.get_tool")}
                                    </Button>
                                </div>
                            </div>
                        </Section>

                        <Section
                            className="lg:col-span-12"
                            title={t("settings.data_mgmt")}
                            icon={<Settings2 size={18} className="text-vie-text-dim" />}
                        >
                            <div className="flex items-center gap-4">
                                <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
                                    <Trash2 size={14} className="mr-2" /> {t("settings.clear_backup")}
                                </Button>
                                <p className="text-xs text-vie-text-dim">
                                    {t("settings.clear_backup_desc")}
                                </p>
                            </div>
                        </Section>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                <div className="p-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-white">{t("settings.modal_delete_title")}</h3>
                    <p className="text-sm text-vie-text-muted">
                        {t("settings.modal_delete_desc")}
                    </p>
                    <div className="flex gap-3 justify-center pt-2">
                        <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>{t("settings.cancel")}</Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                invoke({ channel: "delete-old-vie-backups", payload: null })
                                setDeleteModalOpen(false)
                                toast.success(t("settings.toast_backup_deleted"))
                            }}
                        >
                            {t("settings.confirm_delete")}
                        </Button>
                    </div>
                </div>
            </Modal>
        </RootDiv>
    )
}

const Section = ({
    title,
    icon,
    children,
    className
}: {
    title: string
    icon: any
    children: any
    className?: string
}) => (
    <div className={`glass-liquid rounded-3xl border border-white/10 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${className || ""}`}>
        <div className="flex items-center gap-3 border-b border-vie-border pb-4 mb-4">
            {icon}
            <h2 className="text-lg font-medium text-white">{title}</h2>
        </div>
        {children}
    </div>
)

const SettingItem = memo(({
    label,
    desc,
    children
}: {
    label: string
    desc: string
    children: any
}) => (
    <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
        <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-white truncate">{label}</h4>
            <p className="text-[11px] text-vie-text-muted leading-snug">{desc}</p>
        </div>
        {children}
    </div>
))
