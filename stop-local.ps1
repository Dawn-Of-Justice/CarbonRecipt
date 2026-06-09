<#  stop-local.ps1 — stop the local backend (:8000) and frontend (:3000).  #>
foreach ($port in 8000, 3000) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
            Write-Host "Stopped listener on port $port (PID $($c.OwningProcess))." -ForegroundColor Yellow
        } catch {}
    }
}
Write-Host "Done." -ForegroundColor Green
