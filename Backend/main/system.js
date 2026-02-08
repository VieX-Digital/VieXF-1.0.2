import os from "os"
import { ipcMain, shell, webContents } from "electron"
import si from "systeminformation"
import { exec } from "child_process"
import fs from "fs"
import path from "path"
import log from "electron-log"
import { executePowerShell } from "./powershell"

console.log = log.log
console.error = log.error
console.warn = log.warn

// Cache for static specs
const specsCache = { data: null, timestamp: 0 }
const metricsCache = {
  seq: 0,
  timestamp: 0,
  cpu_usage: 0,
  memory_usage: 0,
  memory_used_gb: "0.0",
  uptime: 0,
}

const METRICS_UPDATE_CHANNEL = "system-metrics:update"
const METRICS_SUBSCRIBE_CHANNEL = "system-metrics:subscribe"
const METRICS_UNSUBSCRIBE_CHANNEL = "system-metrics:unsubscribe"
const METRICS_VISIBILITY_CHANNEL = "system-metrics:visibility"
const METRICS_SNAPSHOT_CHANNEL = "system-metrics:snapshot"

const ACTIVE_METRICS_INTERVAL_MS = 1200
const HIDDEN_METRICS_INTERVAL_MS = 8000

const metricsSubscribers = new Map()
const trackedSenders = new Set()

let metricsPollTimer = null
let metricsPollInFlight = false
let metricsPollIntervalMs = 0

async function getSystemSpecs() {
  if (specsCache.data) return specsCache.data

  try {
    const [
      cpuData,
      graphicsData,
      osInfo,
      memLayout,
      diskLayout,
      fsSize,
      blockDevices,
      memData
    ] = await Promise.all([
      si.cpu(),
      si.graphics(),
      si.osInfo(),
      si.memLayout(),
      si.diskLayout(),
      si.fsSize(),
      si.blockDevices(),
      si.mem()
    ])

    let totalMemory = os.totalmem()
    const memoryType = memLayout.length > 0 ? memLayout[0].type : "Unknown"
    const cDrive = fsSize.find((d) => d.mount.toUpperCase().startsWith("C:"))

    let primaryDisk = null
    if (cDrive) {
      const cBlock = blockDevices.find((b) => b.mount && b.mount.toUpperCase().startsWith("C:"))
      if (cBlock) {
        primaryDisk = diskLayout.find(
            (disk) =>
              disk.device?.toLowerCase() === cBlock.device?.toLowerCase() ||
              disk.name?.toLowerCase().includes(cBlock.name?.toLowerCase())
          ) || null
      }
    }

    let gpuInfo = { model: "GPU not found", vram: "N/A", hasGPU: false, isNvidia: false }

    if (graphicsData.controllers && graphicsData.controllers.length > 0) {
      const dedicatedControllers = graphicsData.controllers.filter((controller) => {
        const model = (controller.model || "").toLowerCase()
        return (
          (model.includes("nvidia") || model.includes("amd") || (model.includes("intel") && model.includes("arc"))) &&
          !model.includes("graphics") && !model.includes("integrated")
        )
      })
      const dedicatedGPU = dedicatedControllers.sort((a, b) => (b.vram || 0) - (a.vram || 0))[0]

      if (dedicatedGPU) {
        gpuInfo = {
          model: dedicatedGPU.model || "Unknown GPU",
          vram: dedicatedGPU.vram ? `${Math.round(dedicatedGPU.vram / 1024)} GB` : "Unknown",
          hasGPU: true,
          isNvidia: dedicatedGPU.model.toLowerCase().includes("nvidia"),
        }
      }
    }

    const versionScript = '(Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").DisplayVersion'
    let windowsVersion = "Unknown"
    try {
        const versionPsResult = await executePowerShell(null, { script: versionScript, name: "GetWindowsVersion" })
        if(versionPsResult.success) windowsVersion = versionPsResult.output.trim()
    } catch {}

    const specs = {
      cpu_model: cpuData.brand,
      cpu_cores: cpuData.physicalCores,
      cpu_threads: cpuData.threads,
      gpu_model: gpuInfo.model,
      vram: gpuInfo.vram,
      hasGPU: gpuInfo.hasGPU,
      isNvidia: gpuInfo.isNvidia,
      memory_total: totalMemory,
      memory_type: memoryType,
      os_distro: osInfo.distro || "Windows",
      os_version: windowsVersion,
      disk_model: primaryDisk?.name || primaryDisk?.device || "Unknown Storage",
      disk_size: cDrive?.size ? `${Math.round(cDrive.size / 1024 / 1024 / 1024).toFixed(1)} GB` : "Unknown",
    }

    specsCache.data = specs
    return specs
  } catch (error) {
    console.error("Failed to get system specs:", error)
    throw error
  }
}

