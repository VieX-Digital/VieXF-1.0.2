import { exec } from "child_process"
import { ipcMain } from "electron"
import fs from "fs"
import log from "electron-log"
console.log = log.log
console.error = log.error
console.warn = log.warn

function runPowerShell(cmd) {
  return new Promise((resolve, reject) => {
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${cmd}"`,
      { windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(stderr || err.message)
        resolve(stdout)
      },
    )
  })
}

function changeRestorePointCooldown() {
  return runPowerShell(
    "New-ItemProperty -Path 'HKLM:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore' -Name 'SystemRestorePointCreationFrequency' -Value 0 -PropertyType DWord -Force",
  )
}

function getTimestamp() {
  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`
}

ipcMain.handle("create-vie-restore-point", async () => {
  const label = `VieBackup-${getTimestamp()}`
  try {
    await runPowerShell(`Checkpoint-Computer -Description '${label}'`)
    await changeRestorePointCooldown()
    return { success: true, label }
  } catch (error) {
    console.error(error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("create-restore-point", async (_, name) => {
  try {
    const label = name ? `${name}-${getTimestamp()}` : `ManualRestore-${getTimestamp()}`

    await runPowerShell(`Checkpoint-Computer -Description '${label}'`)
    await changeRestorePointCooldown()
    return { success: true, label }
  } catch (error) {
    console.error(error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("delete-all-restore-points", async (_, sequenceNumber) => {
  try {
    await runPowerShell(`vssadmin delete shadows /all /quiet`)
    await changeRestorePointCooldown()
    return { success: true }
  } catch (error) {
    console.error("Error deleting all restore points:", error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("get-restore-points", async () => {
  try {
    const output = await runPowerShell(
      "Get-ComputerRestorePoint | Select-Object SequenceNumber, Description, CreationTime, EventType, RestorePointType | ConvertTo-Json",
    )
    await changeRestorePointCooldown()

    let points = []
    try {
      points = JSON.parse(output)
      if (!Array.isArray(points)) points = [points]
    } catch {
      points = []
    }
    return { success: true, points }
  } catch (error) {
    console.error(error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("restore-restore-point", async (_, sequenceNumber) => {
  try {
    await runPowerShell(`Restore-Computer -RestorePoint ${sequenceNumber}`)
    await changeRestorePointCooldown()
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("delete-old-vie-backups", async () => {
  return new Promise((resolve, reject) => {
    const vieRoot = `C:\\Vie`
    if (!fs.existsSync(vieRoot)) {
      return resolve({ success: true, message: "Vie folder does not exist" })
    }

    fs.rm(vieRoot, { recursive: true, force: true }, (err) => {
      if (err) return reject(err)
      resolve({ success: true, message: "Vie folder deleted" })
    })
  })
})
