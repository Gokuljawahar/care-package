import {
  clampStat,
  isNpcId,
  LAW_IDS,
  trustPercent,
  WARDEN_MIN_ACTIONS,
  type DisasterId,
  type LawId,
} from './game.ts';

export type NightUpkeepInput = {
  food: number;
  power: number;
  health: number;
  infected: boolean;
  disaster: DisasterId;
};

export type NightUpkeepOutcome = {
  nextFood: number;
  nextPower: number;
  nextHealth: number;
  foodDelta: number;
  powerDelta: number;
  healthDelta: number;
  foodMissing: number;
  powerMissing: number;
  disasterHealthLoss: number;
  barricadesHeld: boolean;
};

/**
 * Applies daily upkeep (-1 Food, -1 Power) and tonight's disaster to an active player.
 * Every missing unit below 0 deals 2 Health damage.
 */
export const applyActiveNight = (
  input: NightUpkeepInput
): NightUpkeepOutcome => {
  const foodAfterUpkeep = input.food - 1;
  const powerAfterUpkeep = input.power - 1;

  let rawFood = foodAfterUpkeep;
  let rawPower = powerAfterUpkeep;
  let disasterHealthLoss = 0;
  let barricadesHeld = false;

  switch (input.disaster) {
    case 'blackout':
      rawPower -= 3;
      break;
    case 'zombie':
      if (Math.max(0, powerAfterUpkeep) >= 3) {
        barricadesHeld = true;
      } else {
        disasterHealthLoss = 3;
      }
      break;
    case 'nuclear':
      rawFood -= 3;
      rawPower -= 1;
      break;
    case 'civil_war':
      rawFood -= 2;
      break;
    case 'ai_uprising':
      rawPower -= 2;
      break;
  }

  const foodMissing = Math.max(0, -rawFood);
  const powerMissing = Math.max(0, -rawPower);
  const nextFood = clampStat(rawFood);
  const nextPower = clampStat(rawPower);
  const deficitDamage = (foodMissing + powerMissing) * 2;
  const nextHealth = clampStat(
    input.health - deficitDamage - disasterHealthLoss
  );

  return {
    nextFood,
    nextPower,
    nextHealth,
    foodDelta: nextFood - input.food,
    powerDelta: nextPower - input.power,
    healthDelta: nextHealth - input.health,
    foodMissing,
    powerMissing,
    disasterHealthLoss,
    barricadesHeld,
  };
};

export type AwayCatchUpInput = {
  food: number;
  power: number;
  health: number;
  infected: boolean;
  missedNights: number;
};

export type AwayCatchUpOutcome = {
  cappedNights: number;
  nextFood: number;
  nextPower: number;
  nextHealth: number;
  foodLost: number;
  powerLost: number;
  healthLost: number;
  summary: string;
};

/**
 * Lazy catch-up for players who skipped days:
 * - Upkeep only (-1 Food, -1 Power per missed night), capped at 3 nights total.
 * - Absence alone can never take Health below 1.
 */
export const applyAwayCatchUp = (
  input: AwayCatchUpInput
): AwayCatchUpOutcome => {
  const cappedNights = Math.min(3, Math.max(0, Math.trunc(input.missedNights)));
  const rawFood = input.food - cappedNights;
  const rawPower = input.power - cappedNights;
  const foodMissing = Math.max(0, -rawFood);
  const powerMissing = Math.max(0, -rawPower);

  const nextFood = clampStat(rawFood);
  const nextPower = clampStat(rawPower);
  const deficitDamage = (foodMissing + powerMissing) * 2;
  const nextHealth = input.infected
    ? input.health
    : Math.max(1, clampStat(input.health - deficitDamage));

  const foodLost = Math.max(0, input.food - nextFood);
  const powerLost = Math.max(0, input.power - nextPower);
  const healthLost = Math.max(0, input.health - nextHealth);

  const nightsLabel = input.missedNights === 1 ? 'night' : 'nights';
  const summary = `You were away ${input.missedNights} ${nightsLabel}: −${foodLost} Food, −${powerLost} Power`;

  return {
    cappedNights,
    nextFood,
    nextPower,
    nextHealth,
    foodLost,
    powerLost,
    healthLost,
    summary,
  };
};

