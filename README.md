# Care Package

**In the apocalypse, every gift might be a trap and every broadcast might be a lie. Who do you trust?**

Care Package is an asynchronous daily survival and social-trust game for Reddit, built on **Devvit Web** as an interactive post. Every day brings a hidden midnight disaster, scavenged supplies, booby-trapped crates between real players, a signal-jammed Radio feed, and an elected **Warden** who passes a city-wide law.

Built for **Reddit's Game of the Day Hackathon 2026**.

---

## How to play

Open today's Care Package post to manage your bunker (**Food 0–10**, **Power 0–10**, **Health 0–10**, and **Scrap**). Each day you can perform four actions in any order:

1. **Scavenge (1/day):** Pick a location — **Pharmacy** (`+2` Food or Power, safe), **Dead Mall** (`+3` split + `1` Scrap, 20% chance `-2` Health), or **Military Base** (`+5` split + `2` Scrap, 45% chance `-4` Health).
2. **Check your Doorstep:** Crates left for you can be **Scanned** (`1 Power` to check Real vs. Trojan), **Opened** (Real crates deliver `+3` total supplies; Trojans steal `3` of your highest stat and deal `-2` Health), or **Burned** safely with no Trust change. Unopened crates burn automatically after `sentDay + 1`.
3. **Send a Care Package (1/day):** Send to a **Random** survivor or a **Friend** by username (who has played in the subreddit). Pack **2 Food or Power** (`+1` bonus for the recipient) or rig a **Trojan** with `2 Scrap`.
4. **Broadcast on the Radio (1/day):** Pick one claim from a fixed list (no free text). Everyone sees **1 verified official hint** plus up to **4 sampled broadcasts**. True claims raise your **Trust %** at midnight; lies lower it.

### Midnight, Disasters & Infection

Every night at **00:00 UTC**, everyone pays `-1 Food` and `-1 Power` upkeep, then the hidden disaster strikes:

| Disaster | Midnight / Daily Effect |
| --- | --- |
| **Blackout** | `-3 Power` |
| **Zombie Outbreak** | `-3 Health` unless Power ≥ 3 keeps fences hot |
| **Nuclear Winter** | `-3 Food`, `-1 Power` |
| **Civil War** | `-2 Food`; Trojans opened today steal double (`6`) |
| **AI Uprising** | Scans jam 50% of the time today; `-2 Power` |

- Any missing Food or Power below `0` deals **2 Health damage per missing unit**.
- Players who skip days catch up lazily on return: upkeep only (`-1 Food, -1 Power` per night, capped at 3 nights), and absence never drops Health below `1`.
- **Infection:** At Health `0`, you flip **Infected 🧟** — your crates are always free Trojans and your broadcasts show by default unless filtered. Open a **Real** crate from a surviving player to be **Cured** (Health `5`) and earn your rescuer **Medic** credit.
- **Warden of the Day:** At midnight, the highest-Trust surviving player with ≥3 actions becomes **Warden** and chooses **1 of 3 laws** (auto-picked at `12:00 UTC` if undecided).
- **Computer-run survivors (`[NPC]`):** Brand-new players receive 2 `[NPC]` crates on Day 1 (1 Real, 1 Trojan, excluded from the 3-crates/day real-player cap) and 1–2 `[NPC]` broadcasts so Day 1 is always lively. NPCs never become Warden or appear on leaderboards.

### Anti-Abuse Rules

- Maximum **3 real-player crates** received per day (overflow reroutes to a random eligible survivor unless `Closed Borders` is active).
- Cannot send to the same survivor two days in a row.
- No free text anywhere in the game (fixed broadcast claims, validated usernames).

---

## For moderators

### Install & Daily Cycle

1. Install the app on your subreddit (`npx devvit install <your-subreddit>`).
2. `onAppInstall` creates **Care Package #1** automatically.
3. A scheduled task runs every day at **`0 0 * * *` (00:00 UTC)**: burns expired crates, resolves upkeep/disasters/infection, scores broadcasts, elects tomorrow's Warden, opens the next post, updates user flair, and posts a stickied drama summary comment on the closed post.
4. **Manual advance:** Moderators can run **Create today's Care Package post** from the subreddit menu to close the current day and post the next one immediately.

