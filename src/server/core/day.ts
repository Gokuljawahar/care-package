import { redis } from '@devvit/web/server';
import { PROMPTS_PER_DAY } from '../../shared/game';
import { PROMPTS, promptById, type Prompt } from '../../shared/prompts';
import { keys } from './keys';

export const getCurrentDay = async (): Promise<number> => {
  const raw = await redis.get(keys.currentDay());
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isInteger(n) && n > 0 ? n : 0;
};

export const getDayPrompts = async (n: number): Promise<Prompt[]> => {
  const raw = await redis.get(keys.dayPrompts(n));
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => promptById(id))
    .filter((p): p is Prompt => p !== undefined);
};

export const isDayClosed = async (n: number): Promise<boolean> =>
  (await redis.exists(keys.dayClosed(n))) > 0;

/** Bootstraps day 1 if nothing exists yet. */
export const ensureDay = async (): Promise<number> => {
  const current = await getCurrentDay();
  if (current > 0) return current;
  const ids = PROMPTS.slice(0, PROMPTS_PER_DAY).map((p) => p.id);
  await redis.set(keys.dayPrompts(1), ids.join(','));
  await redis.set(keys.currentDay(), '1');
  return 1;
};
