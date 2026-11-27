import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import {
  GAME_NAME,
  isCrateKind,
  isCrateResource,
  isScavengeSiteId,
  nextResetAt,
  trustPercent,
} from '../../shared/game';
import type {
  AppStateResponse,
  CrateSendRequest,
  ErrorResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  ScavengeResponse,
  WardenBanner,
} from '../../shared/api';
import {
  emptyChecklist,
  ensureBunker,
  readChecklist,
  toBunkerState,
} from '../core/bunker';
import {
  burnCrate,
  openCrate,
  readDoorstep,
  readLastSent,
  scanCrate,
  sendCrate,
} from '../core/crates';
import {
  ensureDay,
  getDayDisaster,
  getDayLaw,
  getDayPostId,
  getDayWarden,
  isDayClosed,
} from '../core/day';
import { keys } from '../core/keys';
import { readRadioFeedPreview } from '../core/npcs';
import { executeScavenge } from '../core/scavenge';

export const api = new Hono();

const fail = (message: string): ErrorResponse => ({ status: 'error', message });

const commentsUrl = (postId: string): string =>
  `https://www.reddit.com/r/${context.subredditName}/comments/${postId.replace(/^t3_/, '')}/`;

/** The day this post belongs to (from postData), falling back to today. */
const resolveDay = async (): Promise<number> => {
  const current = await ensureDay();
  const fromPost = context.postData?.['day'];
  return typeof fromPost === 'number' &&
    Number.isInteger(fromPost) &&
    fromPost > 0
    ? fromPost
    : current;
};

const num = (v: string | undefined): number => {
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
};

const loadWardenBanner = async (day: number): Promise<WardenBanner | null> => {
  const wardenId = await getDayWarden(day);
  if (!wardenId) return null;
  const [username, player] = await Promise.all([
    redis.hGet(keys.usernames(), wardenId),
    redis.hGetAll(keys.player(wardenId)),
  ]);
  if (!username) return null;
  return {
    username,
    trust: trustPercent(num(player['trustGood']), num(player['trustTotal'])),
  };
};

const parseCrateId = async (req: Request): Promise<string | null> => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return null;
  }
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('crateId' in raw) ||
    typeof raw.crateId !== 'string' ||
    raw.crateId.length === 0
  ) {
    return null;
  }
  return raw.crateId;
};

const parseCrateSend = async (
  req: Request
): Promise<CrateSendRequest | null> => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  if (
    !('targetMode' in raw) ||
    (raw.targetMode !== 'random' && raw.targetMode !== 'friend')
  ) {
    return null;
  }
  if (!('kind' in raw) || !isCrateKind(raw.kind)) return null;

  let recipientUsername: string | undefined;
  if ('recipientUsername' in raw && raw.recipientUsername !== undefined) {
    if (typeof raw.recipientUsername !== 'string') return null;
    recipientUsername = raw.recipientUsername;
  }

  let resource: CrateSendRequest['resource'];
  if ('resource' in raw && raw.resource !== undefined) {
    if (!isCrateResource(raw.resource)) return null;
    resource = raw.resource;
  }

  return {
    targetMode: raw.targetMode,
    kind: raw.kind,
    recipientUsername,
    resource,
  };
};

api.get('/state', async (c) => {
  try {
    const day = await resolveDay();
    const current = await ensureDay();
    const { userId, username } = context;
    const disaster = (await getDayDisaster(day)) ?? 'blackout';

    const [
      closed,
      warden,
      law,
      todayPostId,
      bunkerRecord,
      checklistData,
      crates,
      lastSent,
      radioFeed,
    ] = await Promise.all([
      isDayClosed(day),
      loadWardenBanner(day),
      getDayLaw(day),
      day !== current ? getDayPostId(current) : Promise.resolve(undefined),
      userId ? ensureBunker(userId, username, current) : Promise.resolve(null),
      userId
        ? readChecklist(day, userId)
        : Promise.resolve({
            checklist: emptyChecklist(),
            lastScavenge: null,
          }),
      userId ? readDoorstep(userId) : Promise.resolve([]),
      userId ? readLastSent(day, userId) : Promise.resolve(null),
      readRadioFeedPreview(day, disaster),
    ]);

    return c.json<AppStateResponse>({
      type: 'state',
      gameName: GAME_NAME,
      day,
      closed,
      loggedIn: Boolean(userId),
      username: username ?? null,
      nextResetAt: nextResetAt(Date.now()),
      subredditName: context.subredditName,
      todayPostUrl: todayPostId ? commentsUrl(todayPostId) : null,
      warden,
      law: law ?? null,
      bunker: bunkerRecord ? toBunkerState(bunkerRecord) : null,
      checklist: {
        ...checklistData.checklist,
        doorstepWaiting: crates.length,
      },
      lastScavenge: checklistData.lastScavenge,
      crates,
      lastSent,
      radioFeed,
    });
  } catch (error) {
    console.error('GET /api/state failed', error);
    return c.json(fail('Could not load bunker state'), 500);
  }
});

