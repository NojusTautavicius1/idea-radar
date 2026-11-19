import type { Feedback, State } from "./types.js";

// Turns Telegram updates into votes and notes. Pure, so it is easy to test.
// Buttons carry "v:<up|down>:<ideaId>"; any plain text message to the bot is kept as a taste note.

export type TelegramUpdate = {
  update_id: number;
  message?: { message_id: number; chat: { id: number }; text?: string; date: number };
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
};

export type VoteMessage = { chatId: number; messageId: number; vote: Feedback["vote"]; callbackId: string };

export type ParsedUpdates = {
  feedback: Feedback[];
  notes: { text: string; at: string }[];
  votedMessages: VoteMessage[];
  nextOffset: number;
};

export function parseUpdates(updates: TelegramUpdate[], chatId: number, offset: number): ParsedUpdates {
  const result: ParsedUpdates = { feedback: [], notes: [], votedMessages: [], nextOffset: offset };

  for (const update of updates) {
    result.nextOffset = Math.max(result.nextOffset, update.update_id + 1);

    const cb = update.callback_query;
    if (cb?.message && cb.message.chat.id === chatId) {
      const match = /^v:(up|down):(.+)$/.exec(cb.data ?? "");
      if (!match) continue;
      const vote = match[1] as Feedback["vote"];
      result.feedback.push({ ideaId: match[2]!, vote, at: new Date().toISOString() });
      result.votedMessages.push({ chatId, messageId: cb.message.message_id, vote, callbackId: cb.id });
      continue;
    }

    const msg = update.message;
    if (msg?.text && msg.chat.id === chatId && !msg.text.startsWith("/")) {
      result.notes.push({ text: msg.text.trim().slice(0, 500), at: new Date(msg.date * 1000).toISOString() });
    }
  }
  return result;
}

// Latest vote per idea wins, so changing your mind works.
export function applyFeedback(state: State, parsed: ParsedUpdates): void {
  for (const vote of parsed.feedback) {
    state.feedback = state.feedback.filter((f) => f.ideaId !== vote.ideaId);
    state.feedback.push(vote);
  }
  state.notes.push(...parsed.notes);
  state.telegramOffset = parsed.nextOffset;
}
