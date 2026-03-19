#!/usr/bin/env node

/**
 * Discord MCP Server
 *
 * An MCP server that turns your Codex CLI into a full-featured
 * Discord assistant. One server, all the Discord tools you need.
 *
 * Run Codex on your PC → talk to it through Discord → it does everything.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pkg from "discord.js";
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
} = pkg;
import { readFileSync } from "node:fs";

// ─── Configuration ───────────────────────────────────────────────

const DEFAULT_CHANNEL = process.env.DISCORD_CHANNEL_ID || "";
const DEFAULT_GUILD = process.env.DISCORD_GUILD_ID || "";

// ─── Discord Client ──────────────────────────────────────────────

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

let discordReady = false;

discord.once("clientReady", () => {
  discordReady = true;
  console.error(`[discord-mcp] Logged in as ${discord.user.tag}`);
});

// Read token
let token = process.env.DISCORD_BOT_TOKEN;
if (!token && process.env.DISCORD_BOT_TOKEN_FILE) {
  try {
    token = readFileSync(process.env.DISCORD_BOT_TOKEN_FILE, "utf-8").trim();
  } catch (err) {
    console.error(`[discord-mcp] Failed to read token file: ${err.message}`);
    process.exit(1);
  }
}
if (!token) {
  console.error(
    "[discord-mcp] No token found.\n" +
      "  Set DISCORD_BOT_TOKEN env var, or\n" +
      "  Set DISCORD_BOT_TOKEN_FILE to a path containing the token."
  );
  process.exit(1);
}

discord.login(token).catch((err) => {
  console.error(`[discord-mcp] Login failed: ${err.message}`);
});

// ─── Helpers ─────────────────────────────────────────────────────

function waitForDiscord(timeoutMs = 30_000) {
  if (discordReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Discord connection timed out")),
      timeoutMs
    );
    discord.once("clientReady", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function resolveChannel(channelId) {
  const id = channelId || DEFAULT_CHANNEL;
  if (!id) {
    throw new Error(
      "No channel_id provided and DISCORD_CHANNEL_ID is not set."
    );
  }
  const ch = discord.channels.cache.get(id);
  if (!ch) throw new Error(`Channel ${id} not found or not cached.`);
  return ch;
}

function resolveGuild(guildId) {
  const id = guildId || DEFAULT_GUILD;
  if (!id) {
    // Try first guild
    const first = discord.guilds.cache.first();
    if (first) return first;
    throw new Error("No guild_id provided and no guilds available.");
  }
  const guild = discord.guilds.cache.get(id);
  if (!guild) throw new Error(`Guild ${id} not found.`);
  return guild;
}

function formatMessage(m) {
  const time = m.createdAt.toISOString();
  const author = m.author.bot
    ? `🤖 ${m.author.username}`
    : `👤 ${m.author.globalName || m.author.username}`;
  const reply = m.reference?.messageId
    ? ` (reply to ${m.reference.messageId})`
    : "";
  const attachments =
    m.attachments.size > 0
      ? ` [${m.attachments.map((a) => a.url).join(", ")}]`
      : "";
  return `[${time}] [id:${m.id}] ${author}${reply}: ${m.content}${attachments}`;
}

function ok(text) {
  return { content: [{ type: "text", text }] };
}

function err(text) {
  return { content: [{ type: "text", text }], isError: true };
}

async function sendLong(channel, text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 1900) {
    chunks.push(text.slice(i, i + 1900));
  }
  const sentIds = [];
  for (const chunk of chunks) {
    const msg = await channel.send(chunk);
    sentIds.push(msg.id);
  }
  return sentIds;
}

// ─── Tool Definitions ────────────────────────────────────────────

const TOOLS = [
  // --- Messaging ---
  {
    name: "discord_send",
    description: "Send a message to a Discord channel.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Message text to send." },
        channel_id: { type: "string", description: "Target channel ID." },
      },
      required: ["message"],
    },
  },
  {
    name: "discord_reply",
    description: "Reply to a specific message in a channel.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Reply text." },
        message_id: {
          type: "string",
          description: "ID of the message to reply to.",
        },
        channel_id: { type: "string", description: "Channel ID." },
      },
      required: ["message", "message_id"],
    },
  },
  {
    name: "discord_edit",
    description: "Edit a message sent by the bot.",
    inputSchema: {
      type: "object",
      properties: {
        message_id: {
          type: "string",
          description: "ID of the bot message to edit.",
        },
        new_content: { type: "string", description: "New message content." },
        channel_id: { type: "string", description: "Channel ID." },
      },
      required: ["message_id", "new_content"],
    },
  },
  {
    name: "discord_delete",
    description: "Delete a message (bot's own or others if permitted).",
    inputSchema: {
      type: "object",
      properties: {
        message_id: {
          type: "string",
          description: "ID of the message to delete.",
        },
        channel_id: { type: "string", description: "Channel ID." },
      },
      required: ["message_id"],
    },
  },
  {
    name: "discord_read",
    description:
      "Read recent messages from a channel. Returns message IDs for use with other tools.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel ID to read." },
        limit: {
          type: "number",
          description: "Number of messages (default: 10, max: 50).",
        },
        before: {
          type: "string",
          description: "Get messages before this message ID (for pagination).",
        },
        after: {
          type: "string",
          description: "Get messages after this message ID.",
        },
      },
    },
  },
  {
    name: "discord_search",
    description:
      "Search messages in a channel by content (simple text match).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search for." },
        channel_id: { type: "string", description: "Channel ID to search." },
        limit: {
          type: "number",
          description: "Max messages to scan (default: 50, max: 100).",
        },
      },
      required: ["query"],
    },
  },
  // --- Reactions ---
  {
    name: "discord_react",
    description: "Add a reaction emoji to a message.",
    inputSchema: {
      type: "object",
      properties: {
        message_id: { type: "string", description: "Message ID." },
        emoji: { type: "string", description: "Emoji (e.g. 👍, ✅)." },
        channel_id: { type: "string", description: "Channel ID." },
      },
      required: ["message_id", "emoji"],
    },
  },
  // --- Threads ---
  {
    name: "discord_thread_create",
    description: "Create a new thread from a message or in a channel.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Thread name." },
        message_id: {
          type: "string",
          description:
            "Message ID to create thread from (optional — omit for channel thread).",
        },
        channel_id: { type: "string", description: "Channel ID." },
        auto_archive_minutes: {
          type: "number",
          description: "Auto-archive after minutes (60, 1440, 4320, 10080).",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "discord_thread_list",
    description: "List active threads in a channel or guild.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: {
          type: "string",
          description: "Channel ID (lists threads in this channel).",
        },
        guild_id: {
          type: "string",
          description: "Guild ID (lists all active threads in guild).",
        },
      },
    },
  },
  // --- Channels ---
  {
    name: "discord_channel_list",
    description: "List all channels in a server.",
    inputSchema: {
      type: "object",
      properties: {
        guild_id: { type: "string", description: "Guild/server ID." },
      },
    },
  },
  {
    name: "discord_channel_info",
    description: "Get detailed information about a channel.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel ID." },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_channel_create",
    description: "Create a new text channel in a server.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Channel name." },
        guild_id: { type: "string", description: "Guild ID." },
        topic: { type: "string", description: "Channel topic." },
        category_id: { type: "string", description: "Parent category ID." },
      },
      required: ["name"],
    },
  },
  {
    name: "discord_channel_edit",
    description: "Edit a channel's name or topic.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel ID." },
        name: { type: "string", description: "New name." },
        topic: { type: "string", description: "New topic." },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_channel_delete",
    description: "Delete a channel (irreversible).",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel ID to delete." },
      },
      required: ["channel_id"],
    },
  },
  // --- Pins ---
  {
    name: "discord_pin",
    description: "Pin a message in a channel.",
    inputSchema: {
      type: "object",
      properties: {
        message_id: { type: "string", description: "Message ID to pin." },
        channel_id: { type: "string", description: "Channel ID." },
      },
      required: ["message_id"],
    },
  },
  {
    name: "discord_unpin",
    description: "Unpin a message.",
    inputSchema: {
      type: "object",
      properties: {
        message_id: { type: "string", description: "Message ID to unpin." },
        channel_id: { type: "string", description: "Channel ID." },
      },
      required: ["message_id"],
    },
  },
  {
    name: "discord_pins_list",
    description: "List all pinned messages in a channel.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel ID." },
      },
    },
  },
  // --- Server / Members ---
  {
    name: "discord_server_info",
    description: "Get server (guild) information.",
    inputSchema: {
      type: "object",
      properties: {
        guild_id: { type: "string", description: "Guild ID." },
      },
    },
  },
  {
    name: "discord_member_list",
    description: "List members in a server.",
    inputSchema: {
      type: "object",
      properties: {
        guild_id: { type: "string", description: "Guild ID." },
        limit: {
          type: "number",
          description: "Max members to return (default: 20, max: 100).",
        },
      },
    },
  },
  {
    name: "discord_member_info",
    description: "Get info about a specific member.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "User ID." },
        guild_id: { type: "string", description: "Guild ID." },
      },
      required: ["user_id"],
    },
  },
  // --- Embeds ---
  {
    name: "discord_send_embed",
    description: "Send a rich embed message to a channel.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel ID." },
        title: { type: "string", description: "Embed title." },
        description: { type: "string", description: "Embed description." },
        color: {
          type: "string",
          description: "Hex color (e.g. #FF5733). Default: blue.",
        },
        fields: {
          type: "array",
          description:
            'Array of {name, value, inline?} objects.',
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              value: { type: "string" },
              inline: { type: "boolean" },
            },
            required: ["name", "value"],
          },
        },
        footer: { type: "string", description: "Footer text." },
        url: { type: "string", description: "Title URL." },
        thumbnail: { type: "string", description: "Thumbnail image URL." },
        image: { type: "string", description: "Large image URL." },
      },
    },
  },
  // --- Topic / Slow mode ---
  {
    name: "discord_set_topic",
    description: "Set a channel's topic.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel ID." },
        topic: { type: "string", description: "New topic text." },
      },
      required: ["channel_id", "topic"],
    },
  },
  // --- Who am I ---
  {
    name: "discord_whoami",
    description:
      "Get info about the bot itself (username, ID, servers it's in).",
    inputSchema: { type: "object", properties: {} },
  },
];

// ─── Tool Handlers ───────────────────────────────────────────────

async function handleTool(name, args) {
  switch (name) {
    // ── Messaging ──
    case "discord_send": {
      const ch = resolveChannel(args.channel_id);
      const ids = await sendLong(ch, args.message);
      return ok(
        `Sent ${ids.length} message(s) to #${ch.name}: ${ids.join(", ")}`
      );
    }

    case "discord_reply": {
      const ch = resolveChannel(args.channel_id);
      const target = await ch.messages.fetch(args.message_id);
      const text = args.message;
      const chunks = [];
      for (let i = 0; i < text.length; i += 1900) {
        chunks.push(text.slice(i, i + 1900));
      }
      const sentIds = [];
      for (let i = 0; i < chunks.length; i++) {
        const opts = i === 0 ? { reply: { messageReference: target.id } } : {};
        const msg = await ch.send({ content: chunks[i], ...opts });
        sentIds.push(msg.id);
      }
      return ok(`Replied with ${sentIds.length} message(s): ${sentIds.join(", ")}`);
    }

    case "discord_edit": {
      const ch = resolveChannel(args.channel_id);
      const msg = await ch.messages.fetch(args.message_id);
      await msg.edit(args.new_content);
      return ok(`Edited message ${args.message_id}`);
    }

    case "discord_delete": {
      const ch = resolveChannel(args.channel_id);
      const msg = await ch.messages.fetch(args.message_id);
      await msg.delete();
      return ok(`Deleted message ${args.message_id}`);
    }

    case "discord_read": {
      const ch = resolveChannel(args.channel_id);
      const limit = Math.min(args.limit || 10, 50);
      const fetchOpts = { limit };
      if (args.before) fetchOpts.before = args.before;
      if (args.after) fetchOpts.after = args.after;
      const messages = await ch.messages.fetch(fetchOpts);
      const formatted = messages.reverse().map(formatMessage).join("\n");
      return ok(formatted || "(no messages)");
    }

    case "discord_search": {
      const ch = resolveChannel(args.channel_id);
      const limit = Math.min(args.limit || 50, 100);
      const messages = await ch.messages.fetch({ limit });
      const query = args.query.toLowerCase();
      const matches = messages.filter((m) =>
        m.content.toLowerCase().includes(query)
      );
      if (matches.size === 0) return ok(`No messages matching "${args.query}"`);
      const formatted = matches.reverse().map(formatMessage).join("\n");
      return ok(`Found ${matches.size} message(s):\n${formatted}`);
    }

    // ── Reactions ──
    case "discord_react": {
      const ch = resolveChannel(args.channel_id);
      const msg = await ch.messages.fetch(args.message_id);
      await msg.react(args.emoji);
      return ok(`Reacted with ${args.emoji}`);
    }

    // ── Threads ──
    case "discord_thread_create": {
      const ch = resolveChannel(args.channel_id);
      const opts = {
        name: args.name,
        autoArchiveDuration: args.auto_archive_minutes || 1440,
      };
      let thread;
      if (args.message_id) {
        const msg = await ch.messages.fetch(args.message_id);
        thread = await msg.startThread(opts);
      } else {
        thread = await ch.threads.create(opts);
      }
      return ok(`Created thread "${thread.name}" (${thread.id})`);
    }

    case "discord_thread_list": {
      if (args.guild_id || (!args.channel_id && DEFAULT_GUILD)) {
        const guild = resolveGuild(args.guild_id);
        const threads = await guild.channels.fetchActiveThreads();
        const list = threads.threads
          .map((t) => `#${t.name} (${t.id}) in <#${t.parentId}>`)
          .join("\n");
        return ok(list || "(no active threads)");
      }
      const ch = resolveChannel(args.channel_id);
      const threads = await ch.threads.fetchActive();
      const list = threads.threads
        .map((t) => `#${t.name} (${t.id})`)
        .join("\n");
      return ok(list || "(no active threads)");
    }

    // ── Channels ──
    case "discord_channel_list": {
      const guild = resolveGuild(args.guild_id);
      const channels = guild.channels.cache
        .filter((c) => c.type !== ChannelType.GuildCategory)
        .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
      const list = channels
        .map((c) => {
          const type =
            c.type === ChannelType.GuildText
              ? "text"
              : c.type === ChannelType.GuildVoice
                ? "voice"
                : c.type === ChannelType.GuildForum
                  ? "forum"
                  : String(c.type);
          const cat = c.parent ? ` [${c.parent.name}]` : "";
          return `#${c.name} (${c.id}) ${type}${cat}`;
        })
        .join("\n");
      return ok(list || "(no channels)");
    }

    case "discord_channel_info": {
      const ch = resolveChannel(args.channel_id);
      const info = [
        `Name: #${ch.name}`,
        `ID: ${ch.id}`,
        `Type: ${ChannelType[ch.type] || ch.type}`,
        ch.topic ? `Topic: ${ch.topic}` : null,
        ch.parent ? `Category: ${ch.parent.name}` : null,
        ch.nsfw !== undefined ? `NSFW: ${ch.nsfw}` : null,
        `Created: ${ch.createdAt?.toISOString()}`,
      ]
        .filter(Boolean)
        .join("\n");
      return ok(info);
    }

    case "discord_channel_create": {
      const guild = resolveGuild(args.guild_id);
      const opts = { name: args.name, type: ChannelType.GuildText };
      if (args.topic) opts.topic = args.topic;
      if (args.category_id) opts.parent = args.category_id;
      const ch = await guild.channels.create(opts);
      return ok(`Created #${ch.name} (${ch.id})`);
    }

    case "discord_channel_edit": {
      const ch = resolveChannel(args.channel_id);
      const edits = {};
      if (args.name) edits.name = args.name;
      if (args.topic !== undefined) edits.topic = args.topic;
      await ch.edit(edits);
      return ok(`Updated #${ch.name}`);
    }

    case "discord_channel_delete": {
      const ch = resolveChannel(args.channel_id);
      const name = ch.name;
      await ch.delete();
      return ok(`Deleted #${name}`);
    }

    // ── Pins ──
    case "discord_pin": {
      const ch = resolveChannel(args.channel_id);
      const msg = await ch.messages.fetch(args.message_id);
      await msg.pin();
      return ok(`Pinned message ${args.message_id}`);
    }

    case "discord_unpin": {
      const ch = resolveChannel(args.channel_id);
      const msg = await ch.messages.fetch(args.message_id);
      await msg.unpin();
      return ok(`Unpinned message ${args.message_id}`);
    }

    case "discord_pins_list": {
      const ch = resolveChannel(args.channel_id);
      const pins = await ch.messages.fetchPinned();
      if (pins.size === 0) return ok("(no pinned messages)");
      const list = pins.map(formatMessage).join("\n");
      return ok(`${pins.size} pinned message(s):\n${list}`);
    }

    // ── Server / Members ──
    case "discord_server_info": {
      const guild = resolveGuild(args.guild_id);
      const info = [
        `Name: ${guild.name}`,
        `ID: ${guild.id}`,
        `Owner: ${guild.ownerId}`,
        `Members: ${guild.memberCount}`,
        `Channels: ${guild.channels.cache.size}`,
        `Roles: ${guild.roles.cache.size}`,
        `Created: ${guild.createdAt.toISOString()}`,
        guild.description ? `Description: ${guild.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return ok(info);
    }

    case "discord_member_list": {
      const guild = resolveGuild(args.guild_id);
      const limit = Math.min(args.limit || 20, 100);
      const members = await guild.members.fetch({ limit });
      const list = members
        .map((m) => {
          const bot = m.user.bot ? " 🤖" : "";
          const nick = m.nickname ? ` (${m.nickname})` : "";
          return `${m.user.username}${nick}${bot} — ${m.id}`;
        })
        .join("\n");
      return ok(list || "(no members)");
    }

    case "discord_member_info": {
      const guild = resolveGuild(args.guild_id);
      const member = await guild.members.fetch(args.user_id);
      const roles = member.roles.cache
        .filter((r) => r.name !== "@everyone")
        .map((r) => r.name)
        .join(", ");
      const info = [
        `Username: ${member.user.username}`,
        `Display: ${member.displayName}`,
        `ID: ${member.id}`,
        `Bot: ${member.user.bot}`,
        `Joined: ${member.joinedAt?.toISOString()}`,
        `Account created: ${member.user.createdAt.toISOString()}`,
        roles ? `Roles: ${roles}` : "Roles: (none)",
      ].join("\n");
      return ok(info);
    }

    // ── Embeds ──
    case "discord_send_embed": {
      const ch = resolveChannel(args.channel_id);
      const embed = new EmbedBuilder();
      if (args.title) embed.setTitle(args.title);
      if (args.description) embed.setDescription(args.description);
      if (args.color) embed.setColor(args.color);
      else embed.setColor(0x5865f2); // Discord blurple
      if (args.url) embed.setURL(args.url);
      if (args.footer) embed.setFooter({ text: args.footer });
      if (args.thumbnail) embed.setThumbnail(args.thumbnail);
      if (args.image) embed.setImage(args.image);
      if (args.fields) {
        for (const f of args.fields) {
          embed.addFields({
            name: f.name,
            value: f.value,
            inline: f.inline || false,
          });
        }
      }
      const msg = await ch.send({ embeds: [embed] });
      return ok(`Sent embed to #${ch.name}: ${msg.id}`);
    }

    // ── Topic ──
    case "discord_set_topic": {
      const ch = resolveChannel(args.channel_id);
      await ch.setTopic(args.topic);
      return ok(`Set topic of #${ch.name}`);
    }

    // ── Who am I ──
    case "discord_whoami": {
      const user = discord.user;
      const guilds = discord.guilds.cache
        .map((g) => `${g.name} (${g.id})`)
        .join(", ");
      const info = [
        `Username: ${user.username}`,
        `ID: ${user.id}`,
        `Tag: ${user.tag}`,
        `Servers: ${guilds || "(none)"}`,
      ].join("\n");
      return ok(info);
    }

    default:
      return err(`Unknown tool: ${name}`);
  }
}

// ─── MCP Server ──────────────────────────────────────────────────

const server = new Server(
  { name: "discord-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    await waitForDiscord();
    return await handleTool(name, args || {});
  } catch (e) {
    return err(`Error: ${e.message}`);
  }
});

// ─── Start ───────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `[discord-mcp] Server running — ${TOOLS.length} tools available`
);
