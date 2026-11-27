import { redis } from '@devvit/web/server';
import { labelFor, npcPercent, type Label } from '../../shared/game';
import type { PromptReveal } from '../../shared/api';
import { readReveals } from './crowd';
import { keys } from './keys';

export type DayScore = {
  reveals: PromptReveal[];
  npc: number;
  label: Label;
};

/**
 * Recomputes the player's NPC % against the crowd as it stands now and
 * stores it in the day's sorted set. Returns null if the player hasn't
 * finished all prompts.
 */
export const scoreDay = async (
  day: number,
  promptIds: string[],
  userId: string
): Promise<DayScore | null> => {
  const reveals = await readReveals(day, promptIds, userId);
  if (promptIds.length === 0 || reveals.length < promptIds.length) return null;
  const npc = npcPercent(reveals.map((r) => r.score));
  await redis.zAdd(keys.npc(day), { member: userId, score: npc });
  return { reveals, npc, label: labelFor(npc) };
};

/** "Top X%" for a user in the day's NPC ranking. */
export const topPercent = async (
  day: number,
  userId: string
): Promise<{ topPercent: number; players: number }> => {
  const [players, rank] = await Promise.all([
    redis.zCard(keys.npc(day)),
    redis.zRank(keys.npc(day), userId),
  ]);
  if (!players || rank === undefined) return { topPercent: 100, players };
  // zRank is ascending: the best score has rank players-1.
  const fromTop = players - rank;
  return {
    topPercent: Math.max(1, Math.ceil((fromTop / players) * 100)),
    players,
  };
};
