🇺🇸 [English](README.en.md) | 🇯🇵 [日本語](README.md) | 🇨🇳 [中文](README.zh.md)

# Discord MCP Server

**Talk to AI through Discord. Mention your bot, get AI replies.**

Mention your bot in Discord and OpenAI's Codex CLI automatically responds.  
Plus 23 MCP tools let any AI (Codex, Claude Code, Cursor, etc.) control Discord.

---

## What is this?

A tool that runs AI (Codex CLI) on your PC and connects it to Discord.

```
Discord: @MyBot what do you think about this?
  ↓
Codex thinks on your PC
  ↓
Auto-reply appears in Discord
```

## Two ways to use it (can run both at once)

### 🗣️ Listener Mode — Auto-reply when mentioned in Discord
Mention the bot in Discord → Codex starts behind the scenes and replies automatically.  
**You just watch Discord.** Keep the listener running and you don't even need to open Codex.

### 🔧 MCP Tool Mode — Control Discord from AI
Tell Codex or Claude Code "read #general" or "create a thread" and the AI operates Discord.  
**You give instructions to the AI.**

---

## Requirements

### 1. Paid services

| Service | Cost | What for |
|---------|------|----------|
| [OpenAI API](https://platform.openai.com/) | Pay-as-you-go (~$5/mo) | The brain behind Codex CLI. GPT-4o generates responses |
| **or** [Anthropic API](https://console.anthropic.com/) | Pay-as-you-go (~$5/mo) | The brain behind Claude Code. Claude generates responses |

> 💡 This is **separate from** ChatGPT Plus ($20/mo) or Claude Pro ($20/mo) subscriptions.  
> You need an API key from the developer console of each service.

### 2. Software to install

| Software | How to install | Verify |
|----------|---------------|--------|
| **Node.js** (v18+) | Download from [nodejs.org](https://nodejs.org/) | `node --version` |
| **Codex CLI** | `npm install -g @openai/codex` | `codex --version` |

> 💡 **Using Claude Code?** Install with `npm install -g @anthropic-ai/claude-code`.  
> MCP Tool Mode works with any MCP-compatible AI (Codex, Claude Code, Cursor, Windsurf, Cline, etc.).

### 3. Discord Bot (free)

The bot is "AI's hands and feet" — it lets AI read and write in Discord.  
**Follow the steps below — takes 5 minutes.**

---

## Setup (complete guide)

### Step 1: Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) (log in with Discord)
2. Click **"New Application"** → name it and create
3. Click **"Bot"** in the left menu
4. Click **"Reset Token"** → copy the token (**this is the most important thing — you'll need it later**)
5. On the same page, turn **ON**:
   - ✅ **MESSAGE CONTENT INTENT** (to read message content)
   - ✅ **SERVER MEMBERS INTENT** (if you need member info)
6. Click **"OAuth2 → URL Generator"** in the left menu
7. Check **`bot`** under scopes
8. Check these permissions:
   - `Send Messages` / `Read Message History` / `Add Reactions`
   - `Manage Messages` / `Manage Channels` / `Manage Threads` / `Embed Links`
9. Copy the generated URL at the bottom → open in browser → select server to invite the bot

> ⚠️ **Never share your token.** If you do, immediately regenerate it with Reset Token.

### Step 2: Download and install

```bash
git clone https://github.com/RazielAI/discord-mcp-server.git
cd discord-mcp-server
npm install
```

> 💡 No git? Download ZIP from the GitHub page ("Code → Download ZIP") and extract.

### Step 3A: Listener Mode (auto-reply)

**Bot auto-replies when mentioned in Discord.** This is all you need.

Mac/Linux:
```bash
DISCORD_BOT_TOKEN="token-from-step-1" node discord-listener.js
```

Windows (PowerShell):
```powershell
$env:DISCORD_BOT_TOKEN="token-from-step-1"
node discord-listener.js
```

Now mention the bot in Discord (@BotName). You'll get an automatic reply 🎉

#### Listener settings (optional)

All optional except DISCORD_BOT_TOKEN.

| Variable | Description |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | **Required.** Bot token |
| `DISCORD_GUILD_ID` | Restrict to specific server |
| `DISCORD_CHANNEL_ID` | Restrict to specific channel |
| `CODEX_PATH` | Path to Codex CLI (auto-detected) |
| `CODEX_WORKSPACE` | Codex working directory |
| `CODEX_TIMEOUT_MS` | Timeout (default: 120s) |
| `BOT_SYSTEM_PROMPT` | Customize AI personality and rules |
| `BOT_NAME` | Bot display name |
| `MAX_HISTORY` | Conversation memory (default: 15 messages) |
| `OWNER_ID` | Owner's Discord ID |

### Step 3B: MCP Tool Mode (AI controls Discord)

**Tell Codex or Claude Code to operate Discord.**

#### For Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.discord]
type = "stdio"
command = "node"
args = ["/path/to/discord-mcp-server/discord-mcp-server.js"]

[mcp_servers.discord.env]
DISCORD_BOT_TOKEN = "token-from-step-1"
DISCORD_CHANNEL_ID = "default-channel-id"
DISCORD_GUILD_ID = "server-id"
```

#### For Claude Code

Add to `.mcp.json` in your project:

```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["/path/to/discord-mcp-server/discord-mcp-server.js"],
      "env": {
        "DISCORD_BOT_TOKEN": "token-from-step-1",
        "DISCORD_CHANNEL_ID": "default-channel-id"
      }
    }
  }
}
```

### Step 3C: Use both together

Listener (auto-reply) and MCP tools (AI control) can run simultaneously.

Terminal 1:
```bash
DISCORD_BOT_TOKEN="your-token" node discord-listener.js
```

Terminal 2:
```bash
codex  # with MCP configured in config.toml
```

> Same bot token for both — they're separate processes, no conflicts.

---

## Keep it running (daemonize)

To keep the bot running after closing the terminal:

### Using pm2 (recommended)

```bash
npm install -g pm2
DISCORD_BOT_TOKEN="your-token" pm2 start discord-listener.js --name discord-bot
pm2 save
pm2 startup  # auto-start after reboot
```

Commands:
```bash
pm2 status              # check status
pm2 logs discord-bot    # view logs
pm2 restart discord-bot # restart
pm2 stop discord-bot    # stop
```

---

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

---

## FAQ

**Q: Listener or MCP mode?**  
A: Want chat replies in Discord → Listener. Want to control Discord from AI → MCP. Both at once is best.

**Q: How much does it cost?**  
A: Discord Bot is free. You only pay OpenAI API fees. Normal conversations cost ~$5-10/month. Use GPT-4o mini for even cheaper.

**Q: I'm subscribed to ChatGPT Plus / Claude Pro. Can I use it?**  
A: No. Subscriptions and API access are separate. You need an API key from the developer console.

**Q: Works with AI other than Codex?**  
A: MCP mode works with any MCP-compatible AI (Claude Code, Cursor, Windsurf, Cline, etc.). Listener mode uses Codex CLI by default, but `CODEX_PATH` lets you use other CLI tools.

**Q: Multiple servers?**  
A: Yes. Don't set `DISCORD_GUILD_ID` and the bot responds in all servers it's in.

**Q: Is it secure?**  
A: Tokens stay in environment variables (not in code). Listener runs Codex with `--sandbox read-only` — no file writes or command execution.

**Q: Bot stops when I close the terminal**  
A: See [Keep it running](#keep-it-running-daemonize). pm2 auto-starts after reboot.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `node: command not found` | Node.js not installed | Install from [nodejs.org](https://nodejs.org/) |
| `codex: command not found` | Codex CLI not installed | `npm install -g @openai/codex` |
| Bot doesn't respond to mentions | MESSAGE CONTENT INTENT is off | Enable it in Developer Portal Bot tab |
| `Error: TOKEN_INVALID` | Wrong token | Reset Token in Developer Portal |
| `Missing Access` | Bot lacks permissions | Regenerate OAuth2 URL with permissions, re-invite |
| Listener works but Codex errors | API key not set | `export OPENAI_API_KEY="sk-..."` |

---

## License

MIT
