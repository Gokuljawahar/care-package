import { reddit, redis } from '@devvit/web/server';
import {
  DISASTER_IDS,
  DISASTERS,
  GAME_NAME,
  isDisasterId,
  isLawId,
  postTitleForDay,
  type DisasterId,
  type LawId,
} from '../../shared/game';
import { keys } from './keys';
import { postSummary, setSurvivorFlair } from './wrapup';

export const getCurrentDay = async (): Promise<number> => {
  const raw = await redis.get(keys.currentDay());
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isInteger(n) && n > 0 ? n : 0;
};

export const getDayPostId = async (n: number): Promise<string | undefined> =>
  redis.get(keys.dayPost(n));

export const isDayClosed = async (n: number): Promise<boolean> =>
  (await redis.exists(keys.dayClosed(n))) > 0;

export const getDayDisaster = async (
  n: number
): Promise<DisasterId | undefined> => {
  const raw = await redis.get(keys.dayDisaster(n));
  return isDisasterId(raw) ? raw : undefined;
};

export const getDayLaw = async (n: number): Promise<LawId | undefined> => {
  const raw = await redis.get(keys.dayLaw(n));
  return isLawId(raw) ? raw : undefined;
};

export const getDayWarden = async (n: number): Promise<string | undefined> => {
  const raw = await redis.get(keys.dayWarden(n));
  return raw || undefined;
};

/** Picks a disaster for day `n` without repeating yesterday's disaster. */
const pickDisaster = async (n: number): Promise<DisasterId> => {
  const yesterday = n > 1 ? await getDayDisaster(n - 1) : undefined;
  const pool = DISASTER_IDS.filter((id) => id !== yesterday);
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return picked ?? 'blackout';
};

const ensureDayDisaster = async (n: number): Promise<DisasterId> => {
  const existing = await getDayDisaster(n);
  if (existing) return existing;
  const picked = await pickDisaster(n);
  await redis.set(keys.dayDisaster(n), picked, { nx: true });
  return (await getDayDisaster(n)) ?? picked;
};

/**
 * Returns the current day, bootstrapping day 1's secret disaster if nothing
 * exists yet so a playtest works before the first post is created.
 */
export const ensureDay = async (): Promise<number> => {
  const current = await getCurrentDay();
  if (current > 0) {
    await ensureDayDisaster(current);
    return current;
  }
  await ensureDayDisaster(1);
  await redis.set(keys.currentDay(), '1');
  return 1;
};

export type Opened = { day: number; postId: string };

/** Creates day n's spoiler-free post (picking its disaster if needed) and makes it current. */
export const openDay = async (n: number): Promise<Opened> => {
  const existing = await getDayPostId(n);
  if (existing) {
    await ensureDayDisaster(n);
    await redis.set(keys.currentDay(), String(n));
    return { day: n, postId: existing };
  }
  await ensureDayDisaster(n);
  const post = await reddit.submitCustomPost({
    title: `${GAME_NAME} #${n}: ${postTitleForDay(n)}`,
    postData: { day: n },
    textFallback: {
      text: `${GAME_NAME} #${n}. In the apocalypse, every gift might be a trap and every broadcast might be a lie.`,
    },
  });
  await redis.set(keys.dayPost(n), post.id);
  await redis.set(keys.currentDay(), String(n));
  return { day: n, postId: post.id };
};

export type DayFinal = {
  day: number;
  postId: string | undefined;
  disaster: DisasterId;
  activeCount: number;
};

/**
 * Freezes day n idempotently. Returns null if the day was already closed.
 */
export const closeDay = async (n: number): Promise<DayFinal | null> => {
  const first = await redis.incrBy(keys.dayClosed(n), 1);
  if (first !== 1) return null;

  const disaster = (await getDayDisaster(n)) ?? 'blackout';
  const activeCount = await redis.zCard(keys.dayActive(n));
  return {
    day: n,
    postId: await getDayPostId(n),
    disaster,
    activeCount,
  };
};

export type ResetResult = {
  closed: number | null;
  opened: Opened;
  flairs: number;
  commented: boolean;
  disasterRevealed: string | null;
};

/**
 * The daily job (also run by the moderator menu):
 * close the current day, then open the next one with a new post.
 */
export const runDailyReset = async (): Promise<ResetResult> => {
  const lock = await redis.incrBy(keys.resetLock(), 1);
  await redis.expire(keys.resetLock(), 120);
  if (lock !== 1)
    throw new Error('A reset is already running. Try again in a minute.');

  try {
    const n = await getCurrentDay();
    const fresh: Omit<ResetResult, 'opened'> = {
      closed: null,
      flairs: 0,
      commented: false,
      disasterRevealed: null,
    };
    if (n === 0) return { ...fresh, opened: await openDay(1) };
    if (!(await getDayPostId(n))) return { ...fresh, opened: await openDay(n) };

    const final = await closeDay(n);
    const opened = await openDay(n + 1);

    let flairs = 0;
    let commented = false;
    if (final) {
      try {
        flairs = await setSurvivorFlair(final);
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
    return {
      closed: n,
      opened,
      flairs,
      commented,
      disasterRevealed: final ? DISASTERS[final.disaster].name : null,
    };
  } finally {
    await redis.del(keys.resetLock());
  }
};
