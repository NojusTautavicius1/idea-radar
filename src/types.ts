export type Source = "hackernews" | "reddit" | "github" | "producthunt";

// One post / repo / launch from any source, normalised so the rest of the pipeline doesn't care where it came from.
export type Item = {
  id: string; // "<source>:<native id>", stable across runs
  source: Source;
  title: string;
  url: string;
  text: string; // body / description, trimmed
  score: number; // upvotes, points or stars
  comments: number;
  createdAt: Date;
  where: string; // subreddit, "Show HN", repo language...
};

export type Feedback = {
  ideaId: string;
  vote: "up" | "down";
  at: string; // ISO
};

export type SentIdea = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: string;
  sources: string[];
};

export type State = {
  seen: Record<string, string>; // item id -> ISO date first seen
  sent: SentIdea[];
  feedback: Feedback[];
  notes: { text: string; at: string }[]; // free-text messages sent to the bot
  telegramOffset: number;
};
