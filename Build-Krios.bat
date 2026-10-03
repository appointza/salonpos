@echo off
setlocal
cd /d "%~dp0"
set "REPO=%~dp0"
if "%REPO:~-1%"=="\" set "REPO=%REPO:~0,-1%"
echo Publishing TakeBuild.exe then running the Krios production build...
dotnet publish "%~dp0tools\KriosBuilder\KriosBuilder.csproj" -c Release -o "D:\aravindan\build" --nologo -p:UseAppHost=true
if errorlevel 1 (
  echo Failed to publish TakeBuild.exe
  exit /b 1
)
"D:\aravindan\build\TakeBuild.exe" --repo "%REPO%"
exit /b %ERRORLEVEL%
