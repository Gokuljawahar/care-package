import { redis } from '@devvit/web/server';
import type {
  RadioBroadcast,
  RadioBroadcastResponse,
} from '../../shared/api';
import {
  CLAIMS,
  isClaimId,
  isClaimTrue,
  isNpcId,
  samplePlayerBroadcasts,
  TRUST_LB_MIN_EVENTS,
  trustPercent,
  type ClaimId,
  type DisasterId,
  type LawId,
  type PlayerBroadcastCandidate,
} from '../../shared/game';
import {
  ensureBunker,
  readChecklist,
  recordDailyAction,
  updatePlayerAtomic,
} from './bunker';
import { getDayDisaster, getDayLaw } from './day';
import { keys } from './keys';
import { readNpcBroadcasts, readOfficialSignal } from './npcs';

const num = (v: string | undefined): number => {
  if (v === undefined) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

export const readMyBroadcast = async (
  day: number,
  userId: string
): Promise<ClaimId | null> => {
  const raw = await redis.hGet(keys.dayBroadcasts(day), userId);
  return isClaimId(raw) ? raw : null;
};

/**
 * Returns up to 5 Radio signals for `viewerId` on `day`:
 * 1 persisted official hint + up to 4 player broadcasts (seeded per day+viewer)
 * + persisted NPC broadcasts to fill empty slots.
 */
export const readRadioFeed = async (
  day: number,
  viewerId: string,
  disaster: DisasterId,
  law: LawId | undefined
): Promise<RadioBroadcast[]> => {
  const [officialText, npcFeed, rawBroadcasts] = await Promise.all([
    readOfficialSignal(day, disaster),
    readNpcBroadcasts(day, disaster),
    redis.hGetAll(keys.dayBroadcasts(day)),
  ]);

  const official: RadioBroadcast = {
    id: `official_${day}`,
    senderName: 'OFFICIAL SIGNAL',
    senderTrust: null,
    isNpc: false,
    isOfficial: true,
    claimId: null,
    text: officialText,
  };

  const playerEntries: { userId: string; claimId: ClaimId }[] = [];
  for (const [uid, rawClaim] of Object.entries(rawBroadcasts)) {
    if (!isNpcId(uid) && isClaimId(rawClaim)) {
      playerEntries.push({ userId: uid, claimId: rawClaim });
    }
  }

  let playerSignals: RadioBroadcast[] = [];
  if (playerEntries.length > 0) {
    const ids = playerEntries.map((e) => e.userId);
    const [names, stats] = await Promise.all([
      redis.hMGet(keys.usernames(), ids),
      Promise.all(ids.map((id) => redis.hGetAll(keys.player(id)))),
    ]);

    const candidates: PlayerBroadcastCandidate[] = playerEntries.map(
      (entry, i) => {
        const h = stats[i] ?? {};
        return {
          userId: entry.userId,
          username: names[i] ?? 'survivor',
          trust: trustPercent(num(h['trustGood']), num(h['trustTotal'])),
          infected: h['infected'] === '1',
          claimId: entry.claimId,
        };
      }
    );

    const sampled = samplePlayerBroadcasts({
      day,
      viewerId,
      law,
      candidates,
      limit: 4,
    });

    playerSignals = sampled.map((item) => ({
      id: `p_${day}_${item.userId}`,
      senderName: item.username,
      senderTrust: item.trust,
      isNpc: false,
      isOfficial: false,
      claimId: item.claimId,
      text: CLAIMS[item.claimId].text,
    }));
  }

  const visibleNpcs =
    law === 'hide_low_trust'
      ? npcFeed.filter((b) => (b.senderTrust ?? 50) >= 50)
      : npcFeed;

  return [official, ...playerSignals, ...visibleNpcs].slice(0, 5);
};

export type SubmitBroadcastResult =
  | ({ ok: true } & RadioBroadcastResponse)
  | { ok: false; status: 409; message: string };

/**
 * Atomically submits one Radio broadcast per player per day using hSetNX.
 */
export const submitBroadcast = async (
  userId: string,
  username: string | undefined,
  day: number,
  claimId: ClaimId
): Promise<SubmitBroadcastResult> => {
  await ensureBunker(userId, username, day);
  const actionsKey = keys.dayActions(day, userId);
  const claimed = await redis.hSetNX(actionsKey, 'broadcast', '1');
  if (claimed !== 1) {
    return {
      ok: false,
      status: 409,
      message: 'You already broadcast on the Radio today',
    };
  }

  let committed = false;
  try {
    await Promise.all([
      redis.hSet(keys.dayBroadcasts(day), { [userId]: claimId }),
      redis.hSet(actionsKey, { broadcastClaim: claimId }),
      recordDailyAction(day, userId),
    ]);
    committed = true;

    const [disaster, law, checklistData] = await Promise.all([
      getDayDisaster(day),
      getDayLaw(day),
      readChecklist(day, userId),
    ]);
    const radioFeed = await readRadioFeed(
      day,
      userId,
      disaster ?? 'blackout',
      law
    );

    return {
      ok: true,
      type: 'radio_broadcast',
      claimId,
      checklist: checklistData.checklist,
      radioFeed,
    };
  } catch (error) {
    if (!committed) {
      await redis.hDel(actionsKey, ['broadcast']);
    }
    throw error;
  }
};

export type BroadcastScoringSummary = {
  scoredCount: number;
  trueCount: number;
  falseCount: number;
};

/**
 * Evaluates all real player broadcasts at midnight close once (idempotent).
 */
export const scoreDayBroadcasts = async (
  day: number,
  disaster: DisasterId
): Promise<BroadcastScoringSummary> => {
  const first = await redis.incrBy(keys.dayBroadcastsScored(day), 1);
  if (first !== 1) return { scoredCount: 0, trueCount: 0, falseCount: 0 };

  const rawBroadcasts = await redis.hGetAll(keys.dayBroadcasts(day));
  let scoredCount = 0;
  let trueCount = 0;
  let falseCount = 0;

  const resultsHash: Record<string, string> = {};
  const liarsHash: Record<string, string> = {};

  for (const [userId, rawClaim] of Object.entries(rawBroadcasts)) {
    if (isNpcId(userId) || !isClaimId(rawClaim)) continue;
    const truth = isClaimTrue(rawClaim, disaster);
    scoredCount += 1;
    if (truth) trueCount += 1;
    else {
      falseCount += 1;
      liarsHash[userId] = rawClaim;
    }
    resultsHash[userId] = truth ? '1' : '0';

    const trustResult = await updatePlayerAtomic(userId, day, (record) => {
      const nextGood = record.trustGood + (truth ? 1 : 0);
      const nextTotal = record.trustTotal + 1;
      return {
        commit: true,
        fields: {
          trustGood: String(nextGood),
          trustTotal: String(nextTotal),
        },
        result: {
          total: nextTotal,
          trust: trustPercent(nextGood, nextTotal),
        },
      };
    });

    if (trustResult.total >= TRUST_LB_MIN_EVENTS) {
      await redis.zAdd(keys.lbTrust(), {
        member: userId,
        score: trustResult.trust,
      });
    }
  }

  if (Object.keys(resultsHash).length > 0) {
    await redis.hSet(keys.dayBroadcastResults(day), resultsHash);
  }
  if (Object.keys(liarsHash).length > 0) {
    await redis.hSet(keys.dayLiars(day), liarsHash);
  }

  return { scoredCount, trueCount, falseCount };
};
