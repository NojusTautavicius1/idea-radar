import type { TelegramUpdate } from "./feedback.js";
import type { Idea } from "./rank.js";

const api = (method: string) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(api(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`telegram ${method}: ${json.description}`);
  return json.result;
}

export const getUpdates = (offset: number) =>
  call<TelegramUpdate[]>("getUpdates", { offset, timeout: 0, allowed_updates: ["message", "callback_query"] });

export const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function formatIdea(idea: Idea, index: number, total: number): string {
  const links = idea.sources.map((s, i) => `<a href="${escapeHtml(s.url)}">${i + 1}. ${escapeHtml(s.label)}</a>`);
  return [
    `<b>${index + 1}/${total} · ${escapeHtml(idea.title)}</b>`,
    `<i>${escapeHtml(idea.category)} · ${escapeHtml(idea.effort)}</i>`,
    "",
    escapeHtml(idea.pitch),
    "",
    `<b>Kodėl tau:</b> ${escapeHtml(idea.whyYou)}`,
    `<b>Pirmas žingsnis:</b> ${escapeHtml(idea.firstStep)}`,
    "",
    links.join("\n"),
  ].join("\n");
}

export const voteKeyboard = (ideaId: string) => ({
  inline_keyboard: [
    [
      { text: "👍", callback_data: `v:up:${ideaId}` },
      { text: "👎", callback_data: `v:down:${ideaId}` },
    ],
  ],
});

export async function sendMessage(chatId: number, html: string, replyMarkup?: object): Promise<void> {
  await call("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

// Replaces the buttons with the recorded vote, so the chat shows what the bot learned.
export async function markVoted(chatId: number, messageId: number, vote: "up" | "down"): Promise<void> {
  await call("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [[{ text: vote === "up" ? "✓ 👍 įsiminta" : "✓ 👎 įsiminta", callback_data: "noop" }]] },
  });
}

export async function answerCallback(callbackId: string): Promise<void> {
  await call("answerCallbackQuery", { callback_query_id: callbackId });
}
