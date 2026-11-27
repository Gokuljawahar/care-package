import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isClaimTrue,
  trustPercent,
  type DisasterId,
  type LawId,
} from '../../shared/game.ts';
import {
  applyActiveNight,
  applyAwayCatchUp,
  electWarden,
  runMidnightPipeline,
  type MidnightBackend,
  type MidnightStep,
  type WardenCandidate,
} from '../../shared/night.ts';

void test('applyActiveNight computes upkeep, all 5 disasters, and 1x Health deficit damage', () => {
  // Blackout: -1 Food, -1 Power, -3 Power = -1 Food, -4 Power.
  const blackout = applyActiveNight({
    food: 6,
    power: 3,
    health: 10,
    infected: false,
    disaster: 'blackout',
  });
  assert.equal(blackout.nextFood, 5);
  assert.equal(blackout.nextPower, 0);
  assert.equal(blackout.powerMissing, 1);
  assert.equal(blackout.nextHealth, 9);

  // Zombie Outbreak: barricades hold when power after upkeep >= 3.
  const zombieHeld = applyActiveNight({
    food: 6,
    power: 4,
    health: 10,
    infected: false,
    disaster: 'zombie',
  });
  assert.equal(zombieHeld.barricadesHeld, true);
  assert.equal(zombieHeld.nextHealth, 10);

  const zombieHit = applyActiveNight({
    food: 6,
    power: 3,
    health: 10,
    infected: false,
    disaster: 'zombie',
  });
  assert.equal(zombieHit.barricadesHeld, false);
  assert.equal(zombieHit.nextHealth, 7);

  // Nuclear Winter: -4 Food, -2 Power total.
  const nuclear = applyActiveNight({
    food: 6,
    power: 6,
    health: 10,
    infected: false,
    disaster: 'nuclear',
  });
  assert.equal(nuclear.nextFood, 2);
  assert.equal(nuclear.nextPower, 4);
  assert.equal(nuclear.nextHealth, 10);

  // Civil War: -3 Food, -1 Power total.
  const cw = applyActiveNight({
    food: 6,
    power: 6,
    health: 10,
    infected: false,
    disaster: 'civil_war',
  });
  assert.equal(cw.nextFood, 3);
  assert.equal(cw.nextPower, 5);

  // AI Uprising: -1 Food, -3 Power total.
  const ai = applyActiveNight({
    food: 6,
    power: 6,
    health: 10,
    infected: false,
    disaster: 'ai_uprising',
  });
  assert.equal(ai.nextFood, 5);
  assert.equal(ai.nextPower, 3);
});

void test('applyAwayCatchUp caps missed nights at 3, floors Health at 1, and formats notice', () => {
  const away = applyAwayCatchUp({
    food: 2,
    power: 1,
    health: 3,
    infected: false,
    missedNights: 5,
  });
  assert.equal(away.cappedNights, 3);
  assert.equal(away.nextFood, 0);
  assert.equal(away.nextPower, 0);
  // Deficit: 1 food + 2 power = 3 damage, but absence never drops Health below 1.
  assert.equal(away.nextHealth, 1);
  assert.equal(away.summary, 'You were away 5 nights: −2 Food, −1 Power');
});

void test('electWarden filters Infected/NPCs/<3 actions and respects exact tie-breaks', () => {
  const candidates: readonly WardenCandidate[] = [
    {
      userId: 'npc_radio_guy',
      infected: false,
      actions: 5,
      trustGood: 10,
      trustTotal: 10,
      daysSurvived: 10,
      trustUpdatedAt: 1,
      joinedAt: 1,
    },
    {
      userId: 'infected_high',
      infected: true,
      actions: 4,
      trustGood: 9,
      trustTotal: 9,
      daysSurvived: 0,
      trustUpdatedAt: 1,
      joinedAt: 1,
    },
    {
      userId: 'too_few_actions',
      infected: false,
      actions: 2,
      trustGood: 5,
      trustTotal: 5,
      daysSurvived: 5,
      trustUpdatedAt: 1,
      joinedAt: 1,
    },
    // Tie on Trust % (2/3 -> (2+1)/(3+2)=60% vs 1/1? Wait: (1+1)/(1+2)=67%, (3+1)/(4+2)=67%).
    {
      userId: 'tie_less_events',
      infected: false,
      actions: 3,
      trustGood: 1,
      trustTotal: 1,
      daysSurvived: 5,
      trustUpdatedAt: 10,
      joinedAt: 10,
    },
    {
      userId: 'tie_later',
      infected: false,
      actions: 3,
      trustGood: 3,
      trustTotal: 4,
      daysSurvived: 2,
      trustUpdatedAt: 200,
      joinedAt: 200,
    },
    {
      userId: 'tie_earlier_winner',
      infected: false,
      actions: 3,
      trustGood: 3,
      trustTotal: 4,
      daysSurvived: 2,
      trustUpdatedAt: 100,
      joinedAt: 100,
    },
  ];

  const winner = electWarden(candidates);
  assert.equal(winner?.userId, 'tie_earlier_winner');
});

