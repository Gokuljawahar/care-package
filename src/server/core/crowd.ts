import { redis } from '@devvit/web/server';
import {
  gridFromHash,
  gridToCells,
  hottest,
  neighbourhood,
  parseCellKey,
  promptScore,
  totalTaps,
  type GridMap,
} from '../../shared/game';
import type { PromptReveal } from '../../shared/api';
import { keys } from './keys';

export const readGrid = async (
  day: number,
  promptId: string
): Promise<GridMap> =>
  gridFromHash(await redis.hGetAll(keys.grid(day, promptId)));

export const readUserCell = async (
  day: number,
  promptId: string,
  userId: string
): Promise<[number, number] | null> => {
  const raw = await redis.hGet(keys.taps(day, promptId), userId);
  return raw ? parseCellKey(raw) : null;
};

export const buildReveal = (
  promptId: string,
  grid: GridMap,
  cx: number,
  cy: number
): PromptReveal => {
  const top = hottest(grid).count;
  return {
    promptId,
    cx,
    cy,
    grid: gridToCells(grid),
    total: totalTaps(grid),
    score: promptScore(grid, cx, cy),
    hottest: top > 0 && neighbourhood(grid, cx, cy) === top,
  };
};

/** Reveals for every prompt the user has tapped, in prompt order. */
export const readReveals = async (
  day: number,
  promptIds: string[],
  userId: string
): Promise<PromptReveal[]> => {
  const out: PromptReveal[] = [];
  for (const id of promptIds) {
    const cell = await readUserCell(day, id, userId);
    if (!cell) continue;
    out.push(buildReveal(id, await readGrid(day, id), cell[0], cell[1]));
  }
  return out;
};
