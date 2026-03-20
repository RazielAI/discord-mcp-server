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
 * Required env:
 *   DISCORD_BOT_TOKEN   - Your Discord bot token
 *
 * Optional env:
 *   DISCORD_GUILD_ID    - Restrict to one server (default: all servers)
 *   DISCORD_CHANNEL_ID  - Restrict to one channel (default: all channels)
 *   CODEX_PATH          - Path to codex CLI (default: auto-detect via npx)
 *   CODEX_WORKSPACE     - Working directory for Codex (default: cwd)
 *   CODEX_TIMEOUT_MS    - Timeout for Codex execution (default: 120000)
 *   BOT_SYSTEM_PROMPT   - Custom system prompt (default: helpful AI assistant)
 *   BOT_NAME            - Bot display name in prompts (default: from Discord)
 *   MAX_HISTORY         - Number of recent messages for context (default: 15)
 *   OWNER_ID            - Discord user ID of the bot owner (optional)
 */

import pkg from "discord.js";
const { Client, GatewayIntentBits, Partials } = pkg;
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ─── Config ──────────────────────────────────────────────────────

const TOKEN = resolveToken();
const GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || "";
const CODEX_WORKSPACE = process.env.CODEX_WORKSPACE || process.cwd();
const CODEX_TIMEOUT_MS = parseInt(process.env.CODEX_TIMEOUT_MS || "120000", 10);
const MAX_HISTORY = parseInt(process.env.MAX_HISTORY || "15", 10);
const BOT_NAME = process.env.BOT_NAME || "";
const OWNER_ID = process.env.OWNER_ID || "";
const CUSTOM_PROMPT = process.env.BOT_SYSTEM_PROMPT || "";

// ─── Resolve Codex path ─────────────────────────────────────────

let CODEX_CMD = process.env.CODEX_PATH || "";
let CODEX_ARGS_PREFIX = [];

if (!CODEX_CMD) {
  // Try to find codex in PATH or common locations
  try {
    const which = execSync("where codex 2>nul || which codex 2>/dev/null", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim().split("\n")[0].trim().replace(/\r/g, "");
    if (which) CODEX_CMD = which;
  } catch (_) {}
}

if (!CODEX_CMD) {
  // Fallback: use npx
  CODEX_CMD = "npx";
  CODEX_ARGS_PREFIX = ["codex"];
}

console.log(`[listener] Codex command: ${CODEX_CMD} ${CODEX_ARGS_PREFIX.join(" ")}`.trim());

// ─── Token resolution ────────────────────────────────────────────

function resolveToken() {
  let t = process.env.DISCORD_BOT_TOKEN;
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
      "[listener] No token. Set DISCORD_BOT_TOKEN or DISCORD_BOT_TOKEN_FILE."
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
    // Ignore own messages
    if (message.author.id === botId) return;

    // Ignore DMs (guild only)
    if (!message.guild) return;

    // Guild filter
    if (GUILD_ID && message.guild.id !== GUILD_ID) return;

    // Channel filter
    if (CHANNEL_ID && message.channel.id !== CHANNEL_ID) return;

    // Only respond to mentions (user mention OR role mention)
    const content = message.content || "";
    const mentionedUser =
      message.mentions.users?.has(botId) ||
      content.includes(`<@${botId}>`) ||
      content.includes(`<@!${botId}>`);

    // Check if any of the bot's roles are mentioned
    let mentionedRole = false;
    if (!mentionedUser && message.mentions.roles?.size > 0) {
      try {
        const botMember = await message.guild.members.fetch(botId);
        mentionedRole = message.mentions.roles.some(role =>
          botMember.roles.cache.has(role.id)
        );
      } catch (e) {
        console.log(`[listener] Could not fetch bot member: ${e.message}`);
      }
    }

    if (!mentionedUser && !mentionedRole) return;

    const channelId = message.channel.id;
    const channelName = message.channel.name || channelId;

    // Prevent concurrent processing per channel
    if (activeChannels.has(channelId)) {
      console.log(`[listener] Already processing in #${channelName}, skipping`);
      return;
    }
    activeChannels.add(channelId);

    console.log(
      `[listener] Mentioned in #${channelName} by ${message.author.globalName || message.author.username}`
    );

    // Show typing indicator
    try {
      await message.channel.sendTyping();
    } catch (_) {}

    // Wait a moment for multi-message input
    await sleep(2000);

    try {
      // Fetch recent history
      const recentMessages = await message.channel.messages.fetch({
        limit: MAX_HISTORY,
      });
      const history = recentMessages
        .reverse()
        .map((m) => formatHistoryMessage(m))
        .join("\n");

      // Clean user input
      const userInput = cleanMentions(content);

      // Build prompt
      const prompt = buildPrompt({
        channelName,
        history,
        userInput,
        authorName:
          message.author.globalName || message.author.username,
        isOwner: OWNER_ID ? message.author.id === OWNER_ID : false,
      });

      // Run Codex
      const result = await runCodex(prompt);
      const reply = result.trim() || "（応答を生成できませんでした）";

      // Send reply (split if >2000 chars)
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

function buildPrompt({ channelName, history, userInput, authorName, isOwner }) {
  const systemPrompt =
    CUSTOM_PROMPT ||
    `You are ${botName}, an AI assistant living in Discord.
You respond helpfully to messages in the channel.
Be concise, friendly, and useful.
Respond in the same language the user writes in.`;

  return `${systemPrompt}

## Current context
- Channel: #${channelName}
- Message from: ${authorName}${isOwner ? " (owner)" : ""}
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
    const tmpFile = join(tmpdir(), `discord-listener-${Date.now()}.txt`);
    writeFileSync(tmpFile, prompt, "utf-8");

    const outFile = tmpFile + ".out";

    // Use file-based prompt: write prompt to file, tell Codex to read it
    const codexPrompt = `Read ${tmpFile} and follow its instructions. Output ONLY your reply text.`;
    const cmdStr = `${CODEX_CMD} ${CODEX_ARGS_PREFIX.join(" ")} exec --sandbox read-only --skip-git-repo-check -o "${outFile}" "${codexPrompt.replace(/"/g, '\\"')}"`.trim();

    console.log(`[listener] Running codex...`);

    const child = spawn(cmdStr, [], {
      cwd: CODEX_WORKSPACE,
      timeout: CODEX_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      shell: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("close", (code) => {
      // Try to read output file first (more reliable than stdout parsing)
      let output = "";
      try { output = readFileSync(outFile, "utf-8").trim(); } catch (_) {}
      cleanup(outFile);
      if (code !== 0 && code !== 1 && code !== null) {
        reject(new Error(`Codex exit ${code}: ${stderr.slice(-300)}`));
        return;
      }
      resolve(output || stdout.trim());
    });

    child.on("error", (err) => {
      cleanup(tmpFile);
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

function cleanup(path) {
  try {
    unlinkSync(path);
  } catch (_) {}
}

// ─── Error handling ──────────────────────────────────────────────

discord.on("error", (err) => console.error("[Discord Error]", err.message));
process.on("uncaughtException", (err) => console.error("[Uncaught]", err));
process.on("unhandledRejection", (err) => console.error("[Unhandled]", err));

// ─── Start ───────────────────────────────────────────────────────

discord.login(TOKEN);
