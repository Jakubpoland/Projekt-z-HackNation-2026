<#
.SYNOPSIS
  Jednorazowa instalacja srodowiska na Windowsie dla Przewodnika (legion-540).

.DESCRIPTION
  1. Sprawdza Git, Go i Node.js LTS; brakujace instaluje przez winget.
  2. Instaluje zaleznosci frontendu (npm ci) i pobiera moduly Go.
  3. Tworzy na pulpicie skrot "Przewodnik ZUS" do Start-Przewodnik.bat.
  4. Z przelacznikiem -AutoStart dodaje skrot do Autostartu (strona startuje po zalogowaniu).

.EXAMPLE
  Dwuklik na Setup-Przewodnik.bat w katalogu repozytorium.
#>
param(
  [switch]$AutoStart,
  [switch]$NoShortcut
)

$ErrorActionPreference = "Continue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Launcher = Join-Path $Root "Start-Przewodnik.bat"

function Say([string]$msg, [string]$color = "Gray") {
  Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg) -ForegroundColor $color
}

function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

function Ensure-Tool([string]$cmd, [string]$wingetId, [string]$name) {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) {
    Say "$name jest zainstalowany." "Green"
    return $true
  }
  if (-not (Get-Command "winget" -ErrorAction SilentlyContinue)) {
    Say "Brak $name i brak winget. Zainstaluj $name recznie i uruchom setup ponownie." "Red"
    return $false
  }
  Say "Instaluje $name (winget $wingetId)..." "Yellow"
  & winget install --id $wingetId -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
  Refresh-Path
  if (Get-Command $cmd -ErrorAction SilentlyContinue) {
    Say "$name zainstalowany." "Green"
    return $true
  }
  Say "$name zainstalowany, ale nie jest jeszcze widoczny. Zamknij okno, otworz nowe i uruchom setup ponownie." "Red"
  return $false
}

Say "Katalog repozytorium: $Root" "Cyan"
$ok = $true
$ok = (Ensure-Tool "git" "Git.Git" "Git") -and $ok
$ok = (Ensure-Tool "go" "GoLang.Go" "Go") -and $ok
$ok = (Ensure-Tool "node" "OpenJS.NodeJS.LTS" "Node.js LTS") -and $ok
if (-not $ok) { exit 1 }

Say "Backend: go mod download" "Yellow"
Push-Location (Join-Path $Root "backend")
& go mod download 2>&1 | Out-Null
Pop-Location
Say "Backend gotowy (nie potrzebuje dodatkowych bibliotek)." "Green"

Say "Frontend: npm ci" "Yellow"
Push-Location (Join-Path $Root "frontend")
& npm.cmd ci --no-audit --no-fund | Out-Host
$npmOk = ($LASTEXITCODE -eq 0)
Pop-Location
if (-not $npmOk) { Say "npm ci nie powiodlo sie - sprawdz komunikat powyzej." "Red"; exit 1 }

function New-Shortcut([string]$path) {
  $shell = New-Object -ComObject WScript.Shell
  $lnk = $shell.CreateShortcut($path)
  $lnk.TargetPath = $Launcher
  $lnk.WorkingDirectory = $Root
  $lnk.Description = "Uruchom Zasilkowy Przewodnik (backend + frontend, auto-aktualizacja)"
  $lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
  $lnk.Save()
}

if (-not $NoShortcut) {
  $desktop = [Environment]::GetFolderPath("Desktop")
  New-Shortcut (Join-Path $desktop "Przewodnik ZUS.lnk")
  Say "Skrot na pulpicie: Przewodnik ZUS" "Green"
}
if ($AutoStart) {
  $startup = [Environment]::GetFolderPath("Startup")
  New-Shortcut (Join-Path $startup "Przewodnik ZUS.lnk")
  Say "Dodano do Autostartu - strona uruchomi sie po zalogowaniu." "Green"
}

Say "Gotowe. Uruchamiaj strone dwuklikiem na 'Przewodnik ZUS' na pulpicie." "Cyan"
