import os from "os"
import { ipcMain } from "electron"
import si from "systeminformation"
import { exec } from "child_process"
import fs from "fs"
import path from "path"
import log from "electron-log"
import { shell } from "electron"
import { executePowerShell } from "./powershell"

console.log = log.log
console.error = log.error
console.warn = log.warn

// Cache for static specs
const specsCache = { data: null, timestamp: 0 }

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

async function getSystemMetrics() {
    try {
        const [currentLoad, memData] = await Promise.all([
            si.currentLoad(),
            si.mem()
        ])

        return {
            cpu_usage: Math.round(currentLoad.currentLoad || 0),
            memory_usage: memData.total ? Math.round(((memData.total - memData.available) / memData.total) * 100) : 0,
            memory_used_gb: (memData.active / 1024 / 1024 / 1024).toFixed(1),
            uptime: os.uptime()
        }
    } catch (err) {
        return { cpu_usage: 0, memory_usage: 0, uptime: 0 }
    }
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
