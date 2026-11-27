# Thumbprint

**Tap where you think everyone else will tap.**

Thumbprint is a daily crowd-guessing game for Reddit, built on Devvit Web as an interactive post. Every day there's a new post with five picture prompts: a keyboard, an empty cinema, a blank landscape, a grid of emoji. You get one tap per picture. The goal isn't to tap what _you_ like. It's to tap where you think the crowd will.

Built for Reddit's Game of the Day Hackathon 2026.

## How to play

1. Open today's Thumbprint post and press **Play**.
2. Read the prompt ("Pick your seat", "Where does the sun go?") and tap the picture once.
3. The crowd's heatmap blooms out from your tap so you can see where everyone else went.
4. Do all five, then get your **NPC %** and a label. Come back tomorrow to keep your streak.

| NPC %  | Label          |
| ------ | -------------- |
| 80–100 | NPC            |
| 50–79  | Blends in      |
| 20–49  | Side quest     |
| 0–19   | Main Character |

## How scoring works

All scoring happens on the server. The client only sends `{ promptId, x, y }`, and scores sent by a client are never trusted.

- Tap coordinates are normalised to 0–1 and bucketed into a **40 × 40 grid**.
- **Prompt score** = taps in the 3 × 3 neighbourhood around your cell ÷ the busiest 3 × 3 neighbourhood anywhere on the grid × 100. Because it compares against the _busiest spot_ rather than one global average, a crowd that splits into two hotspots (left door vs right door) still rewards both camps.
- **NPC %** = the average of your five prompt scores. It's recalculated against the live crowd whenever you open your result, and frozen at the daily reset.
- If fewer than 10 people have tapped a prompt, you still see the heatmap, plus a note that you're one of the first and the real crowd arrives later.

The neighbourhood size is one constant (`RADIUS` in `src/shared/game.ts`). `1` is the 3 × 3 rule; `2` makes it 5 × 5 if scores feel too harsh.

## The daily cycle

A scheduled task runs at **00:00 UTC** every day. It:

1. **Closes yesterday**: no more taps, and every finisher's final NPC % is recorded.
2. **Sets user flair** for yesterday's players, e.g. `Thumbprint · 7-day streak`.
3. **Comments on yesterday's post** with a hotspot summary: where the crowd went on each prompt, the average score, the most NPC player, and a link to today's post.
4. **Picks the next five unused prompts** from the pool of 36 (it starts a fresh cycle once all have been used).
5. **Creates today's post**, titled `Thumbprint #N: <first prompt title>`.

Streaks count consecutive days on which you finish all five prompts.

## For moderators

### Install

1. Install the app on your subreddit from the Devvit app directory, or with `npx devvit install <your-subreddit>` from this project.
2. On install, Thumbprint creates **Thumbprint #1** straight away. After that, a new post appears every day at 00:00 UTC.

### Create a post by hand

In your subreddit, open the menu where installed apps add moderator actions and choose **Create today's Thumbprint post**. It runs the same steps as the midnight job: it closes the current day, sets flair, posts the summary, then creates and opens the next post. Use it to start the game, or to skip ahead if a scheduled run failed.

### Notes

- Flair and the stickied summary comment need the app account to keep moderator permissions (flair and posts). If they're missing, the new day still opens. Only that step is skipped, and an error is logged.
- Players see a leaderboard from the trophy icon on the start screen: today's most NPC players and the best streaks.

## Development

This project uses the Devvit Web React template: React + TypeScript + Tailwind on the client (`src/client`), Hono endpoints on the server (`src/server`), and shared rules and types in `src/shared`.

```bash
npm install
npm run login   # once: devvit login
npm run dev     # devvit playtest in your test subreddit
npm run deploy  # type-check, lint, upload
```

| Path                        | What's there                                                                 |
| --------------------------- | ---------------------------------------------------------------------------- |
| `src/shared/game.ts`        | Grid, scoring, labels (shared by server and client)                          |
| `src/shared/prompts.ts`     | The prompt pool: `{ id, title, svgComponentName }`                           |
| `src/client/pictures/`      | Every prompt picture, drawn as inline SVG                                    |
| `src/client/screens/`       | Start, Play, Result, Leaderboard                                             |
| `src/server/routes/api.ts`  | `GET /api/today`, `POST /api/tap`, `GET /api/result`, `GET /api/leaderboard` |
| `src/server/core/day.ts`    | Opening and closing days, prompt selection                                   |
| `src/server/core/wrapup.ts` | Streak flair and the summary comment                                         |
| `devvit.json`               | Redis and Reddit permissions, the daily scheduler task, the mod menu item    |

### Redis keys

| Key                         | Type       | Holds                                          |
| --------------------------- | ---------- | ---------------------------------------------- |
| `day:current`               | string     | Today's day number                             |
| `day:{n}:prompts`           | string     | The 5 prompt ids, comma-separated              |
| `day:{n}:postId`            | string     | The day's post                                 |
| `day:{n}:closed`            | string     | Set once the day is closed                     |
| `day:{n}:p:{promptId}:grid` | hash       | `"x,y"` → tap count                            |
| `day:{n}:p:{promptId}:taps` | hash       | userId → `"x,y"` (one tap per user per prompt) |
| `day:{n}:npc`               | sorted set | userId → NPC %                                 |
| `user:{id}`                 | hash       | `streak`, `bestStreak`, `lastDayPlayed`        |
| `lb:streaks`                | sorted set | userId → best streak                           |
| `usernames`                 | hash       | userId → username (for leaderboards and flair) |
| `prompts:used`              | hash       | promptId → day it was used                     |

### Adding a prompt

1. Draw a 100 × 100 SVG component in `src/client/pictures/` (flat shapes, the palette in `palette.ts`, no real brands or characters) and export it.
2. Add `{ id, title, svgComponentName }` to `src/shared/prompts.ts`.

Fonts: Fredoka (SIL Open Font License), bundled via `@fontsource-variable/fredoka`.
