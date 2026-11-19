import { describe, expect, it } from "vitest";
import { heat, PER_SOURCE_LIMIT, selectCandidates } from "../src/select.js";
import { item, NOW } from "./fixtures.js";

describe("heat", () => {
  it("ranks more engagement higher", () => {
    expect(heat(item({ id: "a", score: 500 }), NOW)).toBeGreaterThan(heat(item({ id: "b", score: 5 }), NOW));
  });

  it("decays with age", () => {
    const fresh = item({ id: "a", createdAt: new Date(NOW.getTime() - 3_600_000) });
    const old = item({ id: "b", createdAt: new Date(NOW.getTime() - 96 * 3_600_000) });
    expect(heat(fresh, NOW)).toBeGreaterThan(heat(old, NOW) * 2);
  });
});

describe("selectCandidates", () => {
  it("drops items that were already seen and duplicates within the run", () => {
    const items = [item({ id: "reddit:1" }), item({ id: "reddit:2" }), item({ id: "reddit:2" })];
    const result = selectCandidates(items, { "reddit:1": "2026-11-18" }, NOW);
    expect(result.map((i) => i.id)).toEqual(["reddit:2"]);
  });

  it("caps each source so one source can't crowd out the others", () => {
    const reddit = Array.from({ length: 80 }, (_, n) => item({ id: `reddit:${n}`, score: 1000 + n }));
    const hn = [item({ id: "hackernews:1", source: "hackernews", score: 3 })];
    const result = selectCandidates([...reddit, ...hn], {}, NOW);

    expect(result.filter((i) => i.source === "reddit")).toHaveLength(PER_SOURCE_LIMIT.reddit);
    expect(result.some((i) => i.id === "hackernews:1")).toBe(true);
  });

  it("keeps the hottest items when capping", () => {
    const reddit = Array.from({ length: 60 }, (_, n) => item({ id: `reddit:${n}`, score: n }));
    const kept = selectCandidates(reddit, {}, NOW).map((i) => i.id);
    expect(kept).toContain("reddit:59");
    expect(kept).not.toContain("reddit:0");
  });
});
