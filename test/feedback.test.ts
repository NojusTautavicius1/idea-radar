import { describe, expect, it } from "vitest";
import { applyFeedback, parseUpdates, type TelegramUpdate } from "../src/feedback.js";
import { emptyState } from "../src/state.js";

const CHAT = 42;

const vote = (update_id: number, data: string, chat = CHAT): TelegramUpdate => ({
  update_id,
  callback_query: { id: `cb${update_id}`, data, message: { message_id: 100 + update_id, chat: { id: chat } } },
});

const text = (update_id: number, body: string, chat = CHAT): TelegramUpdate => ({
  update_id,
  message: { message_id: update_id, chat: { id: chat }, text: body, date: 1_763_532_000 },
});

describe("parseUpdates", () => {
  it("reads votes from button presses", () => {
    const parsed = parseUpdates([vote(1, "v:up:2026-11-18-1"), vote(2, "v:down:2026-11-18-2")], CHAT, 0);
    expect(parsed.feedback.map((f) => [f.ideaId, f.vote])).toEqual([
      ["2026-11-18-1", "up"],
      ["2026-11-18-2", "down"],
    ]);
    expect(parsed.votedMessages.map((m) => m.messageId)).toEqual([101, 102]);
  });

  it("keeps plain messages as notes but skips commands", () => {
    const parsed = parseUpdates([text(1, "/start"), text(2, "daugiau apie AI agentus restoranams")], CHAT, 0);
    expect(parsed.notes.map((n) => n.text)).toEqual(["daugiau apie AI agentus restoranams"]);
  });

  it("ignores other chats and unknown button data", () => {
    const parsed = parseUpdates([vote(1, "v:up:x", 999), text(2, "hi", 999), vote(3, "noop")], CHAT, 0);
    expect(parsed.feedback).toEqual([]);
    expect(parsed.notes).toEqual([]);
  });

  it("moves the offset past every update, even ignored ones", () => {
    expect(parseUpdates([vote(7, "noop"), text(9, "x", 1)], CHAT, 3).nextOffset).toBe(10);
    expect(parseUpdates([], CHAT, 3).nextOffset).toBe(3);
  });
});

describe("applyFeedback", () => {
  it("keeps only the latest vote per idea", () => {
    const state = emptyState();
    applyFeedback(state, parseUpdates([vote(1, "v:up:a"), vote(2, "v:down:a")], CHAT, 0));
    expect(state.feedback.map((f) => f.vote)).toEqual(["down"]);
    expect(state.telegramOffset).toBe(3);
  });
});
