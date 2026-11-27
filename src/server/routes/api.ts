import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import { GAME_NAME, nextResetAt, trustPercent } from '../../shared/game';
import type {
  AppStateResponse,
  ErrorResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  WardenBanner,
} from '../../shared/api';
import {
  ensureDay,
  getDayLaw,
  getDayPostId,
  getDayWarden,
  isDayClosed,
} from '../core/day';
import { keys } from '../core/keys';

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

api.get('/state', async (c) => {
  try {
    const day = await resolveDay();
    const current = await ensureDay();
    const [closed, warden, law, todayPostId] = await Promise.all([
      isDayClosed(day),
      loadWardenBanner(day),
      getDayLaw(day),
      day !== current ? getDayPostId(current) : Promise.resolve(undefined),
    ]);

    return c.json<AppStateResponse>({
      type: 'state',
      gameName: GAME_NAME,
      day,
      closed,
      loggedIn: Boolean(context.userId),
      username: context.username ?? null,
      nextResetAt: nextResetAt(Date.now()),
      subredditName: context.subredditName,
      todayPostUrl: todayPostId ? commentsUrl(todayPostId) : null,
      warden,
      law: law ?? null,
    });
  } catch (error) {
    console.error('GET /api/state failed', error);
    return c.json(fail('Could not load bunker state'), 500);
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
