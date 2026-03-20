#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "  Discord MCP Server - Listener"
echo "  =============================="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "  [ERROR] Node.js not found."
    echo "  Install from https://nodejs.org/"
    echo ""
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "  [INFO] First-time setup... running npm install."
    echo ""
    npm install
    echo ""
fi

# Check config.toml for token
if ! grep -qE 'discord_bot_token\s*=\s*"[^"]+"' config.toml 2>/dev/null; then
    echo "  [ERROR] No token in config.toml."
    echo ""
    echo "  1. Open config.toml in a text editor"
    echo "  2. Paste your token inside discord_bot_token = \"\""
    echo "  3. Run start.sh again"
    echo ""
    echo "  Get your token: https://discord.com/developers/applications"
    echo ""
    exit 1
fi

echo "  [OK] Starting..."
echo "  Mention your bot in Discord and it will auto-reply."
echo "  Press Ctrl+C to stop."
echo ""

node discord-listener.js
