# Get all Discord processes
$discordProcesses = Get-Process -Name "Discord" -ErrorAction SilentlyContinue

# Define Discord cache paths
$appDataPath = Join-Path $env:APPDATA "discord"
$cachePaths = @(
    (Join-Path $appDataPath "Cache"),
    (Join-Path $appDataPath "Code Cache"),
    (Join-Path $appDataPath "GPUCache")
)

# --- Discord Shutdown Logic ---
if ($discordProcesses) {
    Write-Host "Discord is currently running. Attempting to close Discord for optimal tweak application."
    try {
        Stop-Process -Name "Discord" -Force -ErrorAction Stop
        Write-Host "Discord processes terminated successfully."
        # Give Discord a moment to fully shut down
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "Failed to terminate Discord processes. Some cache files might be in use."
    }
    # Re-check processes after attempting to stop
    $discordProcesses = Get-Process -Name "Discord" -ErrorAction SilentlyContinue
}

# --- Cache Clearing Logic ---
Write-Host "Attempting to clear Discord cache..."

foreach ($cachePath in $cachePaths) {
    if (Test-Path $cachePath) {
        try {
            Remove-Item -Path $cachePath -Recurse -Force -ErrorAction Stop
            Write-Host "Successfully cleared cache: $cachePath"
        } catch {
            Write-Host "Failed to clear cache $cachePath: $($_.Exception.Message)"
        }
    } else {
        Write-Host "Cache path not found: $cachePath (already clear or not present)"
    }
}

# --- Process Priority Logic ---
Write-Host "Attempting to set Discord process priority..."
# Only set priority if Discord is not running, it will apply when Discord starts
if (-not $discordProcesses) {
    Write-Host "Discord is not running. Process priority will be set when Discord starts."
} else {
    # If Discord somehow restarted or wasn't fully closed, try to set priority
    $discordProcesses = Get-Process -Name "Discord" -ErrorAction SilentlyContinue
    if ($discordProcesses) {
        foreach ($process in $discordProcesses) {
            try {
                $process.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal
                Write-Host "Set Discord process $($process.Id) priority to BelowNormal."
            } catch {
                Write-Host "Failed to set priority for process $($process.Id): $($_.Exception.Message)"
            }
        }
    } else {
        Write-Host "Discord process not found after restart attempt. Priority will be set when Discord starts."
    }
}