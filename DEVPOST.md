# Care Package — Devpost Submission Draft

> *In the apocalypse, every gift might be a trap and every broadcast might be a lie. Who do you trust?*

---

## Inspiration

Reddit communities love post-apocalyptic scenarios, social deduction, and shared lore—yet most multiplayer social games require live lobbies where everyone has to be online at once. We wanted a **90-second daily Reddit-native game** built around three ideas:

1. **Booby-trapped gifts between real players:** Sending a Trojan horse to someone you just traded with—or rescuing an infected friend—without needing real-time matchmaking.
2. **Signal over noise:** A Radio feed packed with one vague official clue and conflicting player claims, where figuring out who's lying is half the thrill.
3. **Earned authority:** Becoming **Warden of the Day** through genuine public Trust and passing a city-wide law that changes how everyone plays until midnight.

---

## What it does

Care Package turns any subreddit into one shared bunker town on the brink of collapse:

- **Daily Bunker Loop (90 seconds):** Scavenge **Pharmacy**, **Dead Mall**, or **Military Base**; **Scan**, **Open**, or **Burn** crates on your doorstep; send a **Real** care package (`+1` bonus) or a **Trojan** trap (`-2 Scrap`) to a friend or random survivor; and broadcast one fixed claim on the **Radio**.
- **Hidden Midnight Disasters:** Every night at `00:00 UTC`, upkeep drains Food and Power and a secret disaster (**Blackout**, **Zombie Outbreak**, **Nuclear Winter**, **Civil War**, or **AI Uprising**) hits.
- **Infection & Cures (No Elimination):** Hitting `0` Health flips you **Infected 🧟**—your crates become free Trojans, and only a Real crate from a surviving player can cure you (granting them **Medic** credit).
- **Warden & Laws:** The highest-Trust surviving player with ≥3 actions becomes **Warden** and enacts 1 of 3 laws (e.g., *Open Scanners*, *Scrap Tax*, *Closed Borders*, *Signal Filter*, *Supply Surge*, *Field Aid*).
- **Reddit-Native Wrap-Up:** Every player gets a once-daily **Night Report** with native **Share Sheet** results, safe **user flair** (`Survivor`, `Infected 🧟`, `Warden`) that preserves community flair, and a stickied **daily drama summary comment** naming the Most Trusted survivor, Biggest Traitor, and Best Radio Liar.

---

## How we built it

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + Vite (`Fredoka Variable` typography), using **100% inline SVG & CSS art** (zero network images) tuned to fit Reddit's inline post viewports (`320×440` and `390×512`) with zero scrolling, `≥44px` tap targets, and `prefers-reduced-motion` support.
- **Backend & Persistence:** Hono server on Devvit Web (`Node.js v22` serverless), Devvit Redis, Scheduler (`0 0 * * *` UTC), and Reddit API (`submitCustomPost`, `submitComment`, `getUserFlair`, `setUserFlairBatch`).
- **Safety & Atomicity:** All rolls and outcomes are server-authoritative. Once-per-day actions and crate locks use atomic `hSetNX`, player bunker mutations use optimistic `WATCH / MULTI / EXEC` transactions with retry, and midnight resolution runs an 8-step crash-resumable pipeline (`burn_crates` → `night_upkeep` → `infection` → `score_broadcasts` → `elect_warden` → `open_next` → `flair` → `summary`).

---

## Challenges we ran into

- **Preventing race conditions & lost stat updates:** Opening two crates concurrently or double-tapping Scavenge could overwrite stats. We built a `WATCH/MULTI/EXEC` hash-update helper with conflict retries and atomic lock rollback on failure.
- **Crash-resumable midnight processing:** Marking a day closed before processing all players risks losing updates on a timeout. Restructuring midnight into 8 individually marked steps with per-player day markers (`lastNightApplied`, `infectionCheckedDay`, `trustScoredDay`) made retries idempotent.
- **Fitting a 4-action strategy game into 512px inline without scrolling:** Every screen (Home, Night Report, Doorstep, Scavenge, Send, Radio, Warden, Leaderboard) was budgeted down to the pixel for both `320×440` and `390×512`.
- **Protecting subreddit culture:** Reading existing flair via `getUserFlair` before batch-updating ensures Care Package never overwrites a subreddit's own community flair.

---

## Accomplishments that we're proud of

- Asynchronous multiplayer social betrayal + cooperation with **zero live lobbies** and **zero player elimination**.
- Day-1 viability via clearly labeled `[NPC]` survivors so the first player in any subreddit immediately experiences Real vs. Trojan crates and a populated Radio feed.
- A 30-day multi-agent simulation & unit test suite verifying sensible survival rates, healthy infection pressure, and Trust vs. betrayal balance.

---

## What we learned

- Designing for Reddit's inline feed means every tap target, status strip, and animation must be readable in seconds with zero scrolling.
- Separating "pure deterministic rules" (`src/shared/`) from Redis plumbing (`src/server/core/`) allowed fast unit testing and 30-day balance verification directly under Node.

---

## What's next

- Community-voted seasonal disaster modifiers and custom subreddit loot flavor packs.
- Push notifications for newly delivered friend crates and Warden elections.
- Post-season survival recaps for subreddit communities.

---

## 1-Minute Demo Video Script (60 seconds)

- **[0:00–0:08] Hook (Post in Feed):**
  - *Visual:* Scroll into `Care Package #12: Who do you trust?` in the Reddit feed. Show the inline Home screen (`Day 12 · Tonight: ???`, Food/Power/Health bars, Scrap, pulsing radar).
  - *VO:* "In Care Package, your subreddit is one bunker town at the end of the world. Every gift might be a trap, and every broadcast might be a lie."
- **[0:08–0:18] Scavenge & Radio Deduction:**
  - *Visual:* Tap **Scavenge** → pick **Dead Mall** → loot chips pop up (`+Food`, `+Scrap`). Tap **Radio** → show the `OFFICIAL SIGNAL` hint plus player & `[NPC]` claims → pick a claim and hit **Transmit Signal**.
  - *VO:* "Scavenge risky ruins, then read the Radio—one vague official clue mixed with players who might be bluffing."
- **[0:18–0:32] Doorstep Drama (Scan + Trojan + Real + Send Back):**
  - *Visual:* Open **Doorstep**. Tap **Scan** on a crate (`⚠ Trojan Detected`), **Burn** it, then **Open** another crate showing the shake → red Trojan flash! Then open a Real crate (shake → green/gold burst) and tap **Send one back** to dispatch a crate to a friend.
  - *VO:* "On your doorstep, scan suspicious crates, burn traps, or risk opening them. Real gifts boost supplies—Trojans steal your stock and drain Health."
- **[0:32–0:46] Infection, Cure & Warden Authority:**
  - *Visual:* Flash to the green-striped **Infected Home**, open a friend's Real crate to **Cure** back to Health 5, then switch to **Warden Decree** and enact a city-wide law.
  - *VO:* "Hit zero Health and you flip Infected—until a friend rescues you. Stay trusted and active to become Warden and pass today's law."
- **[0:46–1:00] Midnight Reveal & Reddit Community Loop:**
  - *Visual:* Show the **Night Report** (`Blackout`, Trust change, liar callout, **Share Result**), then scroll to the subreddit's **stickied summary comment** and updated **user flairs** (`Warden`, `Survivor`, `Infected 🧟`).
  - *VO:* "At midnight, the disaster hits, Truth is scored, and the subreddit wakes up to a Night Report, flair, and yesterday's drama. Play Care Package—every day on Reddit."
