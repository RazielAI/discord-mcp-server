🇺🇸 [English](README.md) | 🇯🇵 [日本語](README.ja.md) | 🇨🇳 [中文](README.zh.md)

# Discord MCP Server

**Run Codex on Discord — mention your bot, get AI replies. Plus 23 MCP tools for full Discord control.**

Mention your bot in Discord and Codex CLI responds automatically.  
23 MCP tools let you read, send, search, and manage everything in Discord from your AI.

## Two Modes

### 🗣️ Listener Mode (Auto-Reply)
Mention the bot in Discord → Codex thinks and replies. Just chat.

```
You:    @MyBot review this code
MyBot:  (Codex thinks and responds)
```

### 🔧 MCP Tool Mode (23 Tools)
Control Discord from Codex CLI — messages, threads, channels, members.

```
> Read #general on Discord
> Create a thread in #dev and write meeting notes
> Show me the server member list
```

## Setup (5 minutes)

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) and create an application
2. **Bot** tab → get your token (`Reset Token` → copy)
3. **Bot** tab → enable:
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT (if you need member info)
4. **OAuth2 → URL Generator** → select permissions:
   - Scopes: `bot`
   - Permissions: `Send Messages` / `Read Message History` / `Add Reactions` / `Manage Messages` / `Manage Channels` / `Manage Threads` / `Embed Links`
5. Use the generated URL to invite the bot to your server

### 2. Install

```bash
git clone https://github.com/RazielAI/discord-mcp-server.git
cd discord-mcp-server
npm install
```

### 3A. Listener Mode (Auto-Reply)

Bot auto-responds when mentioned.

```bash
DISCORD_BOT_TOKEN="your-token" node discord-listener.js
```

Windows:
```powershell
$env:DISCORD_BOT_TOKEN="your-token"
node discord-listener.js
```

Mention the bot in Discord and it responds automatically 🎉

#### Listener Configuration (Environment Variables)

| Variable | Required | Description |
|----------|---------|-------------|
| `DISCORD_BOT_TOKEN` | ✅ | Bot token |
| `DISCORD_GUILD_ID` | — | Restrict to a specific server |
| `DISCORD_CHANNEL_ID` | — | Restrict to a specific channel |
| `CODEX_PATH` | — | Path to Codex CLI (auto-detected) |
| `CODEX_WORKSPACE` | — | Codex working directory |
| `CODEX_TIMEOUT_MS` | — | Timeout (default: 120s) |
| `BOT_SYSTEM_PROMPT` | — | Custom system prompt |
| `BOT_NAME` | — | Bot display name |
| `MAX_HISTORY` | — | Messages to include as context (default: 15) |
| `OWNER_ID` | — | Owner's Discord ID |

#### Custom Prompt Example

```bash
BOT_SYSTEM_PROMPT="You are a programming expert. Answer technical questions clearly." \
DISCORD_BOT_TOKEN="your-token" \
node discord-listener.js
```

### 3B. MCP Tool Mode

Control Discord from Codex CLI.

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.discord]
type = "stdio"
command = "node"
args = ["/path/to/discord-mcp-server/discord-mcp-server.js"]

[mcp_servers.discord.env]
DISCORD_BOT_TOKEN = "your-bot-token-here"
DISCORD_CHANNEL_ID = "your-default-channel-id"
DISCORD_GUILD_ID = "your-server-id"
```

```bash
codex
```

### 3C. Use Both Modes Together

Run listener (auto-reply) and MCP tools (Codex-side control) simultaneously.

Terminal 1:
```bash
DISCORD_BOT_TOKEN="your-token" node discord-listener.js
```

Terminal 2:
```bash
codex  # with MCP configured in config.toml
```

> ⚠️ Both can run at the same time with the same bot token (separate processes connecting to Discord).

## MCP Tools (23)

| Category | Tool | Description |
|----------|------|-------------|
| 💬 Messages | `discord_send` | Send message (auto-splits long text) |
| | `discord_reply` | Reply to a specific message |
| | `discord_edit` | Edit bot's own message |
| | `discord_delete` | Delete a message |
| | `discord_read` | Read message history (with pagination) |
| | `discord_search` | Search messages in a channel |
| 👍 Reactions | `discord_react` | Add emoji reaction |
| 🧵 Threads | `discord_thread_create` | Create a thread |
| | `discord_thread_list` | List active threads |
| 📺 Channels | `discord_channel_list` | List channels |
| | `discord_channel_info` | Get channel details |
| | `discord_channel_create` | Create a channel |
| | `discord_channel_edit` | Edit channel name/topic |
| | `discord_channel_delete` | Delete a channel |
| | `discord_set_topic` | Set channel topic |
| 📌 Pins | `discord_pin` | Pin a message |
| | `discord_unpin` | Unpin a message |
| | `discord_pins_list` | List pinned messages |
| 👥 Server | `discord_server_info` | Server info |
| | `discord_member_list` | List members |
| | `discord_member_info` | Get member details |
| 🎨 Rich | `discord_send_embed` | Send embed (rich message) |
| 🤖 Other | `discord_whoami` | Bot's own info |

## Works with Claude Code too

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["/path/to/discord-mcp-server/discord-mcp-server.js"],
      "env": {
        "DISCORD_BOT_TOKEN": "your-bot-token-here",
        "DISCORD_CHANNEL_ID": "your-default-channel-id"
      }
    }
  }
}
```

Works with any MCP-compatible AI client (Claude Code, Cursor, Windsurf, Cline, etc.).

## FAQ

**Q: Listener or MCP mode?**  
A: Want chat replies in Discord → Listener. Want to control Discord from Codex → MCP. Use both for the best experience.

**Q: Works with AI other than Codex?**  
A: MCP mode works with any MCP-compatible AI. Listener mode uses Codex CLI by default, but you can point `CODEX_PATH` to another CLI tool.

**Q: Multiple servers?**  
A: Yes. Don't set `DISCORD_GUILD_ID` and the bot responds in all servers it's in.

**Q: Is it secure?**  
A: Tokens stay in environment variables. Listener runs Codex with `--sandbox read-only` — no file writes or command execution.

## License

MIT
