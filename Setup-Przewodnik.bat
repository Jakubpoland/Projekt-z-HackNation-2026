@echo off
rem Jednorazowa instalacja: Git, Go, Node.js, zaleznosci i skrot "Przewodnik ZUS" na pulpicie.
rem Dodaj parametr /autostart, aby strona uruchamiala sie po zalogowaniu do Windows.
cd /d "%~dp0"
set EXTRA=
if /i "%~1"=="/autostart" set EXTRA=-AutoStart
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1" %EXTRA%
echo.
pause