type SimPlayer = {
  food: number;
  power: number;
  health: number;
  infected: boolean;
  lastNightApplied: number;
  infectionCheckedDay: number;
  trustScoredDay: number;
  daysSurvived: number;
  bestSurvival: number;
  trustGood: number;
  trustTotal: number;
  trustUpdatedAt: number;
  joinedAt: number;
};

type SimState = {
  frozen: boolean;
  closed: boolean;
  steps: Set<MidnightStep>;
  disaster: DisasterId;
  players: Record<string, SimPlayer>;
  actions: Record<string, number>;
  broadcasts: Record<string, 'tonight_blackout' | 'tonight_zombie'>;
  crates: Record<string, { day: number; state: 'waiting' | 'burned' }>;
  nextWarden: string | null;
  nextLaws: readonly [LawId, LawId, LawId] | null;
  openedPostId: string | null;
};

const createInitialSim = (): SimState => ({
  frozen: false,
  closed: false,
  steps: new Set<MidnightStep>(),
  disaster: 'blackout',
  players: {
    u1: {
      food: 6,
      power: 6,
      health: 10,
      infected: false,
      lastNightApplied: 0,
      infectionCheckedDay: 0,
      trustScoredDay: 0,
      daysSurvived: 0,
      bestSurvival: 0,
      trustGood: 1,
      trustTotal: 1,
      trustUpdatedAt: 10,
      joinedAt: 1,
    },
    u2: {
      food: 5,
      power: 2,
      health: 2,
      infected: false,
      lastNightApplied: 0,
      infectionCheckedDay: 0,
      trustScoredDay: 0,
      daysSurvived: 1,
      bestSurvival: 1,
      trustGood: 0,
      trustTotal: 0,
      trustUpdatedAt: 20,
      joinedAt: 2,
    },
    u3: {
      food: 6,
      power: 5,
      health: 10,
      infected: false,
      lastNightApplied: 0,
      infectionCheckedDay: 0,
      trustScoredDay: 0,
      daysSurvived: 0,
      bestSurvival: 0,
      trustGood: 0,
      trustTotal: 0,
      trustUpdatedAt: 30,
      joinedAt: 3,
    },
  },
  actions: { u1: 3, u2: 3, u3: 2 },
  broadcasts: { u1: 'tonight_blackout', u2: 'tonight_zombie' },
  crates: {
    c_old: { day: 0, state: 'waiting' },
    c_today: { day: 1, state: 'waiting' },
  },
  nextWarden: null,
  nextLaws: null,
  openedPostId: null,
});

