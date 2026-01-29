<#
.SYNOPSIS
    AMX Ultimate Optimization Script for Windows 10/11/12 (Deep Debloat + Process Destroyer)
    Features:
    - Advanced Network Optimization (Ping, Jitter, TCP/IP)
    - Deep Debloat (based on Vie Debloat)
    - Aggressive Process Reduction (~50 Processes target)
    - Ultimate Performance Power Plan (Max GHz, Unparked Cores)
    - NVMe & Fan Optimization
    - DPC/ISR Latency Reduction
    
    WARNING: Use at your own risk. Create a Restore Point before running!
#>

# --- REQUEST ADMIN PRIVILEGES ---
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell -Verb RunAs -ArgumentList ("-File `"$($MyInvocation.MyCommand.Path)`"")
    exit
}

Write-Host "Initializing AMX Ultimate Tweaks (Deep Optimization)..." -ForegroundColor Cyan

# ==========================================
# 1. NETWORK OPTIMIZATION
# ==========================================
Write-Host ">>> [1/6] Optimizing Network (Latency & Throughput)..." -ForegroundColor Green

# Network Adapter Tweaks
$Interfaces = Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' }
foreach ($Interface in $Interfaces) {
    # Lower Latency Settings
    Set-NetAdapterAdvancedProperty -Name $Interface.Name -DisplayName "Interrupt Moderation" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
    Set-NetAdapterAdvancedProperty -Name $Interface.Name -DisplayName "Flow Control" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
    Set-NetAdapterAdvancedProperty -Name $Interface.Name -DisplayName "Jumbo Packet" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
    Set-NetAdapterAdvancedProperty -Name $Interface.Name -DisplayName "Energy Efficient Ethernet" -DisplayValue "Disabled" -ErrorAction SilentlyContinue 
    Set-NetAdapterAdvancedProperty -Name $Interface.Name -DisplayName "Power Saving Mode" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
}

# TCP Global Parameters
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global rss=enabled
netsh int tcp set global rsc=disabled
netsh int tcp set global ecncapability=disabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global initialrto=2000
netsh int tcp set global nonsackrttresiliency=disabled
netsh int tcp set global maxsynretransmissions=2
netsh int tcp set global hysterestart=disabled
netsh int tcp set global pacingprofile=off

# Registry Network Optimizations
$TcpParams = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
Set-ItemProperty -Path $TcpParams -Name "TcpTimedWaitDelay" -Value 30 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $TcpParams -Name "MaxUserPort" -Value 65534 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $TcpParams -Name "TcpMaxDataRetransmissions" -Value 3 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $TcpParams -Name "DefaultTTL" -Value 64 -Type DWord -ErrorAction SilentlyContinue

# Disable Nagle's Algorithm (TCPNoDelay) & Ack Frequency
$TcpInterfaceParams = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces"
Get-ChildItem $TcpInterfaceParams | ForEach-Object {
    Set-ItemProperty -Path $_.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $_.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $_.PSPath -Name "SackOpts" -Value 0 -Type DWord -ErrorAction SilentlyContinue
}

# ==========================================
# 2. POWER & HARDWARE OPTIMIZATION
# ==========================================
Write-Host ">>> [2/6] Optimizing Power, Fan & Storage..." -ForegroundColor Green

# Enable Ultimate Performance Plan
$UltimatePerf = Get-CimInstance -ClassName Win32_PowerPlan -Namespace root\cimv2\power | Where-Object { $_.ElementName -eq 'Ultimate Performance' }
if (-not $UltimatePerf) {
    powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
    $UltimatePerf = Get-CimInstance -ClassName Win32_PowerPlan -Namespace root\cimv2\power | Where-Object { $_.ElementName -eq 'Ultimate Performance' }
}
if ($UltimatePerf) {
    powercfg -setactive $UltimatePerf.InstanceID.Substring($UltimatePerf.InstanceID.Length - 38, 36)
}
else {
    powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c # High Performance fallback
}

# Disable Hibernation (Frees space, prevents sleep states)
powercfg -h off

# CPU & Cooling Tweaks (Active Cooling, 100% Min/Max CPU)
# AC Settings
powercfg -setacvalueindex scheme_current sub_processor PROCTHROTTLEMIN 100
powercfg -setacvalueindex scheme_current sub_processor PROCTHROTTLEMAX 100
powercfg -setacvalueindex scheme_current SUB_PROCESSOR CPMINCORES 100 # Unpark Cores
powercfg -setacvalueindex scheme_current SUB_PROCESSOR CPMAXCORES 100
powercfg -setacvalueindex scheme_current SUB_PROCESSOR SYSCOOLPOL 1   # Active Cooling (Fan Max)

# Storage / PCI Tweaks
powercfg -setacvalueindex scheme_current SUB_DISK DISKIDLE 0          # Never turn off HDD
powercfg -setacvalueindex scheme_current SUB_PCIEXPRESS ASPM 0        # Link State Power Management: OFF (Max Perf)

powercfg -setactive scheme_current

# ==========================================
# 3. DPC / ISR / SYSTEM RESPONSIVENESS
# ==========================================
Write-Host ">>> [3/6] Optimizing DPC/ISR Latency..." -ForegroundColor Green

$SystemProfile = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
Set-ItemProperty -Path $SystemProfile -Name "NetworkThrottlingIndex" -Value 4294967295 -Type DWord -Force
Set-ItemProperty -Path $SystemProfile -Name "SystemResponsiveness" -Value 0 -Type DWord -Force
Set-ItemProperty -Path $SystemProfile -Name "NoLazyMode" -Value 1 -Type DWord -Force

# Priority Control
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -Value 26 -Type DWord -Force # 26 or 40 (hex 28)

# GPU Priority
$GamesPath = "$SystemProfile\Tasks\Games"
if (Test-Path $GamesPath) {
    Set-ItemProperty -Path $GamesPath -Name "GPU Priority" -Value 8 -Type DWord -Force
    Set-ItemProperty -Path $GamesPath -Name "Priority" -Value 6 -Type DWord -Force
    Set-ItemProperty -Path $GamesPath -Name "Scheduling Category" -Value "High" -Type String -Force
    Set-ItemProperty -Path $GamesPath -Name "SFIO Priority" -Value "High" -Type String -Force
}

# MSDI Message Signaled Interrupts (Generic attempt for GPU/USB/Net - careful here, sticking to safe defaults)
# (Skipped to avoid BSODs on incompatible hardware)

# ==========================================
# 4. PROCESS DESTROYER (Aggressive Services)
# ==========================================
Write-Host ">>> [4/6] Process Destroyer (Targeting ~50 Proc)..." -ForegroundColor Green
Write-Host "NOTE: Preserving Wi-Fi/Internet services." -ForegroundColor Yellow

# Extensive list of safe-to-disable services for "Gaming/Lite" mode
$ServicesToDisable = @(
    # Bloat / Telemetry
    "DiagTrack", "dmwappushservice", "MapsBroker", "RetailDemo", "MessagingService",
    "ConnectedUserExperiences", "OneSyncSvc", "CDPSvc", "CDPUserSvc", "PcaSvc", "WerSvc",
    "SysMain", # Superfetch (Disable on SSD)
    "WSearch", # Windows Search Indexer (Resource heavy)
    
    # Xbox (Optional - comment out if you game on Xbox App)
    "XblGameSave", "XboxGipSvc", "XboxNetApiSvc", "XboxTCUI", "XblAuthManager",
    
    # Printing & Fax
    "Spooler", "Fax",
    
    # Bluetooth (Comment out if using Bluetooth)
    "bthserv", "BthHFSrv",
    
    # Data & Sync
    "PhoneSvc", "WbioSrvc", "SEMgrSvc", "DusmSvc", "lfsvc", "GeolocSvc",
    
    # Windows Insider / Update assistance
    "wisvc", "WaaSMedicSvc",
    
    # Virtualization / Hyper-V (If not using VMs)
    "HvHost", "vmickvpexchange", "vmicguestinterface", "vmicshutdown", "vmicheartbeat",
    
    # Remote Desktop
    "TermService", "SessionEnv", "UmRdpService",
    
    # Themes (Optional: Makes clean Win9x style if disabled, sticking to 'Themes' ENABLED for modern look usually, but disabling for PURE PERF)
    # "Themes", # Keeping Themes enabled for now as it breaks too much UI if disabled.
    
    # Other
    "TouchKeyboardAndHandwritingPanelService", # If not using touch
    "WMPNetworkSvc", "LanmanServer" # File sharing
)

foreach ($Service in $ServicesToDisable) {
    if (Get-Service $Service -ErrorAction SilentlyContinue) {
        Stop-Service $Service -Force -ErrorAction SilentlyContinue
        Set-Service  $Service -StartupType Disabled -ErrorAction SilentlyContinue
        Write-Host "Killed Service: $Service" -ForegroundColor DarkGray
    }
}

# Disable Telemetry Scheduled Tasks
$TasksToDisable = @(
    "\Microsoft\Windows\Customer Experience\*",
    "\Microsoft\Windows\Application Experience\*",
    "\Microsoft\Windows\Feedback\*",
    "\Microsoft\Windows\DiskDiagnostic\*",
    "\Microsoft\Windows\Maps\*",
    "\Microsoft\Windows\HelloFace\*",
    "\Microsoft\Windows\Windows Error Reporting\*",
    "\Microsoft\Windows\Location\*",
    "\Microsoft\Windows\CloudExperienceHost\*"
)
foreach ($TaskPattern in $TasksToDisable) {
    Get-ScheduledTask | Where-Object { $_.TaskName -like "*$TaskPattern*" -or $_.TaskPath -like $TaskPattern } | Disable-ScheduledTask -ErrorAction SilentlyContinue | Out-Null
}

# ==========================================
# 5. DEEP DEBLOAT (Smart Removal)
# ==========================================
Write-Host ">>> [5/6] Performing Deep Debloat..." -ForegroundColor Green

# List from Debloat-Windows (Merged)
$CoreBloat = @(
    "Clipchamp.Clipchamp", "Microsoft.3DBuilder", "Microsoft.549981C3F5F10", # Cortana
    "Microsoft.BingFinance", "Microsoft.BingFoodAndDrink", "Microsoft.BingHealthAndFitness",
    "Microsoft.BingNews", "Microsoft.BingSports", "Microsoft.BingTranslator", "Microsoft.BingTravel",
    "Microsoft.BingWeather", "Microsoft.Copilot", "Microsoft.Getstarted", "Microsoft.Messaging",
    "Microsoft.Microsoft3DViewer", "Microsoft.MicrosoftJournal", "Microsoft.MicrosoftOfficeHub",
    "Microsoft.MicrosoftPowerBIForWindows", "Microsoft.MicrosoftSolitaireCollection", "Microsoft.MicrosoftStickyNotes",
    "Microsoft.MixedReality.Portal", "Microsoft.News", "Microsoft.Office.OneNote", "Microsoft.Office.Sway",
    "Microsoft.OneConnect", "Microsoft.Print3D", "Microsoft.SkypeApp", "Microsoft.Todos",
    "Microsoft.WindowsAlarms", "Microsoft.WindowsFeedbackHub", "Microsoft.WindowsMaps", 
    "Microsoft.WindowsSoundRecorder", "Microsoft.XboxApp", "Microsoft.ZuneVideo", "Microsoft.ZuneMusic",
    "MicrosoftCorporationII.MicrosoftFamily", "MicrosoftTeams", "MSTeams", 
    "microsoft.windowscommunicationsapps", # Mail & Cal
    "Microsoft.XboxGamingOverlay", "Microsoft.XboxIdentityProvider", "Microsoft.XboxSpeechToTextOverlay",
    "Amazon.com.Amazon", "Disney", "Facebook", "Instagram", "Netflix", "Pandora", "Spotify", "TikTok", "Twitter"
)

# Essential Apps to KEEP (Safety Net)
$SafeToKeep = @(
    "Microsoft.WindowsCalculator", "Microsoft.WindowsNotepad", 
    "Microsoft.Paint", "Microsoft.Windows.Photos",
    "Microsoft.WindowsStore", "Microsoft.DesktopAppInstaller"
)

foreach ($App in $CoreBloat) {
    if ($App -in $SafeToKeep) { continue }
    
    $Package = Get-AppxPackage -Name "*$App*" -ErrorAction SilentlyContinue
    if ($Package) {
        Write-Host "Removing App: $($Package.Name)" -ForegroundColor Yellow
        Remove-AppxPackage -Package $Package.PackageFullName -ErrorAction SilentlyContinue
        
        # Remove Provisioned
        $Prov = Get-AppxProvisionedPackage -Online | Where-Object DisplayName -like "*$App*"
        if ($Prov) {
            Remove-AppxProvisionedPackage -Online -PackageName $Prov.PackageName -ErrorAction SilentlyContinue
        }
    }
}

# ==========================================
# 6. CLEANUP & FINAL TWEAKS
# ==========================================
Write-Host ">>> [6/6] Cleanup & Final Polish..." -ForegroundColor Green

# Clear Temp
Remove-Item "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:SystemRoot\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
Clear-DnsClientCache

# Disable Notification Center & Action Center
$RegExplorer = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
if (!(Test-Path $RegExplorer)) { New-Item -Path $RegExplorer -Force | Out-Null }
Set-ItemProperty -Path $RegExplorer -Name "DisableNotificationCenter" -Value 1 -Type DWord -ErrorAction SilentlyContinue

# Disable Timeline (Activity History)
$RegSystem = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
if (!(Test-Path $RegSystem)) { New-Item -Path $RegSystem -Force | Out-Null }
Set-ItemProperty -Path $RegSystem -Name "EnableActivityFeed" -Value 0 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $RegSystem -Name "PublishUserActivities" -Value 0 -Type DWord -ErrorAction SilentlyContinue

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "   AMX ULTIMATE OPTIMIZATION COMPLETE" -ForegroundColor Cyan
Write-Host "   - Process Count Reduced" -ForegroundColor Green
Write-Host "   - Network Latency Minimized" -ForegroundColor Green
Write-Host "   - Power Plan: Ultimate Performance" -ForegroundColor Green
Write-Host "   - Bloatware Removed" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Please RESTART your PC to apply all changes effectively." -ForegroundColor Yellow
Start-Sleep -Seconds 5
