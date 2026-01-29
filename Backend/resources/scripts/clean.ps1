param (
    [switch]$Temp,
    [switch]$Prefetch,
    [switch]$Update,
    [switch]$Recycle
)

if ($Temp) {
    Write-Host "Cleaning Temp..."
    Remove-Item "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "$env:windir\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
}

if ($Prefetch) {
    Write-Host "Cleaning Prefetch..."
    Remove-Item "$env:windir\Prefetch\*" -Recurse -Force -ErrorAction SilentlyContinue
}

if ($Update) {
    Write-Host "Cleaning Windows Update..."
    Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
    Remove-Item "$env:windir\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Service -Name wuauserv -ErrorAction SilentlyContinue
}

if ($Recycle) {
    Write-Host "Emptying Recycle Bin..."
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
}

Write-Host "Cleanup Complete."
