import { redis } from '@devvit/web/server';
import { isLawId, type LawId } from '../../shared/game';
import { keys } from './keys';

export const getDayWarden = async (n: number): Promise<string | undefined> => {
  const raw = await redis.get(keys.dayWarden(n));
  return raw || undefined;
};

export const getDayLaw = async (n: number): Promise<LawId | undefined> => {
  const raw = await redis.get(keys.dayLaw(n));
  return isLawId(raw) ? raw : undefined;
};

export const getDayLawOptions = async (n: number): Promise<LawId[]> => {
  const raw = await redis.get(keys.dayLawOptions(n));
  if (!raw) return [];
  return raw.split(',').filter(isLawId);
};

/**
 * Resolves the active law for `day`. If the Warden has not chosen by 12:00 UTC
 * (or the day has already passed), atomically picks one at random from the 3 options.
 */
export const resolveDayLaw = async (
  day: number,
  currentDay: number,
  nowMs: number = Date.now()
): Promise<LawId | undefined> => {
  const existing = await getDayLaw(day);
  if (existing) return existing;

  const wardenId = await getDayWarden(day);
  if (!wardenId) return undefined;

  const pastNoonUtc = new Date(nowMs).getUTCHours() >= 12;
  if (day >= currentDay && !pastNoonUtc) return undefined;

  const options = await getDayLawOptions(day);
  if (options.length === 0) return undefined;

  const lock = await redis.incrBy(keys.dayLawLock(day), 1);
  if (lock === 1) {
    const picked = options[Math.floor(Math.random() * options.length)];
    if (picked) {
      await redis.set(keys.dayLaw(day), picked);
      return picked;
    }
  }
  return getDayLaw(day);
};

export type DecreeLawResult =
  | { ok: true; law: LawId }
  | { ok: false; status: 400 | 403 | 409; message: string };

export const decreeLaw = async (
  userId: string,
  day: number,
  lawId: LawId
): Promise<DecreeLawResult> => {
  const wardenId = await getDayWarden(day);
  if (!wardenId || wardenId !== userId) {
    return {
      ok: false,
      status: 403,
      message: 'Only today’s Warden can pick the law',
    };
  }
  if (await getDayLaw(day)) {
    return { ok: false, status: 409, message: 'Today’s law is already set' };
  }
  const options = await getDayLawOptions(day);
  if (!options.includes(lawId)) {
    return { ok: false, status: 400, message: 'Choose one of your 3 options' };
  }

  const lock = await redis.incrBy(keys.dayLawLock(day), 1);
  if (lock !== 1) {
    return { ok: false, status: 409, message: 'Today’s law is already set' };
  }

  await redis.set(keys.dayLaw(day), lawId);
  return { ok: true, law: lawId };
};
