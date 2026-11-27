import { reddit, redis } from '@devvit/web/server';
import {
  DISASTER_IDS,
  DISASTERS,
  GAME_NAME,
  isClaimId,
  isClaimTrue,
  isDisasterId,
  isNpcId,
  postTitleForDay,
  TRUST_LB_MIN_EVENTS,
  trustPercent,
  type DisasterId,
} from '../../shared/game';
import {
  applyActiveNight,
  runMidnightPipeline,
  type MidnightBackend,
  type MidnightStep,
  type WardenCandidate,
} from '../../shared/night';
import { parseRecord, updatePlayerAtomic } from './bunker';
import { keys } from './keys';
import { postSummary, setSurvivorFlair } from './wrapup';

export const getCurrentDay = async (): Promise<number> => {
  const raw = await redis.get(keys.currentDay());
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isInteger(n) && n > 0 ? n : 0;
};

export const getDayPostId = async (n: number): Promise<string | undefined> =>
  redis.get(keys.dayPost(n));

export const isDayClosed = async (n: number): Promise<boolean> =>
  (await redis.exists(keys.dayClosed(n), keys.dayFrozen(n))) > 0;

export const getDayDisaster = async (
  n: number
): Promise<DisasterId | undefined> => {
  const raw = await redis.get(keys.dayDisaster(n));
  return isDisasterId(raw) ? raw : undefined;
};

/** Picks a disaster for day `n` without repeating yesterday's disaster. */
const pickDisaster = async (n: number): Promise<DisasterId> => {
  const yesterday = n > 1 ? await getDayDisaster(n - 1) : undefined;
  const pool = DISASTER_IDS.filter((id) => id !== yesterday);
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return picked ?? 'blackout';
};

const ensureDayDisaster = async (n: number): Promise<DisasterId> => {
  const existing = await getDayDisaster(n);
  if (existing) return existing;
  const picked = await pickDisaster(n);
  await redis.set(keys.dayDisaster(n), picked, { nx: true });
  return (await getDayDisaster(n)) ?? picked;
};

/**
 * Returns the current day, bootstrapping day 1's secret disaster if nothing
 * exists yet so a playtest works before the first post is created.
 */
export const ensureDay = async (): Promise<number> => {
  const current = await getCurrentDay();
  if (current > 0) {
    await ensureDayDisaster(current);
    return current;
  }
  await ensureDayDisaster(1);
  await redis.set(keys.currentDay(), '1');
  return 1;
};

export type Opened = { day: number; postId: string };

/** Creates day n's spoiler-free post (picking its disaster if needed) and makes it current. */
export const openDay = async (n: number): Promise<Opened> => {
  const existing = await getDayPostId(n);
  if (existing) {
    await ensureDayDisaster(n);
    await redis.set(keys.currentDay(), String(n));
    return { day: n, postId: existing };
  }
  await ensureDayDisaster(n);
  const post = await reddit.submitCustomPost({
    title: `${GAME_NAME} #${n}: ${postTitleForDay(n)}`,
    postData: { day: n },
    textFallback: {
      text: `${GAME_NAME} #${n}. In the apocalypse, every gift might be a trap and every broadcast might be a lie.`,
    },
  });
  await redis.set(keys.dayPost(n), post.id);
  await redis.set(keys.currentDay(), String(n));
  return { day: n, postId: post.id };
};

