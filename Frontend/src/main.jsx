import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import { HashRouter } from "react-router-dom"
import { init } from "@sentry/electron/renderer"
import { init as reactInit } from "@sentry/react"
import * as Sentry from "@sentry/react"
import "./i18n"

init(
  {
    dsn: "https://d1e8991c715dd717e6b7b44dbc5c43dd@o4509167771648000.ingest.us.sentry.io/4509167772958720",
    sendDefaultPii: true,
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  },
  reactInit,
)

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)