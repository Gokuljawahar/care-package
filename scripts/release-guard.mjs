import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP_NAME = 'carepackagegame';
const TEST_SUBREDDIT = 'thumbprint_daily_dev';
const PROD_SUBREDDIT = 'CarePackageGame';
const PROD_BRANCH = 'main';
const ARCHIVE_BRANCH = 'master';
const ZERO_SHA = '0000000000000000000000000000000000000000';

const fail = (message) => {
  console.error(`\n[release-guard] BLOCKED: ${message}\n`);
  process.exit(1);
};

const git = (args) =>
  execFileSync('git', args, { encoding: 'utf8' }).trim();

const readDevvitConfig = () => {
  const path = resolve(import.meta.dirname, '..', 'devvit.json');
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(
      `Could not read devvit.json (${error instanceof Error ? error.message : String(error)}).`
    );
  }
};

const assertDevvitConfig = ({ allowDebug }) => {
  const cfg = readDevvitConfig();

  if (cfg.name !== APP_NAME) {
    fail(
      `devvit.json "name" is "${String(cfg.name)}", expected "${APP_NAME}".`
    );
  }

  const devSub = cfg.dev?.subreddit;
  if (
    typeof devSub !== 'string' ||
    devSub.toLowerCase() !== TEST_SUBREDDIT.toLowerCase()
  ) {
    fail(
      `devvit.json "dev.subreddit" is "${String(devSub)}", expected "${TEST_SUBREDDIT}" so playtest never targets production.`
    );
  }

  if (!allowDebug) {
    const items = Array.isArray(cfg.menu?.items) ? cfg.menu.items : [];
    const debugItems = items.filter((item) => {
      const endpoint =
        typeof item?.endpoint === 'string' ? item.endpoint.toLowerCase() : '';
      const label = typeof item?.label === 'string' ? item.label : '';
      return endpoint.includes('debug') || label.startsWith('Debug:');
    });
    if (debugItems.length > 0) {
      fail(
        `devvit.json still contains ${debugItems.length} debug menu item(s). Remove them before production deploy/publish.`
      );
    }
  }
};

const currentBranch = () => {
  try {
    return git(['rev-parse', '--abbrev-ref', 'HEAD']);
  } catch (error) {
    fail(
      `Could not determine current git branch (${error instanceof Error ? error.message : String(error)}).`
    );
  }
};

const assertNotMidnightWindow = () => {
  if (process.env.ALLOW_MIDNIGHT_DEPLOY === '1') return;
  const now = new Date();
  const minutesUtc = now.getUTCHours() * 60 + now.getUTCMinutes();
  const inWindow = minutesUtc >= 23 * 60 + 55 || minutesUtc <= 5;
  if (inWindow) {
    fail(
      'UTC midnight window (23:55-00:05 UTC) overlaps the daily-reset cron. Wait a few minutes or set ALLOW_MIDNIGHT_DEPLOY=1 to override.'
    );
  }
};

const assertProdConfirmation = (exampleCmd) => {
  if (process.env.CONFIRM_PROD !== PROD_SUBREDDIT) {
    fail(
      `Production confirmation missing. Run with CONFIRM_PROD=${PROD_SUBREDDIT}:\n  ${exampleCmd}`
    );
  }
};

const mode = process.argv[2];

if (mode === 'playtest') {
  assertDevvitConfig({ allowDebug: true });
  console.log(`✓ Playtest guard passed (r/${TEST_SUBREDDIT})`);
} else if (mode === 'test') {
  assertDevvitConfig({ allowDebug: true });
  const branch = currentBranch();
  if (branch === ARCHIVE_BRANCH) {
    fail(
      `Current branch is "${ARCHIVE_BRANCH}" (Thumbprint archive). Switch to "dev" or a feature branch before deploying to test.`
    );
  }
  console.log(
    `✓ Test deploy guard passed (branch: ${branch} -> r/${TEST_SUBREDDIT})`
  );
} else if (mode === 'prod') {
  assertDevvitConfig({ allowDebug: false });

  const branch = currentBranch();
  if (branch !== PROD_BRANCH) {
    fail(
      `Production deploys/publishes are only allowed from "${PROD_BRANCH}" (current: "${branch}").`
    );
  }

  const dirty = git(['status', '--porcelain']);
  if (dirty !== '') {
    fail(
      'Working tree has uncommitted or untracked changes. Commit or stash everything cleanly on main before deploying to production.'
    );
  }

  let counts;
  try {
    counts = git([
      'rev-list',
      '--left-right',
      '--count',
      `origin/${PROD_BRANCH}...HEAD`,
    ]);
  } catch {
    fail(
      `Missing remote tracking ref "origin/${PROD_BRANCH}". Run "git fetch origin" and ensure "${PROD_BRANCH}" tracks "origin/${PROD_BRANCH}".`
    );
  }

  const [behindStr, aheadStr] = counts.split(/\s+/);
  const behind = Number(behindStr ?? 0);
  const ahead = Number(aheadStr ?? 0);
  if (behind !== 0 || ahead !== 0) {
    fail(
      `Local "${PROD_BRANCH}" is out of sync with "origin/${PROD_BRANCH}" (behind ${behind}, ahead ${ahead}). Push/pull first so production matches GitHub.`
    );
  }

  assertNotMidnightWindow();
  const cmdHint =
    process.env.npm_lifecycle_event === 'publish:prod'
      ? `CONFIRM_PROD=${PROD_SUBREDDIT} npm run publish:prod`
      : `CONFIRM_PROD=${PROD_SUBREDDIT} npm run deploy:prod`;
  assertProdConfirmation(cmdHint);

  console.log(`✓ Production guard passed (${PROD_BRANCH} -> r/${PROD_SUBREDDIT})`);
} else if (mode === 'rollback') {
  const version = process.argv[3] ?? '';
  if (
    !version ||
    version === ZERO_SHA ||
    !/^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(version)
  ) {
    fail(
      `Provide a valid app version to roll back to, e.g.:\n  CONFIRM_PROD=${PROD_SUBREDDIT} npm run rollback:prod -- 0.0.1`
    );
  }

  assertDevvitConfig({ allowDebug: false });
  assertProdConfirmation(
    `CONFIRM_PROD=${PROD_SUBREDDIT} npm run rollback:prod -- ${version}`
  );

  console.log(
    `Rolling back r/${PROD_SUBREDDIT} to ${APP_NAME}@${version}...`
  );
  execFileSync(
    'npx',
    ['devvit', 'install', PROD_SUBREDDIT, `${APP_NAME}@${version}`],
    { stdio: 'inherit' }
  );
} else {
  fail(
    [
      'Generic "npm run deploy" and "npm run launch" are disabled to prevent accidental production deploys.',
      'Use explicit environment commands instead:',
      `  • Playtest on r/${TEST_SUBREDDIT}:   npm run dev`,
      `  • Deploy to r/${TEST_SUBREDDIT}:     npm run deploy:test`,
      `  • Deploy to r/${PROD_SUBREDDIT}:   CONFIRM_PROD=${PROD_SUBREDDIT} npm run deploy:prod`,
      `  • Publish for public review:        CONFIRM_PROD=${PROD_SUBREDDIT} npm run publish:prod`,
    ].join('\n')
  );
}
