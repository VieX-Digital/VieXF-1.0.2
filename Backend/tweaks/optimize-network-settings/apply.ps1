Write-Host "Applying network tweaks..."

netsh int tcp set heuristics disabled
netsh int tcp set supplemental template=internet congestionprovider=ctcp
netsh int tcp set global rss=enabled
netsh int tcp set global ecncapability=enabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global fastopen=enabled
netsh int tcp set global fastopenfallback=enabled
netsh int tcp set supplemental template=custom icw=10
netsh interface ipv4 set subinterface "Wi-Fi" mtu=1500 store=persistent
netsh interface ipv4 set subinterface Ethernet mtu=1500 store=persistent

Write-Host "Network tweaks applied successfully."
