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
    echo   [ERROR] Node.js が見つかりません。
    echo   https://nodejs.org/ からインストールしてください。
    echo.
    pause
    exit /b 1
)

:: ─── Check npm install ──────────────────────────────────────
if not exist "%~dp0node_modules" (
    echo   [SETUP] 初回セットアップ... npm install を実行します。
    echo.
    cd /d "%~dp0"
    call npm install
    echo.
)

:: ─── Check Codex CLI ────────────────────────────────────────
where codex >nul 2>&1
if %errorlevel% neq 0 (
    echo   [SETUP] Codex CLI が見つかりません。インストールします...
    echo.
    call npm install -g @openai/codex
    echo.
    where codex >nul 2>&1
    if %errorlevel% neq 0 (
        echo   [ERROR] Codex CLI のインストールに失敗しました。
        echo   手動で実行してください: npm install -g @openai/codex
        echo.
        pause
        exit /b 1
    )
    echo   [OK] Codex CLI インストール完了
    echo.
)

:: ─── Check config.toml for bot token ────────────────────────
findstr /r "discord_bot_token.*=.*\"[^\"]\+\"" "%~dp0config.toml" >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] config.toml に Bot トークンが設定されていません。
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

:: ─── Load OpenAI API key from config.toml ───────────────────
cd /d "%~dp0"

:: Check if OPENAI_API_KEY is already set
if defined OPENAI_API_KEY goto :skip_apikey

:: Try to extract from config.toml
for /f "tokens=2 delims==" %%a in ('findstr /r "openai_api_key.*=.*\"[^\"]\+\"" "%~dp0config.toml" 2^>nul') do (
    set "_raw=%%a"
)
if defined _raw (
    :: Strip quotes and spaces
    set "_raw=%_raw: =%"
    set "_raw=%_raw:"=%"
    if not "%_raw%"=="" (
        set "OPENAI_API_KEY=%_raw%"
        echo   [OK] OpenAI API キーを config.toml から読み込みました
    )
)
set "_raw="

if not defined OPENAI_API_KEY (
    echo   [ERROR] OpenAI API キーが設定されていません。
    echo.
    echo   config.toml の openai_api_key = "" にAPIキーを貼ってください。
    echo   APIキーの取得: https://platform.openai.com/api-keys
    echo.
    pause
    exit /b 1
)

:skip_apikey

:: ─── Launch ─────────────────────────────────────────────────
echo   [OK] 起動中...
echo   Discordでbotをメンションすると自動で返事します。
echo   停止するには Ctrl+C を押してください。
echo.

node discord-listener.js

if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] リスナーがエラーで停止しました。
    echo.
    pause
)
