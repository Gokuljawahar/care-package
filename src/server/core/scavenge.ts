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
  toBunkerState,
  updatePlayerAtomic,
} from './bunker';
import { getCurrentDay } from './day';
import { keys } from './keys';
import { resolveDayLaw } from './warden';

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
 * updates the player's bunker via WATCH/MULTI/EXEC, and records activity.
 */
export const executeScavenge = async (
  userId: string,
  username: string | undefined,
  day: number,
  site: ScavengeSiteId
): Promise<ExecuteScavengeResult> => {
  await ensureBunker(userId, username, day);
  const actionsKey = keys.dayActions(day, userId);
  const claimed = await redis.hSetNX(actionsKey, 'scavenged', '1');
  if (claimed !== 1) return { ok: false, reason: 'already_scavenged' };

  let committed = false;
  try {
    const currentDay = await getCurrentDay();
    const law = await resolveDayLaw(day, currentDay || day);
    const rolled = rollScavenge(site, law);

    const updated = await updatePlayerAtomic(userId, day, (record) => {
      const nextFood = clampStat(record.food + rolled.foodDelta);
      const nextPower = clampStat(record.power + rolled.powerDelta);
      const effectiveHealthDelta =
        record.infected && rolled.healthDelta > 0 ? 0 : rolled.healthDelta;
      const nextHealth = clampStat(record.health + effectiveHealthDelta);
      const nextScrap = Math.max(0, record.scrap + rolled.scrapDelta);
      const becameInfected = nextHealth === 0 && !record.infected;
      const nextInfected = record.infected || nextHealth === 0;

      return {
        commit: true,
        fields: {
          food: String(nextFood),
          power: String(nextPower),
          health: String(nextHealth),
          scrap: String(nextScrap),
          infected: nextInfected ? '1' : '0',
        },
        result: {
          outcome: {
            ...rolled,
            healthDelta: effectiveHealthDelta,
            becameInfected,
          },
          bunker: toBunkerState({
            ...record,
            food: nextFood,
            power: nextPower,
            health: nextHealth,
            scrap: nextScrap,
            infected: nextInfected,
          }),
        },
      };
    });

    committed = true;
    await Promise.all([
      redis.hSet(actionsKey, {
        scavengeResult: JSON.stringify(updated.outcome),
      }),
      recordDailyAction(day, userId),
    ]);

    const { checklist } = await readChecklist(day, userId);
    return {
      ok: true,
      outcome: updated.outcome,
      bunker: updated.bunker,
      checklist,
    };
  } catch (error) {
    if (!committed) {
      await redis.hDel(actionsKey, ['scavenged']);
    }
    throw error;
  }
};
