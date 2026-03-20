🇺🇸 [English](README.en.md) | 🇯🇵 [日本語](README.md) | 🇨🇳 [中文](README.zh.md)

# Discord MCP Server

**DiscordでAIと会話できるようにするツールです。**

Discordでメンションするだけで、OpenAIのCodex CLIが自動で返事してくれます。  
さらにMCPツール23個で、Codex/Claude Code/CursorなどのAIからDiscordの操作ができます。

---

## これは何？

あなたのPCでAI（Codex CLI）を動かして、Discordと接続するツールです。

```
Discordで @MyBot これどう思う？
  ↓
あなたのPCでCodexが考える
  ↓
Discordに自動で返事が来る
```

## 2つの使い方（同時に使えます）

### 🗣️ リスナーモード — Discordから話しかけると自動返答
Discordでbotをメンションすると、裏でCodexが起動して自動で返事します。  
**あなたはDiscordを見てるだけ。** リスナーを起動しておけば、Codexを開く必要もありません。

### 🔧 MCPツールモード — AIからDiscordを操作
Codex CLIやClaude Codeから「#generalを読んで」「スレッド作って」と指示すると、AIがDiscordを操作します。  
こちらは**あなたがAIに指示して使います。**

---

## 必要なもの

### 1. お金がかかるもの

