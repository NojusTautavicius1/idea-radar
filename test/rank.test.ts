import { describe, expect, it } from "vitest";
import { buildPrompt, toIdeas } from "../src/rank.js";
import { emptyState } from "../src/state.js";
import { escapeHtml, formatIdea } from "../src/telegram.js";
import { item } from "./fixtures.js";

const raw = (sourceIds: string[], title = "Idea") => ({
  title,
  category: "SaaS / produktas" as const,
  effort: "savaitgalis" as const,
  pitch: "Pitch",
  whyYou: "Why",
  firstStep: "Step",
  sourceIds,
});

describe("toIdeas", () => {
  const candidates = [item({ id: "reddit:1", title: "Need a <tool>" }), item({ id: "hackernews:2", where: "Show HN" })];

  it("links ideas back to their posts and numbers them by date", () => {
    const [idea] = toIdeas([raw(["reddit:1", "hackernews:2"])], candidates, "2026-11-19");
    expect(idea?.id).toBe("2026-11-19-1");
    expect(idea?.sources.map((s) => s.url)).toEqual(["https://example.com/reddit:1", "https://example.com/hackernews:2"]);
  });

  it("drops source ids the model made up, and ideas left with no source", () => {
    const ideas = toIdeas([raw(["reddit:404"], "ghost"), raw(["reddit:404", "reddit:1"], "real")], candidates, "d");
    expect(ideas.map((i) => i.title)).toEqual(["real"]);
    expect(ideas[0]?.sources).toHaveLength(1);
  });

  it("returns at most five ideas", () => {
    expect(toIdeas(Array.from({ length: 8 }, () => raw(["reddit:1"])), candidates, "d")).toHaveLength(5);
  });
});

describe("buildPrompt", () => {
  it("includes votes on earlier ideas, notes and the posts", () => {
    const state = emptyState();
    state.sent = [{ id: "d-1", date: "d", title: "CRM for gyms", category: "SaaS / produktas", sources: [] }];
    state.feedback = [{ ideaId: "d-1", vote: "up", at: "" }];
    state.notes = [{ text: "more local business stuff", at: "" }];

    const prompt = buildPrompt([item({ id: "reddit:9", title: "Gym owners hate their software" })], state);
    expect(prompt).toContain("👍 [SaaS / produktas] CRM for gyms");
    expect(prompt).toContain("more local business stuff");
    expect(prompt).toContain('<post id="reddit:9"');
    expect(prompt).toContain("Gym owners hate their software");
  });
});

describe("telegram formatting", () => {
  it("escapes HTML from titles and post labels", () => {
    expect(escapeHtml("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
    const [idea] = toIdeas([raw(["reddit:1"], "AI <agent> & co")], [item({ id: "reddit:1", title: "<b>x</b>" })], "d");
    const html = formatIdea(idea!, 0, 1);
    expect(html).toContain("AI &lt;agent&gt; &amp; co");
    expect(html).not.toContain("<b>x</b>");
  });
});
