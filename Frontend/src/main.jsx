import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import { HashRouter } from "react-router-dom"
import { init } from "@sentry/electron/renderer"
import { init as reactInit } from "@sentry/react"
import * as Sentry from "@sentry/react"
import "./i18n"

init({
  sendDefaultPii: true,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  reactInit,
})

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
