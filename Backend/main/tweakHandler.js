import { ipcMain, app } from "electron"
import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import { logo } from "./index"
import { executePowerShell } from "./powershell"
import si from "systeminformation"
import log from "electron-log"
console.log = log.log
console.error = log.error
console.warn = log.warn

const execPromise = promisify(exec)
const userDataPath = app.getPath("userData")
const tweaksStatePath = path.join(userDataPath, "tweakStates.json")
const isDev = !app.isPackaged
const tweaksDir = isDev
  ? path.join(process.cwd(), "Backend", "tweaks")
  : path.join(process.resourcesPath, "tweaks")

const getExePath = (exeName) => {
  if (isDev) {
    return path.resolve(process.cwd(), "Backend", "resources", exeName)
  }
  return path.join(process.resourcesPath, exeName)
}

async function loadTweaks() {
  const entries = await fs.readdir(tweaksDir, { withFileTypes: true })
  const tweaks = []
  for (const dir of entries) {
    if (!dir.isDirectory()) continue

    const name = dir.name
    const folder = path.join(tweaksDir, name)

    const applyPath = path.join(folder, "apply.ps1")
    const metaPath = path.join(folder, "meta.json")

    const hasMeta = await fs
      .access(metaPath)
      .then(() => true)
      .catch(() => false)

    if (!hasMeta) continue

    const unapplyPath = path.join(folder, "unapply.ps1")

    let psapply = ""
    let psunapply = ""

    try {
      psapply = await fs.readFile(applyPath, "utf8")
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Error reading apply.ps1 for tweak: ${name}`, error)
      } else {
        console.warn(`[vie]: Tweak "${name}" is missing apply.ps1 - skipping`)
        continue  // Skip this tweak entirely
      }
    }

    // Validate script is not empty
    if (!psapply || psapply.trim().length === 0) {
      console.warn(`[vie]: Tweak "${name}" has empty apply.ps1 - skipping`)
      continue
    }

    try {
      psunapply = await fs.readFile(unapplyPath, "utf8")
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Error reading unapply.ps1 for tweak: ${name}`, error)
      } else {
        console.info(`[vie]: Tweak "${name}" has no unapply.ps1 (one-way tweak)`)
      }
    }

    let meta = {}

    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"))
    } catch (error) {
      console.warn(`Error reading meta.json for tweak: ${name}`, error)
      continue
    }

    tweaks.push({
      id: name,  // Frontend expects 'id' field
      name,
      psapply,
      psunapply: psunapply || "",
      ...meta,
    })
  }
  console.log(`[vie]: Loaded ${tweaks.length} valid tweaks`)
  return tweaks
}

const findTweak = (tweaks, idOrName) => {
  return tweaks.find((t) => t.id === idOrName || t.name === idOrName)
}

const getNipPath = () => {
  if (isDev) {
    return path.resolve(process.cwd(), "Backend", "resources", "vienvidia.nip")
  }
  return path.join(process.resourcesPath, "vienvidia.nip")
}

async function detectGPU() {
  try {
    const graphicsData = await si.graphics()
    if (!graphicsData.controllers || graphicsData.controllers.length === 0) {
      return { hasGPU: false, isNvidia: false, model: null }
    }

    const dedicatedControllers = graphicsData.controllers.filter((controller) => {
      const model = (controller.model || "").toLowerCase()
      return (
        (model.includes("nvidia") &&
          (model.includes("gtx") ||
            model.includes("rtx") ||
            model.includes("titan") ||
            model.includes("quadro") ||
            model.includes("mx") ||
            model.includes("tesla") ||
            model.includes("a100") ||
            model.includes("a40"))) ||
        (model.includes("amd") &&
          (model.includes("radeon") ||
            model.includes("rx") ||
            model.includes("vega") ||
            model.includes("firepro") ||
            model.includes("instinct")) &&
          !model.includes("graphics") &&
          !model.includes("integrated")) ||
        (model.includes("intel") && model.includes("arc"))
      )
    })
    const dedicatedGPU = dedicatedControllers.sort((a, b) => (b.vram || 0) - (a.vram || 0))[0]

    const hasGPU = !!dedicatedGPU
    const isNvidia = hasGPU && dedicatedGPU.model.toLowerCase().includes("nvidia")

    return {
      hasGPU,
      isNvidia,
      model: dedicatedGPU?.model || null,
    }
  } catch (error) {
    console.error("Error detecting GPU:", error)
    return { hasGPU: false, isNvidia: false, model: null }
  }
}

function isGPUTweak(tweak) {
  return tweak.category && tweak.category.includes("GPU")
}

function isNvidiaTweak(tweak) {
  return tweak.name === "optimize-nvidia-settings"
}

function NvidiaProfileInspector() {
  const exePath = getExePath("nvidiaProfileInspector.exe")
  const nipPath = getNipPath()
  return new Promise((resolve, reject) => {
    let hasResolved = false
    const timeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true
        console.error(`[vie]: Nvidia Inspector timed out after 30s`)
        reject(new Error("Nvidia Inspector execution timed out"))
      }
    }, 30000)  // 30 second timeout

    exec(`"${exePath}" -silentImport "${nipPath}"`, (error, stdout, stderr) => {
      if (hasResolved) return  // Timeout already fired
      clearTimeout(timeout)
      hasResolved = true

      console.log("stdout:", stdout)
      console.log("stderr:", stderr)
      if (error) {
        console.error("Error:", error)
        reject(error)
      } else {
        resolve(stdout || "Completed with no output.")
      }
    })
  })
}

