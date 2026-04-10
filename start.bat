@echo off
title Quiz Arena

:: Capture the directory this .bat file lives in (always ends with \)
set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"
set "BACKEND=%ROOT%backend"

echo.
echo  ==========================================
echo   QUIZ ARENA - Starting up...
echo  ==========================================
echo.
echo  Root:     %ROOT%
echo  Frontend: %FRONTEND%
echo  Backend:  %BACKEND%
echo.

:: ── Check Node ────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found.
    echo  Please install from https://nodejs.org
    pause
    exit /b 1
)

:: ── Check Python ──────────────────────────────────────
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python not found.
    echo  Please install from https://python.org
    pause
    exit /b 1
)

:: ── Install frontend deps if needed ───────────────────
if not exist "%FRONTEND%\node_modules" (
    echo  [1/3] Installing frontend dependencies...
    pushd "%FRONTEND%"
    call npm install
    popd
    echo  [1/3] Done.
) else (
    echo  [1/3] Frontend dependencies already installed.
)

:: ── Create venv + install backend deps if needed ──────
if not exist "%BACKEND%\venv" (
    echo  [2/3] Creating Python virtual environment...
    pushd "%BACKEND%"
    python -m venv venv
    call "%BACKEND%\venv\Scripts\activate.bat"
    pip install -r "%BACKEND%\requirements.txt"
    popd
    echo  [2/3] Done.
) else (
    echo  [2/3] Python venv already exists.
)

:: ── Launch backend in a new terminal window ───────────
echo  [3/3] Starting backend  (FastAPI  -> http://localhost:8000)
start "Quiz Arena - Backend" cmd /k "cd /d "%BACKEND%" && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

:: Give backend a moment to bind the port
timeout /t 2 /nobreak >nul

:: ── Launch frontend in a new terminal window ──────────
echo  [3/3] Starting frontend (Next.js  -> http://localhost:3000)
start "Quiz Arena - Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo  ==========================================
echo   Quiz Arena is starting!
echo.
echo   Open http://localhost:3000 in your browser
echo   (may take ~10 seconds on first load)
echo  ==========================================
echo.
echo  Close the two server windows to stop the app.
echo  You can close this window now.
echo.
pause
