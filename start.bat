@echo off
setlocal
cd /d "%~dp0"

title Vintage 29 - Tienda (dev)

echo ================================================
echo   VINTAGE 29 - Tienda online (entorno local)
echo ================================================
echo.
echo   Presiona ESC para apagar el servidor.
echo.

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro pnpm en el PATH.
  echo Instalalo con: npm install -g pnpm
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias ^(primera vez^)...
  call pnpm install
  if errorlevel 1 (
    echo [ERROR] Fallo pnpm install.
    pause
    exit /b 1
  )
)

echo Iniciando servidor...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$s = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','pnpm dev' -NoNewWindow -PassThru; Write-Host ('Servidor en ejecucion (PID ' + $s.Id + '). Presiona ESC para apagarlo.') -ForegroundColor Green; while ($true) { if ([Console]::KeyAvailable) { $k = [Console]::ReadKey($true); if ($k.Key -eq [ConsoleKey]::Escape) { break } }; Start-Sleep -Milliseconds 100 }; Write-Host ''; Write-Host 'Apagando servidor...' -ForegroundColor Yellow; taskkill /F /T /PID $s.Id | Out-Null; Write-Host 'Servidor detenido.' -ForegroundColor Green"

echo.
echo Servidor detenido. Hasta luego.
timeout /t 2 >nul
