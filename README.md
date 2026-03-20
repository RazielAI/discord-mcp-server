🇺🇸 [English](README.en.md) | 🇯🇵 [日本語](README.md) | 🇨🇳 [中文](README.zh.md)

# Discord MCP Server

**あなたのPCで動いてるCodexを、Discord上の会話で動かせます。**

Discordでメンションするだけで、裏でCodex CLIが考えて返事してくれます。  
さらにMCPツール23個で、メッセージ・スレッド・チャンネル・メンバー管理まで全部できます。

## 2つのモード

### 🗣️ リスナーモード（自動応答）
Discordでbotをメンション → Codexが自動で返事。チャットするだけ。

```
あなた: @MyBot このコードレビューして
MyBot:  （Codexが考えて返事する）
```

### 🔧 MCPツールモード（23ツール）
Codex CLIからDiscordの操作を何でもできる。

```
> Discordの #general を読んで
> #dev にスレッド作って議事録書いて
> サーバーのメンバー一覧見せて
```

## セットアップ（5分）

### 1. Discord Botを作る

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成
2. **Bot** タブでトークンを取得（`Reset Token` → コピー）
3. **Bot** タブで以下を有効化：
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT（メンバー情報を使う場合）
4. **OAuth2 → URL Generator** で権限を選択：
   - スコープ: `bot`
   - 権限: `Send Messages` / `Read Message History` / `Add Reactions` / `Manage Messages` / `Manage Channels` / `Manage Threads` / `Embed Links`
5. 生成されたURLでBotをサーバーに招待

### 2. インストール

```bash
git clone https://github.com/RazielAI/discord-mcp-server.git
cd discord-mcp-server
npm install
```

### 3A. リスナーモード（自動応答）

Botがメンションされたら自動でCodexが返事するモード。

```bash
# 起動
DISCORD_BOT_TOKEN="your-token" node discord-listener.js
```

Windowsの場合：
```powershell
$env:DISCORD_BOT_TOKEN="your-token"
node discord-listener.js
```

Discordでbotをメンションすると自動応答します 🎉

#### リスナーの設定（環境変数）

| 変数 | 必須 | 説明 |
|------|-----|------|
| `DISCORD_BOT_TOKEN` | ✅ | Botトークン |
| `DISCORD_GUILD_ID` | — | 特定サーバーのみに制限 |
| `DISCORD_CHANNEL_ID` | — | 特定チャンネルのみに制限 |
| `CODEX_PATH` | — | Codex CLIのパス（自動検出） |
| `CODEX_WORKSPACE` | — | Codexの作業ディレクトリ |
| `CODEX_TIMEOUT_MS` | — | タイムアウト（デフォルト: 120秒） |
| `BOT_SYSTEM_PROMPT` | — | カスタムシステムプロンプト |
| `BOT_NAME` | — | Bot表示名 |
| `MAX_HISTORY` | — | コンテキストに含めるメッセージ数（デフォルト: 15） |
| `OWNER_ID` | — | オーナーのDiscord ID |

#### カスタムプロンプト例

```bash
BOT_SYSTEM_PROMPT="あなたはプログラミング専門のAIアシスタントです。技術的な質問に日本語で答えてください。" \
DISCORD_BOT_TOKEN="your-token" \
node discord-listener.js
```

### 3B. MCPツールモード

Codex CLIからDiscordを操作するモード。

`~/.codex/config.toml` に追加：

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

### 3C. 両方同時に使う

リスナー（自動応答）とMCPツール（Codexからの操作）を同時に動かせます。

ターミナル1:
```bash
DISCORD_BOT_TOKEN="your-token" node discord-listener.js
```

ターミナル2:
```bash
codex  # config.tomlにMCP設定済み
```

> ⚠️ 同じBotトークンを使う場合、リスナーとMCPサーバーは同時に動作できます（別プロセスでDiscordに接続）。

## MCPツール一覧（23個）

| カテゴリ | ツール | できること |
|---------|-------|-----------|
| 💬 メッセージ | `discord_send` | メッセージ送信（長文自動分割） |
| | `discord_reply` | 特定メッセージに返信 |
| | `discord_edit` | Bot送信済みメッセージを編集 |
| | `discord_delete` | メッセージ削除 |
| | `discord_read` | メッセージ履歴取得（ページネーション対応） |
| | `discord_search` | チャンネル内メッセージ検索 |
| 👍 リアクション | `discord_react` | 絵文字リアクション追加 |
| 🧵 スレッド | `discord_thread_create` | スレッド作成 |
| | `discord_thread_list` | アクティブスレッド一覧 |
| 📺 チャンネル | `discord_channel_list` | チャンネル一覧 |
| | `discord_channel_info` | チャンネル詳細情報 |
| | `discord_channel_create` | チャンネル新規作成 |
| | `discord_channel_edit` | チャンネル名・トピック変更 |
| | `discord_channel_delete` | チャンネル削除 |
| | `discord_set_topic` | トピック設定 |
| 📌 ピン | `discord_pin` | メッセージをピン留め |
| | `discord_unpin` | ピン解除 |
| | `discord_pins_list` | ピン留めメッセージ一覧 |
| 👥 サーバー | `discord_server_info` | サーバー情報 |
| | `discord_member_list` | メンバー一覧 |
| | `discord_member_info` | メンバー詳細情報 |
| 🎨 リッチ送信 | `discord_send_embed` | Embed（装飾メッセージ）送信 |
| 🤖 その他 | `discord_whoami` | Bot自身の情報 |

## Claude Codeでも使えます

プロジェクトの `.mcp.json` に追加：

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

MCP対応のAIクライアントなら何でも接続できます（Claude Code, Cursor, Windsurf, Cline等）。

## FAQ

**Q: リスナーモードとMCPモード、どっちを使えばいい？**  
A: Discordからチャットして返事がほしい → リスナーモード。Codexからプログラム的にDiscordを操作したい → MCPモード。両方使うのがおすすめ。

**Q: Codex以外のAIでも使える？**  
A: MCPモードはMCP対応のAIなら何でも。リスナーモードはCodex CLIを使いますが、`CODEX_PATH` で別のCLIツールを指定することも可能です。

**Q: 複数サーバーで使える？**  
A: はい。`DISCORD_GUILD_ID` を設定しなければ、Botが参加している全サーバーで応答します。

**Q: セキュリティは大丈夫？**  
A: トークンは環境変数で管理。リスナーモードではCodexを `--sandbox read-only` で実行するため、ファイルの書き換えやコマンド実行はできません。

## ライセンス

MIT
