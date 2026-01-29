import { useState, useEffect } from "react"
import { Minimize, X, Maximize, Copy, Sparkles } from "lucide-react"
import vieLogo from "../../../Backend/resources/vie.png"

declare global {
    interface Window {
        electron: {
            ipcRenderer: {
                send: (channel: string, ...args: any[]) => void
                on: (channel: string, func: (...args: any[]) => void) => void
                removeAllListeners: (channel: string) => void
            }
        }
    }
}

export default function Titlebar() {
    const [maximized, setMaximized] = useState(false)
    const premiumUrl = (window as any)?.VIE_PREMIUM_URL || "https://discord.com/channels/1274585470633906176/1416609764779098162"

    useEffect(() => {
        // Check if window.electron exists to prevent crash in non-electron env (dev)
        if (!window.electron) return

        const handleMaximize = () => setMaximized(true)
        const handleUnmaximize = () => setMaximized(false)

        window.electron.ipcRenderer.on("window-maximized", handleMaximize)
        window.electron.ipcRenderer.on("window-unmaximized", handleUnmaximize)

        return () => {
            window.electron.ipcRenderer.removeAllListeners("window-maximized")
            window.electron.ipcRenderer.removeAllListeners("window-unmaximized")
        }
    }, [])

    // Safely call electron methods with CORRECT channel names
    const handleMinimize = () => window.electron?.ipcRenderer.send("window-minimize")
    const handleMaximizeToggle = () => window.electron?.ipcRenderer.send("window-toggle-maximize")
    const handleClose = () => window.electron?.ipcRenderer.send("window-close")

    return (
        <div className="h-[40px] flex justify-between items-center shell-bar select-none pl-4 draggable z-[9999] fixed top-0 left-0 right-0 transition-colors duration-300">
            {/* App Title / Logo Area */}
            <div className="flex items-center gap-3 opacity-85 hover:opacity-100 transition-opacity">
                <img
                    src={vieLogo}
                    alt="VieX logo"
                    className="h-6 w-6 rounded-lg object-cover"
                />
                <div className="flex items-baseline gap-1.5 text-sm font-medium tracking-wide">
                    <span className="text-white font-bold font-display">VieXF</span>
                    <span className="text-[10px] text-white/40 font-mono ml-1">1.0.1</span>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center no-drag premium-cta-wrap">
                <button
                    onClick={() => window.open(premiumUrl, "_blank")}
                    className="premium-cta px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-[0.06em] inline-flex items-center gap-2"
                >
                    <span className="p-1 rounded-full bg-white/10 border border-white/10 text-fuchsia-200">
                        <Sparkles size={12} />
                    </span>
                    <span>MỞ KHÓA FPS 🔥</span>
                </button>
            </div>

            {/* Window Controls */}
            <div className="flex h-full no-drag">
                <button
                    onClick={handleMinimize}
                    className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                    title="Minimize"
                >
                    <Minimize size={14} className="group-hover:scale-110 transition-transform" />
                </button>

                <button
                    onClick={handleMaximizeToggle}
                    className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                    title={maximized ? "Restore" : "Maximize"}
                >
                    {maximized ? (
                        <Copy size={13} className="group-hover:scale-110 transition-transform transform rotate-180" />
                    ) : (
                        <Maximize size={13} className="group-hover:scale-110 transition-transform" />
                    )}
                </button>

                <button
                    onClick={handleClose}
                    className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-red-500/80 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-200 group"
                    title="Close"
                >
                    <X size={14} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>
        </div>
    )
}
