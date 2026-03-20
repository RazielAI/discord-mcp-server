🇺🇸 [English](README.en.md) | 🇯🇵 [日本語](README.md) | 🇨🇳 [中文](README.zh.md)

# Discord MCP Server

**在Discord上运行Codex — @你的机器人，AI自动回复。23个MCP工具完全控制Discord。**

在Discord中@你的机器人，Codex CLI就会自动回复。  
23个MCP工具让你的AI可以读取、发送、搜索和管理Discord的一切。

## 两种模式

### 🗣️ 监听模式（自动回复）
在Discord中@机器人 → Codex思考并回复。只需聊天。

```
你:      @MyBot 帮我审查这段代码
MyBot:   （Codex思考后回复）
```

### 🔧 MCP工具模式（23个工具）
通过Codex CLI控制Discord — 消息、线程、频道、成员管理。

```
> 读取Discord的 #general 频道
> 在 #dev 创建线程并写会议记录
> 显示服务器成员列表
```

## 设置（5分钟）

### 1. 创建Discord Bot

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications) 创建应用
2. **Bot** 标签页 → 获取令牌（`Reset Token` → 复制）
3. **Bot** 标签页 → 启用以下选项：
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT（如需成员信息）
4. **OAuth2 → URL Generator** → 选择权限：
   - 范围: `bot`
   - 权限: `Send Messages` / `Read Message History` / `Add Reactions` / `Manage Messages` / `Manage Channels` / `Manage Threads` / `Embed Links`
5. 使用生成的URL将Bot邀请到你的服务器

### 2. 安装

```bash
git clone https://github.com/RazielAI/discord-mcp-server.git
cd discord-mcp-server
npm install
```

### 3A. 监听模式（自动回复）

Bot被@时自动回复。

```bash
DISCORD_BOT_TOKEN="your-token" node discord-listener.js
```

Windows:
```powershell
$env:DISCORD_BOT_TOKEN="your-token"
node discord-listener.js
```

在Discord中@机器人即可自动回复 🎉

#### 监听器配置（环境变量）

| 变量 | 必需 | 说明 |
|------|-----|------|
| `DISCORD_BOT_TOKEN` | ✅ | Bot令牌 |
| `DISCORD_GUILD_ID` | — | 限制到特定服务器 |
| `DISCORD_CHANNEL_ID` | — | 限制到特定频道 |
| `CODEX_PATH` | — | Codex CLI路径（自动检测） |
| `CODEX_WORKSPACE` | — | Codex工作目录 |
| `CODEX_TIMEOUT_MS` | — | 超时时间（默认: 120秒） |
| `BOT_SYSTEM_PROMPT` | — | 自定义系统提示词 |
| `BOT_NAME` | — | Bot显示名称 |
| `MAX_HISTORY` | — | 上下文消息数量（默认: 15） |
| `OWNER_ID` | — | 所有者的Discord ID |

#### 自定义提示词示例

```bash
BOT_SYSTEM_PROMPT="你是一个编程专家。用中文清晰地回答技术问题。" \
DISCORD_BOT_TOKEN="your-token" \
node discord-listener.js
```

### 3B. MCP工具模式

通过Codex CLI控制Discord。

在 `~/.codex/config.toml` 中添加：

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

### 3C. 同时使用两种模式

监听器（自动回复）和MCP工具（Codex端控制）可以同时运行。

终端1:
```bash
DISCORD_BOT_TOKEN="your-token" node discord-listener.js
```

终端2:
```bash
codex  # config.toml中已配置MCP
```

> ⚠️ 使用相同的Bot令牌，两者可以同时运行（作为独立进程连接Discord）。

## MCP工具列表（23个）

| 类别 | 工具 | 功能 |
|------|------|------|
| 💬 消息 | `discord_send` | 发送消息（长文本自动分割） |
| | `discord_reply` | 回复特定消息 |
| | `discord_edit` | 编辑Bot已发送的消息 |
| | `discord_delete` | 删除消息 |
| | `discord_read` | 读取消息历史（支持分页） |
| | `discord_search` | 搜索频道内消息 |
| 👍 反应 | `discord_react` | 添加表情反应 |
| 🧵 线程 | `discord_thread_create` | 创建线程 |
| | `discord_thread_list` | 列出活跃线程 |
| 📺 频道 | `discord_channel_list` | 列出频道 |
| | `discord_channel_info` | 获取频道详情 |
| | `discord_channel_create` | 创建频道 |
| | `discord_channel_edit` | 编辑频道名称/主题 |
| | `discord_channel_delete` | 删除频道 |
| | `discord_set_topic` | 设置频道主题 |
| 📌 置顶 | `discord_pin` | 置顶消息 |
| | `discord_unpin` | 取消置顶 |
| | `discord_pins_list` | 列出置顶消息 |
| 👥 服务器 | `discord_server_info` | 服务器信息 |
| | `discord_member_list` | 成员列表 |
| | `discord_member_info` | 成员详情 |
| 🎨 富文本 | `discord_send_embed` | 发送Embed（富文本消息） |
| 🤖 其他 | `discord_whoami` | Bot自身信息 |

## 也支持Claude Code

在项目的 `.mcp.json` 中添加：

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

兼容所有MCP客户端（Claude Code、Cursor、Windsurf、Cline等）。

## 常见问题

**Q: 监听模式还是MCP模式？**  
A: 想在Discord中聊天获得回复 → 监听模式。想从Codex控制Discord → MCP模式。推荐两者同时使用。

**Q: 支持Codex以外的AI吗？**  
A: MCP模式支持所有MCP兼容的AI。监听模式默认使用Codex CLI，但可以通过 `CODEX_PATH` 指定其他CLI工具。

**Q: 支持多个服务器吗？**  
A: 支持。不设置 `DISCORD_GUILD_ID`，Bot会在所有加入的服务器中响应。

**Q: 安全吗？**  
A: 令牌通过环境变量管理。监听模式使用 `--sandbox read-only` 运行Codex，不会修改文件或执行命令。

## 许可证

MIT
