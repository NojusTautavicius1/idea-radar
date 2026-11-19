import type { Item, Source } from "./types.js";

// Cheap pre-filter before the model sees anything: drop what was already shown,
// then keep the strongest items per source so one loud source can't crowd out the rest.

export const PER_SOURCE_LIMIT: Record<Source, number> = {
  reddit: 45,
  hackernews: 35,
  github: 25,
  producthunt: 20,
};

// Engagement on a log scale, decayed by age (half weight after ~2 days).
export function heat(item: Item, now = new Date()): number {
  const ageHours = Math.max(0, (now.getTime() - item.createdAt.getTime()) / 3_600_000);
  const engagement = Math.log10(1 + item.score) + 0.5 * Math.log10(1 + item.comments);
  return engagement / (1 + ageHours / 48);
}

export function selectCandidates(items: Item[], seen: Record<string, string>, now = new Date()): Item[] {
  const fresh = new Map<string, Item>();
  for (const item of items) {
    if (!seen[item.id] && !fresh.has(item.id)) fresh.set(item.id, item);
  }

  const bySource = new Map<Source, Item[]>();
  for (const item of fresh.values()) {
    bySource.set(item.source, [...(bySource.get(item.source) ?? []), item]);
  }

  return [...bySource.entries()].flatMap(([source, list]) =>
    list.sort((a, b) => heat(b, now) - heat(a, now)).slice(0, PER_SOURCE_LIMIT[source]),
  );
}
