import { useState, useEffect } from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import TitleBar from "./components/titlebar.tsx"
import Nav from "./components/nav.tsx"
import "./app.css"
import { ToastContainer, Slide } from "react-toastify"

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

function App() {
    const [theme] = useState(localStorage.getItem("theme") || "system")
    const location = useLocation()

    useEffect(() => {
        // Theme logic - simpler implementation
        const applyTheme = (theme: string) => {
            document.body.classList.remove("light", "purple", "dark", "gray", "classic")
            // Currently forcing dark/clean theme as requested design
            document.body.classList.add("dark")
        }
        applyTheme(theme)


    }, [theme])

    return (
        <div className="flex flex-col h-screen bg-vie-bg text-vie-text overflow-hidden font-sans select-none">
            <FirstTime />

            {/* Fixed Layout Elements */}
            <TitleBar />
            <Nav />

            {/* Main Content Area - Padded top to account for TitleBar(40px) + Nav(50px) */}
            <div className="flex-1 w-full pt-[90px] overflow-hidden relative">
                <main className="h-full w-full overflow-y-auto overflow-x-hidden no-scrollbar">
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
                toastClassName="!bg-vie-card !border !border-vie-border !text-vie-text !rounded-xl !shadow-2xl !backdrop-blur-xl"
            />
        </div>
    )
}

export default App