export const setupTweaksHandlers = () => {
  ipcMain.handle("tweak-states:load", async () => {
    try {
      await fs.access(tweaksStatePath)
      const data = await fs.readFile(tweaksStatePath, "utf8")
      return data
    } catch (error) {
      if (error.code === "ENOENT") {
        return JSON.stringify({})
      }
      console.error("Error loading tweak states:", error)
      throw error
    }
  })

  ipcMain.handle("tweak-states:save", async (event, payload) => {
    try {
      await fs.mkdir(path.dirname(tweaksStatePath), { recursive: true })
      await fs.writeFile(tweaksStatePath, payload, "utf8")
      return true
    } catch (error) {
      console.error("Error saving tweak states:", error)
      throw error
    }
  })

  ipcMain.handle("tweaks:fetch", async () => {
    return await loadTweaks()
  })

  // Toggle handler - routes to apply or unapply based on state
  ipcMain.handle("tweak:toggle", async (_, { id, state }) => {
    console.log(`[vie]: Toggling tweak "${id}" to ${state ? "ON" : "OFF"}`)
    
    const tweaks = await loadTweaks()
    const tweak = findTweak(tweaks, id)
    
    if (!tweak) {
      throw new Error(`Tweak "${id}" not found`)
    }

    if (state) {
      // Apply the tweak
      if (!tweak.psapply || tweak.psapply.trim().length === 0) {
        throw new Error(`Tweak "${id}" has no apply script`)
      }

      // Check hardware requirements
      if (isGPUTweak(tweak)) {
        const gpuInfo = await detectGPU()
        if (!gpuInfo.hasGPU) {
          throw new Error(`Tweak "${id}" requires a dedicated GPU`)
        }
      }

      if (isNvidiaTweak(tweak)) {
        const gpuInfo = await detectGPU()
        if (!gpuInfo.isNvidia) {
          throw new Error(`Tweak "${id}" requires an NVIDIA GPU`)
        }
      }

      if (id === "optimize-nvidia-settings") {
        console.log(logo, "Running Nvidia settings optimization...")
        return NvidiaProfileInspector()
      } else {
        console.log(`[vie]: Applying tweak: ${id}`)
        return executePowerShell(null, { script: tweak.psapply, name: id })
      }
    } else {
      // Unapply the tweak
      if (!tweak.psunapply || tweak.psunapply.trim().length === 0) {
        console.warn(`[vie]: Tweak "${id}" has no unapply script (one-way tweak)`)
        return { success: true, message: "One-way tweak cannot be reverted" }
      }
      console.log(`[vie]: Unapplying tweak: ${id}`)
      return executePowerShell(null, { script: tweak.psunapply, name: id })
    }
  })

  ipcMain.handle("tweak:apply", async (_, name) => {
    const tweaks = await loadTweaks()
    const tweak = findTweak(tweaks, name)
    if (!tweak) {
      throw new Error(`Tweak "${name}" not found or has no valid apply script`)
    }

    // Extra safety check
    if (!tweak.psapply || tweak.psapply.trim().length === 0) {
      throw new Error(`Tweak "${name}" has empty apply script`)
    }

    // Check hardware requirements for GPU-related tweaks
    if (isGPUTweak(tweak)) {
      const gpuInfo = await detectGPU()
      if (!gpuInfo.hasGPU) {
        throw new Error(`Tweak "${name}" requires a dedicated GPU, but none was detected`)
      }
    }

    if (isNvidiaTweak(tweak)) {
      const gpuInfo = await detectGPU()
      if (!gpuInfo.isNvidia) {
        throw new Error(`Tweak "${name}" is only for NVIDIA GPUs, but none was detected`)
      }
    }

    if (name === "optimize-nvidia-settings") {
      console.log(logo, "Running Nvidia settings optimization...")
      return NvidiaProfileInspector()
    } else {
      console.log(`[vie]: Applying tweak: ${name}`)
      return executePowerShell(null, { script: tweak.psapply, name })
    }
  })

  ipcMain.handle("tweak:unapply", async (_, name) => {
    const tweaks = await loadTweaks()
    const tweak = findTweak(tweaks, name)
    if (!tweak || !tweak.psunapply) {
      throw new Error(`Tweak "${name}" not found or has no unapply script`)
    }
    return executePowerShell(null, { script: tweak.psunapply, name })
  })

  ipcMain.handle("nvidia-inspector", (_, args) => {
    return NvidiaProfileInspector(args)
  })
}

const getActiveTweaks = () => {
  try {
    const data = fsSync.readFileSync(tweaksStatePath, "utf8")
    const parsed = JSON.parse(data)
    return Object.keys(parsed).filter((key) => parsed[key])
  } catch (error) {
    console.error("Error loading tweak states:", error)
    return []
  }
}

ipcMain.handle("tweak:active", () => {
  return getActiveTweaks()
})

export const cleanupTweaksHandlers = () => {
  ipcMain.removeHandler("tweak-states:load")
  ipcMain.removeHandler("tweak-states:save")
  ipcMain.removeHandler("tweaks:fetch")
  ipcMain.removeHandler("tweak:apply")
  ipcMain.removeHandler("tweak:unapply")
  ipcMain.removeHandler("nvidia-inspector")
}

export default {
  setupTweaksHandlers,
  cleanupTweaksHandlers,
}