| サービス | 料金 | 何に使う |
|---------|------|---------|
| [OpenAI API](https://platform.openai.com/) | 従量課金（$5〜/月目安） | Codex CLIの頭脳。GPT-4oが応答を生成 |
| **または** [Anthropic API](https://console.anthropic.com/) | 従量課金（$5〜/月目安） | Claude Codeの頭脳。Claudeが応答を生成 |

> 💡 ChatGPT Plus($20/月)やClaude Pro($20/月)の**サブスクとは別物**です。  
> APIキーが必要です。各サービスの開発者コンソールから取得してください。

### 2. PCにインストールするもの

| ソフト | インストール方法 | 確認コマンド |
|-------|----------------|-------------|
| **Node.js**（v18以上） | [nodejs.org](https://nodejs.org/) からダウンロード | `node --version` |
| **Codex CLI** | `npm install -g @openai/codex` | `codex --version` |

> 💡 **Claude Codeを使う場合:** `npm install -g @anthropic-ai/claude-code` でインストール。  
> MCPツールモードはCodex/Claude Code/Cursor/Windsurf/Cline等のMCP対応AIなら何でも使えます。

### 3. Discord Bot（無料で作れます）

Botは「AIの手足」です。AIがDiscordを読んだり書いたりするために必要です。  
**以下の手順に従えば5分で作れます。**

---

## セットアップ（全手順）

### ステップ1: Discord Botを作る

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く（Discordアカウントでログイン）
2. 右上の **「New Application」** をクリック → 名前を付けて作成
3. 左メニューの **「Bot」** をクリック
4. **「Reset Token」** をクリック → 表示されたトークンをコピー（**これが最重要。後で使います**）
5. 同じ画面で以下を**ON**にする：
   - ✅ **MESSAGE CONTENT INTENT**（メッセージの中身を読むため）
   - ✅ **SERVER MEMBERS INTENT**（メンバー情報を使う場合）
6. 左メニューの **「OAuth2 → URL Generator」** をクリック
7. スコープで **`bot`** にチェック
8. 権限で以下にチェック：
   - `Send Messages` / `Read Message History` / `Add Reactions`
   - `Manage Messages` / `Manage Channels` / `Manage Threads` / `Embed Links`
9. 画面下部に生成されたURLをコピー → ブラウザで開く → Botを招待するサーバーを選択

> ⚠️ **トークンは絶対に他人に見せないでください。** 見せた場合はすぐにReset Tokenで再生成してください。

### ステップ2: ダウンロードとインストール

```bash
git clone https://github.com/RazielAI/discord-mcp-server.git
cd discord-mcp-server
npm install
```

> 💡 gitがない場合: GitHubページから「Code → Download ZIP」でダウンロードして解凍してもOKです。

### ステップ3A: リスナーモード（自動応答）を使う

**Discordで話しかけたらAIが自動で返事するモード。** これだけでOKです。

#### 🟢 簡単な方法（おすすめ）

1. `config.toml` をテキストエディタで開く
2. `discord_bot_token = ""` の `""` の中にステップ1のトークンを貼り付ける
3. **Windows:** `start.bat` をダブルクリック
4. **Mac/Linux:** ターミナルで `./start.sh` を実行

これだけ！初回は自動で `npm install` も実行されます。

#### コマンドで起動する場合

Mac/Linux:
```bash
DISCORD_BOT_TOKEN="ステップ1でコピーしたトークン" node discord-listener.js
```

Windows（PowerShell）:
```powershell
$env:DISCORD_BOT_TOKEN="ステップ1でコピーしたトークン"
node discord-listener.js
```

起動したら、Discordでbotをメンション（@Bot名）してみてください。自動で返事が来ます 🎉

#### リスナーの設定（オプション）

環境変数で細かく設定できます。**DISCORD_BOT_TOKEN以外は全部オプション**です。

| 変数 | 説明 |
|------|------|
| `DISCORD_BOT_TOKEN` | **必須。** Botトークン |
| `DISCORD_GUILD_ID` | 特定サーバーのみに制限（指定しないと全サーバーで応答） |
| `DISCORD_CHANNEL_ID` | 特定チャンネルのみに制限 |
| `CODEX_PATH` | Codex CLIのパス（自動検出するので通常は不要） |
| `CODEX_WORKSPACE` | Codexの作業ディレクトリ |
| `CODEX_TIMEOUT_MS` | タイムアウト（デフォルト: 120秒） |
| `BOT_SYSTEM_PROMPT` | AIの性格やルールをカスタマイズ |
| `BOT_NAME` | Bot表示名 |
| `MAX_HISTORY` | 会話の記憶数（デフォルト: 15メッセージ） |
| `OWNER_ID` | オーナーのDiscord ID |

#### カスタムプロンプト例

```bash
BOT_SYSTEM_PROMPT="あなたはプログラミング専門のAIアシスタントです。技術的な質問に日本語で答えてください。" \
DISCORD_BOT_TOKEN="your-token" \
node discord-listener.js
```

### ステップ3B: MCPツールモード（AIからDiscord操作）を使う

**Codex CLIやClaude Codeから「Discordの#generalを読んで」と指示するモード。**

#### Codex CLIの場合

`~/.codex/config.toml` に以下を追加：

```toml
[mcp_servers.discord]
type = "stdio"
command = "node"
args = ["/path/to/discord-mcp-server/discord-mcp-server.js"]

[mcp_servers.discord.env]
DISCORD_BOT_TOKEN = "ステップ1でコピーしたトークン"
DISCORD_CHANNEL_ID = "デフォルトのチャンネルID"
DISCORD_GUILD_ID = "サーバーID"
```

> 💡 `/path/to/` は実際のパスに置き換えてください。例: `/Users/you/discord-mcp-server/discord-mcp-server.js`

```bash
codex
# → 「Discordの #general を読んで」と入力
```

#### Claude Codeの場合

プロジェクトの `.mcp.json` に追加：

```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["/path/to/discord-mcp-server/discord-mcp-server.js"],
      "env": {
        "DISCORD_BOT_TOKEN": "ステップ1でコピーしたトークン",
        "DISCORD_CHANNEL_ID": "デフォルトのチャンネルID"
      }
    }
  }
}
```

> 💡 MCP対応のAIクライアントなら何でも接続できます（Cursor, Windsurf, Cline等）。

### ステップ3C: 両方同時に使う

リスナー（自動応答）とMCPツール（AI操作）は同時に動かせます。

ターミナル1:
```bash
DISCORD_BOT_TOKEN="your-token" node discord-listener.js
```

ターミナル2:
```bash
codex  # config.tomlにMCP設定済み
```

> 同じBotトークンで両方同時にOK。別プロセスなので干渉しません。

---

## ずっと動かし続ける（常駐化）

ターミナルを閉じてもBotが動き続けるようにするには：

### pm2を使う方法（おすすめ）

```bash
# pm2をインストール
npm install -g pm2

# リスナーを起動
DISCORD_BOT_TOKEN="your-token" pm2 start discord-listener.js --name discord-bot

# PC再起動後も自動起動
pm2 save
pm2 startup
```

管理コマンド：
```bash
pm2 status         # 状態確認
pm2 logs discord-bot  # ログ確認
pm2 restart discord-bot  # 再起動
pm2 stop discord-bot     # 停止
```

---

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

---

## FAQ

**Q: リスナーモードとMCPモード、どっちを使えばいい？**  
A: Discordから話しかけて返事がほしい → リスナーモード。AIからDiscordを操作したい → MCPモード。両方同時がおすすめ。

**Q: お金はどれくらいかかる？**  
A: Discord Botは無料。OpenAI APIの料金だけ。普通の会話なら月$5〜10程度。GPT-4o miniを使えばもっと安くなります。

**Q: ChatGPT PlusやClaude Proに課金してれば使える？**  
A: いいえ。サブスクとAPIは別物です。APIキーを別途取得する必要があります。

**Q: Codex以外のAIでも使える？**  
A: MCPモードはMCP対応のAIなら何でも（Claude Code, Cursor, Windsurf, Cline等）。リスナーモードはCodex CLIがデフォルトですが、`CODEX_PATH` で別のCLIツールを指定できます。

**Q: 複数サーバーで使える？**  
A: はい。`DISCORD_GUILD_ID` を設定しなければ、Botが参加している全サーバーで応答します。

**Q: セキュリティは大丈夫？**  
A: トークンは環境変数で管理（コードに書かない）。リスナーモードではCodexを `--sandbox read-only` で実行するため、ファイルの書き換えやコマンド実行はできません。

**Q: ターミナルを閉じたらBotが止まる**  
A: [常駐化の手順](#ずっと動かし続ける常駐化) を参照してください。pm2を使えばPC再起動後も自動起動します。

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `node: command not found` | Node.jsが入ってない | [nodejs.org](https://nodejs.org/) からインストール |
| `codex: command not found` | Codex CLIが入ってない | `npm install -g @openai/codex` |
| Botがメンションに反応しない | MESSAGE CONTENT INTENTがOFF | Developer PortalのBotタブで有効化 |
| `Error: TOKEN_INVALID` | トークンが間違ってる | Developer PortalでReset Tokenして再取得 |
| `Missing Access` | Botの権限不足 | OAuth2のURL再生成→権限を追加して再招待 |
| リスナーは動くがCodexがエラー | APIキーが未設定 | `export OPENAI_API_KEY="sk-..."` で設定 |

---

## ライセンス

MIT
