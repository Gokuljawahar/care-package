import { reddit, redis } from '@devvit/web/server';
import {
  gridFromHash,
  npcPercent,
  parseCellKey,
  promptScore,
  PROMPTS_PER_DAY,
  type GridMap,
} from '../../shared/game';
import { PROMPTS, promptById, type Prompt } from '../../shared/prompts';
import { keys } from './keys';
import { postSummary, setStreakFlair } from './wrapup';

export const getCurrentDay = async (): Promise<number> => {
  const raw = await redis.get(keys.currentDay());
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isInteger(n) && n > 0 ? n : 0;
};

const readIds = async (n: number): Promise<string[]> => {
  const raw = await redis.get(keys.dayPrompts(n));
  return raw ? raw.split(',').filter(Boolean) : [];
};

export const getDayPrompts = async (n: number): Promise<Prompt[]> =>
  (await readIds(n))
    .map((id) => promptById(id))
    .filter((p): p is Prompt => p !== undefined);

export const getDayPostId = async (n: number): Promise<string | undefined> =>
  redis.get(keys.dayPost(n));

export const isDayClosed = async (n: number): Promise<boolean> =>
  (await redis.exists(keys.dayClosed(n))) > 0;

/**
 * Returns the current day, bootstrapping day 1's prompts if nothing exists yet
 * (so a playtest works before the first scheduled post is created).
 */
export const ensureDay = async (): Promise<number> => {
  const current = await getCurrentDay();
  if (current > 0) return current;
  const ids = await pickPrompts(1);
  await redis.set(keys.dayPrompts(1), ids.join(','));
  await redis.set(keys.currentDay(), '1');
  return 1;
};

// --- prompt selection -------------------------------------------------------

const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Picks the next unused prompts; when the pool runs dry it starts a new cycle. */
const pickPrompts = async (n: number): Promise<string[]> => {
  const used = new Set(await redis.hKeys(keys.usedPrompts()));
  let pool = PROMPTS.map((p) => p.id).filter((id) => !used.has(id));
  if (pool.length < PROMPTS_PER_DAY) {
    await redis.del(keys.usedPrompts());
    const yesterday = new Set(await readIds(n - 1));
    pool = PROMPTS.map((p) => p.id).filter((id) => !yesterday.has(id));
  }
  const rnd = seeded(n * 7919);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j] ?? '', pool[i] ?? ''];
  }
  const picked = pool.slice(0, PROMPTS_PER_DAY);
  await redis.hSet(keys.usedPrompts(), Object.fromEntries(picked.map((id) => [id, String(n)])));
  return picked;
};

// --- opening and closing days -----------------------------------------------

export type Opened = { day: number; postId: string };

/** Creates day n's post (picking its prompts if needed) and makes it current. */
export const openDay = async (n: number): Promise<Opened> => {
  const existing = await getDayPostId(n);
  if (existing) {
    await redis.set(keys.currentDay(), String(n));
    return { day: n, postId: existing };
  }
  let ids = await readIds(n);
  if (ids.length === 0) {
    ids = await pickPrompts(n);
    await redis.set(keys.dayPrompts(n), ids.join(','));
  }
  const first = promptById(ids[0] ?? '');
  const post = await reddit.submitCustomPost({
    title: `Thumbprint #${n}: ${first?.title ?? 'Tap where everyone else taps'}`,
    postData: { day: n },
    textFallback: { text: `Thumbprint #${n}. Tap where you think everyone else will tap.` },
  });
  await redis.set(keys.dayPost(n), post.id);
  await redis.set(keys.currentDay(), String(n));
  return { day: n, postId: post.id };
};

export type DayFinal = {
  day: number;
  postId: string | undefined;
  prompts: Prompt[];
  grids: Record<string, GridMap>;
  /** userId -> final NPC % (finishers only). */
  npc: Map<string, number>;
};

/**
 * Freezes day n: no more taps, and every finisher's NPC % is recomputed once
 * against the final crowd. Reads each grid/taps hash once (not per player).
 * Returns null if the day was already closed.
 */
export const closeDay = async (n: number): Promise<DayFinal | null> => {
  const first = await redis.incrBy(keys.dayClosed(n), 1);
  if (first !== 1) return null;

  const prompts = await getDayPrompts(n);
  const grids: Record<string, GridMap> = {};
  const scores = new Map<string, number[]>();
  for (const p of prompts) {
    const grid = gridFromHash(await redis.hGetAll(keys.grid(n, p.id)));
    grids[p.id] = grid;
    const taps = await redis.hGetAll(keys.taps(n, p.id));
    for (const [userId, cell] of Object.entries(taps)) {
      const c = parseCellKey(cell);
      if (!c) continue;
      const list = scores.get(userId) ?? [];
      list.push(promptScore(grid, c[0], c[1]));
      scores.set(userId, list);
    }
  }

  const npc = new Map<string, number>();
  for (const [userId, list] of scores) {
    if (list.length === prompts.length) npc.set(userId, npcPercent(list));
  }
  const members = [...npc].map(([member, score]) => ({ member, score }));
  for (let i = 0; i < members.length; i += 500) {
    await redis.zAdd(keys.npc(n), ...members.slice(i, i + 500));
  }

  return { day: n, postId: await getDayPostId(n), prompts, grids, npc };
};

export type ResetResult = {
  closed: number | null;
  opened: Opened;
  flairs: number;
  commented: boolean;
};

/**
 * The daily job (also run by the moderator menu):
 * close the current day, then open the next one with a new post.
 * If the current day has no post yet (fresh install / playtest), it just
 * creates that post instead of skipping a day.
 */
export const runDailyReset = async (): Promise<ResetResult> => {
  const lock = await redis.incrBy(keys.resetLock(), 1);
  await redis.expire(keys.resetLock(), 120);
  if (lock !== 1) throw new Error('A reset is already running. Try again in a minute.');

  try {
    const n = await getCurrentDay();
    const fresh = { closed: null, flairs: 0, commented: false };
    if (n === 0) return { ...fresh, opened: await openDay(1) };
    if (!(await getDayPostId(n))) return { ...fresh, opened: await openDay(n) };

    const final = await closeDay(n);
    const opened = await openDay(n + 1);

    // Wrap-up is best effort: a flair or comment failure must not block the new day.
    let flairs = 0;
    let commented = false;
    if (final) {
      try {
        flairs = await setStreakFlair(final);
      } catch (error) {
        console.error(`Flair update for day ${n} failed`, error);
      }
      try {
        await postSummary(final, opened);
        commented = true;
      } catch (error) {
        console.error(`Summary comment for day ${n} failed`, error);
      }
    }
    return { closed: n, opened, flairs, commented };
  } finally {
    await redis.del(keys.resetLock());
  }
};
