import type { SourceReport } from "./sources/index.js";
import type { Idea } from "./rank.js";

// The same digest as Markdown, committed to digests/ so the history is browsable on GitHub.
export function toMarkdown(date: string, ideas: Idea[], report: SourceReport[], candidates: number): string {
  const sources = report
    .map((r) => (r.error ? `${r.source}: failed` : `${r.source}: ${r.count}`))
    .join(" · ");

  const body = ideas.map((idea, i) =>
    [
      `## ${i + 1}. ${idea.title}`,
      `*${idea.category} · ${idea.effort}*`,
      "",
      idea.pitch,
      "",
      `**Kodėl tau:** ${idea.whyYou}  `,
      `**Pirmas žingsnis:** ${idea.firstStep}`,
      "",
      ...idea.sources.map((s) => `- [${s.label.replace(/[[\]]/g, "")}](${s.url})`),
    ].join("\n"),
  );

  return [
    `# Idea radar · ${date}`,
    "",
    `Collected ${sources}; ${candidates} new posts reviewed.`,
    "",
    body.length ? body.join("\n\n") : "Nothing strong enough today.",
    "",
  ].join("\n");
}
