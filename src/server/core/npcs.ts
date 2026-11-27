import { redis } from '@devvit/web/server';
import type { RadioBroadcast } from '../../shared/api';
import {
  CLAIMS,
  isClaimId,
  npcById,
  officialSignalForDay,
  pickDayOneNpcCrateSpecs,
  pickNpcBroadcastSpecs,
  type DisasterId,
  type NpcBroadcastSpec,
} from '../../shared/game';
import { keys } from './keys';

const isNpcBroadcastSpec = (v: unknown): v is NpcBroadcastSpec => {
  if (typeof v !== 'object' || v === null) return false;
  if (!('npcId' in v) || typeof v.npcId !== 'string') return false;
  if (!('claimId' in v) || !isClaimId(v.claimId)) return false;
  return npcById(v.npcId) !== undefined;
};

const parseNpcSpecs = (raw: string | undefined): NpcBroadcastSpec[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isNpcBroadcastSpec);
  } catch {
    return [];
  }
};

/**
 * Seeds 2 Day-1 NPC crates (1 real, 1 Trojan) on a player's doorstep once.
 * NPC crates never count toward real players' 3-crates/day cap.
 */
export const seedNewPlayerNpcCrates = async (
  userId: string,
  day: number
): Promise<void> => {
  const playerKey = keys.player(userId);
  const claimed = await redis.hSetNX(playerKey, 'npcCratesSeeded', '1');
  if (claimed !== 1) return;

  try {
    const specs = pickDayOneNpcCrateSpecs();
    for (const spec of specs) {
      const seq = await redis.incrBy(keys.crateSeq(), 1);
      const crateId = `c${day}_npc_${seq}`;
      await redis.hSet(keys.crate(crateId), {
        id: crateId,
        from: spec.npc.id,
        fromUsername: spec.npc.name,
        fromTrust: String(spec.npc.trust),
        isNpc: '1',
        to: userId,
        kind: spec.kind,
        resource: spec.resource,
        day: String(day),
        state: 'waiting',
        scanned: '0',
        scanResult: '',
      });
      await redis.zAdd(keys.doorstep(userId), { member: crateId, score: day });
    }
  } catch (error) {
    await redis.hDel(playerKey, ['npcCratesSeeded']);
    throw error;
  }
};

/**
 * Returns 1-2 clearly labeled [NPC] broadcasts for `day`, persisted atomically.
 */
export const readNpcBroadcasts = async (
  day: number,
  disaster: DisasterId
): Promise<RadioBroadcast[]> => {
  const key = keys.dayNpcBroadcasts(day);
  let specs = parseNpcSpecs(await redis.get(key));
  if (specs.length === 0) {
    const generated = pickNpcBroadcastSpecs(day, disaster);
    await redis.set(key, JSON.stringify(generated), { nx: true });
    specs = parseNpcSpecs(await redis.get(key));
    if (specs.length === 0) specs = [...generated];
  }

  const out: RadioBroadcast[] = [];
  for (const spec of specs) {
    const npc = npcById(spec.npcId);
    if (!npc) continue;
    out.push({
      id: `npc_${day}_${npc.id}`,
      senderName: npc.name,
      senderTrust: npc.trust,
      isNpc: true,
      isOfficial: false,
      claimId: spec.claimId,
      text: CLAIMS[spec.claimId].text,
    });
  }
  return out;
};

export const readRadioFeedPreview = async (
  day: number,
  disaster: DisasterId
): Promise<RadioBroadcast[]> => {
  const official: RadioBroadcast = {
    id: `official_${day}`,
    senderName: 'OFFICIAL SIGNAL',
    senderTrust: null,
    isNpc: false,
    isOfficial: true,
    claimId: null,
    text: officialSignalForDay(day, disaster),
  };
  const npcFeed = await readNpcBroadcasts(day, disaster);
  return [official, ...npcFeed];
};
