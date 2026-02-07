import { ipcMain } from "electron"
import { executePowerShell } from "./powershell"

export const setupAppsHandlers = () => {
    ipcMain.handle("apps:remove", async (event, ids) => {
        if (!ids || ids.length === 0) return { success: true }
        
        // Map ids to package names partials
        const appMap = {
            "cortana": "Microsoft.549981C3F5F10",
            "edge": "Microsoft.MicrosoftEdge", // Careful, might not be removable easily
            "onedrive": "Microsoft.OneDrive",
            "xbox": "Xbox",
            "maps": "Microsoft.WindowsMaps",
            "weather": "Microsoft.BingWeather",
            "news": "Microsoft.Windows.ContentDeliveryManager", // News & Interests often linked here
            "telemetry": "DiagTrack" // Service, not app, but we handle it
        }

        let script = ""
        
        ids.forEach(id => {
            const keys = Object.keys(appMap)
            const target = appMap[id] || id
            
            if (id === "telemetry") {
                 script += `
                    Stop-Service DiagTrack -Force -ErrorAction SilentlyContinue
                    Set-Service DiagTrack -StartupType Disabled
                 `
            } else if (id === "onedrive") {
                 script += `
                    taskkill /f /im OneDrive.exe -ErrorAction SilentlyContinue
                    $onedrive = "$env:LOCALAPPDATA\\Microsoft\\OneDrive\\OneDriveSetup.exe"
                    if (Test-Path $onedrive) {
                        Start-Process $onedrive -ArgumentList "/uninstall" -Wait -NoNewWindow
                    }
                 `
            } else {
                 script += `Get-AppxPackage *${target}* | Remove-AppxPackage -ErrorAction SilentlyContinue\n`
            }
        })

       try {
          await executePowerShell(null, { script, name: "Remove-Apps" })
          return { success: true }
       } catch (err) {
          return { success: false, error: err.message }
       }
    })
}

export default { setupAppsHandlers }
