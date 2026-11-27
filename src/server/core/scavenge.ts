import { redis } from '@devvit/web/server';
import type {
  BunkerState,
  DayChecklist,
  ScavengeOutcome,
} from '../../shared/api';
import {
  clampStat,
  rollScavenge,
  type ScavengeSiteId,
} from '../../shared/game';
import {
  ensureBunker,
  readChecklist,
  recordDailyAction,
  saveBunkerStats,
  toBunkerState,
} from './bunker';
import { getDayLaw } from './day';
import { keys } from './keys';

export type ExecuteScavengeResult =
  | {
      ok: true;
      outcome: ScavengeOutcome;
      bunker: BunkerState;
      checklist: DayChecklist;
    }
  | { ok: false; reason: 'already_scavenged' };

/**
 * Atomically claims today's scavenge with hSetNX, rolls loot server-side,
 * updates the player's bunker, and records activity.
 */
export const executeScavenge = async (
  userId: string,
  username: string | undefined,
  day: number,
  site: ScavengeSiteId
): Promise<ExecuteScavengeResult> => {
  const record = await ensureBunker(userId, username, day);
  const actionsKey = keys.dayActions(day, userId);
  const claimed = await redis.hSetNX(actionsKey, 'scavenged', '1');
  if (claimed !== 1) return { ok: false, reason: 'already_scavenged' };

  const law = await getDayLaw(day);
  const rolled = rollScavenge(site, law);

  const nextFood = clampStat(record.food + rolled.foodDelta);
  const nextPower = clampStat(record.power + rolled.powerDelta);
  const nextHealth = clampStat(record.health + rolled.healthDelta);
  const nextScrap = Math.max(0, record.scrap + rolled.scrapDelta);
  const becameInfected = nextHealth === 0 && !record.infected;
  const nextInfected = record.infected || nextHealth === 0;

  const outcome: ScavengeOutcome = {
    ...rolled,
    becameInfected,
  };

  await Promise.all([
    saveBunkerStats(userId, {
      food: nextFood,
      power: nextPower,
      health: nextHealth,
      scrap: nextScrap,
      infected: nextInfected,
    }),
    redis.hSet(actionsKey, { scavengeResult: JSON.stringify(outcome) }),
    recordDailyAction(day, userId),
  ]);

  const updatedRecord = {
    ...record,
    food: nextFood,
    power: nextPower,
    health: nextHealth,
    scrap: nextScrap,
    infected: nextInfected,
  };
  const { checklist } = await readChecklist(day, userId);

  return {
    ok: true,
    outcome,
    bunker: toBunkerState(updatedRecord),
    checklist,
  };
};