export type WardenCandidate = {
  userId: string;
  infected: boolean;
  actions: number;
  trustGood: number;
  trustTotal: number;
  daysSurvived: number;
  trustUpdatedAt: number;
  joinedAt: number;
};

/**
 * Elects tomorrow's Warden from surviving non-NPC players with >= 3 actions today.
 * Tie-break: Trust % -> resolved Trust events -> daysSurvived -> earliest trustUpdatedAt.
 */
export const electWarden = (
  candidates: readonly WardenCandidate[]
): WardenCandidate | null => {
  const eligible = candidates.filter(
    (c) =>
      !c.infected && !isNpcId(c.userId) && c.actions >= WARDEN_MIN_ACTIONS
  );
  if (eligible.length === 0) return null;

  const sorted = [...eligible].sort((a, b) => {
    const trustDiff =
      trustPercent(b.trustGood, b.trustTotal) -
      trustPercent(a.trustGood, a.trustTotal);
    if (trustDiff !== 0) return trustDiff;
    if (b.trustTotal !== a.trustTotal) return b.trustTotal - a.trustTotal;
    if (b.daysSurvived !== a.daysSurvived)
      return b.daysSurvived - a.daysSurvived;
    if (a.trustUpdatedAt !== b.trustUpdatedAt)
      return a.trustUpdatedAt - b.trustUpdatedAt;
    if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
    return a.userId.localeCompare(b.userId);
  });

  return sorted[0] ?? null;
};

/** Picks 3 distinct random laws from the pool for the Warden. */
export const pickLawOptions = (
  rng: () => number = Math.random
): readonly [LawId, LawId, LawId] => {
  const pool = [...LAW_IDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = pool[i];
    const b = pool[j];
    if (a !== undefined && b !== undefined) {
      pool[i] = b;
      pool[j] = a;
    }
  }
  return [
    pool[0] ?? 'free_scans',
    pool[1] ?? 'double_trojan_cost',
    pool[2] ?? 'scavenge_plus_one',
  ];
};

export type MidnightStep =
  | 'burn_crates'
  | 'night_upkeep'
  | 'infection'
  | 'score_broadcasts'
  | 'elect_warden'
  | 'open_next'
  | 'flair'
  | 'summary';

export type OpenedDayInfo = { day: number; postId: string };

export type MidnightBackend = {
  isStepDone: (day: number, step: MidnightStep) => Promise<boolean>;
  markStepDone: (day: number, step: MidnightStep) => Promise<void>;
  freezeDay: (day: number) => Promise<void>;
  getDisaster: (day: number) => Promise<DisasterId>;
  listExpiredCrates: (day: number) => Promise<string[]>;
  burnCrateExpired: (day: number, crateId: string) => Promise<boolean>;
  listActivePlayers: (day: number) => Promise<string[]>;
  applyPlayerNightUpkeep: (
    day: number,
    userId: string,
    disaster: DisasterId
  ) => Promise<boolean>;
  applyPlayerInfection: (
    day: number,
    userId: string
  ) => Promise<'survived' | 'infected' | 'skipped'>;
  listBroadcasts: (day: number) => Promise<string[]>;
  scorePlayerBroadcast: (
    day: number,
    userId: string,
    disaster: DisasterId
  ) => Promise<boolean>;
  loadWardenCandidates: (day: number) => Promise<WardenCandidate[]>;
  saveNextWardenAndLaws: (
    nextDay: number,
    wardenId: string | null,
    laws: readonly [LawId, LawId, LawId] | null
  ) => Promise<void>;
  openNextDay: (nextDay: number) => Promise<OpenedDayInfo>;
  markDayClosed: (day: number) => Promise<void>;
  runFlair: (day: number) => Promise<number>;
  runSummary: (
    day: number,
    disaster: DisasterId,
    opened: OpenedDayInfo,
    nextWardenId: string | null
  ) => Promise<boolean>;
};

export type MidnightPipelineResult = {
  day: number;
  disaster: DisasterId;
  opened: OpenedDayInfo;
  wardenId: string | null;
  burnedCrates: number;
  activeProcessed: number;
  newlyInfected: number;
  broadcastsScored: number;
  flairs: number;
  commented: boolean;
};

