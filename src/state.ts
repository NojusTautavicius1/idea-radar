import fs from "node:fs";
import type { Item, State } from "./types.js";

// Everything the bot remembers lives in one JSON file that the workflow commits back to the repo.

export const STATE_FILE = "data/state.json";
const SEEN_DAYS = 30;

export const emptyState = (): State => ({ seen: {}, sent: [], feedback: [], notes: [], telegramOffset: 0 });

export function loadState(file = STATE_FILE): State {
  if (!fs.existsSync(file)) return emptyState();
  return { ...emptyState(), ...(JSON.parse(fs.readFileSync(file, "utf8")) as Partial<State>) };
}

export function saveState(state: State, file = STATE_FILE): void {
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + "\n");
}

export function markSeen(state: State, items: Item[], now = new Date()): void {
  const today = now.toISOString().slice(0, 10);
  for (const item of items) state.seen[item.id] ??= today;
}

// Keeps the file small: forget seen items after a month, keep the latest sent ideas / votes / notes.
export function prune(state: State, now = new Date()): State {
  const cutoff = new Date(now.getTime() - SEEN_DAYS * 86_400_000).toISOString().slice(0, 10);
  return {
    ...state,
    seen: Object.fromEntries(Object.entries(state.seen).filter(([, date]) => date >= cutoff)),
    sent: state.sent.slice(-300),
    feedback: state.feedback.slice(-300),
    notes: state.notes.slice(-50),
  };
}
