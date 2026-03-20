🇺🇸 [English](README.en.md) | 🇯🇵 [日本語](README.md) | 🇨🇳 [中文](README.zh.md)

# Discord MCP Server

**通过Discord与AI对话。@你的机器人，AI自动回复。**

在Discord中@你的机器人，OpenAI的Codex CLI会自动回复。  
23个MCP工具让任何AI（Codex、Claude Code、Cursor等）都能控制Discord。

---

## 这是什么？

一个在你的电脑上运行AI（Codex CLI）并将其连接到Discord的工具。

```
Discord: @MyBot 你觉得怎么样？
  ↓
你电脑上的Codex开始思考
  ↓
Discord自动收到回复
```

## 两种使用方式（可以同时使用）

### 🗣️ 监听模式 — 在Discord中@就自动回复
在Discord中@机器人，Codex会在后台启动并自动回复。  
**你只需要看Discord就行。** 保持监听器运行，甚至不需要打开Codex。

### 🔧 MCP工具模式 — 从AI控制Discord
告诉Codex或Claude Code「读取#general」「创建一个线程」，AI就会操作Discord。  
**你向AI下达指令。**

---

## 所需条件

### 1. 付费服务

| 服务 | 费用 | 用途 |
|------|------|------|
| [OpenAI API](https://platform.openai.com/) | 按量付费（约$5/月） | Codex CLI的大脑。GPT-4o生成回复 |
| **或** [Anthropic API](https://console.anthropic.com/) | 按量付费（约$5/月） | Claude Code的大脑。Claude生成回复 |

> 💡 这与ChatGPT Plus($20/月)或Claude Pro($20/月)的**订阅是分开的**。  
> 你需要从各服务的开发者控制台获取API密钥。

### 2. 需要安装的软件

| 软件 | 安装方法 | 验证 |
|------|---------|------|
| **Node.js**（v18+） | 从 [nodejs.org](https://nodejs.org/) 下载 | `node --version` |
| **Codex CLI** | `npm install -g @openai/codex` | `codex --version` |

> 💡 **使用Claude Code？** 用 `npm install -g @anthropic-ai/claude-code` 安装。  
> MCP工具模式支持任何MCP兼容的AI（Codex、Claude Code、Cursor、Windsurf、Cline等）。

### 3. Discord Bot（免费创建）

Bot是「AI的手和脚」——让AI能读写Discord。  
**按照以下步骤操作，5分钟搞定。**

---

## 设置（完整指南）

### 步骤1：创建Discord Bot

1. 打开 [Discord Developer Portal](https://discord.com/developers/applications)（用Discord账号登录）
2. 点击右上角 **「New Application」** → 命名并创建
3. 点击左侧菜单 **「Bot」**
4. 点击 **「Reset Token」** → 复制显示的令牌（**这是最重要的，后面要用**）
5. 在同一页面启用以下选项：
   - ✅ **MESSAGE CONTENT INTENT**（读取消息内容）
   - ✅ **SERVER MEMBERS INTENT**（如需成员信息）
6. 点击左侧菜单 **「OAuth2 → URL Generator」**
7. 在范围中勾选 **`bot`**
8. 勾选以下权限：
   - `Send Messages` / `Read Message History` / `Add Reactions`
   - `Manage Messages` / `Manage Channels` / `Manage Threads` / `Embed Links`
9. 复制底部生成的URL → 在浏览器打开 → 选择要邀请Bot的服务器

> ⚠️ **绝对不要把令牌给别人看。** 如果泄露了，立即用Reset Token重新生成。

### 步骤2：下载和安装

```bash
git clone https://github.com/RazielAI/discord-mcp-server.git
cd discord-mcp-server
npm install
```

> 💡 没有git？从GitHub页面点击「Code → Download ZIP」下载解压即可。

### 步骤3A：监听模式（自动回复）

**在Discord中@就自动回复。** 这就够了。

Mac/Linux:
```bash
DISCORD_BOT_TOKEN="步骤1复制的令牌" node discord-listener.js
```

Windows（PowerShell）:
```powershell
$env:DISCORD_BOT_TOKEN="步骤1复制的令牌"
node discord-listener.js
```

启动后在Discord中@机器人试试。会自动回复 🎉

#### 监听器设置（可选）

除DISCORD_BOT_TOKEN外全部可选。

| 变量 | 说明 |
|------|------|
| `DISCORD_BOT_TOKEN` | **必需。** Bot令牌 |
| `DISCORD_GUILD_ID` | 限制到特定服务器 |
| `DISCORD_CHANNEL_ID` | 限制到特定频道 |
| `CODEX_PATH` | Codex CLI路径（自动检测） |
| `CODEX_WORKSPACE` | Codex工作目录 |
| `CODEX_TIMEOUT_MS` | 超时（默认: 120秒） |
| `BOT_SYSTEM_PROMPT` | 自定义AI的性格和规则 |
| `BOT_NAME` | Bot显示名称 |
| `MAX_HISTORY` | 对话记忆数（默认: 15条） |
| `OWNER_ID` | 所有者的Discord ID |

### 步骤3B：MCP工具模式（从AI控制Discord）

#### Codex CLI

在 `~/.codex/config.toml` 中添加：

```toml
[mcp_servers.discord]
type = "stdio"
command = "node"
args = ["/path/to/discord-mcp-server/discord-mcp-server.js"]

[mcp_servers.discord.env]
DISCORD_BOT_TOKEN = "步骤1复制的令牌"
DISCORD_CHANNEL_ID = "默认频道ID"
DISCORD_GUILD_ID = "服务器ID"
```

#### Claude Code

在项目的 `.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["/path/to/discord-mcp-server/discord-mcp-server.js"],
      "env": {
        "DISCORD_BOT_TOKEN": "步骤1复制的令牌",
        "DISCORD_CHANNEL_ID": "默认频道ID"
      }
    }
  }
}
```

### 步骤3C：同时使用两种模式

终端1:
```bash
DISCORD_BOT_TOKEN="your-token" node discord-listener.js
```

终端2:
```bash
codex  # config.toml中已配置MCP
```

> 同一个Bot令牌可以同时用于两者——它们是独立进程，互不干扰。

---

## 保持持续运行（守护进程化）

### 使用pm2（推荐）

```bash
npm install -g pm2
DISCORD_BOT_TOKEN="your-token" pm2 start discord-listener.js --name discord-bot
pm2 save
pm2 startup  # 重启后自动启动
```

管理命令：
```bash
pm2 status              # 查看状态
pm2 logs discord-bot    # 查看日志
pm2 restart discord-bot # 重启
pm2 stop discord-bot    # 停止
```

---

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

---

## 常见问题

**Q: 监听模式还是MCP模式？**  
A: 想在Discord聊天获得回复 → 监听模式。想从AI控制Discord → MCP模式。推荐同时使用。

**Q: 花多少钱？**  
A: Discord Bot免费。只付OpenAI API费用。普通对话约$5-10/月。用GPT-4o mini更便宜。

**Q: 我订阅了ChatGPT Plus / Claude Pro，能用吗？**  
A: 不能。订阅和API是分开的。需要从开发者控制台单独获取API密钥。

**Q: 支持Codex以外的AI吗？**  
A: MCP模式支持所有MCP兼容AI（Claude Code、Cursor、Windsurf、Cline等）。监听模式默认用Codex CLI，但可通过 `CODEX_PATH` 指定其他工具。

**Q: 安全吗？**  
A: 令牌通过环境变量管理（不写在代码里）。监听模式用 `--sandbox read-only` 运行Codex，不会修改文件或执行命令。

**Q: 关掉终端Bot就停了**  
A: 参见[保持持续运行](#保持持续运行守护进程化)。用pm2可以重启后自动启动。

---

## 故障排除

| 症状 | 原因 | 解决方法 |
|------|------|---------|
| `node: command not found` | 未安装Node.js | 从 [nodejs.org](https://nodejs.org/) 安装 |
| `codex: command not found` | 未安装Codex CLI | `npm install -g @openai/codex` |
| Bot不响应@提及 | MESSAGE CONTENT INTENT未开启 | 在Developer Portal的Bot标签页启用 |
| `Error: TOKEN_INVALID` | 令牌错误 | 在Developer Portal重新Reset Token |
| `Missing Access` | Bot权限不足 | 重新生成OAuth2 URL并添加权限，重新邀请 |
| 监听器正常但Codex报错 | API密钥未设置 | `export OPENAI_API_KEY="sk-..."` |

---

## 许可证

MIT
