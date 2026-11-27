import { redis } from '@devvit/web/server';
import {
  atomicUpdateHash,
  type HashUpdateDecision,
} from '../../shared/atomic';
import type {
  BunkerState,
  DayChecklist,
  NightReportData,
  ScavengeOutcome,
} from '../../shared/api';
import {
  clampStat,
  isDisasterId,
  isScavengeSiteId,
  START_FOOD,
  START_HEALTH,
  START_POWER,
  START_SCRAP,
  trustPercent,
} from '../../shared/game';
import { applyAwayCatchUp } from '../../shared/night';
import { keys } from './keys';
import { seedNewPlayerNpcCrates } from './npcs';

export type PlayerRecord = {
  food: number;
  power: number;
  health: number;
  scrap: number;
  infected: boolean;
  lastNightApplied: number;
  infectionCheckedDay: number;
  trustScoredDay: number;
  firstDay: number;
  daysSurvived: number;
  bestSurvival: number;
  cures: number;
  trustGood: number;
  trustTotal: number;
  trustUpdatedAt: number;
  joinedAt: number;
  seenReportDay: number;
};

const parseIntOr = (v: string | undefined, fallback: number): number => {
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const parseRecord = (
  h: Record<string, string>,
  day: number
): PlayerRecord => ({
  food: clampStat(parseIntOr(h['food'], START_FOOD)),
  power: clampStat(parseIntOr(h['power'], START_POWER)),
  health: clampStat(parseIntOr(h['health'], START_HEALTH)),
  scrap: Math.max(0, parseIntOr(h['scrap'], START_SCRAP)),
  infected: h['infected'] === '1',
  lastNightApplied: parseIntOr(h['lastNightApplied'], Math.max(0, day - 1)),
  infectionCheckedDay: parseIntOr(
    h['infectionCheckedDay'],
    Math.max(0, day - 1)
  ),
  trustScoredDay: Math.max(0, parseIntOr(h['trustScoredDay'], 0)),
  firstDay: parseIntOr(h['firstDay'], day),
  daysSurvived: Math.max(0, parseIntOr(h['daysSurvived'], 0)),
  bestSurvival: Math.max(0, parseIntOr(h['bestSurvival'], 0)),
  cures: Math.max(0, parseIntOr(h['cures'], 0)),
  trustGood: Math.max(0, parseIntOr(h['trustGood'], 0)),
  trustTotal: Math.max(0, parseIntOr(h['trustTotal'], 0)),
  trustUpdatedAt: Math.max(0, parseIntOr(h['trustUpdatedAt'], 0)),
  joinedAt: Math.max(0, parseIntOr(h['joinedAt'], 0)),
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
 * Loads the player's bunker, atomically creating starting stats on first visit,
 * indexing their username, and seeding their 2 Day-1 NPC crates.
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
      const now = String(Date.now());
      await redis.hSet(playerKey, {
        food: String(START_FOOD),
        power: String(START_POWER),
        health: String(START_HEALTH),
        scrap: String(START_SCRAP),
        infected: '0',
        lastNightApplied: String(Math.max(0, day - 1)),
        infectionCheckedDay: String(Math.max(0, day - 1)),
        trustScoredDay: '0',
        firstDay: String(day),
        daysSurvived: '0',
        bestSurvival: '0',
        cures: '0',
        trustGood: '0',
        trustTotal: '0',
        trustUpdatedAt: now,
        joinedAt: now,
        seenReportDay: '0',
      });
      await redis.zAdd(keys.playersAll(), { member: userId, score: day });
    }
    h = await redis.hGetAll(playerKey);
  }

  if (h['npcCratesSeeded'] !== '1') {
    await seedNewPlayerNpcCrates(userId, day);
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

/**
 * Performs an optimistic-locking WATCH/MULTI/EXEC update on `cp:player:{userId}`.
 */
export const updatePlayerAtomic = async <T>(
  userId: string,
  day: number,
  updater: (record: PlayerRecord) => HashUpdateDecision<T>
): Promise<T> =>
  atomicUpdateHash(redis, keys.player(userId), (h) =>
    updater(parseRecord(h, day))
  );

/**
 * Applies lazy away catch-up if `userId` missed one or more closed nights.
 * Upkeep only (-1 Food, -1 Power), capped at 3 nights, Health floored at 1.
 */
export const applyLazyCatchUp = async (
  userId: string,
  latestClosedDay: number
): Promise<string | null> => {
  if (latestClosedDay <= 0) return null;

  const outcome = await updatePlayerAtomic(
    userId,
    latestClosedDay,
    (record) => {
      if (record.lastNightApplied >= latestClosedDay) {
        return { commit: false, result: null };
      }
      const missedNights = latestClosedDay - record.lastNightApplied;
      const caught = applyAwayCatchUp({
        food: record.food,
        power: record.power,
        health: record.health,
        infected: record.infected,
        missedNights,
      });

      return {
        commit: true,
        fields: {
          food: String(caught.nextFood),
          power: String(caught.nextPower),
          health: String(caught.nextHealth),
          lastNightApplied: String(latestClosedDay),
          infectionCheckedDay: String(latestClosedDay),
        },
        result: {
          missedNights,
          infected: record.infected,
          daysSurvived: record.daysSurvived,
          trust: trustPercent(record.trustGood, record.trustTotal),
          cures: record.cures,
          ...caught,
        },
      };
    }
  );

  if (!outcome) return null;

  const report: NightReportData = {
    day: latestClosedDay,
    away: true,
    missedNights: outcome.missedNights,
    awaySummary: outcome.summary,
    disaster: null,
    disasterName: null,
    foodDelta: -outcome.foodLost,
    powerDelta: -outcome.powerLost,
    healthDelta: -outcome.healthLost,
    infected: outcome.infected,
    daysSurvived: outcome.daysSurvived,
    trust: outcome.trust,
    cures: outcome.cures,
    sentCrateNote: null,
    broadcastClaimText: null,
    broadcastTrue: null,
    liarCallout: null,
    nextWardenName: null,
  };

  await redis.set(
    keys.dayReport(latestClosedDay, userId),
    JSON.stringify(report)
  );

  return outcome.summary;
};

const isNullableStr = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

const isNightReportData = (v: unknown): v is NightReportData => {
  if (typeof v !== 'object' || v === null) return false;
  if (!('day' in v) || typeof v.day !== 'number') return false;
  if (!('away' in v) || typeof v.away !== 'boolean') return false;
  if (!('missedNights' in v) || typeof v.missedNights !== 'number')
    return false;
  if (!('awaySummary' in v) || !isNullableStr(v.awaySummary)) return false;
  if (
    !('disaster' in v) ||
    (v.disaster !== null && !isDisasterId(v.disaster))
  ) {
    return false;
  }
  if (!('disasterName' in v) || !isNullableStr(v.disasterName)) return false;
  if (!('foodDelta' in v) || typeof v.foodDelta !== 'number') return false;
  if (!('powerDelta' in v) || typeof v.powerDelta !== 'number') return false;
  if (!('healthDelta' in v) || typeof v.healthDelta !== 'number') return false;
  if (!('infected' in v) || typeof v.infected !== 'boolean') return false;
  if (!('daysSurvived' in v) || typeof v.daysSurvived !== 'number')
    return false;
  if (!('trust' in v) || typeof v.trust !== 'number') return false;
  if (!('cures' in v) || typeof v.cures !== 'number') return false;
  if (!('sentCrateNote' in v) || !isNullableStr(v.sentCrateNote)) return false;
  if (!('broadcastClaimText' in v) || !isNullableStr(v.broadcastClaimText))
    return false;
  if (
    !('broadcastTrue' in v) ||
    (v.broadcastTrue !== null && typeof v.broadcastTrue !== 'boolean')
  ) {
    return false;
  }
  if (!('liarCallout' in v) || !isNullableStr(v.liarCallout)) return false;
  if (!('nextWardenName' in v) || !isNullableStr(v.nextWardenName))
    return false;
  return true;
};

export const readUnseenNightReport = async (
  userId: string,
  latestClosedDay: number,
  seenReportDay: number
): Promise<NightReportData | null> => {
  if (latestClosedDay <= 0 || seenReportDay >= latestClosedDay) return null;
  const raw = await redis.get(keys.dayReport(latestClosedDay, userId));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isNightReportData(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const markNightReportSeen = async (
  userId: string,
  currentDay: number,
  reportDay: number
): Promise<number> =>
  updatePlayerAtomic(userId, currentDay, (record) => {
    const next = Math.max(record.seenReportDay, reportDay);
    return {
      commit: true,
      fields: { seenReportDay: String(next) },
      result: next,
    };
  });

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