const makeSimBackend = (
  sim: SimState,
  failOpts?: {
    crashOnUpkeepCall?: number;
    crashOnBroadcastCall?: number;
  }
): MidnightBackend => {
  let upkeepCalls = 0;
  let broadcastCalls = 0;

  return {
    isStepDone: async (_day, step) => sim.steps.has(step),
    markStepDone: async (_day, step) => {
      sim.steps.add(step);
    },
    freezeDay: async () => {
      sim.frozen = true;
    },
    getDisaster: async () => sim.disaster,
    listExpiredCrates: async (day) =>
      Object.entries(sim.crates)
        .filter(([, c]) => c.state === 'waiting' && c.day <= day - 1)
        .map(([id]) => id),
    burnCrateExpired: async (_day, crateId) => {
      const crate = sim.crates[crateId];
      if (!crate || crate.state !== 'waiting') return false;
      crate.state = 'burned';
      return true;
    },
    listActivePlayers: async () => Object.keys(sim.actions),
    applyPlayerNightUpkeep: async (day, uid, disaster) => {
      upkeepCalls += 1;
      if (failOpts?.crashOnUpkeepCall === upkeepCalls) {
        throw new Error('Simulated crash during night_upkeep');
      }
      const p = sim.players[uid];
      if (!p || p.lastNightApplied >= day) return false;
      const out = applyActiveNight({
        food: p.food,
        power: p.power,
        health: p.health,
        infected: p.infected,
        disaster,
      });
      p.food = out.nextFood;
      p.power = out.nextPower;
      p.health = out.nextHealth;
      p.lastNightApplied = day;
      return true;
    },
    applyPlayerInfection: async (day, uid) => {
      const p = sim.players[uid];
      if (!p || p.infectionCheckedDay >= day) return 'skipped';
      p.infected = p.infected || p.health === 0;
      p.daysSurvived = p.infected ? 0 : p.daysSurvived + 1;
      p.bestSurvival = Math.max(p.bestSurvival, p.daysSurvived);
      p.infectionCheckedDay = day;
      return p.infected ? 'infected' : 'survived';
    },
    listBroadcasts: async () => Object.keys(sim.broadcasts),
    scorePlayerBroadcast: async (day, uid, disaster) => {
      broadcastCalls += 1;
      if (failOpts?.crashOnBroadcastCall === broadcastCalls) {
        throw new Error('Simulated crash during score_broadcasts');
      }
      const p = sim.players[uid];
      const claim = sim.broadcasts[uid];
      if (!p || !claim || p.trustScoredDay >= day) return false;
      const truth = isClaimTrue(claim, disaster);
      p.trustGood += truth ? 1 : 0;
      p.trustTotal += 1;
      p.trustScoredDay = day;
      return true;
    },
    loadWardenCandidates: async () =>
      Object.entries(sim.players).map(([uid, p]) => ({
        userId: uid,
        infected: p.infected,
        actions: sim.actions[uid] ?? 0,
        trustGood: p.trustGood,
        trustTotal: p.trustTotal,
        daysSurvived: p.daysSurvived,
        trustUpdatedAt: p.trustUpdatedAt,
        joinedAt: p.joinedAt,
      })),
    saveNextWardenAndLaws: async (_nextDay, wardenId, laws) => {
      sim.nextWarden = wardenId;
      sim.nextLaws = laws;
    },
    openNextDay: async (nextDay) => {
      if (!sim.openedPostId) sim.openedPostId = `t3_day_${nextDay}`;
      return { day: nextDay, postId: sim.openedPostId };
    },
    markDayClosed: async () => {
      sim.closed = true;
    },
    runFlair: async () => 3,
    runSummary: async () => true,
  };
};

void test('runMidnightPipeline resumes cleanly after mid-step crashes and matches clean run', async () => {
  const fixedRng = () => 0.25;
  const cleanSim = createInitialSim();
  await runMidnightPipeline(1, makeSimBackend(cleanSim), fixedRng);

  const crashedSim = createInitialSim();
  // Crash halfway through night_upkeep (after 1st player).
  await assert.rejects(
    runMidnightPipeline(
      1,
      makeSimBackend(crashedSim, { crashOnUpkeepCall: 2 }),
      fixedRng
    )
  );
  assert.equal(crashedSim.steps.has('burn_crates'), true);
  assert.equal(crashedSim.steps.has('night_upkeep'), false);

  // Resume, then crash halfway through score_broadcasts (after 1st broadcaster).
  await assert.rejects(
    runMidnightPipeline(
      1,
      makeSimBackend(crashedSim, { crashOnBroadcastCall: 2 }),
      fixedRng
    )
  );
  assert.equal(crashedSim.steps.has('night_upkeep'), true);
  assert.equal(crashedSim.steps.has('infection'), true);
  assert.equal(crashedSim.steps.has('score_broadcasts'), false);

  // Final resume finishes cleanly.
  await runMidnightPipeline(1, makeSimBackend(crashedSim), fixedRng);
  // Running again is a complete no-op.
  await runMidnightPipeline(1, makeSimBackend(crashedSim), fixedRng);

  assert.deepEqual(crashedSim, cleanSim);
  // u2 had power 2, blackout dealt -4 power -> 2 missing -> -2 health -> 0 -> infected!
  assert.equal(cleanSim.players['u2']?.infected, true);
  assert.equal(cleanSim.players['u1']?.daysSurvived, 1);
  // u1 broadcast true claim, u1 is elected Warden (u2 is infected, u3 had only 2 actions).
  assert.equal(cleanSim.nextWarden, 'u1');
  assert.equal(trustPercent(cleanSim.players['u1']!.trustGood, cleanSim.players['u1']!.trustTotal), 75);
});
