import { redis } from '@devvit/web/server';
import { keys } from './keys';

export type Streak = {
  streak: number;
  bestStreak: number;
  lastDayPlayed: number;
};

const num = (v: string | undefined) => {
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
};

export const readUser = async (userId: string): Promise<Streak> => {
  const h = await redis.hGetAll(keys.user(userId));
  return {
    streak: num(h['streak']),
    bestStreak: num(h['bestStreak']),
    lastDayPlayed: num(h['lastDayPlayed']),
  };
};

/** Streak as it stands today: it's broken once a whole day is missed. */
export const liveStreak = (u: Streak, currentDay: number): number =>
  u.lastDayPlayed >= currentDay - 1 ? u.streak : 0;

/** Called once when a player finishes all prompts of `day`. Idempotent. */
export const recordFinish = async (
  userId: string,
  day: number
): Promise<Streak> => {
  const u = await readUser(userId);
  if (u.lastDayPlayed >= day) return u;
  const streak = u.lastDayPlayed === day - 1 ? u.streak + 1 : 1;
  const bestStreak = Math.max(u.bestStreak, streak);
  const next = { streak, bestStreak, lastDayPlayed: day };
  await redis.hSet(keys.user(userId), {
    streak: String(streak),
    bestStreak: String(bestStreak),
    lastDayPlayed: String(day),
  });
  await redis.zAdd(keys.streaks(), { member: userId, score: bestStreak });
  return next;
};
