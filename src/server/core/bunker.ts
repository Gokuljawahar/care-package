import { redis } from '@devvit/web/server';
import type {
  BunkerState,
  DayChecklist,
  ScavengeOutcome,
} from '../../shared/api';
import {
  clampStat,
  isScavengeSiteId,
  START_FOOD,
  START_HEALTH,
  START_POWER,
  START_SCRAP,
  trustPercent,
} from '../../shared/game';
import { keys } from './keys';

export type PlayerRecord = {
  food: number;
  power: number;
  health: number;
  scrap: number;
  infected: boolean;
  lastNightApplied: number;
  firstDay: number;
  daysSurvived: number;
  bestSurvival: number;
  cures: number;
  trustGood: number;
  trustTotal: number;
  seenReportDay: number;
};

const parseIntOr = (v: string | undefined, fallback: number): number => {
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const parseRecord = (
  h: Record<string, string>,
  day: number
): PlayerRecord => ({
  food: clampStat(parseIntOr(h['food'], START_FOOD)),
  power: clampStat(parseIntOr(h['power'], START_POWER)),
  health: clampStat(parseIntOr(h['health'], START_HEALTH)),
  scrap: Math.max(0, parseIntOr(h['scrap'], START_SCRAP)),
  infected: h['infected'] === '1',
  lastNightApplied: parseIntOr(h['lastNightApplied'], Math.max(0, day - 1)),
  firstDay: parseIntOr(h['firstDay'], day),
  daysSurvived: Math.max(0, parseIntOr(h['daysSurvived'], 0)),
  bestSurvival: Math.max(0, parseIntOr(h['bestSurvival'], 0)),
  cures: Math.max(0, parseIntOr(h['cures'], 0)),
  trustGood: Math.max(0, parseIntOr(h['trustGood'], 0)),
  trustTotal: Math.max(0, parseIntOr(h['trustTotal'], 0)),
  seenReportDay: Math.max(0, parseIntOr(h['seenReportDay'], 0)),
});

export const toBunkerState = (record: PlayerRecord): BunkerState => ({
  food: record.food,
  power: record.power,
  health: record.health,
  scrap: record.scrap,
  infected: record.infected,
  daysSurvived: record.daysSurvived,
  bestSurvival: record.bestSurvival,
  trust: trustPercent(record.trustGood, record.trustTotal),
  cures: record.cures,
});

/**
 * Loads the player's bunker, atomically creating starting stats on first visit
 * and indexing their username and membership in `cp:players:all`.
 */
export const ensureBunker = async (
  userId: string,
  username: string | undefined,
  day: number
): Promise<PlayerRecord> => {
  const playerKey = keys.player(userId);
  let h = await redis.hGetAll(playerKey);

  if (h['initialized'] !== '1') {
    const claimed = await redis.hSetNX(playerKey, 'initialized', '1');
    if (claimed === 1) {
      await redis.hSet(playerKey, {
        food: String(START_FOOD),
        power: String(START_POWER),
        health: String(START_HEALTH),
        scrap: String(START_SCRAP),
        infected: '0',
        lastNightApplied: String(Math.max(0, day - 1)),
        firstDay: String(day),
        daysSurvived: '0',
        bestSurvival: '0',
        cures: '0',
        trustGood: '0',
        trustTotal: '0',
        seenReportDay: '0',
      });
      await redis.zAdd(keys.playersAll(), { member: userId, score: day });
    }
    h = await redis.hGetAll(playerKey);
  }

  if (username) {
    await Promise.all([
      redis.hSet(keys.usernames(), { [userId]: username }),
      redis.hSet(keys.usernamesByName(), {
        [username.toLowerCase()]: userId,
      }),
    ]);
  }

  return parseRecord(h, day);
};

export const saveBunkerStats = async (
  userId: string,
  stats: {
    food: number;
    power: number;
    health: number;
    scrap: number;
    infected: boolean;
  }
): Promise<void> => {
  await redis.hSet(keys.player(userId), {
    food: String(clampStat(stats.food)),
    power: String(clampStat(stats.power)),
    health: String(clampStat(stats.health)),
    scrap: String(Math.max(0, Math.trunc(stats.scrap))),
    infected: stats.infected ? '1' : '0',
  });
};

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === 'string');

const isScavengeOutcome = (v: unknown): v is ScavengeOutcome => {
  if (typeof v !== 'object' || v === null) return false;
  if (!('site' in v) || !isScavengeSiteId(v.site)) return false;
  if (!('foodDelta' in v) || typeof v.foodDelta !== 'number') return false;
  if (!('powerDelta' in v) || typeof v.powerDelta !== 'number') return false;
  if (!('scrapDelta' in v) || typeof v.scrapDelta !== 'number') return false;
  if (!('healthDelta' in v) || typeof v.healthDelta !== 'number') return false;
  if (!('loot' in v) || !isStringArray(v.loot)) return false;
  if (!('note' in v) || typeof v.note !== 'string') return false;
  if (!('becameInfected' in v) || typeof v.becameInfected !== 'boolean')
    return false;
  if (!('lawBonus' in v) || typeof v.lawBonus !== 'boolean') return false;
  return true;
};

const parseScavengeOutcome = (
  raw: string | undefined
): ScavengeOutcome | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isScavengeOutcome(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const emptyChecklist = (): DayChecklist => ({
  scavenged: false,
  doorstepWaiting: 0,
  sent: false,
  broadcast: false,
});

export const readChecklist = async (
  day: number,
  userId: string
): Promise<{
  checklist: DayChecklist;
  lastScavenge: ScavengeOutcome | null;
}> => {
  const [actions, doorstepWaiting] = await Promise.all([
    redis.hGetAll(keys.dayActions(day, userId)),
    redis.zCard(keys.doorstep(userId)),
  ]);
  return {
    checklist: {
      scavenged: actions['scavenged'] === '1',
      doorstepWaiting,
      sent: actions['sent'] === '1',
      broadcast: actions['broadcast'] === '1',
    },
    lastScavenge: parseScavengeOutcome(actions['scavengeResult']),
  };
};

/** Increments today's action counter for active-player tracking & Warden eligibility. */
export const recordDailyAction = async (
  day: number,
  userId: string
): Promise<number> => redis.zIncrBy(keys.dayActive(day), userId, 1);