### App Settings & Permissions

- **Set Care Package user flair** (`setUserFlair`, default `true`): Updates active players' flair (`Survivor · Day N`, `Infected 🧟 · Day N`, `Warden · Day N+1`). It reads existing flair via `getUserFlair` and **never overwrites custom community flair**.
- Granting the app account moderator permissions (posts + flair) enables the stickied summary comment and batch user flair; if missing, those steps are skipped gracefully without blocking the new day.

---

## Development

Stack: **React 19 + TypeScript + Tailwind 4 + Vite** client, **Hono** server, Devvit **Redis**, **Scheduler**, and **Reddit API** (`@devvit/*` `0.15.4`).

```bash
npm install
npm run login        # once: devvit login
npm run dev          # devvit playtest in dev subreddit
npx tsc --build      # type-check
npm run lint         # eslint
npm run test:unit    # Node unit tests & 30-day balance simulation
npm run build        # production Vite build
npm run deploy       # type-check, lint, upload
npx devvit publish   # submit for Reddit review
```

### Architecture & Redis Keys (`cp:` prefix)

| Path | Purpose |
| --- | --- |
| `src/shared/game.ts`, `night.ts`, `atomic.ts`, `api.ts` | Shared rules, pure disaster/crate/radio/midnight logic, `WATCH/MULTI/EXEC` helper, API contracts |
| `src/server/core/day.ts`, `bunker.ts`, `scavenge.ts`, `crates.ts`, `radio.ts`, `warden.ts`, `npcs.ts`, `wrapup.ts` | Server game engine & crash-resumable 8-step midnight pipeline |
| `src/server/routes/api.ts`, `menu.ts`, `scheduler.ts`, `triggers.ts` | Hono endpoints, mod menu actions, `00:00 UTC` cron, install trigger |
| `src/client/screens/`, `src/client/components/` | Zero-scroll inline screens (`Home`, `NightReport`, `Scavenge`, `Doorstep`, `Send`, `Radio`, `Warden`, `Leaderboard`) & inline SVG art |

| Redis Key | Type | Holds |
| --- | --- | --- |
| `cp:day:current` | string | Current day number |
| `cp:day:{n}:postId` / `closed` / `frozen` | string | Post ID, closed flag, mid-close freeze flag |
| `cp:day:{n}:step:{step}` | string | Per-step completion marker (`burn_crates` .. `summary`) |
| `cp:day:{n}:disaster` | string | Secret disaster ID (revealed at midnight) |
| `cp:day:{n}:warden` / `law` / `lawOptions` / `lawLock` | string | Day `n` Warden ID, chosen law, 3 law options, atomic lock |
| `cp:day:{n}:active` | sorted set | Active players → action count |
| `cp:day:{n}:broadcasts` / `broadcastResults` / `liars` | hash | Player broadcasts, truth flags, false-claim callouts |
| `cp:day:{n}:officialSignal` / `npcBroadcasts` | string | Persisted daily official hint & NPC broadcasts |
| `cp:day:{n}:actions:{userId}` | hash | Once-per-day action flags & saved results (`hSetNX`) |
| `cp:day:{n}:crateCount` / `traitors` / `medics` / `stats` / `nightResults` | hash | Daily caps, drama counters, night deltas |
| `cp:day:{n}:report:{userId}` | string | JSON Night Report for day `n` |
| `cp:player:{userId}` | hash | Bunker stats, survival streak, Trust counters, progress markers |
| `cp:players:all` / `cp:crates:waiting` | sorted set | All bunker owners / waiting crates indexed by `sentDay` |
| `cp:crate:{id}` / `cp:crate:seq` | hash / string | Crate metadata, scan state, atomic locks |
| `cp:doorstep:{userId}` / `cp:sentTo:{userId}` | sorted set / hash | Waiting crates / last sent day per recipient |
| `cp:lb:streak` / `cp:lb:trust` / `cp:lb:medic` | sorted set | Survival, Trust (≥3 resolved events), and Medic leaderboards |
| `cp:usernames` / `cp:usernames:byName` | hash | `userId ↔ username` lookup |
| `cp:lock:reset` | string | Midnight job lock with 120s TTL |
