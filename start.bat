@echo off
chcp 65001 >nul 2>&1
title Discord MCP Server - Listener

echo.
echo   Discord MCP Server - Listener
echo   ==============================
echo.

:: ─── Check Node.js ──────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js not found.
    echo   Download from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: ─── Check npm install ──────────────────────────────────────
if not exist "%~dp0node_modules" (
    echo   [SETUP] First-time setup... running npm install.
    echo.
    cd /d "%~dp0"
    call npm install
    echo.
)

:: ─── Check Codex CLI ────────────────────────────────────────
where codex >nul 2>&1
if %errorlevel% neq 0 (
    echo   [SETUP] Codex CLI not found. Installing...
    echo.
    call npm install -g @openai/codex
    echo.
    where codex >nul 2>&1
    if %errorlevel% neq 0 (
        echo   [ERROR] Failed to install Codex CLI.
        echo   Run manually: npm install -g @openai/codex
        echo.
        pause
        exit /b 1
    )
    echo   [OK] Codex CLI installed
    echo.
)

:: ─── Check config.toml for bot token ────────────────────────
findstr /r "discord_bot_token.*=.*\"[^\"]\+\"" "%~dp0config.toml" >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] No bot token in config.toml.
    echo.
    echo   1. Open config.toml in a text editor
    echo   2. Paste your token inside discord_bot_token = ""
    echo   3. Run start.bat again
    echo.
    echo   Get your token: https://discord.com/developers/applications
    echo.
    pause
    exit /b 1
)

:: ─── Launch ─────────────────────────────────────────────────
cd /d "%~dp0"
echo   [OK] Starting...
echo   Mention your bot in Discord and it will auto-reply.
echo   Press Ctrl+C to stop.
echo.

node discord-listener.js

if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Listener stopped with an error.
    echo.
    pause
)