api.post('/scavenge', async (c) => {
  const { userId, username } = context;
  if (!userId) return c.json(fail('Log in to scavenge'), 401);

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(fail('Bad request'), 400);
  }
  if (
    typeof rawBody !== 'object' ||
    rawBody === null ||
    !('site' in rawBody) ||
    !isScavengeSiteId(rawBody.site)
  ) {
    return c.json(fail('Choose a valid scavenge site'), 400);
  }

  try {
    const day = await resolveDay();
    if (await isDayClosed(day)) return c.json(fail('This day is closed'), 409);

    const res = await executeScavenge(userId, username, day, rawBody.site);
    if (!res.ok) return c.json(fail('You already scavenged today'), 409);

    return c.json<ScavengeResponse>({
      type: 'scavenge',
      outcome: res.outcome,
      bunker: res.bunker,
      checklist: res.checklist,
    });
  } catch (error) {
    console.error('POST /api/scavenge failed', error);
    return c.json(fail('Scavenge run failed'), 500);
  }
});

api.post('/crates/send', async (c) => {
  const { userId, username } = context;
  if (!userId) return c.json(fail('Log in to send crates'), 401);

  const reqBody = await parseCrateSend(c.req.raw);
  if (!reqBody) return c.json(fail('Invalid crate request'), 400);

  try {
    const day = await resolveDay();
    if (await isDayClosed(day)) return c.json(fail('This day is closed'), 409);

    const res = await sendCrate(userId, username, day, reqBody);
    if (!res.ok) return c.json(fail(res.message), res.status);

    return c.json(res);
  } catch (error) {
    console.error('POST /api/crates/send failed', error);
    return c.json(fail('Could not send care package'), 500);
  }
});

api.post('/crates/scan', async (c) => {
  const { userId, username } = context;
  if (!userId) return c.json(fail('Log in to scan crates'), 401);

  const crateId = await parseCrateId(c.req.raw);
  if (!crateId) return c.json(fail('Missing crate id'), 400);

  try {
    const day = await resolveDay();
    if (await isDayClosed(day)) return c.json(fail('This day is closed'), 409);

    const res = await scanCrate(userId, username, day, crateId);
    if (!res.ok) return c.json(fail(res.message), res.status);

    return c.json(res);
  } catch (error) {
    console.error('POST /api/crates/scan failed', error);
    return c.json(fail('Could not scan crate'), 500);
  }
});

api.post('/crates/open', async (c) => {
  const { userId, username } = context;
  if (!userId) return c.json(fail('Log in to open crates'), 401);

  const crateId = await parseCrateId(c.req.raw);
  if (!crateId) return c.json(fail('Missing crate id'), 400);

  try {
    const day = await resolveDay();
    if (await isDayClosed(day)) return c.json(fail('This day is closed'), 409);

    const res = await openCrate(userId, username, day, crateId);
    if (!res.ok) return c.json(fail(res.message), res.status);

    return c.json(res);
  } catch (error) {
    console.error('POST /api/crates/open failed', error);
    return c.json(fail('Could not open crate'), 500);
  }
});

api.post('/crates/burn', async (c) => {
  const { userId, username } = context;
  if (!userId) return c.json(fail('Log in to burn crates'), 401);

  const crateId = await parseCrateId(c.req.raw);
  if (!crateId) return c.json(fail('Missing crate id'), 400);

  try {
    const day = await resolveDay();
    if (await isDayClosed(day)) return c.json(fail('This day is closed'), 409);

    const res = await burnCrate(userId, username, day, crateId);
    if (!res.ok) return c.json(fail(res.message), res.status);

    return c.json(res);
  } catch (error) {
    console.error('POST /api/crates/burn failed', error);
    return c.json(fail('Could not burn crate'), 500);
  }
});

const withUsernames = async (
  rows: { member: string; score: number }[]
): Promise<LeaderboardEntry[]> => {
  if (rows.length === 0) return [];
  const names = await redis.hMGet(
    keys.usernames(),
    rows.map((r) => r.member)
  );
  return rows.map((r, i) => ({
    username: names[i] ?? 'survivor',
    value: r.score,
  }));
};

api.get('/leaderboard', async (c) => {
  try {
    const day = await resolveDay();
    const [streakRows, trustRows, medicRows] = await Promise.all([
      redis.zRange(keys.lbStreak(), 0, 9, { by: 'rank', reverse: true }),
      redis.zRange(keys.lbTrust(), 0, 9, { by: 'rank', reverse: true }),
      redis.zRange(keys.lbMedic(), 0, 9, { by: 'rank', reverse: true }),
    ]);
    const [streak, trust, medic] = await Promise.all([
      withUsernames(streakRows),
      withUsernames(trustRows),
      withUsernames(medicRows),
    ]);

    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      day,
      streak,
      trust,
      medic,
    });
  } catch (error) {
    console.error('GET /api/leaderboard failed', error);
    return c.json(fail('Could not load the leaderboard'), 500);
  }
});
