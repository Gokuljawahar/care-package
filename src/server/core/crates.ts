import { redis } from '@devvit/web/server';
import type {
  BunkerState,
  CrateBurnResponse,
  CrateOpenOutcome,
  CrateOpenResponse,
  CrateScanResponse,
  CrateSendRequest,
  CrateSendResponse,
  DoorstepCrate,
  SentCrateSummary,
} from '../../shared/api';
import {
  clampStat,
  isCrateKind,
  isCrateResource,
  MAX_CRATES_PER_DAY,
  REAL_CRATE_COST,
  resolveCrateOpen,
  scanCostFor,
  TROJAN_SCRAP_COST,
  trojanCostFor,
  TRUST_LB_MIN_EVENTS,
  trustPercent,
  type CrateKind,
  type CrateResource,
  type CrateScanStatus,
} from '../../shared/game';
import {
  ensureBunker,
  readChecklist,
  recordDailyAction,
  saveBunkerStats,
  toBunkerState,
} from './bunker';
import { getDayDisaster, getDayLaw } from './day';
import { keys } from './keys';

const num = (v: string | undefined): number => {
  if (v === undefined) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

const normalizeUsername = (raw: string): string =>
  raw.trim().replace(/^\/?u\//i, '').toLowerCase();

const shuffle = <T>(items: readonly T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i];
    const b = arr[j];
    if (a !== undefined && b !== undefined) {
      arr[i] = b;
      arr[j] = a;
    }
  }
  return arr;
};

const scanStatusFromCrate = (
  crate: Record<string, string>
): CrateScanStatus => {
  if (crate['scanned'] === 'jammed') return 'jammed';
  if (crate['scanned'] === '1') {
    if (crate['scanResult'] === 'real') return 'real';
    if (crate['scanResult'] === 'trojan') return 'trojan';
  }
  return 'unscanned';
};

const isSentCrateSummary = (v: unknown): v is SentCrateSummary => {
  if (typeof v !== 'object' || v === null) return false;
  if (!('recipientUsername' in v) || typeof v.recipientUsername !== 'string')
    return false;
  if (!('kind' in v) || !isCrateKind(v.kind)) return false;
  if (
    !('resource' in v) ||
    (v.resource !== null && !isCrateResource(v.resource))
  )
    return false;
  if (!('rerouted' in v) || typeof v.rerouted !== 'boolean') return false;
  return true;
};

