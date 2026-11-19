import fs from "node:fs";
import { toMarkdown } from "./archive.js";
import { applyFeedback, parseUpdates } from "./feedback.js";
import { rankIdeas } from "./rank.js";
import { selectCandidates } from "./select.js";
import { collectAll } from "./sources/index.js";
import { loadState, markSeen, prune, saveState } from "./state.js";
import * as telegram from "./telegram.js";

// Daily run: read yesterday's votes -> collect -> filter -> Claude picks 5 -> Telegram + archive -> save state.
// `--dry` prints the digest instead of sending it and leaves state untouched.

if (fs.existsSync(".env")) process.loadEnvFile(".env");

const dry = process.argv.includes("--dry");
const date = new Date().toISOString().slice(0, 10);

function chatId(): number {
  const id = Number(process.env.TELEGRAM_CHAT_ID);
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID || !Number.isFinite(id)) {
    throw new Error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (or run with --dry)");
  }
  return id;
}

async function readVotes(state: ReturnType<typeof loadState>, chat: number) {
  const parsed = parseUpdates(await telegram.getUpdates(state.telegramOffset), chat, state.telegramOffset);
  applyFeedback(state, parsed);
  for (const voted of parsed.votedMessages) {
    // Old callbacks can't be answered any more and edits can fail; the vote is already saved.
    await telegram.answerCallback(voted.callbackId).catch(() => {});
    await telegram.markVoted(voted.chatId, voted.messageId, voted.vote).catch(() => {});
  }
  console.log(`votes: +${parsed.feedback.length}, notes: +${parsed.notes.length}`);
}

async function main() {
  const state = loadState();
  const chat = dry ? 0 : chatId();
  if (!dry) await readVotes(state, chat);

  const { items, report } = await collectAll();
  for (const r of report) console.log(`${r.source}: ${r.error ? `FAILED ${r.error}` : r.count}`);

  const candidates = selectCandidates(items, state.seen);
  console.log(`candidates: ${candidates.length} new of ${items.length}`);

  const ideas = await rankIdeas(candidates, state, date);
  const markdown = toMarkdown(date, ideas, report, candidates.length);

  if (dry) {
    console.log("\n" + markdown);
    return;
  }

  if (ideas.length === 0) {
    await telegram.sendMessage(chat, `<b>Idea radar · ${date}</b>\nŠiandien nieko verto dėmesio.`);
  }
  for (const [i, idea] of ideas.entries()) {
    await telegram.sendMessage(chat, telegram.formatIdea(idea, i, ideas.length), telegram.voteKeyboard(idea.id));
  }

  markSeen(state, items);
  state.sent.push(
    ...ideas.map((idea) => ({
      id: idea.id,
      date,
      title: idea.title,
      category: idea.category,
      sources: idea.sources.map((s) => s.url),
    })),
  );
  fs.mkdirSync("digests", { recursive: true });
  fs.writeFileSync(`digests/${date}.md`, markdown);
  saveState(prune(state));
  console.log(`sent ${ideas.length} ideas`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
