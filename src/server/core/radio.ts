import { redis } from '@devvit/web/server';
import type {
  RadioBroadcast,
  RadioBroadcastResponse,
} from '../../shared/api';
import {
  CLAIMS,
  isClaimId,
  isNpcId,
  samplePlayerBroadcasts,
  trustPercent,
  type ClaimId,
  type DisasterId,
  type LawId,
  type PlayerBroadcastCandidate,
} from '../../shared/game';
import { ensureBunker, readChecklist, recordDailyAction } from './bunker';
import { getCurrentDay, getDayDisaster } from './day';
import { keys } from './keys';
import { readNpcBroadcasts, readOfficialSignal } from './npcs';
import { resolveDayLaw } from './warden';

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

    const currentDay = await getCurrentDay();
    const [disaster, law, checklistData] = await Promise.all([
      getDayDisaster(day),
      resolveDayLaw(day, currentDay || day),
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