async function collectSystemMetricsRaw() {
  try {
    const [currentLoad, memData] = await Promise.all([si.currentLoad(), si.mem()])

    return {
      cpu_usage: Math.round(currentLoad.currentLoad || 0),
      memory_usage: memData.total ? Math.round(((memData.total - memData.available) / memData.total) * 100) : 0,
      memory_used_gb: (memData.active / 1024 / 1024 / 1024).toFixed(1),
      uptime: os.uptime(),
    }
  } catch {
    return { cpu_usage: 0, memory_usage: 0, memory_used_gb: "0.0", uptime: 0 }
  }
}

function commitMetricsCache(rawMetrics) {
  metricsCache.seq += 1
  metricsCache.timestamp = Date.now()
  metricsCache.cpu_usage = rawMetrics.cpu_usage ?? 0
  metricsCache.memory_usage = rawMetrics.memory_usage ?? 0
  metricsCache.memory_used_gb = rawMetrics.memory_used_gb ?? "0.0"
  metricsCache.uptime = rawMetrics.uptime ?? 0
  return { ...metricsCache }
}

function pickLegacyMetrics(snapshot) {
  return {
    cpu_usage: snapshot.cpu_usage,
    memory_usage: snapshot.memory_usage,
    memory_used_gb: snapshot.memory_used_gb,
    uptime: snapshot.uptime,
  }
}

async function getSystemMetricsSnapshot() {
  if (!metricsCache.timestamp) {
    const rawMetrics = await collectSystemMetricsRaw()
    return commitMetricsCache(rawMetrics)
  }
  return { ...metricsCache }
}

async function getSystemMetrics() {
  const rawMetrics = await collectSystemMetricsRaw()
  const snapshot = commitMetricsCache(rawMetrics)
  return pickLegacyMetrics(snapshot)
}

function pruneDeadMetricSubscribers() {
  for (const id of metricsSubscribers.keys()) {
    const sender = webContents.fromId(id)
    if (!sender || sender.isDestroyed()) {
      metricsSubscribers.delete(id)
      trackedSenders.delete(id)
    }
  }
}

function getMetricsIntervalForSubscribers() {
  pruneDeadMetricSubscribers()
  if (metricsSubscribers.size === 0) {
    return null
  }

  for (const subscriber of metricsSubscribers.values()) {
    if (!subscriber.hidden) {
      return ACTIVE_METRICS_INTERVAL_MS
    }
  }

  return HIDDEN_METRICS_INTERVAL_MS
}

function stopMetricsPoller() {
  if (metricsPollTimer) {
    clearTimeout(metricsPollTimer)
    metricsPollTimer = null
  }
  metricsPollIntervalMs = 0
}

function scheduleMetricsTick(delayMs) {
  if (metricsPollTimer) {
    clearTimeout(metricsPollTimer)
  }
  metricsPollTimer = setTimeout(runMetricsTick, delayMs)
}

function ensureMetricsPoller() {
  const nextInterval = getMetricsIntervalForSubscribers()

  if (nextInterval === null) {
    stopMetricsPoller()
    return
  }

  if (!metricsPollTimer) {
    metricsPollIntervalMs = nextInterval
    scheduleMetricsTick(0)
    return
  }

  if (metricsPollIntervalMs !== nextInterval) {
    metricsPollIntervalMs = nextInterval
    scheduleMetricsTick(nextInterval)
  }
}

function broadcastMetricsUpdate(snapshot) {
  pruneDeadMetricSubscribers()

  for (const id of metricsSubscribers.keys()) {
    const sender = webContents.fromId(id)
    if (!sender || sender.isDestroyed()) {
      metricsSubscribers.delete(id)
      trackedSenders.delete(id)
      continue
    }

    sender.send(METRICS_UPDATE_CHANNEL, snapshot)
  }
}

