# PLAN: Revamping Thumbprint into Care Package

## 1. Header & Scope

- **Goal:** Revamp the Thumbprint codebase into **Care Package**, an asynchronous daily survival & social-trust game on **Devvit Web** (`React 19 + TypeScript + Tailwind 4 + Vite` client, `Hono` server, Devvit `Redis`, `scheduler`, and `reddit` API).
- **Display Name:** Stored in a single shared constant `GAME_NAME` (`src/shared/game.ts`) = `'Care Package'`.
- **Branch & App Registration:** Work on the `care-package` git branch while keeping Thumbprint intact on `master` (with `thumbprint-daily` / `thumbprint_daily_dev` committed on `master`).
- **Deadline:** 8 Dec 2026, 6:00 PM Pacific (7:30 AM 9 Dec IST).

---

## 2. Verified Platform, Docs & Data Model Notes (Devvit 0.15.4)

Verified directly against `node_modules/@devvit/*` (stay on `0.15.4`; do not upgrade):

- **Redis key namespace (`cp:`):** Every Care Package Redis key uses the `cp:` prefix (e.g., `cp:day:current`, `cp:player:{userId}`, `cp:lb:streak`) so it never collides with existing Thumbprint keys in `thumbprint_daily_dev`.
- **Redis sorted sets instead of sets:** `@devvit/redis` does not expose Redis Sets (`sAdd`/`sMembers`). Use sorted sets (`zAdd`, `zRange`, `zCard`, `zScan`, `zRem`) for `cp:day:{n}:active`, `cp:players:all`, and `cp:doorstep:{userId}`.
- **Atomic lazy fallback:** `redis.set(key, value, { nx: true })` is supported (`SetOptions.nx`); use it for lazy 12:00 UTC Warden law auto-pick without adding an extra cron task.
- **Verified Reddit & Client APIs:** `reddit.getUserByUsername`, `reddit.setUserFlairBatch` (up to 100 per call, no commas in flair text), `reddit.submitCustomPost` (`postData` ≤ 2 KB), `reddit.submitComment` + `comment.distinguish(true)`, `showShareSheet`, `showLoginPrompt`, `showToast`, `navigateTo`.
- **Devvit Feature Guide requirements:** Compelling custom first screen, self-explanatory UX, strict prohibition on scrolling inside inline posts (`320×440` and `390×512`), fast load (`App.Ready`), and full mobile + desktop support.
- **Additional Redis keys beyond Section 7 (all `cp:` prefixed):**
  - `cp:players:all` (sorted set): real players who initialized a bunker (for random-survivor targeting & friend validation).
  - `cp:usernames:byName` (hash: `lowercaseUsername -> userId`): O(1) friend lookup alongside `cp:usernames`.
  - `cp:day:{n}:crateCount` (hash: `userId -> count`): enforces the 3-crates/day recipient cap (overflow routes to a random survivor).
  - `cp:day:{n}:report:{userId}` (JSON string): per-player night report written at midnight or during lazy catch-up (paired with `seenReportDay` on `cp:player:{userId}` so it displays once per day before Home).
  - `cp:day:{n}:lawOptions` (string): 3 random laws rolled for day `n`'s Warden.
- **Code & UI rules:** Type aliases over interfaces, named exports only, **no type casts (`as`)** (use type guards and typed constants), server-authoritative outcomes, capture initial mount state in React so prop updates never cancel animations, `≥44px` tap targets, `prefers-reduced-motion`, and unit tests via `npm run test:unit` (Node 24 test runner).

---

## 3. Milestones & File Map

### Milestone 0 — Branch, Plan & Clean Slate
- **Git:** Committed `devvit.json`, `package.json`, and `package-lock.json` on `master`, then branched `care-package`.
- **Deleted Thumbprint-only files:** `crowd.ts`, `score.ts`, `prompts.ts`, `src/client/pictures/*`, `Heatmap.tsx`, `Thumb.tsx`, `Mini.tsx`, `Logo.tsx`, `Play.tsx`, `Start.tsx`, `Result.tsx`, `useSquare.ts`.
- **Updated / Scaffolded:** `devvit.json`, `splash.html`, `game.html`, `src/shared/{game,api}.ts`, `src/server/core/{keys,user,day,wrapup}.ts`, `src/server/routes/{menu,scheduler,triggers,api}.ts`, `src/client/{api,App,index.css}`, `src/client/screens/Leaderboard.tsx`.
- **Done when:** `npx tsc --build`, `npm run lint`, and `npm run build` pass cleanly.

### Milestone 1 — Bunker State, Scavenging & Home Screen
- **Create:** `src/server/core/bunker.ts`, `src/server/core/scavenge.ts`, `src/client/screens/{Home,Scavenge}.tsx`, `src/client/components/StatBar.tsx`.
- **Update:** `src/server/routes/api.ts` (`GET /api/state`, `POST /api/scavenge`), `src/client/api.ts`, `src/client/App.tsx`.
- **Done when:** New players get a bunker, scavenge works once per day, and reload preserves state.

