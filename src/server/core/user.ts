import { redis } from '@devvit/web/server';
import { keys } from './keys';

export type PlayerSurvival = {
  daysSurvived: number;
  bestSurvival: number;
  cures: number;
};

const num = (v: string | undefined): number => {
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
};

export const readPlayerSurvival = async (
  userId: string
): Promise<PlayerSurvival> => {
  const h = await redis.hGetAll(keys.player(userId));
  return {
    daysSurvived: num(h['daysSurvived']),
    bestSurvival: num(h['bestSurvival']),
    cures: num(h['cures']),
  };
};
