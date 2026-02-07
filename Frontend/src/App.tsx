import { useState, useEffect, useLayoutEffect } from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import TitleBar from "./components/titlebar"
import Nav from "./components/nav"
import "./app.css"
import { ToastContainer, Slide } from "react-toastify"
import useBackgroundStore from "./store/backgroundStore"

// Pages
import Home from "./pages/Home"
import Tweaks from "./pages/Tweaks"
import Clean from "./pages/Clean"
import Apps from "./pages/Apps"
import Utilities from "./pages/Utilities"
import DNS from "./pages/DNS"
import Settings from "./pages/Settings"
import Backup from "./pages/Backup"

// Components
import FirstTime from "./components/firsttime"
import UpdateManager from "./components/updatemanager"
import { updateThemeColors } from "./lib/theme"

function App() {
    const [theme] = useState(localStorage.getItem("theme") || "system")
    const location = useLocation()

    const {
        backgroundImageUrl,
        backgroundPosition,
        backgroundSize,
        backgroundRepeat,
        backgroundOpacity,
    } = useBackgroundStore()

    useEffect(() => {
        // Theme logic - simpler implementation
        const applyTheme = (theme: string) => {
            document.body.classList.remove("light", "purple", "dark", "gray", "classic")
            // Currently forcing dark/clean theme as requested design
            document.body.classList.add("dark")
        }
        applyTheme(theme)

        // Sync Primary Color
        const savedColor = localStorage.getItem("vie:primaryColor")
        if (savedColor) {
            updateThemeColors(savedColor)
        }

    }, [theme])

    // Apply background styles globally
    useLayoutEffect(() => {
        if (backgroundImageUrl) {
            document.body.style.backgroundImage = `url(${backgroundImageUrl})`
            document.body.style.backgroundPosition = backgroundPosition
            document.body.style.backgroundSize = backgroundSize
            document.body.style.backgroundRepeat = backgroundRepeat
            document.documentElement.style.setProperty('--background-overlay-opacity', (backgroundOpacity / 100).toString());
            document.body.classList.add("has-custom-background");
        } else {
            document.body.style.backgroundImage = ""
            document.body.style.backgroundPosition = ""
            document.body.style.backgroundSize = ""
            document.body.style.backgroundRepeat = ""
            document.documentElement.style.removeProperty('--background-overlay-opacity');
            document.body.classList.remove("has-custom-background");
        }
    }, [backgroundImageUrl, backgroundPosition, backgroundSize, backgroundRepeat, backgroundOpacity])

    return (
        <div className="flex flex-col h-screen bg-transparent text-vie-text overflow-hidden font-sans select-none">
            <FirstTime />

            {/* Background Effects - Global overlay for all pages */}
            <BackgroundEffects />

            {/* Fixed Layout Elements */}
            <TitleBar />
            <Nav />

            {/* Main Content Area - Padded top to account for TitleBar height only (40px) */}
            <div className="flex-1 w-full pt-[40px] overflow-hidden relative">
                <main className="h-full w-full overflow-y-auto overflow-x-hidden">
                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            <Route path="/" element={<Home />} />
                            <Route path="/tweaks" element={<Tweaks />} />
                            <Route path="/clean" element={<Clean />} />
                            <Route path="/backup" element={<Backup />} />
                            <Route path="/utilities" element={<Utilities />} />
                            <Route path="/dns" element={<DNS />} />
                            <Route path="/apps" element={<Apps />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AnimatePresence>
                </main>
            </div>

            <UpdateManager />
            <ToastContainer
                stacked
                limit={5}
                position="bottom-right"
                theme="dark"
                transition={Slide}
                hideProgressBar
                pauseOnFocusLoss={false}
                toastClassName="!bg-vie-card !border !border-vie-border !text-vie-text !rounded-xl !shadow-2xl !backdrop-blur-lg"
            />
        </div>
    )
}

// Background Effects Component - Beautiful but lightweight
function BackgroundEffects() {
    const backgroundEffectEnabled = localStorage.getItem("vie:backgroundEffect") !== "false"

    if (!backgroundEffectEnabled) return null

    return (
        <>
            {/* Ambient Glow 1 - Top Left */}
            <div className="fixed -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-emerald-500/6 blur-[120px] animate-float-slow" />
            
            {/* Ambient Glow 2 - Top Right */}
            <div className="fixed top-1/3 -right-20 w-[450px] h-[450px] rounded-full bg-cyan-500/6 blur-[120px] animate-float-slow" style={{ animationDelay: "2s" }} />
            
            {/* Ambient Glow 3 - Bottom Center */}
            <div className="fixed bottom-0 left-1/3 w-[600px] h-[400px] rounded-full bg-blue-500/4 blur-[140px] animate-float-slow" style={{ animationDelay: "4s" }} />
            
            {/* Ambient Glow 4 - Top Center */}
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-purple-500/4 blur-[100px] animate-float-slow" style={{ animationDelay: "1s" }} />
            
            {/* Ambient Glow 5 - Bottom Right */}
            <div className="fixed bottom-20 -right-10 w-[350px] h-[350px] rounded-full bg-fuchsia-500/5 blur-[100px] animate-float-slow" style={{ animationDelay: "3s" }} />
            
            {/* Subtle Grid Pattern */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:64px_64px]" />
        </>
    )
}

export default App