### Milestone 2 — Crates, Doorstep, Open/Scan/Burn & Anti-Abuse
- **Create:** `src/server/core/crates.ts`, `src/client/screens/{Doorstep,Send}.tsx`.
- **Update:** `src/server/routes/api.ts` (`POST /api/crates/{send,scan,open,burn}`).
- **Done when:** Two test accounts can trade real and Trojan crates both ways; all outcomes are server-authoritative.

### Milestone 3 — Computer-Run Survivors (NPCs)
- **Create:** `src/server/core/npcs.ts` (5 clearly labeled `[NPC]` survivors; 2 Day-1 crates per new player; 1–2 mostly-true daily Radio broadcasts; excluded from Warden & leaderboards).
- **Done when:** A brand-new player on Day 1 has 2 NPC crates on their doorstep and a non-empty Radio feed.

### Milestone 4 — Radio & Broadcasts
- **Create:** `src/server/core/radio.ts`, `src/client/screens/Radio.tsx`.
- **Update:** `src/server/routes/api.ts` (`POST /api/radio/broadcast`).
- **Done when:** Broadcasts display properly (respecting Warden `<50% Trust` law over Infected too) and Trust % updates accurately at midnight.

### Milestone 5 — Midnight Cycle, Disasters, Infection/Cure, Lazy Catch-Up & Warden
- **Update:** `src/server/core/day.ts`, `src/server/core/user.ts`, `src/server/routes/api.ts` (`POST /api/warden/law`).
- **Create:** `src/client/screens/Warden.tsx`, plus green-tinted Infected Home variant in `src/client/screens/Home.tsx`.
- **Done when:** Mod menu action advances days cleanly, double-running does not double-apply nights, and Warden laws take effect across all players.

### Milestone 6 — Night Report, Flair, Summary Comment, Leaderboards & Share
- **Update:** `src/server/core/wrapup.ts` (batch flair + stickied drama summary comment), `src/server/routes/api.ts` (`GET /api/leaderboard`), `src/client/screens/Leaderboard.tsx`.
- **Create:** `src/client/screens/NightReport.tsx` (shown once per day before Home, with `showShareSheet` spoiler-free share string).
- **Done when:** Night reports, user flairs, summary comments, leaderboards, and sharing all work in `r/thumbprint_daily_dev`.

### Milestone 7 — Visual Identity, Crate Animation & Polish
- **Create:** `src/client/components/{DisasterArt,CrateArt}.tsx` (lightweight inline SVG/CSS art and per-disaster accent colors).
- **Polish:** Hero crate opening animation (shake → crack → supplies burst or red Trojan flash), respecting `prefers-reduced-motion`; verify every screen fits `320×440` and `390×512` with zero scrolling and `≥44px` tap targets.

### Milestone 8 — Balance Pass, README & Devpost Write-Up
- **Pre-publish cleanup:** Remove `DEV_DEBUG_SUBREDDIT` and `/internal/menu/debug-hurt` from `src/server/routes/menu.ts` and `devvit.json` before publishing!
- **Balance:** 30-day simulation script + `npm run test:unit` suite targeting sensible-play survival, ~15–30% daily infection rate, and Trust vs. Trojan payoff balance.
- **Docs:** Rewrite `README.md`, draft Devpost write-up, and draft a 1-minute demo video script.

---

## 4. Locked Design Decisions

1. **Spoiler-free post title & Home header:** Active post titles use a rotating teaser (`Care Package #N: Who do you trust?`, `Care Package #N: Something is coming`, etc.). Home shows `Day N · Tonight: ???`. The disaster is revealed at midnight in the Night Report and summary comment.
2. **Doorstep delivery & midnight burn timing:** Immediate delivery; unopened crates burn at the end of day `sentDay + 1`.
3. **Warden `<50% Trust` law vs. Infected broadcasts:** The Warden's law wins — `<50% Trust hidden` also hides Infected broadcasts.
4. **Warden `≥3 actions` & tie-breaking:** Counts any 3 of `{scavenge, each doorstep open/scan/burn, send, broadcast}` (each crate action counts separately). Ties break by resolved Trust events → `daysSurvived` → whoever reached the score first.

---

## 5. Open Items (Section 11)

1. **Final game name:** **Care Package** (`GAME_NAME` constant in `src/shared/game.ts`).
2. **Devpost hackathon URL & judging criteria:** `https://redditgameofday2026.devpost.com/` — four equally weighted criteria: **Delightful UX**, **Polish** (launch quality, Devvit Rules compliant, self-explanatory demo post), **Reddit-like & Community-Minded** (comments, flair, streaks, community interaction), and **Fresh Recurring Content** (daily loop, variety, replayability).
3. **Target launch subreddit:** TBD (keep copy generic; keep `thumbprint_daily_dev` for playtesting).
4. **Two-player testing:** User confirmed second Reddit account will be ready for Milestone 2.
