import type { Item } from "../src/types.js";

export const NOW = new Date("2026-11-19T06:00:00Z");

export function item(overrides: Partial<Item> & { id: string }): Item {
  return {
    source: "reddit",
    title: "I wish there was a tool for X",
    url: `https://example.com/${overrides.id}`,
    text: "",
    score: 50,
    comments: 10,
    createdAt: new Date(NOW.getTime() - 6 * 3_600_000),
    where: "r/SaaS",
    ...overrides,
  };
}
