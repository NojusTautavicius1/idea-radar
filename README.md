# Idea radar

[![CI](https://github.com/NojusTautavicius1/idea-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/NojusTautavicius1/idea-radar/actions/workflows/ci.yml)
[![Daily digest](https://github.com/NojusTautavicius1/idea-radar/actions/workflows/digest.yml/badge.svg)](https://github.com/NojusTautavicius1/idea-radar/actions/workflows/digest.yml)

Every morning a GitHub Action reads what people posted on Hacker News, GitHub, Product Hunt and Reddit,
lets Claude pick the five ideas that fit me best, and sends them to my Telegram. I vote 👍 / 👎 under each one,
and the next morning's picks take those votes into account.

Every digest is also saved in [`digests/`](digests), so you can see what it has been sending.

## How it works

```
08:00 cron (GitHub Actions)
  │
  ├─ 1. read yesterday's 👍/👎 and messages from Telegram   src/feedback.ts
  ├─ 2. collect posts from all sources in parallel           src/sources/*
  │      a source that fails is reported and skipped
  ├─ 3. drop anything seen before, keep the hottest per source   src/select.ts
  │      (log-scaled engagement, decayed by age)
  ├─ 4. one Claude call: my profile + votes + ~100 posts      src/rank.ts
  │      → 5 ideas as validated JSON (Zod structured output),
  │        each linked to the posts it came from
  ├─ 5. send to Telegram with vote buttons                    src/telegram.ts
  └─ 6. commit state + Markdown digest back to the repo       data/, digests/
```

No server and no database: the workflow runs once a day, and state is one JSON file in the repo.
Telegram's `getUpdates` collects the button presses that arrived since the last run.

Some details I cared about:

- **Ideas can't point at made-up sources.** The model returns post ids; any id that wasn't in the input is dropped,
  and an idea with no real source is dropped too (`toIdeas`, tested).
- **Votes teach it.** The prompt includes the latest votes with the idea titles and categories, plus any free-text note
  I send the bot ("more stuff for local businesses").
- **One source can't drown out the others.** Each source has its own cap before the model sees anything.
- **Old buttons update.** After a vote is read, its buttons are replaced with "✓ 👍 įsiminta" so the chat shows what
  the bot learned.

## Stack

TypeScript (Node 22, ESM) · Claude API (`@anthropic-ai/sdk`, structured outputs) · Zod · Telegram Bot API ·
GitHub Actions · Vitest

## Run it yourself

1. Create a bot with [@BotFather](https://t.me/BotFather), press **Start** in its chat, then:
   ```bash
   npm install
   cp .env.example .env        # fill in ANTHROPIC_API_KEY and TELEGRAM_BOT_TOKEN
   npm run whoami              # prints TELEGRAM_CHAT_ID
   npm run digest:dry          # prints today's digest without sending
   npm run digest              # sends it
   ```
2. On GitHub, add the same values as repository secrets (Settings → Secrets and variables → Actions) and run
   **Daily digest** once from the Actions tab.
3. Edit [`src/profile.ts`](src/profile.ts) to describe yourself.

Optional sources: `PRODUCT_HUNT_TOKEN` (free developer token) and `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` (a Reddit
"script" app; Reddit blocks anonymous access). GitHub search uses the workflow's built-in token.

```bash
npm test          # vitest
npm run typecheck
```