export const readLastSent = async (
  day: number,
  userId: string
): Promise<SentCrateSummary | null> => {
  const raw = await redis.hGet(keys.dayActions(day, userId), 'sentSummary');
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSentCrateSummary(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Reads all waiting crates on `userId`'s doorstep without leaking `kind` or `resource`
 * unless the crate has been successfully scanned.
 */
export const readDoorstep = async (
  userId: string
): Promise<DoorstepCrate[]> => {
  const entries = await redis.zRange(keys.doorstep(userId), 0, -1, {
    by: 'rank',
  });
  if (entries.length === 0) return [];

  const crateHashes = await Promise.all(
    entries.map((e) => redis.hGetAll(keys.crate(e.member)))
  );

  const staleIds: string[] = [];
  const waiting: { id: string; data: Record<string, string> }[] = [];
  entries.forEach((entry, idx) => {
    const data = crateHashes[idx];
    if (!data || data['state'] !== 'waiting' || data['to'] !== userId) {
      staleIds.push(entry.member);
      return;
    }
    waiting.push({ id: entry.member, data });
  });

  if (staleIds.length > 0) {
    await redis.zRem(keys.doorstep(userId), staleIds);
  }
  if (waiting.length === 0) return [];

  const senderIds = [
    ...new Set(
      waiting
        .filter((w) => w.data['isNpc'] !== '1')
        .map((w) => w.data['from'])
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [senderNames, senderStats] = await Promise.all([
    senderIds.length > 0
      ? redis.hMGet(keys.usernames(), senderIds)
      : Promise.resolve([]),
    Promise.all(senderIds.map((id) => redis.hGetAll(keys.player(id)))),
  ]);

  const senderMap = new Map<string, { username: string; trust: number }>();
  senderIds.forEach((id, idx) => {
    const username = senderNames[idx] ?? 'survivor';
    const stats = senderStats[idx] ?? {};
    senderMap.set(id, {
      username,
      trust: trustPercent(num(stats['trustGood']), num(stats['trustTotal'])),
    });
  });

  return waiting.map(({ id, data }) => {
    const isNpc = data['isNpc'] === '1';
    const fromId = data['from'] ?? '';
    const senderInfo = senderMap.get(fromId);
    const fromUsername = isNpc
      ? (data['fromUsername'] ?? '[NPC] Survivor')
      : (senderInfo?.username ?? data['fromUsername'] ?? 'survivor');
    const fromTrust = isNpc
      ? num(data['fromTrust'] ?? '50')
      : (senderInfo?.trust ?? 50);

    return {
      id,
      fromUsername,
      fromTrust,
      fromIsNpc: isNpc,
      day: num(data['day']),
      scanStatus: scanStatusFromCrate(data),
    };
  });
};

type CrateErr = { ok: false; status: 400 | 404 | 409; message: string };

const err = (status: 400 | 404 | 409, message: string): CrateErr => ({
  ok: false,
  status,
  message,
});

const claimRandomRecipient = async (
  senderId: string,
  day: number,
  sentToMap: Record<string, string>,
  excludeId?: string
): Promise<{ id: string; username: string } | null> => {
  const allPlayers = await redis.zRange(keys.playersAll(), 0, 499, {
    by: 'rank',
  });
  const countMap = await redis.hGetAll(keys.dayCrateCount(day));

  const eligibleIds = shuffle(
    allPlayers
      .map((p) => p.member)
      .filter((id) => {
        if (id === senderId || id === excludeId) return false;
        if (num(sentToMap[id]) >= day - 1) return false;
        if (num(countMap[id]) >= MAX_CRATES_PER_DAY) return false;
        return true;
      })
  );

  for (const candidateId of eligibleIds) {
    const newCount = await redis.hIncrBy(keys.dayCrateCount(day), candidateId, 1);
    if (newCount <= MAX_CRATES_PER_DAY) {
      const name = await redis.hGet(keys.usernames(), candidateId);
      return { id: candidateId, username: name ?? 'survivor' };
    }
    await redis.hIncrBy(keys.dayCrateCount(day), candidateId, -1);
  }
  return null;
};

export type SendCrateResult =
  | ({ ok: true } & CrateSendResponse)
  | CrateErr;

export const sendCrate = async (
  senderId: string,
  senderUsername: string | undefined,
  day: number,
  req: CrateSendRequest
): Promise<SendCrateResult> => {
  const sender = await ensureBunker(senderId, senderUsername, day);
  const actionsKey = keys.dayActions(day, senderId);
  if ((await redis.hGet(actionsKey, 'sent')) === '1') {
    return err(409, 'You already sent a care package today');
  }

  const law = await getDayLaw(day);
  if (req.targetMode === 'random' && law === 'friends_only') {
    return err(409, 'Warden law: random deliveries are suspended today');
  }

  if (sender.infected && req.kind === 'real') {
    return err(400, 'Infected survivors can only send Trojans');
  }

  const kind: CrateKind = sender.infected ? 'trojan' : req.kind;
  let resource: CrateResource = 'food';
  if (kind === 'real') {
    if (!req.resource) return err(400, 'Choose Food or Power to pack');
    resource = req.resource;
    const stock = resource === 'food' ? sender.food : sender.power;
    if (stock < REAL_CRATE_COST) {
      return err(409, `Need at least ${REAL_CRATE_COST} ${resource} to send`);
    }
  } else {
    const cost = trojanCostFor(sender.infected, law);
    if (sender.scrap < cost) {
      return err(
        409,
        `Need ${cost || TROJAN_SCRAP_COST} Scrap to rig a Trojan`
      );
    }
  }

  const sentToMap = await redis.hGetAll(keys.sentTo(senderId));
  let recipientId: string;
  let recipientUsername: string;
  let rerouted = false;

  if (req.targetMode === 'friend') {
    const normalized = normalizeUsername(req.recipientUsername ?? '');
    if (!normalized) return err(400, 'Enter a survivor username');

    const foundId = await redis.hGet(keys.usernamesByName(), normalized);
    const foundInit = foundId
      ? await redis.hGet(keys.player(foundId), 'initialized')
      : undefined;
    if (!foundId || foundInit !== '1') {
      return err(404, 'No survivor found with that username');
    }
    if (foundId === senderId) {
      return err(400, "You can't send a care package to yourself");
    }
    if (num(sentToMap[foundId]) >= day - 1) {
      return err(
        409,
        'You already sent to that survivor yesterday — pick someone else'
      );
    }

    const claimedCount = await redis.hIncrBy(keys.dayCrateCount(day), foundId, 1);
    if (claimedCount <= MAX_CRATES_PER_DAY) {
      recipientId = foundId;
      recipientUsername =
        (await redis.hGet(keys.usernames(), foundId)) ?? normalized;
    } else {
      await redis.hIncrBy(keys.dayCrateCount(day), foundId, -1);
      const overflow = await claimRandomRecipient(
        senderId,
        day,
        sentToMap,
        foundId
      );
      if (!overflow) {
        return err(
          409,
          "That doorstep is full and no other survivor has room today"
        );
      }
      recipientId = overflow.id;
      recipientUsername = overflow.username;
      rerouted = true;
    }
  } else {
    const picked = await claimRandomRecipient(senderId, day, sentToMap);
    if (!picked) {
      return err(409, 'No eligible survivors available today');
    }
    recipientId = picked.id;
    recipientUsername = picked.username;
  }

  const rollbackSlot = async () => {
    if (recipientId) {
      await redis.hIncrBy(keys.dayCrateCount(day), recipientId, -1);
    }
  };

  const claimedSend = await redis.hSetNX(actionsKey, 'sent', '1');
  if (claimedSend !== 1) {
    await rollbackSlot();
    return err(409, 'You already sent a care package today');
  }

  // Re-read sender bunker after atomic claim to guard against concurrent deductions.
  const freshSender = await ensureBunker(senderId, senderUsername, day);
  let nextFood = freshSender.food;
  let nextPower = freshSender.power;
  let nextScrap = freshSender.scrap;

  if (kind === 'real') {
    if (resource === 'food') {
      if (freshSender.food < REAL_CRATE_COST) {
        await redis.hDel(actionsKey, ['sent']);
        await rollbackSlot();
        return err(409, `Need at least ${REAL_CRATE_COST} food to send`);
      }
      nextFood = clampStat(freshSender.food - REAL_CRATE_COST);
    } else {
      if (freshSender.power < REAL_CRATE_COST) {
        await redis.hDel(actionsKey, ['sent']);
        await rollbackSlot();
        return err(409, `Need at least ${REAL_CRATE_COST} power to send`);
      }
      nextPower = clampStat(freshSender.power - REAL_CRATE_COST);
    }
  } else {
    const cost = trojanCostFor(freshSender.infected, law);
    if (freshSender.scrap < cost) {
      await redis.hDel(actionsKey, ['sent']);
      await rollbackSlot();
      return err(409, `Need ${cost} Scrap to rig a Trojan`);
    }
    nextScrap = Math.max(0, freshSender.scrap - cost);
  }

  const seq = await redis.incrBy(keys.crateSeq(), 1);
  const crateId = `c${day}_${seq}`;
  const summary: SentCrateSummary = {
    recipientUsername,
    kind,
    resource: kind === 'real' ? resource : null,
    rerouted,
  };

  await Promise.all([
    saveBunkerStats(senderId, {
      food: nextFood,
      power: nextPower,
      health: freshSender.health,
      scrap: nextScrap,
      infected: freshSender.infected,
    }),
    redis.hSet(keys.crate(crateId), {
      id: crateId,
      from: senderId,
      fromUsername: senderUsername ?? 'survivor',
      fromIsNpc: '0',
      isNpc: '0',
      to: recipientId,
      kind,
      resource: kind === 'real' ? resource : 'food',
      day: String(day),
      state: 'waiting',
      scanned: '0',
      scanResult: '',
    }),
    redis.zAdd(keys.doorstep(recipientId), { member: crateId, score: day }),
    redis.hSet(keys.sentTo(senderId), { [recipientId]: String(day) }),
    redis.hSet(actionsKey, {
      sentCrateId: crateId,
      sentSummary: JSON.stringify(summary),
    }),
    recordDailyAction(day, senderId),
  ]);

  const { checklist } = await readChecklist(day, senderId);
  const bunker: BunkerState = toBunkerState({
    ...freshSender,
    food: nextFood,
    power: nextPower,
    scrap: nextScrap,
  });

  return {
    ok: true,
    type: 'crate_send',
    summary,
    bunker,
    checklist,
  };
};

export type ScanCrateResult =
  | ({ ok: true } & CrateScanResponse)
  | CrateErr;

export const scanCrate = async (
  userId: string,
  username: string | undefined,
  day: number,
  crateId: string
): Promise<ScanCrateResult> => {
  const crateKey = keys.crate(crateId);
  const crate = await redis.hGetAll(crateKey);
  if (Object.keys(crate).length === 0 || crate['to'] !== userId) {
    return err(404, 'Crate not found on your doorstep');
  }
  if (crate['state'] !== 'waiting') {
    return err(409, 'This crate was already opened or burned');
  }
  if (crate['scanned'] === '1' || crate['scanned'] === 'jammed') {
    return err(409, 'This crate was already scanned');
  }

  const law = await getDayLaw(day);
  const powerCost = scanCostFor(law);
  const bunker = await ensureBunker(userId, username, day);
  if (bunker.power < powerCost) {
    return err(409, 'Not enough Power to scan');
  }

  const scanLock = await redis.hSetNX(crateKey, 'scanLock', '1');
  if (scanLock !== 1) {
    return err(409, 'This crate was already scanned');
  }

  const freshCrate = await redis.hGetAll(crateKey);
  if (
    freshCrate['resolveLock'] === '1' ||
    freshCrate['state'] !== 'waiting'
  ) {
    await redis.hDel(crateKey, ['scanLock']);
    return err(409, 'This crate was already opened or burned');
  }

  const freshBunker = await ensureBunker(userId, username, day);
  if (freshBunker.power < powerCost) {
    await redis.hDel(crateKey, ['scanLock']);
    return err(409, 'Not enough Power to scan');
  }

  const nextPower = clampStat(freshBunker.power - powerCost);
  const disaster = await getDayDisaster(day);
  const jammed = disaster === 'ai_uprising' && Math.random() < 0.5;
  const kind: CrateKind = freshCrate['kind'] === 'real' ? 'real' : 'trojan';
  const scanStatus: CrateScanStatus = jammed ? 'jammed' : kind;

  await Promise.all([
    saveBunkerStats(userId, {
      food: freshBunker.food,
      power: nextPower,
      health: freshBunker.health,
      scrap: freshBunker.scrap,
      infected: freshBunker.infected,
    }),
    redis.hSet(crateKey, {
      scanned: jammed ? 'jammed' : '1',
      scanResult: scanStatus,
    }),
    recordDailyAction(day, userId),
  ]);

  const [crates, checklistData] = await Promise.all([
    readDoorstep(userId),
    readChecklist(day, userId),
  ]);

  return {
    ok: true,
    type: 'crate_scan',
    crateId,
    jammed,
    scanStatus,
    powerCost,
    bunker: toBunkerState({ ...freshBunker, power: nextPower }),
    checklist: checklistData.checklist,
    crates,
  };
};

export type OpenCrateResult =
  | ({ ok: true } & CrateOpenResponse)
  | CrateErr;

export const openCrate = async (
  userId: string,
  username: string | undefined,
  day: number,
  crateId: string
): Promise<OpenCrateResult> => {
  const crateKey = keys.crate(crateId);
  const crate = await redis.hGetAll(crateKey);
  if (Object.keys(crate).length === 0 || crate['to'] !== userId) {
    return err(404, 'Crate not found on your doorstep');
  }
  if (crate['state'] !== 'waiting') {
    return err(409, 'This crate was already opened or burned');
  }

  const resolveLock = await redis.hSetNX(crateKey, 'resolveLock', '1');
  if (resolveLock !== 1) {
    return err(409, 'This crate was already opened or burned');
  }

  const recipient = await ensureBunker(userId, username, day);
  const [disaster, law] = await Promise.all([
    getDayDisaster(day),
    getDayLaw(day),
  ]);

  const kind: CrateKind = crate['kind'] === 'real' ? 'real' : 'trojan';
  const resource: CrateResource =
    crate['resource'] === 'power' ? 'power' : 'food';
  const isNpc = crate['isNpc'] === '1';
  const fromId = crate['from'] ?? '';

  const resolution = resolveCrateOpen({
    kind,
    resource,
    recipient: {
      food: recipient.food,
      power: recipient.power,
      health: recipient.health,
      infected: recipient.infected,
    },
    disaster: disaster ?? 'blackout',
    law,
  });

  await Promise.all([
    saveBunkerStats(userId, {
      food: resolution.nextFood,
      power: resolution.nextPower,
      health: resolution.nextHealth,
      scrap: recipient.scrap,
      infected: resolution.nextInfected,
    }),
    redis.hSet(crateKey, {
      state: 'opened',
      openedDay: String(day),
    }),
    redis.zRem(keys.doorstep(userId), [crateId]),
    recordDailyAction(day, userId),
  ]);

  let fromUsername = crate['fromUsername'] ?? 'survivor';
  let fromTrust = num(crate['fromTrust'] ?? '50');

  if (!isNpc && fromId) {
    const senderKey = keys.player(fromId);
    const [storedName, newGood, newTotal] = await Promise.all([
      redis.hGet(keys.usernames(), fromId),
      resolution.senderTrustGoodDelta > 0
        ? redis.hIncrBy(senderKey, 'trustGood', resolution.senderTrustGoodDelta)
        : redis.hGet(senderKey, 'trustGood').then(num),
      resolution.senderTrustTotalDelta > 0
        ? redis.hIncrBy(
            senderKey,
            'trustTotal',
            resolution.senderTrustTotalDelta
          )
        : redis.hGet(senderKey, 'trustTotal').then(num),
    ]);
    if (storedName) fromUsername = storedName;
    fromTrust = trustPercent(newGood, newTotal);

    if (newTotal >= TRUST_LB_MIN_EVENTS) {
      await redis.zAdd(keys.lbTrust(), { member: fromId, score: fromTrust });
    }

    if (resolution.senderCuresDelta > 0) {
      const cures = await redis.hIncrBy(
        senderKey,
        'cures',
        resolution.senderCuresDelta
      );
      await Promise.all([
        redis.zAdd(keys.lbMedic(), { member: fromId, score: cures }),
        redis.hSet(keys.dayMedics(day), { [fromId]: '1' }),
      ]);
    }

    if (kind === 'trojan') {
      await redis.hIncrBy(keys.dayTraitors(day), fromId, 1);
      if (resolution.senderGain > 0 && resolution.stolenStat) {
        const senderData = await redis.hGetAll(senderKey);
        const curStat = num(senderData[resolution.stolenStat]);
        await redis.hSet(senderKey, {
          [resolution.stolenStat]: String(
            clampStat(curStat + resolution.senderGain)
          ),
        });
      }
    }
  }

  const [crates, checklistData] = await Promise.all([
    readDoorstep(userId),
    readChecklist(day, userId),
  ]);

  const outcome: CrateOpenOutcome = {
    crateId,
    kind,
    fromUsername,
    fromTrust,
    fromIsNpc: isNpc,
    resource: kind === 'real' ? resource : null,
    foodDelta: resolution.foodDelta,
    powerDelta: resolution.powerDelta,
    healthDelta: resolution.healthDelta,
    stolenStat: resolution.stolenStat,
    stolenAmount: resolution.stolenAmount,
    cured: resolution.cured,
    becameInfected: resolution.becameInfected,
    lawHealed: resolution.lawHealed,
    civilWarDouble: resolution.civilWarDouble,
  };

  return {
    ok: true,
    type: 'crate_open',
    outcome,
    bunker: toBunkerState({
      ...recipient,
      food: resolution.nextFood,
      power: resolution.nextPower,
      health: resolution.nextHealth,
      infected: resolution.nextInfected,
    }),
    checklist: checklistData.checklist,
    crates,
  };
};

export type BurnCrateResult =
  | ({ ok: true } & CrateBurnResponse)
  | CrateErr;

export const burnCrate = async (
  userId: string,
  username: string | undefined,
  day: number,
  crateId: string
): Promise<BurnCrateResult> => {
  const crateKey = keys.crate(crateId);
  const crate = await redis.hGetAll(crateKey);
  if (Object.keys(crate).length === 0 || crate['to'] !== userId) {
    return err(404, 'Crate not found on your doorstep');
  }
  if (crate['state'] !== 'waiting') {
    return err(409, 'This crate was already opened or burned');
  }

  const resolveLock = await redis.hSetNX(crateKey, 'resolveLock', '1');
  if (resolveLock !== 1) {
    return err(409, 'This crate was already opened or burned');
  }

  const recipient = await ensureBunker(userId, username, day);

  await Promise.all([
    redis.hSet(crateKey, { state: 'burned', burnedDay: String(day) }),
    redis.zRem(keys.doorstep(userId), [crateId]),
    recordDailyAction(day, userId),
  ]);

  const [crates, checklistData] = await Promise.all([
    readDoorstep(userId),
    readChecklist(day, userId),
  ]);

  return {
    ok: true,
    type: 'crate_burn',
    crateId,
    bunker: toBunkerState(recipient),
    checklist: checklistData.checklist,
    crates,
  };
};
