Write-Host "Reverting NVIDIA optimization settings..."

$ErrorActionPreference = 'SilentlyContinue'

# Function to check for NVIDIA GPU presence
function Test-NvidiaGpuPresence {
    $nvidiaGpu = Get-PnpDevice -Class Display -Status OK | Where-Object { $_.FriendlyName -like "*NVIDIA*" }
    if ($nvidiaGpu) {
        return $true
    } else {
        return $false
    }
}

if (-not (Test-NvidiaGpuPresence)) {
    Write-Host "Bạn không có card đồ họa Nvidia"
    exit 1
}
# Function to set NVIDIA registry keys
function Set-NvidiaRegistryKey {
    param (
        [string]$Path,
        [string]$Name,
        [string]$Value,
        [string]$Type = "DWord"
    )
    $fullPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Video\"
    Get-ChildItem -Path $fullPath -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer -and $_.Name -match "0000$" } | ForEach-Object {
        $driverPath = Join-Path $_.PSPath "0000"
        if (-not (Test-Path $driverPath)) {
            New-Item -Path $driverPath -Force | Out-Null
        }
        Set-ItemProperty -Path $driverPath -Name $Name -Value $Value -Type $Type -ErrorAction SilentlyContinue
        Write-Host "  Set $($Name) to $($Value) in $($driverPath)"
    }
}

# 1. Power Management Mode: Optimal Power (Value: 2)
Set-NvidiaRegistryKey -Name "PowerMizerEnable" -Value "0" # Let driver decide
Set-NvidiaRegistryKey -Name "PowerMizerDefault" -Value "2"
Set-NvidiaRegistryKey -Name "PowerMizerLevel" -Value "2"
Set-NvidiaRegistryKey -Name "PowerMizerLevelAC" -Value "2"
Set-NvidiaRegistryKey -Name "PowerMizerLevelDC" -Value "2"

# 2. Texture Filtering Quality: Quality (Value: 0)
Set-NvidiaRegistryKey -Name "TextureFilterQuality" -Value "0"

# 3. Low Latency Mode: Off (Value: 0)
Set-NvidiaRegistryKey -Name "LowLatencyMode" -Value "0"

# 4. Shader Cache: On (Value: 1) - Generally beneficial, keeping it on.

# 5. Threaded Optimization: Auto (Value: 2)
Set-NvidiaRegistryKey -Name "ThreadedOptimization" -Value "2"

# 6. Vertical Sync (V-Sync): Use the 3D application setting (Value: 1)
Set-NvidiaRegistryKey -Name "VSync" -Value "1"

Write-Host "NVIDIA optimization settings reverted to defaults."