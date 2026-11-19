import type { Item } from "../types.js";
import { clip, getJson, hoursAgo } from "./http.js";

// Top posts of the day from subreddits where people describe problems and what they build.
// Reddit blocks anonymous JSON and RSS now, so this needs a free "script" app: REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET.

export const SUBREDDITS = [
  "SaaS",
  "SideProject",
  "Entrepreneur",
  "startups",
  "smallbusiness",
  "indiehackers",
  "AI_Agents",
  "automation",
  "nocode",
  "webdev",
  "web_design",
  "freelance",
];

type Listing = {
  data: {
    children: {
      data: {
        id: string;
        title: string;
        selftext: string;
        permalink: string;
        url: string;
        score: number;
        num_comments: number;
        created_utc: number;
        subreddit: string;
        stickied: boolean;
        over_18: boolean;
      };
    }[];
  };
};

async function appToken(id: string, secret: string): Promise<string> {
  const res = await getJson<{ access_token: string }>("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  return res.access_token;
}

export async function fetchReddit(sinceHours = 36, minScore = 10): Promise<Item[]> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return [];

  const headers = { authorization: `Bearer ${await appToken(id, secret)}` };
  const since = hoursAgo(sinceHours);
  const items: Item[] = [];

  for (const sub of SUBREDDITS) {
    try {
      const listing = await getJson<Listing>(`https://oauth.reddit.com/r/${sub}/top.json?t=day&limit=25&raw_json=1`, { headers });
      for (const { data: post } of listing.data.children) {
        const createdAt = new Date(post.created_utc * 1000);
        if (post.stickied || post.over_18 || post.score < minScore || createdAt < since) continue;
        items.push({
          id: `reddit:${post.id}`,
          source: "reddit",
          title: post.title,
          url: `https://www.reddit.com${post.permalink}`,
          text: clip(post.selftext),
          score: post.score,
          comments: post.num_comments,
          createdAt,
          where: `r/${post.subreddit}`,
        });
      }
    } catch (error) {
      // One blocked subreddit shouldn't cost the whole digest.
      console.warn(`reddit r/${sub}: ${(error as Error).message}`);
    }
  }
  return items;
}
