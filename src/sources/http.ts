const USER_AGENT = "idea-radar/1.0 (+https://github.com/NojusTautavicius1/idea-radar)";

export async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": USER_AGENT, accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

export function clip(text: string | null | undefined, max = 600): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

export const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
