@echo off
chcp 65001 >nul 2>&1
title Discord MCP Server - Listener

echo.
echo   Discord MCP Server - Listener
echo   ==============================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js が見つかりません。
    echo   https://nodejs.org/ からインストールしてください。
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "%~dp0node_modules" (
    echo   [INFO] 初回セットアップ中... npm install を実行します。
    echo.
    cd /d "%~dp0"
    call npm install
    echo.
)

:: Check config.toml for token
findstr /r "discord_bot_token.*=.*\"[^\"]\+\"" "%~dp0config.toml" >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] config.toml にトークンが設定されていません。
    echo.
    echo   1. config.toml をテキストエディタで開く
    echo   2. discord_bot_token = "" の中にトークンを貼る
    echo   3. もう一度 start.bat を実行
    echo.
    echo   トークンの取得: https://discord.com/developers/applications
    echo.
    pause
    exit /b 1
)

echo   [OK] 起動中...
echo   Discordでbotをメンションすると自動で返事します。
echo   停止するには Ctrl+C を押してください。
echo.

cd /d "%~dp0"
node discord-listener.js

if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] リスナーがエラーで停止しました。
    echo.
    pause
)
