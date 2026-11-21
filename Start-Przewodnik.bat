@echo off
rem Uruchamia backend i frontend Przewodnika oraz co 15 s pobiera nowe zmiany z GitHuba.
rem Sledzi galaz tej kopii: checkout main szuka zmian na main, checkout Claude na swojej galezi.

cd /d "%~dp0"
title Przewodnik ZUS - serwery (nie zamykaj, Ctrl+C konczy)
:start
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev-windows.ps1" -IntervalSeconds 15
rem kod 3 = skrypt sie zaktualizowal, uruchom go ponownie
if errorlevel 3 goto start
if errorlevel 1 (
  echo.
  echo Cos poszlo nie tak. Skopiuj komunikat powyzej i wklej go w rozmowie.
  pause
)
