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
const tweakHistoryPath = path.join(userDataPath, "tweakHistory.json")
const tweakScriptsDir = path.join(userDataPath, "tweak-scripts")
const isDev = !app.isPackaged
const tweaksDir = isDev
  ? path.join(process.cwd(), "Backend", "tweaks")
  : path.join(process.resourcesPath, "tweaks")
const TWEAKS_CACHE_TTL = 5000
let tweaksCache = null
let tweaksCacheAt = 0
let stateWriteQueue = Promise.resolve()
const GPU_CACHE_TTL = 60000
let gpuCache = null
let gpuCacheAt = 0

const getExePath = (exeName) => {
  if (isDev) {
    return path.resolve(process.cwd(), "Backend", "resources", exeName)
  }
  return path.join(process.resourcesPath, exeName)
}

const readJson = async (filePath, fallback) => {
  try {
    const data = await fs.readFile(filePath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    if (error.code === "ENOENT") return fallback
    console.error(`Error reading JSON from ${filePath}:`, error)
    return fallback
  }
}

const writeJson = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
}

const sanitizeFileName = (value) => value.toString().replace(/[^a-zA-Z0-9-_]/g, "_")

const saveScriptSnapshot = async (id, action, script) => {
  if (!script || script.trim().length === 0) return null
  const safeId = sanitizeFileName(id)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const fileName = `${timestamp}-${action}.ps1`
  const dirPath = path.join(tweakScriptsDir, safeId)
  const filePath = path.join(dirPath, fileName)
  await fs.mkdir(dirPath, { recursive: true })
  await fs.writeFile(filePath, script, "utf8")
  return filePath
}

const queueStateWrite = (fn) => {
  stateWriteQueue = stateWriteQueue.then(fn, fn)
  return stateWriteQueue
}

const persistTweakState = async ({ id, action, active, script, note }) => {
  return queueStateWrite(async () => {
    const timestamp = new Date().toISOString()
    const scriptPath = await saveScriptSnapshot(id, action, script)
    const state = await readJson(tweaksStatePath, {})
    const previous = state[id]
    const nextState = {
      ...(previous && typeof previous === "object" ? previous : {}),
      active,
      lastAction: action,
      updatedAt: timestamp,
      lastScriptPath: scriptPath,
      note: note || undefined,
    }
    state[id] = nextState

    const history = await readJson(tweakHistoryPath, [])
    const nextHistory = Array.isArray(history) ? history : []
    nextHistory.unshift({
      id,
      action,
      active,
      timestamp,
      scriptPath,
      note: note || undefined,
    })
    if (nextHistory.length > 500) nextHistory.length = 500

    await writeJson(tweaksStatePath, state)
    await writeJson(tweakHistoryPath, nextHistory)
    return nextState
  })
}

async function loadTweaks({ force = false } = {}) {
  if (!force && tweaksCache && Date.now() - tweaksCacheAt < TWEAKS_CACHE_TTL) {
    return tweaksCache
  }
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
  tweaksCache = tweaks
  tweaksCacheAt = Date.now()
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
    if (gpuCache && Date.now() - gpuCacheAt < GPU_CACHE_TTL) {
      return gpuCache
    }
    const graphicsData = await si.graphics()
    if (!graphicsData.controllers || graphicsData.controllers.length === 0) {
      const fallback = { hasGPU: false, isNvidia: false, model: null }
      gpuCache = fallback
      gpuCacheAt = Date.now()
      return fallback
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

    const result = {
      hasGPU,
      isNvidia,
      model: dedicatedGPU?.model || null,
    }
    gpuCache = result
    gpuCacheAt = Date.now()
    return result
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
    const tweaks = await loadTweaks()
    return tweaks.map(({ psapply, psunapply, ...meta }) => meta)
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
        const result = await NvidiaProfileInspector()
        const script = `# NVIDIA Profile Inspector import\n# NIP: ${getNipPath()}\n# Command: ${getExePath("nvidiaProfileInspector.exe")} -silentImport "${getNipPath()}"\n`
        await persistTweakState({ id, action: "apply", active: true, script })
        return result
      } else {
        console.log(`[vie]: Applying tweak: ${id}`)
        const result = await executePowerShell(null, { script: tweak.psapply, name: id })
        if (result?.success === false) {
          throw new Error(result?.error || `Failed to apply tweak "${id}"`)
        }
        await persistTweakState({ id, action: "apply", active: true, script: tweak.psapply })
        return result
      }
    } else {
      // Unapply the tweak
      if (!tweak.psunapply || tweak.psunapply.trim().length === 0) {
        console.warn(`[vie]: Tweak "${id}" has no unapply script (one-way tweak)`)
        throw new Error(`Tweak "${id}" has no unapply script (one-way tweak)`)
      }
      console.log(`[vie]: Unapplying tweak: ${id}`)
      const result = await executePowerShell(null, { script: tweak.psunapply, name: id })
      if (result?.success === false) {
        throw new Error(result?.error || `Failed to unapply tweak "${id}"`)
      }
      await persistTweakState({ id, action: "unapply", active: false, script: tweak.psunapply })
      return result
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
      const result = await NvidiaProfileInspector()
      const script = `# NVIDIA Profile Inspector import\n# NIP: ${getNipPath()}\n# Command: ${getExePath("nvidiaProfileInspector.exe")} -silentImport "${getNipPath()}"\n`
      await persistTweakState({ id: name, action: "apply", active: true, script })
      return result
    } else {
      console.log(`[vie]: Applying tweak: ${name}`)
      const result = await executePowerShell(null, { script: tweak.psapply, name })
      if (result?.success === false) {
        throw new Error(result?.error || `Failed to apply tweak "${name}"`)
      }
      await persistTweakState({ id: name, action: "apply", active: true, script: tweak.psapply })
      return result
    }
  })

  ipcMain.handle("tweak:unapply", async (_, name) => {
    const tweaks = await loadTweaks()
    const tweak = findTweak(tweaks, name)
    if (!tweak || !tweak.psunapply) {
      throw new Error(`Tweak "${name}" not found or has no unapply script`)
    }
    const result = await executePowerShell(null, { script: tweak.psunapply, name })
    if (result?.success === false) {
      throw new Error(result?.error || `Failed to unapply tweak "${name}"`)
    }
    await persistTweakState({ id: name, action: "unapply", active: false, script: tweak.psunapply })
    return result
  })

  ipcMain.handle("nvidia-inspector", (_, args) => {
    return NvidiaProfileInspector(args)
  })
}

const isActiveState = (value) => {
  if (typeof value === "boolean") return value
  if (value && typeof value === "object") return !!value.active
  return false
}

const getActiveTweaks = () => {
  try {
    const data = fsSync.readFileSync(tweaksStatePath, "utf8")
    const parsed = JSON.parse(data)
    return Object.keys(parsed).filter((key) => isActiveState(parsed[key]))
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