const CHUNK_SIZE = 50;

const chunked = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

/**
 * Crash-resumable midnight pipeline.
 * Each step marks itself complete ONLY AFTER succeeding, and each per-player /
 * per-crate operation is individually idempotent.
 */
export const runMidnightPipeline = async (
  day: number,
  backend: MidnightBackend,
  rng: () => number = Math.random
): Promise<MidnightPipelineResult> => {
  await backend.freezeDay(day);
  const disaster = await backend.getDisaster(day);

  let burnedCrates = 0;
  if (!(await backend.isStepDone(day, 'burn_crates'))) {
    const expired = await backend.listExpiredCrates(day);
    for (const batch of chunked(expired, CHUNK_SIZE)) {
      const results = await Promise.all(
        batch.map((crateId) => backend.burnCrateExpired(day, crateId))
      );
      burnedCrates += results.filter(Boolean).length;
    }
    await backend.markStepDone(day, 'burn_crates');
  }

  let activeProcessed = 0;
  if (!(await backend.isStepDone(day, 'night_upkeep'))) {
    const active = await backend.listActivePlayers(day);
    for (const batch of chunked(active, CHUNK_SIZE)) {
      const results = await Promise.all(
        batch.map((uid) => backend.applyPlayerNightUpkeep(day, uid, disaster))
      );
      activeProcessed += results.filter(Boolean).length;
    }
    await backend.markStepDone(day, 'night_upkeep');
  }

  let newlyInfected = 0;
  if (!(await backend.isStepDone(day, 'infection'))) {
    const active = await backend.listActivePlayers(day);
    for (const batch of chunked(active, CHUNK_SIZE)) {
      const results = await Promise.all(
        batch.map((uid) => backend.applyPlayerInfection(day, uid))
      );
      newlyInfected += results.filter((r) => r === 'infected').length;
    }
    await backend.markStepDone(day, 'infection');
  }

  let broadcastsScored = 0;
  if (!(await backend.isStepDone(day, 'score_broadcasts'))) {
    const broadcasters = await backend.listBroadcasts(day);
    for (const batch of chunked(broadcasters, CHUNK_SIZE)) {
      const results = await Promise.all(
        batch.map((uid) => backend.scorePlayerBroadcast(day, uid, disaster))
      );
      broadcastsScored += results.filter(Boolean).length;
    }
    await backend.markStepDone(day, 'score_broadcasts');
  }

  let wardenId: string | null;
  if (!(await backend.isStepDone(day, 'elect_warden'))) {
    const candidates = await backend.loadWardenCandidates(day);
    const winner = electWarden(candidates);
    wardenId = winner ? winner.userId : null;
    const laws = wardenId ? pickLawOptions(rng) : null;
    await backend.saveNextWardenAndLaws(day + 1, wardenId, laws);
    await backend.markStepDone(day, 'elect_warden');
  } else {
    const candidates = await backend.loadWardenCandidates(day);
    const winner = electWarden(candidates);
    wardenId = winner ? winner.userId : null;
  }

  const opened = await backend.openNextDay(day + 1);
  if (!(await backend.isStepDone(day, 'open_next'))) {
    await backend.markDayClosed(day);
    await backend.markStepDone(day, 'open_next');
  }

  let flairs = 0;
  if (!(await backend.isStepDone(day, 'flair'))) {
    try {
      flairs = await backend.runFlair(day);
      await backend.markStepDone(day, 'flair');
    } catch (error) {
      console.error(`Flair update for day ${day} failed`, error);
    }
  }

  let commented = false;
  if (!(await backend.isStepDone(day, 'summary'))) {
    try {
      commented = await backend.runSummary(day, disaster, opened, wardenId);
      if (commented) {
        await backend.markStepDone(day, 'summary');
      }
    } catch (error) {
      console.error(`Summary comment for day ${day} failed`, error);
    }
  }

  return {
    day,
    disaster,
    opened,
    wardenId,
    burnedCrates,
    activeProcessed,
    newlyInfected,
    broadcastsScored,
    flairs,
    commented,
  };
};
