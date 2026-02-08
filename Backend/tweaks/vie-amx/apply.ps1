<<<<<<< HEAD
Set-StrictMode -Version Latest
=======
﻿Set-StrictMode -Version Latest
>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)
$ErrorActionPreference = 'Stop'

#region Logging / Elevation
function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-Log {
    param(
        [Parameter(Mandatory)] [string] $Message,
        [ValidateSet('INFO', 'WARN', 'ERROR')] [string] $Level = 'INFO'
    )
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
    $line = "[$ts][$Level] $Message"
    $line | Out-File -FilePath $script:LogFile -Append -Encoding UTF8
    Write-Host $line
}

if (-not (Test-IsAdmin)) {
    Write-Host "[ERROR] Please run this script as Administrator." -ForegroundColor Red
    exit 1
}

$logRoot = Join-Path $env:SystemDrive 'Oneclick Logs'
New-Item -Path $logRoot -ItemType Directory -Force | Out-Null
$script:LogFile = Join-Path $logRoot ("Oneclick-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".log")
Start-Transcript -Path (Join-Path $logRoot ("Transcript-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".txt")) -Force | Out-Null
Write-Log "Log file: $script:LogFile"
#endregion

#region Helpers
function Invoke-External {
    param(
        [Parameter(Mandatory)] [string] $FilePath,
        [string[]] $Arguments = @(),
        [switch] $IgnoreErrors
    )
    if (-not (Test-Path -LiteralPath $FilePath)) {
        Write-Log "External tool not found, skipping: $FilePath" 'WARN'
        return
    }
    try {
        Write-Log "Running: $FilePath $($Arguments -join ' ')"
        $p = Start-Process -FilePath $FilePath -ArgumentList $Arguments -Wait -PassThru -WindowStyle Hidden
        Write-Log "ExitCode: $($p.ExitCode)"
    }
    catch {
        if ($IgnoreErrors) {
            Write-Log "External tool failed (ignored): $FilePath - $($_.Exception.Message)" 'WARN'
        }
        else {
            throw
        }
    }
}

function Invoke-RegExe {
    param(
        [Parameter(Mandatory)] [ValidateSet('add', 'delete')] [string] $Action,
        [Parameter(Mandatory)] [string] $Key,
        [Parameter(Mandatory)] [string] $Rest
    )
    # Split args while preserving quoted segments
    $tokens = [System.Collections.Generic.List[string]]::new()
    foreach ($m in [regex]::Matches($Rest, '"(?:[^"\\]|\\.)*"|\S+')) {
        $tokens.Add($m.Value)
    }
    $args = @($Action, $Key) + $tokens.ToArray()
    try {
        Write-Log "reg.exe $Action $Key $Rest"
        $null = & reg.exe @args 2>$null
    }
    catch {
        Write-Log "reg.exe failed: $Action $Key ($($_.Exception.Message))" 'WARN'
    }
}

function Disable-ScheduledTaskSafe {
    param([Parameter(Mandatory)][string]$TaskName)
    try {
        $t = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
        if ($t.State -ne 'Disabled') {
            Disable-ScheduledTask -InputObject $t | Out-Null
            Write-Log "Disabled scheduled task: $TaskName"
        }
        else {
            Write-Log "Scheduled task already disabled: $TaskName"
        }
    }
    catch {
        Write-Log "Scheduled task not found / cannot disable: $TaskName" 'WARN'
    }
}

function Set-ServiceStartMode {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][ValidateSet('auto', 'demand', 'disabled')] [string]$Start
    )
    try {
        $null = Get-Service -Name $Name -ErrorAction Stop
        $current = (Get-CimInstance Win32_Service -Filter "Name='$Name'" -ErrorAction Stop).StartMode
        $desired = switch ($Start) {
            'auto' { 'Auto' }
            'demand' { 'Manual' }
            'disabled' { 'Disabled' }
        }
        if ($current -notlike "$desired*") {
            & sc.exe config $Name start= $Start | Out-Null
            Write-Log "Service start type set: $Name => $Start"
        }
        else {
            Write-Log "Service start type already: $Name => $Start"
        }
    }
    catch {
        Write-Log "Service not found / cannot set: $Name" 'WARN'
    }
}

function Remove-AppxPattern {
    param([Parameter(Mandatory)][string]$Pattern)
    try {
        $pkgs = Get-AppxPackage -AllUsers -Name $Pattern -ErrorAction SilentlyContinue
        foreach ($p in $pkgs) {
            try {
                Write-Log "Removing AppX (installed): $($p.Name)"
                Remove-AppxPackage -Package $p.PackageFullName -AllUsers -ErrorAction SilentlyContinue
            }
            catch {
                Write-Log "Remove-AppxPackage failed for $($p.Name): $($_.Exception.Message)" 'WARN'
            }
        }

        $prov = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -like $Pattern }
        foreach ($pp in $prov) {
            try {
                Write-Log "Removing AppX (provisioned): $($pp.DisplayName)"
                Remove-AppxProvisionedPackage -Online -PackageName $pp.PackageName -ErrorAction SilentlyContinue | Out-Null
            }
            catch {
                Write-Log "Remove-AppxProvisionedPackage failed for $($pp.DisplayName): $($_.Exception.Message)" 'WARN'
            }
        }
    }
    catch {
        Write-Log "AppX removal failed for pattern ${Pattern}: $($_.Exception.Message)" 'WARN'
    }
}

function Expand-BatchPath {
    param(
        [Parameter(Mandatory)][string]$Text,
        [hashtable]$Vars = @{}
    )
    $s = $Text
    foreach ($k in $Vars.Keys) {
        $s = $s -replace [regex]::Escape("%$k%"), [string]$Vars[$k]
    }
    $s = [regex]::Replace($s, '%([A-Za-z0-9_]+)%', {
            param($m)
            $name = $m.Groups[1].Value
            $val = [Environment]::GetEnvironmentVariable($name)
            if ($null -ne $val) { return $val }
            return $m.Value
        })
    return $s
}
#endregion

