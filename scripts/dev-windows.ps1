<#
.SYNOPSIS
  Uruchamia backend (Go) i frontend (Next.js) na Windowsie i sam pobiera nowe zmiany z GitHuba.

.DESCRIPTION
  Skrypt dla laptopa legion-540. Co -IntervalSeconds sekund robi `git pull --ff-only`
  na aktualnie wybranej galezi. Gdy przyjda zmiany:
    - w backend/           -> restartuje serwer Go,
    - w frontend/package*  -> robi `npm ci` i restartuje Next.js,
    - w pozostalych plikach frontendu -> nic nie trzeba, `next dev` przeladuje strone sam.
  Lokalnych zmian nie nadpisuje: gdy pull nie jest mozliwy jako fast-forward, tylko o tym pisze.

.EXAMPLE
  cd C:\Zus\ZUS
  powershell -ExecutionPolicy Bypass -File .\scripts\dev-windows.ps1

.EXAMPLE
  # obserwowanie galezi, na ktora pushuje agent frontendu
  powershell -ExecutionPolicy Bypass -File .\scripts\dev-windows.ps1 -Branch claude/magical-pascal-brns04
#>
param(
  [string]$Branch = "",
  [int]$IntervalSeconds = 30,
  [int]$BackendPort = 8080,
  [int]$FrontendPort = 3000,
  [switch]$NoPull
)

# "Continue": w Windows PowerShell 5.1 komunikaty gita na stderr nie moga przerywac skryptu.
$ErrorActionPreference = "Continue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$LogDir = Join-Path $Root ".dev-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Say([string]$msg, [string]$color = "Gray") {
  Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg) -ForegroundColor $color
}

function Require([string]$cmd, [string]$hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Say "Brak polecenia '$cmd'. $hint" "Red"
    exit 1
  }
}

Require "git" "Zainstaluj: winget install --id Git.Git -e"
Require "go" "Zainstaluj: winget install --id GoLang.Go -e"
Require "node" "Zainstaluj: winget install --id OpenJS.NodeJS.LTS -e"
Require "npm.cmd" "Zainstaluj Node.js LTS."

Set-Location $Root

if ($Branch) {
  Say "Przelaczam na galaz $Branch" "Cyan"
  git fetch origin $Branch
  git checkout $Branch
  git pull --ff-only origin $Branch
}
$CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()

# Zabija proces i wszystkie jego dzieci (go run / npm odpalaja podprocesy).
function Stop-Tree($proc) {
  if ($proc -and -not $proc.HasExited) {
    & taskkill.exe /PID $proc.Id /T /F 2>$null | Out-Null
  }
}

function Free-Port([int]$port) {
  try {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
      ForEach-Object { & taskkill.exe /PID $_.OwningProcess /T /F 2>$null | Out-Null }
  } catch { }
}

$script:Restart = $false
$script:BackendProc = $null
$script:FrontendProc = $null

function Start-Backend {
  Stop-Tree $script:BackendProc
  Free-Port $BackendPort
  Say "Backend: go run ./cmd/api (port $BackendPort)" "Green"
  $env:PORT = "$BackendPort"
  $script:BackendProc = Start-Process -FilePath "go" -ArgumentList "run", "./cmd/api" `
    -WorkingDirectory $Backend -NoNewWindow -PassThru `
    -RedirectStandardOutput (Join-Path $LogDir "backend.log") `
    -RedirectStandardError (Join-Path $LogDir "backend.err.log")
}

function Install-Frontend {
  Say "Frontend: npm ci" "Yellow"
  Push-Location $Frontend
  try { & npm.cmd ci --no-audit --no-fund | Out-Host } finally { Pop-Location }
}

function Start-Frontend {
  Stop-Tree $script:FrontendProc
  Free-Port $FrontendPort
  Say "Frontend: npm run dev (http://localhost:$FrontendPort)" "Green"
  $env:NEXT_PUBLIC_API_URL = "http://localhost:$BackendPort"
  $script:FrontendProc = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "-p", "$FrontendPort" `
    -WorkingDirectory $Frontend -NoNewWindow -PassThru `
    -RedirectStandardOutput (Join-Path $LogDir "frontend.log") `
    -RedirectStandardError (Join-Path $LogDir "frontend.err.log")
}

function Test-Url([string]$url) {
  try { (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { $false }
}

# --- start ---
if (-not (Test-Path (Join-Path $Frontend "node_modules"))) { Install-Frontend }
Start-Backend
Start-Frontend

$ok = $false
for ($i = 0; $i -lt 60 -and -not $ok; $i++) {
  Start-Sleep -Seconds 2
  $ok = (Test-Url "http://localhost:$BackendPort/api/v1/health") -and (Test-Url "http://localhost:$FrontendPort")
}
if ($ok) {
  Say "Gotowe: http://localhost:$FrontendPort  (backend: http://localhost:$BackendPort)" "Cyan"
  Start-Process "http://localhost:$FrontendPort"
} else {
  Say "Serwery jeszcze nie odpowiadaja. Logi: $LogDir" "Yellow"
}
if ($NoPull) {
  Say "Tryb bez pobierania zmian (-NoPull). Ctrl+C konczy." "Gray"
} else {
  Say "Obserwuje galaz '$CurrentBranch' co $IntervalSeconds s. Ctrl+C konczy." "Gray"
}

try {
  while ($true) {
    Start-Sleep -Seconds $IntervalSeconds

    if ($script:BackendProc.HasExited) { Say "Backend sie zatrzymal - uruchamiam ponownie. Logi: $LogDir\backend.err.log" "Red"; Start-Backend }
    if ($script:FrontendProc.HasExited) { Say "Frontend sie zatrzymal - uruchamiam ponownie. Logi: $LogDir\frontend.err.log" "Red"; Start-Frontend }
    if ($NoPull) { continue }

    $before = (git rev-parse HEAD).Trim()
    git fetch --quiet origin $CurrentBranch 2>$null
    $remote = (git rev-parse "origin/$CurrentBranch" 2>$null)
    if (-not $remote -or $remote.Trim() -eq $before) { continue }

    $pull = git pull --ff-only --quiet origin $CurrentBranch 2>&1
    if ($LASTEXITCODE -ne 0) {
      Say "Nie moge pobrac zmian bez nadpisywania lokalnych plikow: $pull" "Red"
      continue
    }
    $after = (git rev-parse HEAD).Trim()
    $changed = git diff --name-only $before $after
    $log = (git log --format="%h %an: %s" "$before..$after" | Select-Object -First 5) -join " | "
    Say "Nowe zmiany: $log" "Cyan"

    if ($changed | Where-Object { $_ -like "scripts/dev-windows.ps1" -or $_ -like "*.bat" }) {
      Say "Zmienil sie skrypt startowy - uruchamiam go ponownie." "Yellow"
      $script:Restart = $true
      break
    }
    if ($changed | Where-Object { $_ -like "backend/*" }) { Start-Backend }
    if ($changed | Where-Object { $_ -like "frontend/package*.json" }) { Install-Frontend; Start-Frontend }
    elseif ($changed | Where-Object { $_ -like "frontend/next.config.*" -or $_ -like "frontend/.env*" }) { Start-Frontend }
  }
}
finally {
  Say "Zatrzymuje serwery..." "Gray"
  Stop-Tree $script:BackendProc
  Stop-Tree $script:FrontendProc
}
if ($script:Restart) { exit 3 }
