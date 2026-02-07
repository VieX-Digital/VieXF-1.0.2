import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import RootDiv from "@/components/rootdiv"

import Button from "@/components/ui/button"
import Toggle from "@/components/ui/toggle"
import Modal from "@/components/ui/modal"
import { invoke } from "@/lib/electron"
import { toast } from "react-toastify"
import jsonData from "../../../package.json"
import { updateThemeColors } from "@/lib/theme"
import useBackgroundStore from "@/store/backgroundStore"
import {
    Settings2,
    Palette,
    Globe,
    ShieldAlert,
    Trash2,
    Image, // Added for background settings
    Rocket,
    Monitor // Added for tray icon setting
} from "lucide-react"

export default function Settings() {
    const { t, i18n } = useTranslation()
    const [lang, setLang] = useState(i18n.language)
    const [primaryColor, setPrimaryColor] = useState("#38bdf8")
    const [runAsAdmin, setRunAsAdmin] = useState(false)
    const [showTrayIcon, setShowTrayIcon] = useState(
        () => localStorage.getItem("vie:showTrayIcon") !== "false"
    )

    const [compactMode, setCompactMode] = useState(
        () => localStorage.getItem("vie:ui-compact") === "true"
    )
    const [backgroundEffect, setBackgroundEffect] = useState(
        () => localStorage.getItem("vie:backgroundEffect") !== "false"
    )
    const {
        backgroundImageUrl, setBackgroundImageUrl,
        backgroundPosition, setBackgroundPosition,
        backgroundSize, setBackgroundSize,
        backgroundRepeat, setBackgroundRepeat,
        backgroundOpacity, setBackgroundOpacity,
    } = useBackgroundStore()
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)

    // Sync state with i18next
    useEffect(() => {
        setLang(i18n.language)
    }, [i18n.language])

    useEffect(() => {
        updateThemeColors(primaryColor)
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

    useEffect(() => {
        localStorage.setItem("vie:backgroundEffect", String(backgroundEffect))
    }, [backgroundEffect])

    useEffect(() => {
        localStorage.setItem("vie:showTrayIcon", String(showTrayIcon))
        invoke({ channel: "set-tray-visibility", payload: showTrayIcon })
    }, [showTrayIcon])

    // Handlers for the new settings
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value
        setPrimaryColor(color)
        localStorage.setItem("vie:primaryColor", color)
    }

    const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setBackgroundImageUrl(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleClearBackgroundImage = () => {
        setBackgroundImageUrl("")
    }

    const handleBackgroundOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBackgroundOpacity(parseFloat(e.target.value) / 100)
    }

    const handleLangToggle = () => {
        const newLang = lang === "vi" ? "en" : "vi"
        i18n.changeLanguage(newLang)
        setLang(newLang)
        localStorage.setItem("vie:lang", newLang)
        toast.info(t("settings.toast_lang_changed"))
    }

    return (
        <RootDiv style={{}}>
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-light text-white">{t("settings.title")}</h1>
                        <p className="text-vie-text-muted text-sm mt-1">{t("settings.subtitle")}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-vie-text-dim font-mono">
                        v{jsonData.version}
                    </div>
                </div>

                {/* 1. Personalization */}
                <Section title={t("settings.personalization")} icon={<Palette size={18} className="text-vie-primary" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <Button onClick={handleLangToggle} variant="secondary" className="min-w-[80px]">
                                {lang === "vi" ? "Tiếng Việt" : "English"}
                            </Button>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.compact_mode")}
                            desc={t("settings.compact_desc")}
                        >
                            <Toggle checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} />
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_effect")}
                            desc={t("settings.background_effect_desc")}
                        >
                            <Toggle checked={backgroundEffect} onChange={(e) => setBackgroundEffect(e.target.checked)} />
                        </SettingItem>
                    </div>
                </Section>

                {/* 1.1. Background */}
                <Section title={t("settings.background")} icon={<Image size={18} className="text-vie-primary" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingItem
                            label={t("settings.background_image")}
                            desc={t("settings.background_image_desc")}
                        >
                            <div className="flex items-center gap-3">
                                <Button size="sm" variant="secondary" className="relative">
                                    {t("settings.upload_image")}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleBackgroundImageUpload}
                                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                    />
                                </Button>
                                {backgroundImageUrl && (
                                    <Button size="sm" variant="danger" onClick={handleClearBackgroundImage}>
                                        {t("settings.clear_image")}
                                    </Button>
                                )}
                            </div>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_position")}
                            desc={t("settings.background_position_desc")}
                        >
                            <select
                                value={backgroundPosition}
                                onChange={(e) => setBackgroundPosition(e.target.value)}
                                className="bg-vie-card border border-vie-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-vie-primary"
                            >
                                <option value="center">{t("settings.position_center")}</option>
                                <option value="top">{t("settings.position_top")}</option>
                                <option value="bottom">{t("settings.position_bottom")}</option>
                                <option value="left">{t("settings.position_left")}</option>
                                <option value="right">{t("settings.position_right")}</option>
                            </select>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_size")}
                            desc={t("settings.background_size_desc")}
                        >
                            <select
                                value={backgroundSize}
                                onChange={(e) => setBackgroundSize(e.target.value)}
                                className="bg-vie-card border border-vie-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-vie-primary"
                            >
                                <option value="cover">{t("settings.size_cover")}</option>
                                <option value="contain">{t("settings.size_contain")}</option>
                                <option value="auto">{t("settings.size_auto")}</option>
                                <option value="100% 100%">{t("settings.size_fill")}</option>
                            </select>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_repeat")}
                            desc={t("settings.background_repeat_desc")}
                        >
                            <select
                                value={backgroundRepeat}
                                onChange={(e) => setBackgroundRepeat(e.target.value)}
                                className="bg-vie-card border border-vie-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-vie-primary"
                            >
                                <option value="no-repeat">{t("settings.repeat_no_repeat")}</option>
                                <option value="repeat">{t("settings.repeat_repeat")}</option>
                                <option value="repeat-x">{t("settings.repeat_repeat_x")}</option>
                                <option value="repeat-y">{t("settings.repeat_repeat_y")}</option>
                            </select>
                        </SettingItem>

                        <SettingItem
                            label={t("settings.background_opacity")}
                            desc={t("settings.background_opacity_desc")}
                        >
                            <div className="flex items-center gap-3 w-full max-w-[150px]">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={backgroundOpacity * 100}
                                    onChange={handleBackgroundOpacityChange}
                                    className="w-full h-2 bg-vie-border rounded-lg appearance-none cursor-pointer accent-vie-primary"
                                />
                                <span className="text-sm text-white min-w-[30px] text-right">
                                    {Math.round(backgroundOpacity * 100)}%
                                </span>
                            </div>
                        </SettingItem>
                    </div>
                </Section>

                {/* 2. System & Admin */}
                <Section title={t("settings.system")} icon={<ShieldAlert size={18} className="text-vie-secondary" />}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
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

                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                    <Monitor size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-white">{t("settings.show_tray_icon")}</h4>
                                    <p className="text-xs text-vie-text-muted">{t("settings.show_tray_icon_desc")}</p>
                                </div>
                            </div>
                            <Toggle checked={showTrayIcon} onChange={(e) => setShowTrayIcon(e.target.checked)} />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
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

                {/* 3. Data */}
                <Section title={t("settings.data_mgmt")} icon={<Settings2 size={18} className="text-vie-text-dim" />}>
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

const Section = ({ title, icon, children }: { title: string, icon: any, children: any }) => (
    <div className="p-6 space-y-6 rounded-2xl border border-vie-border bg-vie-card/50 backdrop-blur-lg">
        <div className="flex items-center gap-3 border-b border-vie-border pb-4 mb-4">
            {icon}
            <h2 className="text-lg font-medium text-white">{title}</h2>
        </div>
        {children}
    </div>
)

const SettingItem = ({ label, desc, children }: { label: string, desc: string, children: any }) => (
    <div className="flex items-center justify-between gap-4">
        <div>
            <h4 className="text-sm font-medium text-white">{label}</h4>
            <p className="text-xs text-vie-text-muted">{desc}</p>
        </div>
        {children}
    </div>
)