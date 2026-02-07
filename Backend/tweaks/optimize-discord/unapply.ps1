# Get all Discord processes
$discordProcesses = Get-Process -Name "Discord" -ErrorAction SilentlyContinue

if ($discordProcesses) {
    foreach ($process in $discordProcesses) {
        # Set process priority to Normal
        $process.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Normal
        Write-Host "Set Discord process $($process.Id) priority to Normal."
    }
} else {
    Write-Host "Discord process not found. No changes to revert."
}