try {
    #region Restore Point (BAT prompted; now auto)
    Write-Log "Attempting to create a restore point (automatic)."
    try {
        Invoke-RegExe add 'HKLM\Software\Microsoft\Windows NT\CurrentVersion\SystemRestore' '/v "SystemRestorePointCreationFrequency" /t REG_DWORD /d 0 /f'
        Enable-ComputerRestore -Drive "$env:SystemDrive\" -ErrorAction SilentlyContinue
<<<<<<< HEAD
        Checkpoint-Computer -Description 'VieXF 1.0.0' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction SilentlyContinue
=======
        Checkpoint-Computer -Description 'VieXF 1.0.2' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction SilentlyContinue
>>>>>>> a41e2bc (chore: rename VieX to VieXF, update version to 1.0.2, and optimize Tweaks UI)
        Write-Log "Restore point request submitted."
    }
    catch {
        Write-Log "Restore point creation failed/unsupported: $($_.Exception.Message)" 'WARN'
    }
    #endregion

    #region Scheduled Tasks
    Disable-ScheduledTaskSafe -TaskName 'UCPD velocity'
    #endregion

    #region Registry Tweaks (network-tuning and menu-only branches excluded)
    Write-Log "Applying registry tweaks."
    $RegistryOps = @(
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v HideFileExt /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v Hidden /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'delete'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}'; Rest = '/f' }
        @{ Action = 'delete'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}'; Rest = '/f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer'; Rest = '/v HideSCAMeetNow /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'delete'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}'; Rest = '/f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer'; Rest = '/v NoInstrumentation /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'delete'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{3dfdf296-dbec-4fb4-81d1-6a3438bcf4de}'; Rest = '/f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Desktop'; Rest = '/v MenuShowDelay /t REG_SZ /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v Start_TrackProgs /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v HidePeopleBar /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v DisablePreviewDesktop /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v ShowCortanaButton /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v ShowTaskViewButton /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v TaskbarMn /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v TaskbarDa /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v TaskbarAl /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Blocked'; Rest = '/v `{e2bf9676-5f8f-435c-97eb-11607a5bedf7`} /t REG_SZ /d `"`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v ShowSyncProviderNotifications /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Desktop'; Rest = '/v AutoEndTasks /t REG_SZ /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Desktop'; Rest = '/v WaitToKillAppTimeout /t REG_SZ /d `"2000`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Control'; Rest = '/v WaitToKillServiceTimeout /t REG_SZ /d `"2000`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Desktop'; Rest = '/v HungAppTimeout /t REG_SZ /d `"2000`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Desktop'; Rest = '/v LowLevelHooksTimeout /t REG_SZ /d `"1000`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Mouse'; Rest = '/v MouseHoverTime /t REG_SZ /d `"10`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'; Rest = '/v EnableLUA /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'; Rest = '/v ConsentPromptBehaviorAdmin /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Desktop'; Rest = '/v WindowArrangementActive /t REG_SZ /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize'; Rest = '/v StartupDelayInMSec /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v ListviewAlphaSelect /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v ListviewShadow /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v TaskbarAnimations /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v ListviewWatermark /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v DisableThumbnailCache /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Desktop'; Rest = '/v UserPreferencesMask /t REG_BINARY /d `"9012078010000000`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\DWM'; Rest = '/v EnableAeroPeek /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{29`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{30`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{31`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{32`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{33`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{34`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{35`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{36`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{37`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{38`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons'; Rest = '/v `{39`} /t REG_SZ /d `"%SystemRoot%\System32\imageres.dll,-134`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\DWM'; Rest = '/v AlwaysHibernateThumbnails /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'; Rest = '/v EnableTransparency /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'; Rest = '/v ColorPrevalence /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'; Rest = '/v AppsUseLightTheme /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'; Rest = '/v SystemUsesLightTheme /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'; Rest = '/v LaunchTo /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer'; Rest = '/v NoLowDiskSpaceChecks /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer'; Rest = '/v NoResolveSearch /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer'; Rest = '/v NoResolveTrack /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search'; Rest = '/v AllowCortana /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search'; Rest = '/v DisableWebSearch /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search'; Rest = '/v ConnectedSearchUseWeb /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search'; Rest = '/v ConnectedSearchUseWebOverMeteredConnections /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Search'; Rest = '/v BingSearchEnabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Search'; Rest = '/v CortanaConsent /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Search'; Rest = '/v AllowSearchToUseLocation /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Search'; Rest = '/v DeviceHistoryEnabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Search'; Rest = '/v HistoryViewEnabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search'; Rest = '/v AllowCloudSearch /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search'; Rest = '/v DisableSearchBoxSuggestions /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings'; Rest = '/v IsAADCloudSearchEnabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings'; Rest = '/v IsMSACloudSearchEnabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings'; Rest = '/v SafeSearchMode /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings'; Rest = '/v IsDeviceSearchHistoryEnabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings'; Rest = '/v IsCloudSearchEnabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Software\Microsoft\Windows\CurrentVersion\SearchSettings'; Rest = '/v IsSearchHistoryEnabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System'; Rest = '/v DisableCdp /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System'; Rest = '/v DisableActivityFeed /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System'; Rest = '/v PublishUserActivities /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System'; Rest = '/v UploadUserActivities /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection'; Rest = '/v AllowTelemetry /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection'; Rest = '/v AllowTelemetry /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection'; Rest = '/v MaxTelemetryAllowed /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection'; Rest = '/v MaxTelemetryAllowed /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat'; Rest = '/v AITEnable /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat'; Rest = '/v DisableUAR /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat'; Rest = '/v DisableInventory /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat'; Rest = '/v DisablePCA /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat'; Rest = '/v DisableEngine /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Customer Experience Improvement Program'; Rest = '/v Conset /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Customer Experience Improvement Program'; Rest = '/v DisableCEIP /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Customer Experience Improvement Program'; Rest = '/v DisableUFS /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\SQMClient\Windows'; Rest = '/v CEIPEnable /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\TabletPC'; Rest = '/v PreventHandwritingDataSharing /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\TextInput'; Rest = '/v AllowLinguisticDataCollection /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\SOFTWARE\Microsoft\InputPersonalization'; Rest = '/v RestrictImplicitTextCollection /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\SOFTWARE\Microsoft\InputPersonalization'; Rest = '/v RestrictImplicitInkCollection /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKCU\SOFTWARE\Microsoft\InputPersonalization\TrainedDataStore'; Rest = '/v HarvestContacts /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\SOFTWARE\Microsoft\Personalization\Settings'; Rest = '/v AcceptedPrivacyPolicy /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\SOFTWARE\Microsoft\InputPersonalization'; Rest = '/v PersonalizationPrivacyConsent /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Language'; Rest = '/v Enabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Language'; Rest = '/v Enabled /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System'; Rest = '/v EnableSmartScreen /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System'; Rest = '/v DisableAcrylicBackgroundOnLogon /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Services\TimeBrokerSvc'; Rest = '/v Start /t REG_DWORD /d `"4`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Services\CDPSvc'; Rest = '/v Start /t REG_DWORD /d `"4`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Services\DiagTrack'; Rest = '/v Start /t REG_DWORD /d `"4`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Services\diagnosticshub.standardcollector.service'; Rest = '/v Start /t REG_DWORD /d `"4`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Services\dmwappushservice'; Rest = '/v Start /t REG_DWORD /d `"4`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Services\MapsBroker'; Rest = '/v Start /t REG_DWORD /d `"4`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Services\ndu'; Rest = '/v Start /t REG_DWORD /d `"4`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Services\PcaSvc'; Rest = '/v Start /t REG_DWORD /d `"4`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\DirectX\UserGpuPreferences'; Rest = '/v DirectXUserGlobalSettings /t REG_SZ /d SwapEffectUpgradeEnable=1 /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Accessibility\StickyKeys'; Rest = '/v Flags /t REG_SZ /d `"506`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Accessibility\Keyboard Response'; Rest = '/v Flags /t REG_SZ /d `"122`" /f' }
        @{ Action = 'add'; Key = 'HKCU\Control Panel\Accessibility\ToggleKeys'; Rest = '/v Flags /t REG_SZ /d `"58`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer'; Rest = '/v Max Cached Icons /t REG_SZ /d `"4096`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SOFTWARE\Microsoft\Windows\Dwm'; Rest = '/v OverlayTestMode /t REG_DWORD /d 5 /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Kernel'; Rest = '/v DynamicHeteroCpuPolicyMask /t REG_DWORD /d `"3`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Kernel'; Rest = '/v DefaultDynamicHeteroCpuPolicy /t REG_DWORD /d `"3`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Kernel'; Rest = '/v DynamicHeteroCpuPolicyImportant /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Kernel'; Rest = '/v DynamicHeteroCpuPolicyImportantShort /t REG_DWORD /d `"1`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Kernel'; Rest = '/v DynamicHeteroCpuPolicyImportantPriority /t REG_DWORD /d `"8`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Kernel'; Rest = '/v `"SerializeTimerExpiration`" /t REG_DWORD /d `"2`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel'; Rest = '/v `"TimerCheckFlags`" /t REG_DWORD /d `"0`" /f' }
        @{ Action = 'add'; Key = 'HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl'; Rest = '/v `"Win32PrioritySeparation`" /t REG_DWORD /d `"0x00000024`" /f' }
    )

    foreach ($op in $RegistryOps) {
        Invoke-RegExe -Action $op.Action -Key $op.Key -Rest $op.Rest
    }
    #endregion

    #region Graphics Preferences / Priority / FSO
    Write-Log "Applying Graphics Preferences / Priority / FSO rules (only if target files exist)."

    $programFilesRoblox = Get-ChildItem 'C:\Program Files (x86)\Roblox\Versions' -Directory -Filter 'version-*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
    $appDataRoblox = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Roblox\Versions') -Directory -Filter 'version-*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
    $discord = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Discord') -Directory -Filter 'app-*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1

    $vars = @{
        ProgramFilesRobloxPath = if ($programFilesRoblox) { Join-Path $programFilesRoblox.FullName 'RobloxPlayerBeta.exe' } else { '' }
        AppDataRobloxPath      = if ($appDataRoblox) { Join-Path $appDataRoblox.FullName 'RobloxPlayerBeta.exe' } else { '' }
        LatestDiscordPath      = if ($discord) { Join-Path $discord.FullName 'Discord.exe' } else { '' }
    }

    $Games = @(
        "%ProgramFilesRobloxPath%"
        "%AppDataRobloxPath%"
        "C:\Program Files\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"
        "C:\Program Files\Epic Games\GTAV\PlayGTAV.exe"
        "C:\Program Files\Riot Games\Riot Client\RiotClientServices.exe"
        "C:\Riot Games\VALORANT\live\VALORANT.exe"
        "%USERPROFILE%\AppData\Local\osu!\osu!.exe"
        "%ProgramFiles%\Steam\steamapps\common\Counter-Strike Global Offensive\csgo.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Apex Legends\r5apex.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Rust\RustClient.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Overwatch\Overwatch.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Call of Duty\cod.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Rainbow Six Siege\RainbowSix.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\PUBG\TslGame.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Destiny 2\destiny2.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\GTA5\GTA5.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Dota 2\game\bin\win64\dota2.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Team Fortress 2\tf.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Warframe\Warframe.x64.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\ARK\ShooterGame\Binaries\Win64\ShooterGame.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\GarrysMod\hl2.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\The Witcher 3\bin\x64\witcher3.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077\bin\x64\Cyberpunk2077.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Elden Ring\Game\eldenring.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Hogwarts Legacy\Phoenix\Binaries\Win64\HogwartsLegacy.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Starfield\Starfield.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Baldurs Gate 3\bin\bg3.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Red Dead Redemption 2\RDR2.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Forza Horizon 5\ForzaHorizon5.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\FIFA 23\FIFA23.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Minecraft\Launcher\MinecraftLauncher.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\League of Legends\LeagueClient.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Rocket League\Binaries\Win64\RocketLeague.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Fall Guys\FallGuys_client_game.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Dead by Daylight\DeadByDaylight-Win64-Shipping.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Phasmophobia\Phasmophobia.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Genshin Impact\GenshinImpact.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Honkai Star Rail\StarRail.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\War Thunder\aces.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\World of Tanks\WorldOfTanks.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\World of Warcraft\Wow.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Diablo IV\Diablo IV.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Path of Exile\PathOfExile.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Grand Theft Auto San Andreas\gta_sa.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Need for Speed Heat\NFSHeat.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Assetto Corsa\acs.exe"
        "C:\Program Files (x86)\Steam\steamapps\common\Project Cars 2\pCars2.exe"
    ) | ForEach-Object { Expand-BatchPath -Text $_ -Vars $vars } | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

    $Apps = @(
        "%LatestDiscordPath%"
        "%USERPROFILE%\AppData\Roaming\Spotify\Spotify.exe"
        "C:\Program Files (x86)\MSI Afterburner\MSIAfterburner.exe"
        "C:\Program Files\Google\Chrome\Application\chrome.exe"
        "C:\Program Files\Mozilla Firefox\firefox.exe"
        "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
        "C:\Program Files\Opera\launcher.exe"
        "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
        "C:\Program Files\7-Zip\7zG.exe"
        "C:\Program Files\VideoLAN\VLC\vlc.exe"
        "C:\Program Files\Notepad++\notepad++.exe"
        "C:\Program Files\WinRAR\WinRAR.exe"
        "C:\Program Files\qBittorrent\qbittorrent.exe"
        "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        "C:\Program Files\Microsoft VS Code\Code.exe"
        "C:\Program Files\Core Temp\Core Temp.exe"
        "C:\Program Files (x86)\Steam\steam.exe"
    ) | ForEach-Object { Expand-BatchPath -Text $_ -Vars $vars } | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

    $OtherExeNames = @(
        "Adobe Premiere Pro.exe"
        "VegasPro.exe"
        "Resolve.exe"
        "blender.exe"
        "shotcut.exe"
        "HandBrake.exe"
        "capcut.exe"
        "Cinebench.exe"
        "3DMark.exe"
        "LatMon.exe"
        "y-cruncher.exe"
        "TM5.exe"
        "linpack_xeon64.exe"
        "node.exe"
        "WinRAR.exe"
        "UnRAR.exe"
        "Rar.exe"
        "7zFM.exe"
        "7zG.exe"
        "7z.exe"
    )

    $regKeyGP = 'HKCU\SOFTWARE\Microsoft\DirectX\UserGpuPreferences'
    $regKeyPR = 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options'
    $regKeyFO = 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers'

    foreach ($path in $Games) {
        $exe = [IO.Path]::GetFileName($path)
        Write-Log "High Performance + High Priority + FSO: $exe"
        Invoke-RegExe add $regKeyGP ("/v `"$path`" /t REG_SZ /d `"GpuPreference=2`" /f")
        Invoke-RegExe add ("$regKeyPR\$exe\PerfOptions") ("/v `"CpuPriorityClass`" /t REG_DWORD /d `"3`" /f")
        Invoke-RegExe add $regKeyFO ("/v `"$path`" /t REG_SZ /d `"~ DISABLEDXMAXIMIZEDWINDOWEDMODE HIGHDPIAWARE`" /f")
    }

    foreach ($path in $Apps) {
        $exe = [IO.Path]::GetFileName($path)
        Write-Log "Power Saving + Low Priority: $exe"
        Invoke-RegExe add $regKeyGP ("/v `"$path`" /t REG_SZ /d `"GpuPreference=1`" /f")
        Invoke-RegExe add ("$regKeyPR\$exe\PerfOptions") ("/v `"CpuPriorityClass`" /t REG_DWORD /d `"1`" /f")
    }

    foreach ($exeName in $OtherExeNames) {
        Invoke-RegExe add ("$regKeyPR\$exeName\PerfOptions") ("/v `"CpuPriorityClass`" /t REG_DWORD /d `"3`" /f")
    }
    #endregion

    #region App removals
    Write-Log "Removing bundled AppX packages."
    $AppxPatterns = @(
        "*Clipchamp.Clipchamp*"
        "*Microsoft.ApplicationCompatibilityEnhancements*"
        "*Microsoft.AV1VideoExtension*"
        "*Microsoft.AVCEncoderVideoExtension*"
        "*Microsoft.BingNews*"
        "*Microsoft.BingSearch*"
        "*Microsoft.BingWeather*"
        "*Microsoft.Copilot*"
        "*Microsoft.Edge.GameAssist*"
        "*Microsoft.Family*"
        "*Microsoft.GamingApp*"
        "*Microsoft.GamingServices*"
        "*Microsoft.GetHelp*"
        "*Microsoft.Getstarted*"
        "*Microsoft.HEIFImageExtension*"
        "*Microsoft.HEVCVideoExtension*"
        "*Microsoft.MicrosoftEdge.Stable*"
        "*Microsoft.MicrosoftOfficeHub*"
        "*Microsoft.MicrosoftSolitaireCollection*"
        "*Microsoft.MicrosoftStickyNotes*"
        "*Microsoft.MixedReality.Portal*"
        "*Microsoft.MSPaint*"
        "*Microsoft.Office.OneNote*"
        "*Microsoft.OneConnect*"
        "*Microsoft.OutlookForWindows*"
        "*Microsoft.People*"
        "*Microsoft.PowerAutomateDesktop*"
        "*Microsoft.ScreenSketch*"
        "*Microsoft.SkypeApp*"
        "*Microsoft.Todos*"
        "*Microsoft.Windows.DevHome*"
        "*Microsoft.Windows.PeopleExperienceHost*"
        "*Microsoft.WindowsAlarms*"
        "*Microsoft.WindowsCalculator*"
        "*Microsoft.WindowsCamera*"
        "*Microsoft.windowscommunicationsapps*"
        "*Microsoft.WindowsFeedbackHub*"
        "*Microsoft.WindowsMaps*"
        "*Microsoft.WindowsNotepad*"
        "*Microsoft.WindowsSoundRecorder*"
        "*Microsoft.Xbox.TCUI*"
        "*Microsoft.XboxApp*"
        "*Microsoft.XboxGameOverlay*"
        "*Microsoft.XboxGamingOverlay*"
        "*Microsoft.XboxIdentityProvider*"
        "*Microsoft.XboxSpeechToTextOverlay*"
        "*Microsoft.YourPhone*"
        "*Microsoft.ZuneMusic*"
        "*Microsoft.ZuneVideo*"
        "*MicrosoftCorporationII.QuickAssist*"
        "*MicrosoftWindows.Client.WebExperience*"
        "*MicrosoftWindows.CrossDevice*"
        "*MicrosoftWindows.CrossDevice.CSP*"
        "*MicrosoftWindows.FeedbackHub*"
        "*MicrosoftWindows.FunFacts*"
        "*MicrosoftWindows.Launcher*"
        "*MicrosoftWindows.NarratorQuickStart*"
        "*MicrosoftWindows.PeopleExperienceHost*"
        "*MicrosoftWindows.ParentalControls*"
        "*MicrosoftWindows.Photos*"
        "*MicrosoftWindows.SecureAssessmentBrowser*"
        "*MicrosoftWindowsSoundRecorder*"
        "*MicrosoftWindowsTerminal*"
        "*MicrosoftWindowsWallpaper*"
        "*MicrosoftWindowsWidgets*"
        "*Windows.CBSPreview*"
        "*Windows.DevHome*"
    )
    foreach ($pat in $AppxPatterns) {
        Remove-AppxPattern -Pattern $pat
    }
    #endregion

    #region Xbox bloat file deletions (with backup)
    Write-Log "Deleting Xbox bloat files (if present) and backing up."
    $xboxPath = 'C:\Windows\System32'
    $backupDir = 'C:\Oneclick Tools\Backup\Xbox Bloat'
    New-Item -Path $backupDir -ItemType Directory -Force | Out-Null

    $XboxFiles = @(
        "GameBarPresenceWriter.exe"
        "GameBarPresenceWriter.proxy.dll"
        "GameChatOverlayExt.dll"
        "GameChatTranscription.dll"
        "GamePanel.exe"
        "GamePanelExternalHook.dll"
        "gamestreamingext.dll"
        "GameSystemToastIcon.contrast-white.png"
        "GameSystemToastIcon.png"
        "gameux.dll"
        "gamingtcui.dll"
        "GraphicsPerfSvc.dll"
        "XblAuthManager.dll"
        "XblAuthManagerProxy.dll"
        "XblAuthTokenBrokerExt.dll"
        "XblGameSave.dll"
        "XblGameSaveExt.dll"
        "XblGameSaveProxy.dll"
        "XblGameSaveTask.exe"
        "XboxNetApiSvc.dll"
        "Windows.Gaming.Preview.dll"
        "Windows.Gaming.UI.GameBar.dll"
        "Windows.Gaming.XboxLive.Storage.dll"
    )
    foreach ($f in $XboxFiles) {
        $src = Join-Path $xboxPath $f
        if (Test-Path -LiteralPath $src) {
            try {
                Write-Log "Removing: $src"
                takeown /F $src | Out-Null
                icacls $src /grant administrators:F | Out-Null
                Copy-Item -LiteralPath $src -Destination $backupDir -Force -ErrorAction SilentlyContinue
                Remove-Item -LiteralPath $src -Force -ErrorAction SilentlyContinue
            }
            catch {
                Write-Log "Failed removing ${src}: $($_.Exception.Message)" 'WARN'
            }
        }
    }
    #endregion

    #region Services (start type changes)
    Write-Log "Applying service start-type tweaks."
    $Services = @(
        @{ Name = "ucpd"; Start = "disabled" }
        @{ Name = "TrustedInstaller"; Start = "disabled" }
        @{ Name = "VSS"; Start = "demand" }
        @{ Name = "swprv"; Start = "demand" }
        @{ Name = "AarSvc"; Start = "disabled" }
        @{ Name = "ADPSvc"; Start = "disabled" }
        @{ Name = "AppMgmt"; Start = "disabled" }
        @{ Name = "AppReadiness"; Start = "disabled" }
        @{ Name = "AppVClient"; Start = "disabled" }
        @{ Name = "AssignedAccessManagerSvc"; Start = "disabled" }
        @{ Name = "AudioEndpointBuilder"; Start = "auto" }
        @{ Name = "AudioSrv"; Start = "auto" }
        @{ Name = "AxInstSV"; Start = "disabled" }
        @{ Name = "BcastDVRUserService"; Start = "disabled" }
        @{ Name = "BDESVC"; Start = "disabled" }
        @{ Name = "BITS"; Start = "disabled" }
        @{ Name = "BrokerInfrastructure"; Start = "auto" }
        @{ Name = "camsvc"; Start = "disabled" }
        @{ Name = "CaptureService"; Start = "disabled" }
        @{ Name = "cbdhsvc"; Start = "disabled" }
        @{ Name = "CertPropSvc"; Start = "disabled" }
        @{ Name = "ClipSVC"; Start = "disabled" }
        @{ Name = "cloudidsvc"; Start = "disabled" }
        @{ Name = "COMSysApp"; Start = "disabled" }
        @{ Name = "ConsentUxUserSvc"; Start = "disabled" }
        @{ Name = "CoreMessagingRegistrar"; Start = "auto" }
        @{ Name = "CredentialEnrollmentManagerUserSvc"; Start = "disabled" }
        @{ Name = "CryptSvc"; Start = "auto" }
        @{ Name = "DcomLaunch"; Start = "auto" }
        @{ Name = "dcsvc"; Start = "disabled" }
        @{ Name = "defragsvc"; Start = "disabled" }
        @{ Name = "DeviceAssociationBrokerSvc"; Start = "disabled" }
        @{ Name = "DeviceAssociationService"; Start = "disabled" }
        @{ Name = "DeviceInstall"; Start = "disabled" }
        @{ Name = "DevicePickerUserSvc"; Start = "disabled" }
        @{ Name = "DevicesFlowUserSvc"; Start = "disabled" }
        @{ Name = "DevQueryBroker"; Start = "disabled" }
        @{ Name = "diagnosticshub.standardcollector.service"; Start = "disabled" }
        @{ Name = "diagsvc"; Start = "disabled" }
        @{ Name = "DiagTrack"; Start = "disabled" }
        @{ Name = "DispBrokerDesktopSvc"; Start = "disabled" }
        @{ Name = "DisplayEnhancementService"; Start = "disabled" }
        @{ Name = "DmEnrollmentSvc"; Start = "disabled" }
        @{ Name = "dmwappushservice"; Start = "disabled" }
        @{ Name = "DoSvc"; Start = "disabled" }
        @{ Name = "DPS"; Start = "disabled" }
        @{ Name = "DsmSvc"; Start = "disabled" }
        @{ Name = "DsSvc"; Start = "disabled" }
        @{ Name = "DusmSvc"; Start = "disabled" }
        @{ Name = "EFS"; Start = "disabled" }
        @{ Name = "edgeupdate"; Start = "disabled" }
        @{ Name = "edgeupdatem"; Start = "disabled" }
        @{ Name = "EFSRPC"; Start = "disabled" }
        @{ Name = "EmbeddedMode"; Start = "disabled" }
        @{ Name = "EntAppSvc"; Start = "disabled" }
        @{ Name = "EventLog"; Start = "auto" }
        @{ Name = "EventSystem"; Start = "auto" }
        @{ Name = "fhsvc"; Start = "disabled" }
        @{ Name = "FontCache"; Start = "disabled" }
        @{ Name = "FrameServer"; Start = "disabled" }
        @{ Name = "FrameServerMonitor"; Start = "disabled" }
        @{ Name = "FvSvc"; Start = "disabled" }
        @{ Name = "gupdate"; Start = "disabled" }
        @{ Name = "gupdatem"; Start = "disabled" }
        @{ Name = "GraphicsPerfSvc"; Start = "disabled" }
        @{ Name = "HvHost"; Start = "disabled" }
        @{ Name = "InstallService"; Start = "disabled" }
        @{ Name = "InventorySvc"; Start = "disabled" }
        @{ Name = "IpxlatCfgSvc"; Start = "disabled" }
        @{ Name = "irmon"; Start = "disabled" }
        @{ Name = "KeyIso"; Start = "disabled" }
        @{ Name = "KtmRm"; Start = "disabled" }
        @{ Name = "lfsvc"; Start = "disabled" }
        @{ Name = "LicenseManager"; Start = "disabled" }
        @{ Name = "LxpSvc"; Start = "disabled" }
        @{ Name = "MapsBroker"; Start = "disabled" }
        @{ Name = "MSDTC"; Start = "disabled" }
        @{ Name = "MSiSCSI"; Start = "disabled" }
        @{ Name = "MsKeyboardFilter"; Start = "disabled" }
        @{ Name = "NaturalAuthentication"; Start = "disabled" }
        @{ Name = "NcbService"; Start = "disabled" }
        @{ Name = "NgcCtnrSvc"; Start = "disabled" }
        @{ Name = "NgcSvc"; Start = "disabled" }
        @{ Name = "NPSMSvc"; Start = "disabled" }
        @{ Name = "OneSyncSvc"; Start = "disabled" }
        @{ Name = "P9RdrService"; Start = "disabled" }
        @{ Name = "PcaSvc"; Start = "disabled" }
        @{ Name = "PeerDistSvc"; Start = "disabled" }
        @{ Name = "PerfHost"; Start = "disabled" }
        @{ Name = "PhoneSvc"; Start = "disabled" }
        @{ Name = "PimIndexMaintenanceSvc"; Start = "disabled" }
        @{ Name = "PlugPlay"; Start = "auto" }
        @{ Name = "PrintNotify"; Start = "disabled" }
        @{ Name = "ProfSvc"; Start = "auto" }
        @{ Name = "PushToInstall"; Start = "disabled" }
        @{ Name = "RemoteRegistry"; Start = "disabled" }
        @{ Name = "RetailDemo"; Start = "disabled" }
        @{ Name = "RmSvc"; Start = "disabled" }
        @{ Name = "RpcEptMapper"; Start = "auto" }
        @{ Name = "RpcLocator"; Start = "disabled" }
        @{ Name = "RpcSs"; Start = "auto" }
        @{ Name = "RSoPProv"; Start = "disabled" }
        @{ Name = "sacsvr"; Start = "disabled" }
        @{ Name = "SamSs"; Start = "auto" }
        @{ Name = "SCardSvr"; Start = "disabled" }
        @{ Name = "ScDeviceEnum"; Start = "disabled" }
        @{ Name = "SCPolicySvc"; Start = "disabled" }
        @{ Name = "SDRSVC"; Start = "disabled" }
        @{ Name = "seclogon"; Start = "disabled" }
        @{ Name = "SecurityHealthService"; Start = "disabled" }
        @{ Name = "SEMgrSvc"; Start = "disabled" }
        @{ Name = "Sense"; Start = "disabled" }
        @{ Name = "SensorDataService"; Start = "disabled" }
        @{ Name = "SensorService"; Start = "disabled" }
        @{ Name = "SensrSvc"; Start = "disabled" }
        @{ Name = "SessionEnv"; Start = "disabled" }
        @{ Name = "SharedRealitySvc"; Start = "disabled" }
        @{ Name = "ShellHWDetection"; Start = "disabled" }
        @{ Name = "SmsRouter"; Start = "disabled" }
        @{ Name = "SNMPTRAP"; Start = "disabled" }
        @{ Name = "Spooler"; Start = "disabled" }
        @{ Name = "StiSvc"; Start = "disabled" }
        @{ Name = "StorSvc"; Start = "disabled" }
        @{ Name = "svsvc"; Start = "disabled" }
        @{ Name = "swprv"; Start = "demand" }
        @{ Name = "SysMain"; Start = "disabled" }
        @{ Name = "TabletInputService"; Start = "disabled" }
        @{ Name = "TapiSrv"; Start = "disabled" }
        @{ Name = "TermService"; Start = "disabled" }
        @{ Name = "TextInputManagementService"; Start = "disabled" }
        @{ Name = "Themes"; Start = "disabled" }
        @{ Name = "TimeBrokerSvc"; Start = "disabled" }
        @{ Name = "TokenBroker"; Start = "disabled" }
        @{ Name = "TrkWks"; Start = "disabled" }
        @{ Name = "TroubleshootingSvc"; Start = "disabled" }
        @{ Name = "TrustedInstaller"; Start = "disabled" }
        @{ Name = "tzautoupdate"; Start = "disabled" }
        @{ Name = "UevAgentService"; Start = "disabled" }
        @{ Name = "UmRdpService"; Start = "disabled" }
        @{ Name = "UserDataSvc"; Start = "disabled" }
        @{ Name = "VaultSvc"; Start = "disabled" }
        @{ Name = "vds"; Start = "disabled" }
        @{ Name = "vmcompute"; Start = "disabled" }
        @{ Name = "vmicguestinterface"; Start = "disabled" }
        @{ Name = "vmicheartbeat"; Start = "disabled" }
        @{ Name = "vmickvpexchange"; Start = "disabled" }
        @{ Name = "vmicrdv"; Start = "disabled" }
        @{ Name = "vmicshutdown"; Start = "disabled" }
        @{ Name = "vmictimesync"; Start = "disabled" }
        @{ Name = "vmicvmsession"; Start = "disabled" }
        @{ Name = "vmicvss"; Start = "disabled" }
        @{ Name = "VSS"; Start = "demand" }
        @{ Name = "W32Time"; Start = "disabled" }
        @{ Name = "WaaSMedicSvc"; Start = "disabled" }
        @{ Name = "WalletService"; Start = "disabled" }
        @{ Name = "WarpJITSvc"; Start = "disabled" }
        @{ Name = "wbengine"; Start = "disabled" }
        @{ Name = "WbioSrvc"; Start = "disabled" }
        @{ Name = "WdiServiceHost"; Start = "disabled" }
        @{ Name = "WdiSystemHost"; Start = "disabled" }
        @{ Name = "Wecsvc"; Start = "disabled" }
        @{ Name = "WEPHOSTSVC"; Start = "disabled" }
        @{ Name = "wercplsupport"; Start = "disabled" }
        @{ Name = "WerSvc"; Start = "disabled" }
        @{ Name = "WiaRpc"; Start = "disabled" }
        @{ Name = "WinDefend"; Start = "disabled" }
        @{ Name = "Winmgmt"; Start = "auto" }
        @{ Name = "wlidsvc"; Start = "disabled" }
        @{ Name = "wlpasvc"; Start = "disabled" }
        @{ Name = "WManSvc"; Start = "disabled" }
        @{ Name = "WpcMonSvc"; Start = "disabled" }
        @{ Name = "WPDBusEnum"; Start = "disabled" }
        @{ Name = "WpnService"; Start = "disabled" }
        @{ Name = "WpnUserService"; Start = "disabled" }
        @{ Name = "wscsvc"; Start = "disabled" }
        @{ Name = "WSearch"; Start = "disabled" }
        @{ Name = "wuauserv"; Start = "disabled" }
        @{ Name = "XblAuthManager"; Start = "disabled" }
        @{ Name = "XblGameSave"; Start = "disabled" }
        @{ Name = "XboxGipSvc"; Start = "disabled" }
        @{ Name = "XboxNetApiSvc"; Start = "disabled" }
        @{ Name = "XtaCache"; Start = "disabled" }
        @{ Name = "EpicGamesUpdater"; Start = "auto" }
        @{ Name = "EpicOnlineServices"; Start = "auto" }
    )
    foreach ($s in $Services) {
        Set-ServiceStartMode -Name $s.Name -Start $s.Start
    }
    #endregion

    #region GPU Tweaks (auto-detect)
    Write-Log "Applying GPU tweaks (auto-detect vendor)."
    $gpus = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue
    $gpuNames = ($gpus | Select-Object -ExpandProperty Name -ErrorAction SilentlyContinue) -join '; '

    if ($gpuNames -match 'NVIDIA') {
        Write-Log "Detected NVIDIA GPU(s): $gpuNames"
        Invoke-External -FilePath 'C:\Oneclick Tools\Nvidia Profile Inspector\nvidiaProfileInspector.exe' -Arguments @('-importProfile', 'C:\Oneclick Tools\Nvidia Profile Inspector\QuakedOptimizedNVProflie.nip') -IgnoreErrors

        foreach ($k in Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Video' -ErrorAction SilentlyContinue) {
            $p = Join-Path $k.PSPath '0000'
            if (Test-Path $p) {
                $reg = $p -replace '^Microsoft\.PowerShell\.Core\\Registry::', ''
                Invoke-RegExe add $reg '/v "PowerMizerEnable" /t REG_DWORD /d "1" /f'
                Invoke-RegExe add $reg '/v "PowerMizerLevel" /t REG_DWORD /d "1" /f'
                Invoke-RegExe add $reg '/v "PowerMizerLevelAC" /t REG_DWORD /d "1" /f'
                Invoke-RegExe add $reg '/v "PerfLevelSrc" /t REG_DWORD /d "8738" /f'
            }
        }
        Invoke-RegExe add 'HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global\NVTweak' '/v "DisplayPowerSaving" /t REG_DWORD /d 0 /f'
        Invoke-RegExe add 'HKLM\SOFTWARE\NVIDIA Corporation\NvControlPanel2\Client' '/v "OptInOrOutPreference" /t REG_DWORD /d 0 /f'
        Invoke-RegExe add 'HKLM\SOFTWARE\NVIDIA Corporation\Global\FTS' '/v "EnableRID44231" /t REG_DWORD /d 0 /f'
        Invoke-RegExe add 'HKLM\SOFTWARE\NVIDIA Corporation\Global\FTS' '/v "EnableRID64640" /t REG_DWORD /d 0 /f'
        Invoke-RegExe add 'HKLM\SOFTWARE\NVIDIA Corporation\Global\FTS' '/v "EnableRID66610" /t REG_DWORD /d 0 /f'
        Invoke-RegExe add 'HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm\FTS' '/v "EnableRID61684" /t REG_DWORD /d "1" /f'
        Invoke-RegExe add 'HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global\Startup' '/v "SendTelemetryData" /t REG_DWORD /d 0 /f'
        Invoke-RegExe delete 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' '/v "NvBackend" /f'

        foreach ($pnp in ($gpus | Select-Object -ExpandProperty PNPDeviceID -ErrorAction SilentlyContinue)) {
            $pnpKey = "HKLM\SYSTEM\CurrentControlSet\Enum\$pnp\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
            Invoke-RegExe add $pnpKey '/v MSISupported /t REG_DWORD /d 1 /f'
            Invoke-RegExe delete "HKLM\SYSTEM\CurrentControlSet\Enum\$pnp\Device Parameters\Interrupt Management\Affinity Policy" '/v DevicePriority /f'
        }

        foreach ($disp in Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}' -ErrorAction SilentlyContinue) {
            $k = $disp.PSPath -replace '^Microsoft\.PowerShell\.Core\\Registry::', ''
            Invoke-RegExe add $k '/v "RMHdcpKeyGlobZero" /t REG_DWORD /d 1 /f'
        }
        Invoke-RegExe add 'HKLM\SOFTWARE\Microsoft\Windows\Dwm' '/v "OverlayTestMode" /t REG_DWORD /d 5 /f'
    }
    elseif ($gpuNames -match 'AMD|Radeon') {
        Write-Log "Detected AMD GPU(s): $gpuNames"
        $amdValues = @(
            @{ Name = 'EnableUlps'; Type = 'REG_DWORD'; Data = '0' },
            @{ Name = 'EnableAspmL0s'; Type = 'REG_DWORD'; Data = '0' },
            @{ Name = 'EnableAspmL1'; Type = 'REG_DWORD'; Data = '0' },
            @{ Name = 'DisableSAMUPowerGating'; Type = 'REG_DWORD'; Data = '1' },
            @{ Name = 'DisableUVDPowerGatingDynamic'; Type = 'REG_DWORD'; Data = '1' },
            @{ Name = 'DisableVCEPowerGating'; Type = 'REG_DWORD'; Data = '1' },
            @{ Name = 'KMD_DeLagEnabled'; Type = 'REG_DWORD'; Data = '1' },
            @{ Name = 'KMD_FRTEnabled'; Type = 'REG_DWORD'; Data = '0' },
            @{ Name = 'PP_SclkDeepSleepDisable'; Type = 'REG_DWORD'; Data = '1' },
            @{ Name = 'PP_ThermalAutoThrottlingEnable'; Type = 'REG_DWORD'; Data = '0' }
        )
        foreach ($k in Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Video' -ErrorAction SilentlyContinue) {
            $p = Join-Path $k.PSPath '0000'
            if (Test-Path $p) {
                $reg = $p -replace '^Microsoft\.PowerShell\.Core\\Registry::', ''
                foreach ($v in $amdValues) {
                    Invoke-RegExe add $reg ("/v `"$($v.Name)`" /t $($v.Type) /d `"$($v.Data)`" /f")
                }
            }
        }
        foreach ($disp in Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}' -ErrorAction SilentlyContinue) {
            $k = $disp.PSPath -replace '^Microsoft\.PowerShell\.Core\\Registry::', ''
            Invoke-RegExe add $k '/v "RMHdcpKeyGlobZero" /t REG_DWORD /d 1 /f'
        }
        Invoke-RegExe add 'HKLM\SOFTWARE\Microsoft\Windows\Dwm' '/v "OverlayTestMode" /t REG_DWORD /d 5 /f'
    }
    else {
        Write-Log "Detected Intel/Other GPU(s): $gpuNames"
        foreach ($disp in Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}' -ErrorAction SilentlyContinue) {
            $k = $disp.PSPath -replace '^Microsoft\.PowerShell\.Core\\Registry::', ''
            Invoke-RegExe add $k '/v "Disable_OverlayDSQualityEnhancement" /t REG_DWORD /d "1" /f'
            Invoke-RegExe add $k '/v "IncreaseFixedSegment" /t REG_DWORD /d "1" /f'
            Invoke-RegExe add $k '/v "AdaptiveVsyncEnable" /t REG_DWORD /d "0" /f'
            Invoke-RegExe add $k '/v "DisablePFonDP" /t REG_DWORD /d "1" /f'
            Invoke-RegExe add $k '/v "EnableCompensationForDVI" /t REG_DWORD /d "1" /f'
        }
    }
    #endregion

    #region BCDEdit + Power Tweaks
    Write-Log "Applying BCDEdit tweaks."
    try { & bcdedit /deletevalue useplatformclock 2>$null | Out-Null } catch { }
    try { & bcdedit /set useplatformtick no 2>$null | Out-Null } catch { }
    try { & bcdedit /set disabledynamictick yes 2>$null | Out-Null } catch { }

    Write-Log "Disabling hibernation."
    try { & powercfg /hibernate off 2>$null | Out-Null } catch { }
    #endregion

    #region Power Plan (single-path)
    Write-Log "Importing and activating Quaked power plans if present."
    $pow1 = 'C:\Oneclick Tools\Power Plans\Quaked Ultimate Performance.pow'
    $pow2 = 'C:\Oneclick Tools\Power Plans\Quaked Ultimate Performance Idle Off.pow'
    if (Test-Path $pow1) { try { & powercfg -import $pow1 2>$null | Out-Null } catch { Write-Log "powercfg import failed: $pow1" 'WARN' } }
    if (Test-Path $pow2) { try { & powercfg -import $pow2 2>$null | Out-Null } catch { Write-Log "powercfg import failed: $pow2" 'WARN' } }

    $plans = & powercfg /list 2>$null
    $line = ($plans | Select-String -Pattern 'Quaked Ultimate Performance' | Select-Object -First 1)
    if ($line -and $line.ToString() -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') {
        $g = $Matches[1]
        try { & powercfg /setactive $g 2>$null | Out-Null; Write-Log "Activated power plan: $g (Quaked Ultimate Performance)" } catch { Write-Log "Failed to activate plan: $g" 'WARN' }
    }
    else {
        Write-Log "Quaked Ultimate Performance plan not found; leaving active plan unchanged." 'WARN'
    }
    #endregion

    #region File Cleanup (network cleanup removed)
    Write-Log "Running file cleanup."
    $pathsToDelete = @(
        (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\INetCache\*'),
        (Join-Path $env:TEMP '*'),
        (Join-Path $env:APPDATA 'Discord\Cache\*'),
        (Join-Path $env:APPDATA 'Discord\Code Cache\*'),
        (Join-Path $env:ProgramData 'USOPrivate\UpdateStore\*'),
        (Join-Path $env:ProgramData 'USOShared\Logs\*'),
        'C:\Windows\System32\SleepStudy\*',
        (Join-Path $env:WINDIR 'Logs\*'),
        (Join-Path $env:LOCALAPPDATA 'Temp\*'),
        (Join-Path $env:WINDIR 'Temp\*'),
        'C:\Windows\Prefetch\*'
    )

    foreach ($p in $pathsToDelete) {
        try {
            if (Test-Path $p) {
                Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
                Write-Log "Deleted: $p"
            }
        }
        catch {
            Write-Log "Failed deleting ${p}: $($_.Exception.Message)" 'WARN'
        }
    }

    $webCache = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\WebCache'
    if (Test-Path $webCache) {
        try { Remove-Item -LiteralPath $webCache -Recurse -Force -ErrorAction SilentlyContinue; Write-Log "Removed: $webCache" } catch { }
    }
    #endregion

    Write-Log "Completed."
}
catch {
    Write-Log "FATAL: $($_.Exception.Message)" 'ERROR'
    throw
}
finally {
    Stop-Transcript | Out-Null
}
