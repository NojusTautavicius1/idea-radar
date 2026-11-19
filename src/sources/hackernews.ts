import type { Item } from "../types.js";
import { clip, getJson, hoursAgo } from "./http.js";

// Hacker News through the free Algolia API: Show HN launches, Ask HN threads and the front page.

type Hit = {
  objectID: string;
  title: string | null;
  url: string | null;
  story_text: string | null;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
  _tags: string[];
};

const FEEDS = [
  { tag: "show_hn", minPoints: 15, where: "Show HN" },
  { tag: "ask_hn", minPoints: 15, where: "Ask HN" },
  { tag: "front_page", minPoints: 80, where: "HN front page" },
] as const;

export async function fetchHackerNews(sinceHours = 48): Promise<Item[]> {
  const since = Math.floor(hoursAgo(sinceHours).getTime() / 1000);
  const items = new Map<string, Item>();

  for (const feed of FEEDS) {
    const url =
      `https://hn.algolia.com/api/v1/search_by_date?tags=${feed.tag}` +
      `&numericFilters=created_at_i>${since},points>=${feed.minPoints}&hitsPerPage=60`;
    const { hits } = await getJson<{ hits: Hit[] }>(url);
    for (const hit of hits) {
      if (!hit.title) continue;
      const id = `hackernews:${hit.objectID}`;
      if (items.has(id)) continue;
      items.set(id, {
        id,
        source: "hackernews",
        title: hit.title,
        url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        text: clip(hit.story_text?.replace(/<[^>]+>/g, " ")),
        score: hit.points ?? 0,
        comments: hit.num_comments ?? 0,
        createdAt: new Date(hit.created_at_i * 1000),
        where: feed.where,
      });
    }
  }
  return [...items.values()];
}
