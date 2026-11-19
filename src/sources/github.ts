import type { Item } from "../types.js";
import { clip, getJson, hoursAgo } from "./http.js";

// New repositories that collect stars fast: shows what people are building right now.

const TOPICS = ["ai-agents", "llm", "automation", "saas", "mcp", "nextjs", "self-hosted", "workflow"];

type Repo = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  language: string | null;
  topics?: string[];
};

export async function fetchGitHub(sinceDays = 7, minStars = 40): Promise<Item[]> {
  const since = hoursAgo(sinceDays * 24).toISOString().slice(0, 10);
  const headers: Record<string, string> = { accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const items = new Map<string, Item>();
  for (const topic of TOPICS) {
    const q = encodeURIComponent(`topic:${topic} created:>=${since} stars:>=${minStars}`);
    const { items: repos } = await getJson<{ items: Repo[] }>(
      `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=15`,
      { headers },
    );
    for (const repo of repos) {
      const id = `github:${repo.id}`;
      if (items.has(id)) continue;
      items.set(id, {
        id,
        source: "github",
        title: repo.full_name,
        url: repo.html_url,
        text: clip([repo.description, repo.topics?.length ? `Topics: ${repo.topics.join(", ")}` : ""].join(" ")),
        score: repo.stargazers_count,
        comments: repo.forks_count,
        createdAt: new Date(repo.created_at),
        where: repo.language ?? "repo",
      });
    }
  }
  return [...items.values()];
}
