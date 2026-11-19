import type { Item, Source } from "../types.js";
import { fetchGitHub } from "./github.js";
import { fetchHackerNews } from "./hackernews.js";
import { fetchProductHunt } from "./producthunt.js";
import { fetchReddit } from "./reddit.js";

const FETCHERS: Record<Source, () => Promise<Item[]>> = {
  hackernews: fetchHackerNews,
  reddit: fetchReddit,
  github: fetchGitHub,
  producthunt: fetchProductHunt,
};

export type SourceReport = { source: Source; count: number; error?: string };

// All sources in parallel; a failing source is reported, not fatal.
export async function collectAll(): Promise<{ items: Item[]; report: SourceReport[] }> {
  const entries = Object.entries(FETCHERS) as [Source, () => Promise<Item[]>][];
  const results = await Promise.allSettled(entries.map(([, fetcher]) => fetcher()));

  const items: Item[] = [];
  const report: SourceReport[] = results.map((result, i) => {
    const source = entries[i]![0];
    if (result.status === "rejected") return { source, count: 0, error: String(result.reason) };
    items.push(...result.value);
    return { source, count: result.value.length };
  });
  return { items, report };
}
