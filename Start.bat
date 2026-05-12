@echo off
setlocal

rem Run from the directory where this script lives so double-click works.
cd /d "%~dp0"

rem Prefer the Windows Python launcher, fall back to "python" on PATH.
where py >nul 2>nul
if %ERRORLEVEL%==0 (
    set "PY_CMD=py -3"
) else (
    where python >nul 2>nul
    if errorlevel 1 (
        echo [start] Python 3.10+ is required. Install it from https://www.python.org/ and reopen the terminal.
        pause
        exit /b 1
    )
    set "PY_CMD=python"
)

%PY_CMD% dev.py %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo [start] dev.py exited with code %EXIT_CODE%.
    pause
)

exit /b %EXIT_CODE%
