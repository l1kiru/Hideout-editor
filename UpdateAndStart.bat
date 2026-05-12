@echo off
setlocal

cd /d "%~dp0"

where git >nul 2>nul
if %ERRORLEVEL%==0 (
    echo [update] git pull
    git pull --ff-only
    if errorlevel 1 (
        echo.
        echo [update] git pull failed. Resolve the issue, then re-run UpdateAndStart.bat.
        pause
        exit /b 1
    )
) else (
    echo [update] git is not installed. Skipping git pull.
)

call "%~dp0Start.bat" %*
exit /b %ERRORLEVEL%
