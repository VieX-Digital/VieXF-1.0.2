# Productivity Tweaks Validation Guide

This guide helps you validate the new "Laptop Productivity" and "PC Productivity" tweaks.

## Prerequisites
- Windows 10 or 11 Machine (VM recommended for first run).
- PowerShell running as **Administrator**.

## 1. Laptop Productivity Tweak (`laptop-productivity-work`)

### Validation Steps
1. **Navigate** to the folder:
   ```powershell
   cd "D:\WorkSpace\VIEX FREE 1.0.0\Backend\tweaks\laptop-productivity-work"
   ```
2. **Run Apply Script**:
   ```powershell
   .\apply.ps1
   ```
   - **Check**: Does it ask for Admin if not elevated?
   - **Check**: Does it log to `C:\VieXF Logs`?
   - **Check**: Does it change Power Plan to **Balanced**? (`powercfg /getactivescheme`)
   - **Check**: Are "Game Bar" settings disabled in Registry?
   - **Check**: Is "Hibernation" Enabled? (`powercfg /a`)
3. **Run Unapply Script**:
   ```powershell
   .\unapply.ps1
   ```
   - **Check**: Are Game Bar settings reverted?
   - **Check**: Are Xbox services set back to Manual?

## 2. PC Productivity Tweak (`pc-productivity-work`)

### Validation Steps
1. **Navigate** to the folder:
   ```powershell
   cd "D:\WorkSpace\VIEX FREE 1.0.0\Backend\tweaks\pc-productivity-work"
   ```
2. **Run Apply Script**:
   ```powershell
   .\apply.ps1
   ```
   - **Check**: Does it change Power Plan to **High Performance**?
   - **Check**: Is "Hibernation" Disabled?
   - **Check**: Are USB/PCI power savings disabled in the active power plan?
3. **Run Unapply Script**:
   ```powershell
   .\unapply.ps1
   ```
   - **Check**: Does Power Plan revert to Balanced?
   - **Check**: Is Hibernation re-enabled?

## Safety Checks
- [ ] **System Restore**: Did a restore point get created? (Check `vssadmin list shadows` or System Restore UI).
- [ ] **Error Handling**: Try running the script while a target file is locked or in use. Does it crash or log an error gracefully?
- [ ] **Idempotency**: Run `apply.ps1` twice. It should not cause errors on the second run.