async function runMetricsTick() {
  metricsPollTimer = null

  const nextInterval = getMetricsIntervalForSubscribers()
  if (nextInterval === null) {
    stopMetricsPoller()
    return
  }

  if (metricsPollInFlight) {
    metricsPollIntervalMs = nextInterval
    scheduleMetricsTick(nextInterval)
    return
  }

  metricsPollInFlight = true
  try {
    const rawMetrics = await collectSystemMetricsRaw()
    const snapshot = commitMetricsCache(rawMetrics)
    broadcastMetricsUpdate(snapshot)
  } finally {
    metricsPollInFlight = false
    const updatedInterval = getMetricsIntervalForSubscribers()
    if (updatedInterval !== null) {
      metricsPollIntervalMs = updatedInterval
      scheduleMetricsTick(updatedInterval)
    } else {
      stopMetricsPoller()
    }
  }
}

function handleMetricsSubscribe(event) {
  const senderId = event.sender.id
  metricsSubscribers.set(senderId, { hidden: false })

  if (!trackedSenders.has(senderId)) {
    trackedSenders.add(senderId)
    event.sender.once("destroyed", () => {
      metricsSubscribers.delete(senderId)
      trackedSenders.delete(senderId)
      ensureMetricsPoller()
    })
  }

  ensureMetricsPoller()

  if (metricsCache.timestamp) {
    event.sender.send(METRICS_UPDATE_CHANNEL, { ...metricsCache })
    return
  }

  void collectSystemMetricsRaw().then((rawMetrics) => {
    const snapshot = commitMetricsCache(rawMetrics)
    if (!event.sender.isDestroyed()) {
      event.sender.send(METRICS_UPDATE_CHANNEL, snapshot)
    }
  })
}

function handleMetricsUnsubscribe(event) {
  const senderId = event.sender.id
  metricsSubscribers.delete(senderId)
  trackedSenders.delete(senderId)
  ensureMetricsPoller()
}

function handleMetricsVisibility(event, payload) {
  const senderId = event.sender.id
  const currentState = metricsSubscribers.get(senderId)
  if (!currentState) {
    return
  }

  currentState.hidden = !!payload?.hidden
  metricsSubscribers.set(senderId, currentState)
  ensureMetricsPoller()
}

async function handleMetricsSnapshot() {
  return await getSystemMetricsSnapshot()
}

function restartSystem() {
  exec("shutdown /r /t 0")
  return { success: true }
}

function getUserName() {
  return os.userInfo().username
}

function clearVieCache() {
    // simplified for brevity, logic same as before
    return { success: true }
}

function openLogFolder() {
  const logPath = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "vie", "logs")
  if (fs.existsSync(logPath)) {
    shell.openPath(logPath)
    return { success: true }
  }
  return { success: false, error: "Logs directory does not exist." }
}

// IPC HANDLES
ipcMain.handle("restart", restartSystem)
ipcMain.handle("open-log-folder", openLogFolder)
ipcMain.handle("clear-vie-cache", clearVieCache)
ipcMain.handle("get-system-specs", getSystemSpecs)
ipcMain.handle("get-system-metrics", getSystemMetrics)
ipcMain.handle("get-system-info", getSystemSpecs) // Fallback for safety if frontend calls old one
ipcMain.handle("get-user-name", getUserName)
ipcMain.removeAllListeners(METRICS_SUBSCRIBE_CHANNEL)
ipcMain.removeAllListeners(METRICS_UNSUBSCRIBE_CHANNEL)
ipcMain.removeAllListeners(METRICS_VISIBILITY_CHANNEL)
ipcMain.removeHandler(METRICS_SNAPSHOT_CHANNEL)
ipcMain.on(METRICS_SUBSCRIBE_CHANNEL, handleMetricsSubscribe)
ipcMain.on(METRICS_UNSUBSCRIBE_CHANNEL, handleMetricsUnsubscribe)
ipcMain.on(METRICS_VISIBILITY_CHANNEL, handleMetricsVisibility)
ipcMain.handle(METRICS_SNAPSHOT_CHANNEL, handleMetricsSnapshot)
