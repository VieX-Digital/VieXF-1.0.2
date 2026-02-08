import { useState, useEffect } from "react"
import { Minimize2, Maximize2, CircleX } from "lucide-react"

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
        <div className="h-[42px] flex justify-between items-center bg-black/60 backdrop-blur-2xl border-b border-white/10 select-none pl-4 draggable z-[9999] fixed top-0 left-0 right-0 transition-all duration-300 shadow-lg">
            {/* App Title / Logo Area */}
            <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse" />
                <div className="flex items-baseline gap-1.5 text-sm font-medium tracking-wide">
                    <span className="text-white font-bold font-display">VIE</span>
                    <span className="text-cyan-400 font-bold">XF</span>
<<<<<<< HEAD
                    <span className="text-[10px] text-white/40 font-mono ml-1"></span>
=======
                    <span className="text-[10px] text-white/40 font-mono ml-1">v1.0.2</span>
>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)
                </div>
            </div>

            {/* Window Controls */}
            <div className="flex h-full no-drag">
                <button
                    onClick={handleMinimize}
                    className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-cyan-500/20 transition-all duration-200 group"
                    title="Minimize"
                >
                    <Minimize2 size={14} className="group-hover:scale-110 group-hover:rotate-6 transition-transform" />
                </button>

                <button
                    onClick={handleMaximizeToggle}
                    className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-cyan-500/20 transition-all duration-200 group"
                    title={maximized ? "Restore" : "Maximize"}
                >
                    {maximized ? (
                        <Minimize2 size={13} className="group-hover:scale-125 transition-transform transform rotate-180" />
                    ) : (
                        <Maximize2 size={13} className="group-hover:scale-125 transition-transform" />
                    )}
                </button>

                <button
                    onClick={handleClose}
                    className="w-12 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-red-500/80 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-200 group"
                    title="Close"
                >
                    <CircleX size={14} className="group-hover:scale-125 group-hover:rotate-90 transition-transform" />
                </button>
            </div>
        </div>
    )
}