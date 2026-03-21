#!/usr/bin/env node

/**
 * Discord Listener for Codex
 *
 * Watches Discord for mentions → sends context to Codex → posts the reply.
 * Your AI lives in Discord. Mention it and it responds.
 *
 * Usage:
 *   node discord-listener.js
 *
 * Required:
 *   - Discord bot token (config.toml or DISCORD_BOT_TOKEN env var)
 *   - Codex CLI installed and authenticated (npm install -g @openai/codex)
 *
 * Optional env / config.toml:
 *   DISCORD_GUILD_ID    - Restrict to one server (default: all servers)
 *   DISCORD_CHANNEL_ID  - Restrict to one channel (default: all channels)
 *   CODEX_WORKSPACE     - Working directory for Codex (default: cwd)
 *   CODEX_TIMEOUT_MS    - Timeout for Codex execution (default: 120000)
 *   BOT_SYSTEM_PROMPT   - Custom system prompt (default: helpful AI assistant)
 *   BOT_NAME            - Bot display name in prompts (default: from Discord)
 *   MAX_HISTORY         - Number of recent messages for context (default: 15)
 */

import pkg from "discord.js";
const { Client, GatewayIntentBits, Partials } = pkg;
import { readFileSync, existsSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Load config.toml (if present) ──────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfigToml() {
  const cfgPath = join(__dirname, "config.toml");
  if (!existsSync(cfgPath)) return {};
  const cfg = {};
  try {
    const lines = readFileSync(cfgPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      cfg[key] = val;
    }
  } catch (_) {}
  return cfg;
}

const tomlConfig = loadConfigToml();

function cfg(envKey, tomlKey, fallback = "") {
  return process.env[envKey] || tomlConfig[tomlKey] || tomlConfig[envKey] || fallback;
}

// ─── Config ──────────────────────────────────────────────────────

const TOKEN = resolveToken();
const GUILD_ID = cfg("DISCORD_GUILD_ID", "discord_guild_id");
const CHANNEL_ID = cfg("DISCORD_CHANNEL_ID", "discord_channel_id");
const CODEX_WORKSPACE = cfg("CODEX_WORKSPACE", "codex_workspace", process.cwd());
const CODEX_TIMEOUT_MS = parseInt(cfg("CODEX_TIMEOUT_MS", "codex_timeout_ms", "120000"), 10);
const MAX_HISTORY = parseInt(cfg("MAX_HISTORY", "max_history", "15"), 10);
const BOT_NAME = cfg("BOT_NAME", "bot_name");
const CUSTOM_PROMPT = cfg("BOT_SYSTEM_PROMPT", "bot_system_prompt");

// ─── Resolve Codex entry point ──────────────────────────────────

let CODEX_JS = "";

// Find codex.js — the Node.js entry point of Codex CLI
// We run `node codex.js` directly instead of the CLI wrapper to avoid TTY issues
function resolveCodexJs() {
  // 1. Explicit config
  const explicit = cfg("CODEX_PATH", "codex_path");
  if (explicit) {
    if (existsSync(explicit)) return explicit;
  }

  // 2. npm global modules
  try {
    const npmRoot = execSync("npm root -g", { encoding: "utf-8", timeout: 10000 }).trim();
    const candidate = join(npmRoot, "@openai", "codex", "bin", "codex.js");
    if (existsSync(candidate)) return candidate;
  } catch (_) {}

  // 3. Resolve from `codex` command location
  try {
    const which = execSync(
      process.platform === "win32" ? "where codex 2>nul" : "which codex 2>/dev/null",
      { encoding: "utf-8", timeout: 5000 }
    ).trim().split("\n")[0].trim().replace(/\r/g, "");
    if (which) {
      // codex binary is in .../npm/codex → node_modules is at .../npm/node_modules
      const npmDir = dirname(which);
      const candidate = join(npmDir, "node_modules", "@openai", "codex", "bin", "codex.js");
      if (existsSync(candidate)) return candidate;
    }
  } catch (_) {}

  return "";
}

CODEX_JS = resolveCodexJs();

if (!CODEX_JS) {
  console.error(
    "[listener] Codex CLI not found.\n" +
    "  Install it: npm install -g @openai/codex\n" +
    "  Then authenticate: codex"
  );
  process.exit(1);
}

console.log(`[listener] Codex entry: ${CODEX_JS}`);

// ─── Token resolution ────────────────────────────────────────────

function resolveToken() {
  let t = process.env.DISCORD_BOT_TOKEN || tomlConfig["discord_bot_token"] || tomlConfig["DISCORD_BOT_TOKEN"];
  if (!t && process.env.DISCORD_BOT_TOKEN_FILE) {
    try {
      t = readFileSync(process.env.DISCORD_BOT_TOKEN_FILE, "utf-8").trim();
    } catch (err) {
      console.error(`[listener] Failed to read token file: ${err.message}`);
      process.exit(1);
    }
  }
  if (!t) {
    console.error(
      "[listener] No token found. Set it in one of:\n" +
      "  1. config.toml → discord_bot_token = \"your-token\"\n" +
      "  2. Environment variable → DISCORD_BOT_TOKEN\n" +
      "  3. Token file → DISCORD_BOT_TOKEN_FILE"
    );
    process.exit(1);
  }
  return t;
}

// ─── Discord Client ──────────────────────────────────────────────

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

let botId = "";
let botName = "";
const activeChannels = new Set();

discord.once("ready", () => {
  botId = discord.user.id;
  botName = BOT_NAME || discord.user.username;
  console.log(`[listener] Online as ${discord.user.tag} (${botId})`);
  console.log(`[listener] Listening for mentions...`);
  if (GUILD_ID) console.log(`[listener] Restricted to guild: ${GUILD_ID}`);
  if (CHANNEL_ID) console.log(`[listener] Restricted to channel: ${CHANNEL_ID}`);
});

// ─── Message handler ─────────────────────────────────────────────

discord.on("messageCreate", async (message) => {
  try {
    if (message.author.id === botId) return;
    if (!message.guild) return;
    if (GUILD_ID && message.guild.id !== GUILD_ID) return;
    if (CHANNEL_ID && message.channel.id !== CHANNEL_ID) return;

    // Only respond to mentions (user mention OR role mention)
    const content = message.content || "";
    const mentionedUser =
      message.mentions.users?.has(botId) ||
      content.includes(`<@${botId}>`) ||
      content.includes(`<@!${botId}>`);

    let mentionedRole = false;
    if (!mentionedUser && message.mentions.roles?.size > 0) {
      try {
        const botMember = await message.guild.members.fetch(botId);
        mentionedRole = message.mentions.roles.some(role =>
          botMember.roles.cache.has(role.id)
        );
      } catch (_) {}
    }

    if (!mentionedUser && !mentionedRole) return;

    const channelId = message.channel.id;
    const channelName = message.channel.name || channelId;

    if (activeChannels.has(channelId)) {
      console.log(`[listener] Already processing in #${channelName}, skipping`);
      return;
    }
    activeChannels.add(channelId);

    console.log(
      `[listener] Mentioned in #${channelName} by ${message.author.globalName || message.author.username}`
    );

    try { await message.channel.sendTyping(); } catch (_) {}

    // Wait a moment for multi-message input
    await sleep(2000);

    try {
      const recentMessages = await message.channel.messages.fetch({ limit: MAX_HISTORY });
      const history = recentMessages
        .reverse()
        .map((m) => formatHistoryMessage(m))
        .join("\n");

      const userInput = cleanMentions(content);

      const prompt = buildPrompt({
        channelName,
        history,
        userInput,
        authorName: message.author.globalName || message.author.username,
      });

      const result = await runCodex(prompt);
      const reply = result.trim() || "（応答を生成できませんでした）";

      await sendLong(message.channel, reply);
    } finally {
      activeChannels.delete(channelId);
    }
  } catch (err) {
    console.error("[listener] Error:", err);
    activeChannels.delete(message.channel?.id);
    try {
      await message.channel.send(
        `⚠️ Error: ${String(err.message || err).slice(0, 200)}`
      );
    } catch (_) {}
  }
});

// ─── Prompt builder ──────────────────────────────────────────────

function buildPrompt({ channelName, history, userInput, authorName }) {
  const systemPrompt =
    CUSTOM_PROMPT ||
    `You are ${botName}, an AI assistant living in Discord.
You respond helpfully to messages in the channel.
Be concise, friendly, and useful.
Respond in the same language the user writes in.`;

  return `${systemPrompt}

## Current context
- Channel: #${channelName}
- Message from: ${authorName}
- Message: ${userInput || "(mention only)"}

## Recent conversation
${history || "(none)"}

## Instructions
Reply naturally to the user's message.
Output ONLY your reply text — nothing else.
Keep it under 1500 characters.`;
}

// ─── Codex runner ────────────────────────────────────────────────

function runCodex(prompt) {
  return new Promise((resolve, reject) => {
    // Spawn node with codex.js directly — avoids TTY requirement of CLI wrapper
    const child = spawn(process.execPath, [
      CODEX_JS,
      "exec",
      "--sandbox", "read-only",
      "--skip-git-repo-check",
      "-",  // read prompt from stdin
    ], {
      cwd: CODEX_WORKSPACE,
      timeout: CODEX_TIMEOUT_MS,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    // Send prompt via stdin
    child.stdin.write(prompt);
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    child.on("close", (code) => {
      console.log(`[listener] Codex exited (code=${code}, output=${stdout.length} chars)`);
      if (stderr) console.log(`[listener] Codex stderr: ${stderr.slice(-300)}`);

      if (code !== 0 && code !== 1 && code !== null) {
        reject(new Error(`Codex exit ${code}: ${stderr.slice(-300)}`));
        return;
      }
      resolve(stdout.trim());
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────

function cleanMentions(text) {
  return text.replace(/<@[!&]?\d+>/g, "").replace(/\s+/g, " ").trim();
}

function formatHistoryMessage(m) {
  const name = m.author.bot
    ? `🤖 ${m.author.username}`
    : `👤 ${m.author.globalName || m.author.username}`;
  const text = cleanMentions(m.content || "");
  return `${name}: ${text}`;
}

async function sendLong(channel, text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 1900) {
    chunks.push(text.slice(i, i + 1900));
  }
  for (const chunk of chunks) {
    await channel.send(chunk);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Error handling ──────────────────────────────────────────────

discord.on("error", (err) => console.error("[Discord Error]", err.message));
process.on("uncaughtException", (err) => console.error("[Uncaught]", err));
process.on("unhandledRejection", (err) => console.error("[Unhandled]", err));

// ─── Start ───────────────────────────────────────────────────────

discord.login(TOKEN);
