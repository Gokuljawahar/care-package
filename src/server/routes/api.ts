import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import { cellKey, nextResetAt, toCell } from '../../shared/game';
import type {
  ErrorResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  ResultResponse,
  TapRequest,
  TapResponse,
  TodayResponse,
} from '../../shared/api';
import { ensureDay, getDayPostId, getDayPrompts, isDayClosed } from '../core/day';
import { liveStreak, readUser, recordFinish } from '../core/user';
import { buildReveal, readGrid, readReveals } from '../core/crowd';
import { keys } from '../core/keys';
import { scoreDay, topPercent } from '../core/score';

export const api = new Hono();

const fail = (message: string): ErrorResponse => ({ status: 'error', message });

const commentsUrl = (postId: string): string =>
  `https://www.reddit.com/r/${context.subredditName}/comments/${postId.replace(/^t3_/, '')}/`;

/** The day this post belongs to (from postData), falling back to today. */
const resolveDay = async (): Promise<number> => {
  const current = await ensureDay();
  const fromPost = context.postData?.['day'];
  return typeof fromPost === 'number' && Number.isInteger(fromPost) && fromPost > 0
    ? fromPost
    : current;
};

api.get('/today', async (c) => {
  try {
    const day = await resolveDay();
    const prompts = await getDayPrompts(day);
    const { userId } = context;
    const reveals = userId
      ? await readReveals(day, prompts.map((p) => p.id), userId)
      : [];
    const user = userId ? await readUser(userId) : null;
    const current = await ensureDay();
    const todayPostId = day !== current ? await getDayPostId(current) : undefined;

    return c.json<TodayResponse>({
      type: 'today',
      day,
      closed: await isDayClosed(day),
      loggedIn: Boolean(userId),
      prompts,
      reveals,
      streak: user ? liveStreak(user, current) : 0,
      bestStreak: user?.bestStreak ?? 0,
      nextResetAt: nextResetAt(Date.now()),
      subredditName: context.subredditName,
      todayPostUrl: todayPostId ? commentsUrl(todayPostId) : null,
    });
  } catch (error) {
    console.error('GET /api/today failed', error);
    return c.json(fail('Could not load today'), 500);
  }
});

api.post('/tap', async (c) => {
  const { userId } = context;
  if (!userId) return c.json(fail('Log in to play'), 401);

  let body: TapRequest;
  try {
    body = await c.req.json<TapRequest>();
  } catch {
    return c.json(fail('Bad request'), 400);
  }
  const { promptId, x, y } = body;
  if (
    typeof promptId !== 'string' ||
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1
  ) {
    return c.json(fail('Bad tap'), 400);
  }

  try {
    const day = await resolveDay();
    if (await isDayClosed(day)) return c.json(fail('This day is closed'), 409);

    const prompts = await getDayPrompts(day);
    if (!prompts.some((p) => p.id === promptId)) {
      return c.json(fail('Not one of today’s prompts'), 400);
    }

    const cx = toCell(x);
    const cy = toCell(y);
    // hSetNX is the one-tap-per-user guard: it only writes if the field is new.
    const isNew = await redis.hSetNX(keys.taps(day, promptId), userId, cellKey(cx, cy));
    if (!isNew) return c.json(fail('You already tapped this one'), 409);

    await redis.hIncrBy(keys.grid(day, promptId), cellKey(cx, cy), 1);
    if (context.username) {
      await redis.hSet(keys.usernames(), { [userId]: context.username });
    }

    const grid = await readGrid(day, promptId);
    const reveal = buildReveal(promptId, grid, cx, cy);
    const finished = await scoreDay(day, prompts.map((p) => p.id), userId);
    if (finished) await recordFinish(userId, day);

    return c.json<TapResponse>({ type: 'tap', reveal, done: finished !== null });
  } catch (error) {
    console.error('POST /api/tap failed', error);
    return c.json(fail('Could not save your tap'), 500);
  }
});

const postUrl = (): string | null => (context.postId ? commentsUrl(context.postId) : null);

api.get('/result', async (c) => {
  const { userId } = context;
  if (!userId) return c.json(fail('Log in to play'), 401);
  try {
    const day = await resolveDay();
    const prompts = await getDayPrompts(day);
    const scored = await scoreDay(day, prompts.map((p) => p.id), userId);
    if (!scored) return c.json(fail('Finish all prompts first'), 409);
    const rank = await topPercent(day, userId);
    const user = await recordFinish(userId, day);
    const current = await ensureDay();

    return c.json<ResultResponse>({
      type: 'result',
      day,
      npc: scored.npc,
      label: scored.label,
      reveals: scored.reveals,
      streak: liveStreak(user, current),
      bestStreak: user.bestStreak,
      topPercent: rank.topPercent,
      players: rank.players,
      nextResetAt: nextResetAt(Date.now()),
      postUrl: postUrl(),
      subredditName: context.subredditName,
    });
  } catch (error) {
    console.error('GET /api/result failed', error);
    return c.json(fail('Could not load your result'), 500);
  }
});

const withUsernames = async (
  rows: { member: string; score: number }[]
): Promise<LeaderboardEntry[]> => {
  if (rows.length === 0) return [];
  const names = await redis.hMGet(keys.usernames(), rows.map((r) => r.member));
  return rows.map((r, i) => ({ username: names[i] ?? 'anonymous', value: r.score }));
};

api.get('/leaderboard', async (c) => {
  try {
    const day = await resolveDay();
    const [todayRows, streakRows] = await Promise.all([
      redis.zRange(keys.npc(day), 0, 9, { by: 'rank', reverse: true }),
      redis.zRange(keys.streaks(), 0, 9, { by: 'rank', reverse: true }),
    ]);
    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      day,
      today: await withUsernames(todayRows),
      streaks: await withUsernames(streakRows),
    });
  } catch (error) {
    console.error('GET /api/leaderboard failed', error);
    return c.json(fail('Could not load the leaderboard'), 500);
  }
});
