import type { Item } from "../types.js";
import { clip, getJson, hoursAgo } from "./http.js";

// Yesterday's and today's launches. Needs a free developer token (PRODUCT_HUNT_TOKEN); skipped without one.

type Response = {
  data?: {
    posts: {
      edges: {
        node: {
          id: string;
          name: string;
          tagline: string;
          description: string | null;
          url: string;
          votesCount: number;
          commentsCount: number;
          createdAt: string;
          topics: { edges: { node: { name: string } }[] };
        };
      }[];
    };
  };
  errors?: { message: string }[];
};

const QUERY = `query ($after: DateTime!) {
  posts(order: VOTES, postedAfter: $after, first: 30) {
    edges { node {
      id name tagline description url votesCount commentsCount createdAt
      topics(first: 3) { edges { node { name } } }
    } }
  }
}`;

export async function fetchProductHunt(sinceHours = 36): Promise<Item[]> {
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) return [];

  const res = await getJson<Response>("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { after: hoursAgo(sinceHours).toISOString() } }),
  });
  if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join("; "));

  return (res.data?.posts.edges ?? []).map(({ node }) => ({
    id: `producthunt:${node.id}`,
    source: "producthunt" as const,
    title: `${node.name}: ${node.tagline}`,
    url: node.url,
    text: clip(node.description),
    score: node.votesCount,
    comments: node.commentsCount,
    createdAt: new Date(node.createdAt),
    where: node.topics.edges.map((t) => t.node.name).join(", ") || "Product Hunt",
  }));
}
