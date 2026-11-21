@echo off
rem Uruchamia backend i frontend Przewodnika oraz co 15 s pobiera nowe zmiany z GitHuba.
rem Galaz, na ktora pushuje agent frontendu (legion-540). Zmien tutaj, aby obserwowac inna.
set BRANCH=claude/magical-pascal-brns04

cd /d "%~dp0"
title Przewodnik ZUS - serwery (nie zamykaj, Ctrl+C konczy)
:start
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev-windows.ps1" -Branch %BRANCH% -IntervalSeconds 15
rem kod 3 = skrypt sie zaktualizowal, uruchom go ponownie
if errorlevel 3 goto start
if errorlevel 1 (
  echo.
  echo Cos poszlo nie tak. Skopiuj komunikat powyzej i wklej go w rozmowie.
  pause
)
