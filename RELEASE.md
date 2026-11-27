# Release & Environment Strategy (`carepackagegame`)

Care Package uses two isolated Reddit subreddits on one Devvit app (`carepackagegame`) plus explicit branch and CLI guardrails so test work never reaches production by mistake.

---

## 1. Environments & Branches

| Branch / Env | Target | Purpose |
| --- | --- | --- |
| `feat/*`, `fix/*` | `r/thumbprint_daily_dev` (`npm run dev`) | Feature development and playtesting |
| `dev` | `r/thumbprint_daily_dev` (`npm run deploy:test`) | Staging / pre-release verification of uploaded bundle |
| `main` | `r/CarePackageGame` (`deploy:prod` / `publish:prod`) | Production — clean, tagged, verified releases only |
| `master` | *(local archive)* | Original Thumbprint baseline (never deployed) |

Devvit isolates Redis storage per subreddit automatically, so activity in `r/thumbprint_daily_dev` never affects `r/CarePackageGame`.

---

## 2. One-Time Local Setup

Run these once inside `/home/gokul/Downloads/care-package`:

```bash
# 1. Align local branch name with GitHub (care-package -> main)
git branch -m care-package main
git branch --set-upstream-to=origin/main main

# 2. Activate repo git pre-push hooks & run full verification
npm run hooks:install
npm run check

# 3. Commit & push the release setup on main
git add -A
git commit -m "Tune 5 balance, remove dev debug menu, and add release guardrails"
git push -u origin main

# 4. Create the staging branch for future work
git checkout -b dev
git push -u origin dev
```

*(Optional GitHub UI hardening: in GitHub repo Settings → Branches → Add rule for `main`, enable **Require a pull request before merging** and **Do not allow bypassing** / **Block force pushes**.)*

---

## 3. Command Reference

| Command | Effect |
| --- | --- |
| `npm run check` | Runs `tsc --build`, ESLint, Node unit tests (incl. 30-day balance sim), and Vite build |
| `npm run dev` | Starts `devvit playtest` strictly against `r/thumbprint_daily_dev` |
| `npm run deploy:test` | Runs `npm run check`, uploads, and installs onto `r/thumbprint_daily_dev` |
| `CONFIRM_PROD=CarePackageGame npm run deploy:prod` | Runs prod guardrails + `npm run check`, uploads, and installs onto `r/CarePackageGame` |
| `CONFIRM_PROD=CarePackageGame npm run publish:prod` | Same prod guardrails + uploads & submits for Reddit review (`>200` members / public launch) |
| `CONFIRM_PROD=CarePackageGame npm run rollback:prod -- <version>` | Re-installs a prior uploaded version (e.g. `0.0.1`) onto `r/CarePackageGame` |
| `npm run logs:test` / `npm run logs:prod` | Streams live Devvit logs for test or prod |

Generic `npm run deploy` and `npm run launch` are intentionally disabled.

---

## 4. Automated Guardrails

- **[scripts/release-guard.mjs](scripts/release-guard.mjs):**
  - Ensures `devvit.json` stays `name: "carepackagegame"` and `dev.subreddit: "thumbprint_daily_dev"`.
  - Blocks `deploy:test` from `master`.
  - Blocks `deploy:prod` / `publish:prod` unless:
    1. No `Debug:` / `debug` menu items exist in `devvit.json`.
    2. Current git branch is `main` with a clean working tree.
    3. Local `main` matches `origin/main` (0 ahead, 0 behind).
    4. Current UTC time is outside the `23:55–00:05 UTC` daily-reset cron window (override with `ALLOW_MIDNIGHT_DEPLOY=1`).
    5. `CONFIRM_PROD=CarePackageGame` is explicitly set.
- **[.githooks/pre-push](.githooks/pre-push):**
  - Blocks pushing any non-`main` ref into `origin/main` or pushing with a dirty tree.
  - Runs `npm run check` before pushes to `main`, `dev`, or `v*` tags (and verifies release tags point to commits on `main`).
  - Runs `test:types && lint` before pushing feature branches.

---

## 5. Day-to-Day Feature Release Workflow

1. Branch off `dev`:
   ```bash
   git checkout dev && git pull
   git checkout -b feat/my-feature
   ```
2. Build & playtest on `r/thumbprint_daily_dev`:
   ```bash
   npm run dev
   ```
3. Merge into `dev` and test the uploaded bundle on `r/thumbprint_daily_dev`:
   ```bash
   git checkout dev && git merge --no-ff feat/my-feature
   git push origin dev
   npm run deploy:test
   ```
4. Promote `dev` → `main` and deploy to `r/CarePackageGame`:
   ```bash
   git checkout main && git merge --no-ff dev
   git push origin main
   CONFIRM_PROD=CarePackageGame npm run deploy:prod
   ```
   *(For public release, run `CONFIRM_PROD=CarePackageGame npm run publish:prod`.)*
5. Tag and monitor:
   ```bash
   git tag v0.x.y && git push --tags
   npm run logs:prod
   ```

### Schema & Rollback Rules
- **Additive Redis changes only:** Give new `cp:player:{userId}` fields safe fallback defaults on read so live bunkers on `r/CarePackageGame` never break.
- **Instant rollback:** `CONFIRM_PROD=CarePackageGame npm run rollback:prod -- 0.0.1`
