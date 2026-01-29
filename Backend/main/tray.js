import { Tray, Menu, app, nativeImage } from "electron"
import fs from "fs"
import path from "path"
import { getResourcePath } from "./index"

function loadTrayIcon() {
  const candidates = [
    getResourcePath("vie.ico"),
    getResourcePath("vie.png"),
    path.join(process.resourcesPath, "Backend", "resources", "vie.ico"),
    path.join(process.resourcesPath, "Backend", "resources", "vie.png"),
    path.join(process.resourcesPath, "app.asar.unpacked", "resources", "vie.ico"),
    path.join(process.resourcesPath, "app.asar.unpacked", "resources", "vie.png"),
    path.join(process.resourcesPath, "app.asar.unpacked", "Backend", "resources", "vie.ico"),
    path.join(process.resourcesPath, "app.asar.unpacked", "Backend", "resources", "vie.png"),
  ]

  for (const iconPath of candidates) {
    if (!iconPath || !fs.existsSync(iconPath)) continue
    const image = nativeImage.createFromPath(iconPath)
    if (!image.isEmpty()) {
      return { image, iconPath }
    }
  }

  return { image: nativeImage.createEmpty(), iconPath: null }
}

export function createTray(mainWindow) {
  let tray
  try {
    const { image, iconPath } = loadTrayIcon()
    tray = new Tray(image)
    if (iconPath) {
      console.log(`[vie]: Tray icon loaded from: ${iconPath}`)
    } else {
      console.warn(`[vie]: Tray icon missing, using empty icon`)
    }
  } catch (error) {
    console.error(`[vie]: Failed to load tray icon:`, error)
    console.warn(`[vie]: Using fallback empty icon for tray`)
    // Fallback: Create empty 16x16 transparent icon to prevent crash
    tray = new Tray(nativeImage.createEmpty())
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: "Open Window", click: () => mainWindow.show() },
    { label: "Quit", click: () => app.quit() },
  ])

  tray.setToolTip("Vie Optimizer")
  tray.setTitle("Vie Optimizer")
  tray.setContextMenu(contextMenu)
  tray.on("click", () => ToggleWindowState(mainWindow))
  return tray
}

function ToggleWindowState(mainWindow) {
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
}
