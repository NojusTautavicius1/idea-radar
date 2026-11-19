import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptyState, loadState, markSeen, prune, saveState } from "../src/state.js";
import { item, NOW } from "./fixtures.js";

describe("state", () => {
  it("starts empty when there is no file and survives a save/load round trip", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "radar-")), "state.json");
    expect(loadState(file)).toEqual(emptyState());

    const state = emptyState();
    markSeen(state, [item({ id: "reddit:1" })], NOW);
    saveState(state, file);
    expect(loadState(file).seen).toEqual({ "reddit:1": "2026-11-19" });
  });

  it("does not overwrite the first-seen date", () => {
    const state = emptyState();
    state.seen["reddit:1"] = "2026-11-01";
    markSeen(state, [item({ id: "reddit:1" })], NOW);
    expect(state.seen["reddit:1"]).toBe("2026-11-01");
  });

  it("forgets seen items after 30 days and caps the lists", () => {
    const state = emptyState();
    state.seen = { old: "2026-10-01", recent: "2026-11-10" };
    state.notes = Array.from({ length: 80 }, (_, i) => ({ text: String(i), at: "" }));

    const pruned = prune(state, NOW);
    expect(Object.keys(pruned.seen)).toEqual(["recent"]);
    expect(pruned.notes).toHaveLength(50);
    expect(pruned.notes.at(-1)?.text).toBe("79");
  });
});