const num = (v: string | undefined): number => {
  if (v === undefined) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

const createRedisMidnightBackend = (): MidnightBackend => ({
  isStepDone: async (day: number, step: MidnightStep) =>
    (await redis.get(keys.dayStep(day, step))) === '1',

  markStepDone: async (day: number, step: MidnightStep) => {
    await redis.set(keys.dayStep(day, step), '1');
  },

  freezeDay: async (day: number) => {
    await redis.set(keys.dayFrozen(day), '1', { nx: true });
  },

  getDisaster: async (day: number) => ensureDayDisaster(day),

  listExpiredCrates: async (day: number) => {
    const cutoff = day - 1;
    if (cutoff < 1) return [];
    const tracked = await redis.zRange(keys.waitingCrates(), 0, cutoff, {
      by: 'score',
    });
    const ids = new Set(tracked.map((t) => t.member));

    // Also scan player doorsteps for any pre-M5 crates with score <= cutoff.
    const players = await redis.zRange(keys.playersAll(), 0, 499, {
      by: 'rank',
    });
    for (let i = 0; i < players.length; i += 50) {
      const batch = players.slice(i, i + 50);
      const lists = await Promise.all(
        batch.map((p) =>
          redis.zRange(keys.doorstep(p.member), 0, cutoff, { by: 'score' })
        )
      );
      for (const list of lists) {
        for (const item of list) ids.add(item.member);
      }
    }
    return [...ids];
  },

  burnCrateExpired: async (day: number, crateId: string) => {
    const crateKey = keys.crate(crateId);
    const crate = await redis.hGetAll(crateKey);
    const toUser = crate['to'];
    if (Object.keys(crate).length === 0 || crate['state'] !== 'waiting') {
      if (toUser) await redis.zRem(keys.doorstep(toUser), [crateId]);
      await redis.zRem(keys.waitingCrates(), [crateId]);
      return false;
    }

    const lock = await redis.hSetNX(crateKey, 'resolveLock', '1');
    if (lock !== 1) return false;

    try {
      await redis.hSet(crateKey, { state: 'burned', burnedDay: String(day) });
      if (toUser) await redis.zRem(keys.doorstep(toUser), [crateId]);
      await redis.zRem(keys.waitingCrates(), [crateId]);
      return true;
    } catch (error) {
      await redis.hDel(crateKey, ['resolveLock']);
      throw error;
    }
  },

  listActivePlayers: async (day: number) => {
    const rows = await redis.zRange(keys.dayActive(day), 0, -1, { by: 'rank' });
    return rows.map((r) => r.member).filter((id) => !isNpcId(id));
  },

  applyPlayerNightUpkeep: async (
    day: number,
    userId: string,
    disaster: DisasterId
  ) => {
    const outcome = await updatePlayerAtomic(userId, day, (record) => {
      if (record.lastNightApplied >= day) {
        return { commit: false, result: null };
      }
      const night = applyActiveNight({
        food: record.food,
        power: record.power,
        health: record.health,
        infected: record.infected,
        disaster,
      });

      return {
        commit: true,
        fields: {
          food: String(night.nextFood),
          power: String(night.nextPower),
          health: String(night.nextHealth),
          lastNightApplied: String(day),
        },
        result: {
          wasInfected: record.infected,
          night,
        },
      };
    });

    if (!outcome) return false;

    await redis.hSet(keys.dayNightResults(day), {
      [userId]: JSON.stringify({
        wasInfected: outcome.wasInfected,
        ...outcome.night,
      }),
    });
    return true;
  },

  applyPlayerInfection: async (day: number, userId: string) => {
    const result = await updatePlayerAtomic<'survived' | 'infected' | 'skipped'>(
      userId,
      day,
      (record) => {
        if (record.infectionCheckedDay >= day) {
          return { commit: false, result: 'skipped' };
        }
        const nowInfected = record.infected || record.health === 0;
        const nextDaysSurvived = nowInfected ? 0 : record.daysSurvived + 1;
        const nextBest = Math.max(record.bestSurvival, nextDaysSurvived);
        return {
          commit: true,
          fields: {
            infected: nowInfected ? '1' : '0',
            daysSurvived: String(nextDaysSurvived),
            bestSurvival: String(nextBest),
            infectionCheckedDay: String(day),
          },
          result: nowInfected ? 'infected' : 'survived',
        };
      }
    );

    if (result === 'skipped') return 'skipped';

    const fresh = parseRecord(await redis.hGetAll(keys.player(userId)), day);
    await Promise.all([
      redis.zAdd(keys.lbStreak(), { member: userId, score: fresh.bestSurvival }),
      redis.hIncrBy(
        keys.dayStats(day),
        result === 'infected' ? 'infected' : 'survived',
        1
      ),
    ]);
    return result;
  },

  listBroadcasts: async (day: number) => {
    const raw = await redis.hGetAll(keys.dayBroadcasts(day));
    return Object.entries(raw)
      .filter(([uid, claim]) => !isNpcId(uid) && isClaimId(claim))
      .map(([uid]) => uid);
  },

  scorePlayerBroadcast: async (
    day: number,
    userId: string,
    disaster: DisasterId
  ) => {
    const rawClaim = await redis.hGet(keys.dayBroadcasts(day), userId);
    if (!isClaimId(rawClaim)) return false;
    const truth = isClaimTrue(rawClaim, disaster);

    const trustResult = await updatePlayerAtomic(userId, day, (record) => {
      if (record.trustScoredDay >= day) {
        return { commit: false, result: null };
      }
      const nextGood = record.trustGood + (truth ? 1 : 0);
      const nextTotal = record.trustTotal + 1;
      return {
        commit: true,
        fields: {
          trustGood: String(nextGood),
          trustTotal: String(nextTotal),
          trustUpdatedAt: String(Date.now()),
          trustScoredDay: String(day),
        },
        result: {
          total: nextTotal,
          trust: trustPercent(nextGood, nextTotal),
        },
      };
    });

    if (!trustResult) return false;

    const writes: Promise<unknown>[] = [
      redis.hSet(keys.dayBroadcastResults(day), {
        [userId]: truth ? '1' : '0',
      }),
    ];
    if (!truth) {
      writes.push(redis.hSet(keys.dayLiars(day), { [userId]: rawClaim }));
    }
    if (trustResult.total >= TRUST_LB_MIN_EVENTS) {
      writes.push(
        redis.zAdd(keys.lbTrust(), { member: userId, score: trustResult.trust })
      );
    }
    await Promise.all(writes);
    return true;
  },

  loadWardenCandidates: async (day: number) => {
    const activeRows = await redis.zRange(keys.dayActive(day), 0, -1, {
      by: 'rank',
    });
    const realRows = activeRows.filter((r) => !isNpcId(r.member));
    const hashes = await Promise.all(
      realRows.map((r) => redis.hGetAll(keys.player(r.member)))
    );
    const out: WardenCandidate[] = [];
    realRows.forEach((row, idx) => {
      const h = hashes[idx] ?? {};
      const rec = parseRecord(h, day);
      out.push({
        userId: row.member,
        infected: rec.infected,
        actions: row.score,
        trustGood: rec.trustGood,
        trustTotal: rec.trustTotal,
        daysSurvived: rec.daysSurvived,
        trustUpdatedAt: rec.trustUpdatedAt,
        joinedAt: rec.joinedAt,
      });
    });
    return out;
  },

  saveNextWardenAndLaws: async (nextDay, wardenId, laws) => {
    if (!wardenId || !laws) return;
    await Promise.all([
      redis.set(keys.dayWarden(nextDay), wardenId, { nx: true }),
      redis.set(keys.dayLawOptions(nextDay), laws.join(','), { nx: true }),
    ]);
  },

  openNextDay: async (nextDay: number) => openDay(nextDay),

  markDayClosed: async (day: number) => {
    await redis.set(keys.dayClosed(day), '1');
    const [activeRows, disaster] = await Promise.all([
      redis.zRange(keys.dayActive(day), 0, -1, { by: 'rank' }),
      ensureDayDisaster(day),
    ]);
    const realIds = activeRows
      .map((r) => r.member)
      .filter((id) => !isNpcId(id));
    if (realIds.length === 0) return;

    const [nightMap, broadcastMap, broadcastResMap, playerHashes] =
      await Promise.all([
        redis.hGetAll(keys.dayNightResults(day)),
        redis.hGetAll(keys.dayBroadcasts(day)),
        redis.hGetAll(keys.dayBroadcastResults(day)),
        Promise.all(realIds.map((id) => redis.hGetAll(keys.player(id)))),
      ]);

    const nextWardenId = (await redis.get(keys.dayWarden(day + 1))) ?? null;
    const nextWardenName = nextWardenId
      ? ((await redis.hGet(keys.usernames(), nextWardenId)) ?? null)
      : null;

    await Promise.all(
      realIds.map(async (uid, idx) => {
        const rawNight = nightMap[uid];
        const rec = parseRecord(playerHashes[idx] ?? {}, day);
        const claim = broadcastMap[uid] ?? null;
        const broadcastTrue =
          broadcastResMap[uid] === '1'
            ? true
            : broadcastResMap[uid] === '0'
              ? false
              : null;

        let parsedNight: Record<string, unknown> | null = null;
        if (rawNight) {
          try {
            const p: unknown = JSON.parse(rawNight);
            if (typeof p === 'object' && p !== null) {
              parsedNight = Object.fromEntries(Object.entries(p));
            }
          } catch {
            parsedNight = null;
          }
        }

        await redis.set(
          keys.dayReport(day, uid),
          JSON.stringify({
            day,
            away: false,
            disaster,
            disasterName: DISASTERS[disaster].name,
            foodDelta: num(
              typeof parsedNight?.['foodDelta'] === 'number'
                ? String(parsedNight['foodDelta'])
                : undefined
            ),
            powerDelta: num(
              typeof parsedNight?.['powerDelta'] === 'number'
                ? String(parsedNight['powerDelta'])
                : undefined
            ),
            healthDelta: num(
              typeof parsedNight?.['healthDelta'] === 'number'
                ? String(parsedNight['healthDelta'])
                : undefined
            ),
            infected: rec.infected,
            daysSurvived: rec.daysSurvived,
            trust: trustPercent(rec.trustGood, rec.trustTotal),
            broadcastClaim: claim,
            broadcastTrue,
            nextWardenName,
          }),
          { nx: true }
        );
      })
    );
  },

  runFlair: async (day: number) => setSurvivorFlair(day),

  runSummary: async (day, disaster, opened, nextWardenId) => {
    const postId = await getDayPostId(day);
    return postSummary({
      day,
      postId,
      disaster,
      nextDay: opened.day,
      nextPostId: opened.postId,
      nextWardenId,
    });
  },
});

export type ResetResult = {
  closed: number | null;
  opened: Opened;
  flairs: number;
  commented: boolean;
  disasterRevealed: string | null;
};

/**
 * The daily job (also run by the moderator menu):
 * runs the crash-resumable midnight pipeline for the current day.
 */
export const runDailyReset = async (): Promise<ResetResult> => {
  const lock = await redis.incrBy(keys.resetLock(), 1);
  await redis.expire(keys.resetLock(), 120);
  if (lock !== 1)
    throw new Error('A reset is already running. Try again in a minute.');

  try {
    const n = await getCurrentDay();
    const fresh: Omit<ResetResult, 'opened'> = {
      closed: null,
      flairs: 0,
      commented: false,
      disasterRevealed: null,
    };
    if (n === 0) return { ...fresh, opened: await openDay(1) };
    if (!(await getDayPostId(n))) return { ...fresh, opened: await openDay(n) };

    const res = await runMidnightPipeline(n, createRedisMidnightBackend());
    return {
      closed: n,
      opened: res.opened,
      flairs: res.flairs,
      commented: res.commented,
      disasterRevealed: DISASTERS[res.disaster].name,
    };
  } finally {
    await redis.del(keys.resetLock());
  }
};
