import { app, shell, BrowserWindow, ipcMain } from "electron"
import path, { join } from "path"
import * as Sentry from "@sentry/electron/main"
import { IPCMode } from "@sentry/electron/main"
import log from "electron-log"
import "./system"
import "./powershell"
import "./rpc"
import "./tweakHandler"
import "./dnsHandler"
import "./backup"
import { executePowerShell } from "./powershell"
import { createTray } from "./tray"
import { setupTweaksHandlers } from "./tweakHandler"
import { setupDNSHandlers } from "./dnsHandler"
import { setupCleanHandlers } from "./cleanHandler"
import { setupUtilitiesHandlers } from "./utilitiesHandler"
import { setupAppsHandlers } from "./appsHandler"
import Store from "electron-store"
import { startDiscordRPC, stopDiscordRPC } from "./rpc"
import { initAutoUpdater, triggerAutoUpdateCheck } from "./updates.js"

// DIAGNOSTIC LOGGING: Check if @electron-toolkit/utils can be resolved
try {
  const utilsPath = require.resolve("@electron-toolkit/utils")
  log.info("[DIAGNOSTIC] @electron-toolkit/utils resolved at:", utilsPath)
  log.info("[DIAGNOSTIC] app.isPackaged:", app.isPackaged)
  log.info("[DIAGNOSTIC] __dirname:", __dirname)
  log.info("[DIAGNOSTIC] process.resourcesPath:", process.resourcesPath)
  log.info("[DIAGNOSTIC] app.getAppPath():", app.getAppPath())
} catch (error) {
  log.error("[DIAGNOSTIC] Failed to resolve @electron-toolkit/utils:", error.message)
  log.error("[DIAGNOSTIC] Error stack:", error.stack)
}

// Now import after diagnostic check
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
Sentry.init({
  dsn: "https://d1e8991c715dd717e6b7b44dbc5c43dd@o4509167771648000.ingest.us.sentry.io/4509167772958720",
  ipcMode: IPCMode.Both,
})
console.log = log.log
console.error = log.error
console.warn = log.warn

<<<<<<< HEAD
export const logo = "[viex]:"
=======
export const logo = "[viexf]:"
>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)
log.initialize()
export const getResourcePath = (...segments) => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...segments)
  }
  return path.join(process.cwd(), "Backend", "resources", ...segments)
}
async function Defender() {
  const Apppath = path.dirname(process.execPath)
  if (app.isPackaged) {
    const result = await executePowerShell(null, {
      script: `Add-MpPreference -ExclusionPath ${Apppath}`,
      name: "Add-MpPreference",
    })
    if (result.success) {
<<<<<<< HEAD
      console.log(logo, "Added VieX to Windows Defender Exclusions")
=======
      console.log(logo, "Added VieXF to Windows Defender Exclusions")
>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)
    } else {
      console.error(logo, "Failed to add Vie to Windows Defender Exclusions", result.error)
    }
  } else {
    console.log(logo, "Running in development mode, skipping Windows Defender exclusion")
  }
}

const store = new Store()

let trayInstance = null
if (store.get("showTray") === undefined) {
  store.set("showTray", true)
}

ipcMain.handle("tray:get", () => {
  return store.get("showTray")
})
ipcMain.handle("set-tray-visibility", (event, value) => {
  store.set("showTray", value)
  if (mainWindow) {
    if (value) {
      if (!trayInstance) {
        trayInstance = createTray(mainWindow)
      }
    } else {
      if (trayInstance) {
        trayInstance.destroy()
        trayInstance = null
      }
    }
  }
  return store.get("showTray")
})

const initDiscordRPC = async () => {
  if (store.get("discord-rpc") === undefined) {
    store.set("discord-rpc", true)
    console.log("(main.js) ", logo, "Starting Discord RPC")
    await startDiscordRPC()
  } else if (store.get("discord-rpc") === true) {
    console.log("(main.js) ", logo, "Starting Discord RPC (from settings)")
    await startDiscordRPC()
  }
}

initDiscordRPC().catch((err) => {
  console.warn("(main.js) ", "Failed to initialize Discord RPC:", err.message)
})

ipcMain.handle("discord-rpc:toggle", async (event, value) => {
  try {
    if (value) {
      store.set("discord-rpc", true)
      console.log(logo, "Starting Discord RPC")
      await startDiscordRPC()
    } else {
      store.set("discord-rpc", false)
      console.log(logo, "Stopping Discord RPC")
      await stopDiscordRPC()
    }
    return { success: true, enabled: store.get("discord-rpc") }
  } catch (error) {
    console.error(logo, "Error toggling Discord RPC:", error)
    return {
      success: false,
      error: error.message,
      enabled: store.get("discord-rpc"),
    }
  }
})
ipcMain.handle("discord-rpc:get", () => {
  return store.get("discord-rpc")
})

export let mainWindow = null

function createWindow() {
  let windowIcon
  try {
    windowIcon = getResourcePath("vie.ico")
  } catch (error) {
    console.warn(`[vie]: Could not resolve window icon path, using default`)
    windowIcon = undefined  // Electron will use default icon
  }

  mainWindow = new BrowserWindow({
    width: 1380,
    backgroundColor: "#0c121f",
    height: 760,
    minWidth: 1380,
    minHeight: 760,
    center: true,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    icon: windowIcon,
    titleBarStyle: 'hidden',
    transparent: true,
    vibrancy: 'acrylic',
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      devTools: app.isPackaged ? false : true,
      sandbox: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })
}

app.whenReady().then(() => {
    createWindow()
    initAutoUpdater(() => mainWindow)
    if (store.get("showTray")) {
      trayInstance = createTray(mainWindow)
    }
  setTimeout(() => {
    void triggerAutoUpdateCheck()
  }, 1500)

  setTimeout(() => {
    void Defender()
    setupTweaksHandlers()
    setupDNSHandlers()
    setupCleanHandlers()
    setupUtilitiesHandlers()
    setupAppsHandlers()
  }, 0)

  electronApp.setAppUserModelId("com.parcoil.vie")

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on("window-minimize", () => {
    if (mainWindow) mainWindow.minimize()
  })

  ipcMain.on("window-toggle-maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.on("window-close", () => {
    if (mainWindow) {
      if (store.get("showTray")) {
        mainWindow.hide()
      } else {
        app.quit()
      }
    }
  })

  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
  } else {
    app.on("second-instance", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })
  }
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})