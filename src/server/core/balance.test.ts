import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAIM_IDS,
  clampStat,
  DISASTER_IDS,
  isClaimTrue,
  MAX_CRATES_PER_DAY,
  REAL_CRATE_COST,
  resolveCrateOpen,
  rollScavenge,
  scanCostFor,
  seedFromString,
  START_FOOD,
  START_HEALTH,
  START_POWER,
  START_SCRAP,
  trojanCostFor,
  trustPercent,
  type ClaimId,
  type CrateKind,
  type CrateResource,
  type DisasterId,
  type LawId,
} from '../../shared/game.ts';
import {
  applyActiveNight,
  electWarden,
  pickLawOptions,
  type WardenCandidate,
} from '../../shared/night.ts';

type Strategy = 'cooperator' | 'opportunist' | 'traitor';

type SimAgent = {
  id: string;
  strategy: Strategy;
  food: number;
  power: number;
  health: number;
  scrap: number;
  infected: boolean;
  daysSurvived: number;
  trustGood: number;
  trustTotal: number;
  trustUpdatedAt: number;
  joinedAt: number;
  lastSentTo: Map<string, number>;
};

type SimCrate = {
  fromId: string;
  fromTrust: number;
  kind: CrateKind;
  resource: CrateResource;
};

void test('30-day balance simulation across 30 active players hits healthy survival, infection, and Trust separation', () => {
  const rng = seedFromString('care-package-balance-30d');
  const agents: SimAgent[] = [];

  for (let i = 0; i < 30; i++) {
    const strategy: Strategy =
      i < 18 ? 'cooperator' : i < 25 ? 'opportunist' : 'traitor';
    agents.push({
      id: `p_${i}`,
      strategy,
      food: START_FOOD,
      power: START_POWER,
      health: START_HEALTH,
      scrap: START_SCRAP,
      infected: false,
      daysSurvived: 0,
      trustGood: 0,
      trustTotal: 0,
      trustUpdatedAt: i,
      joinedAt: i,
      lastSentTo: new Map(),
    });
  }

  let yesterdayDisaster: DisasterId | undefined;
  let wardenId: string | null = null;
  let law: LawId | undefined;

  let steadyDays = 0;
  let coopSurvivedSum = 0;
  let coopTotalSum = 0;
  let overallInfectedSum = 0;
  let overallTotalSum = 0;
  let coopWardenWins = 0;
  let oppWardenWins = 0;
  let traitorWardenWins = 0;

  for (let day = 1; day <= 30; day++) {
    const disasterPool = DISASTER_IDS.filter((d) => d !== yesterdayDisaster);
    const disaster =
      disasterPool[Math.floor(rng() * disasterPool.length)] ?? 'blackout';
    yesterdayDisaster = disaster;

    if (wardenId) {
      const opts = pickLawOptions(rng);
      law = opts[Math.floor(rng() * opts.length)];
    } else {
      law = undefined;
    }

    const trueClaims = CLAIM_IDS.filter((c) => isClaimTrue(c, disaster));
    const falseClaims = CLAIM_IDS.filter((c) => !isClaimTrue(c, disaster));

    const actionsCount = new Map<string, number>();
    const bumpAction = (id: string) => {
      actionsCount.set(id, (actionsCount.get(id) ?? 0) + 1);
    };

    // 1. Scavenge
    for (const a of agents) {
      const site =
        a.health <= 4 || a.strategy === 'cooperator'
          ? a.health >= 7 && (a.food < 4 || a.power < 4)
            ? 'mall'
            : 'pharmacy'
          : a.health >= 6
            ? 'military'
            : 'mall';
      const rolled = rollScavenge(site, law, rng);
      a.food = clampStat(a.food + rolled.foodDelta);
      a.power = clampStat(a.power + rolled.powerDelta);
      const effectiveHealthDelta =
        a.infected && rolled.healthDelta > 0 ? 0 : rolled.healthDelta;
      a.health = clampStat(a.health + effectiveHealthDelta);
      a.scrap = Math.max(0, a.scrap + rolled.scrapDelta);
      if (a.health === 0) a.infected = true;
      bumpAction(a.id);
    }

    // 2. Send crates (respecting 3/day cap and no-two-days-in-a-row)
    const doorstep = new Map<string, SimCrate[]>();
    const dayCounts = new Map<string, number>();

    for (const sender of agents) {
      const senderTrust = trustPercent(sender.trustGood, sender.trustTotal);
      let kind: CrateKind;
      if (sender.infected) {
        kind = 'trojan';
      } else if (sender.strategy === 'traitor') {
        kind =
          sender.scrap >= trojanCostFor(false, law) ? 'trojan' : 'real';
      } else if (sender.strategy === 'opportunist') {
        kind =
          rng() < 0.4 && sender.scrap >= trojanCostFor(false, law)
            ? 'trojan'
            : 'real';
      } else {
        kind = 'real';
      }

      const resource: CrateResource =
        sender.food >= sender.power ? 'food' : 'power';
      if (kind === 'real') {
        const stock = resource === 'food' ? sender.food : sender.power;
        if (stock < REAL_CRATE_COST) continue;
      } else {
        const cost = trojanCostFor(sender.infected, law);
        if (sender.scrap < cost) continue;
      }

      const eligible = agents.filter((target) => {
        if (target.id === sender.id) return false;
        if ((sender.lastSentTo.get(target.id) ?? 0) >= day - 1) return false;
        if ((dayCounts.get(target.id) ?? 0) >= MAX_CRATES_PER_DAY) return false;
        return true;
      });
      if (eligible.length === 0) continue;

      // Cooperators try to cure infected allies when sending real crates.
      const infectedTargets =
        kind === 'real' ? eligible.filter((t) => t.infected) : [];
      const pickPool = infectedTargets.length > 0 ? infectedTargets : eligible;
      const recipient = pickPool[Math.floor(rng() * pickPool.length)];
      if (!recipient) continue;

      if (kind === 'real') {
        if (resource === 'food') sender.food = clampStat(sender.food - REAL_CRATE_COST);
        else sender.power = clampStat(sender.power - REAL_CRATE_COST);
      } else {
        sender.scrap = Math.max(
          0,
          sender.scrap - trojanCostFor(sender.infected, law)
        );
      }

      sender.lastSentTo.set(recipient.id, day);
      dayCounts.set(recipient.id, (dayCounts.get(recipient.id) ?? 0) + 1);
      const list = doorstep.get(recipient.id) ?? [];
      list.push({
        fromId: sender.id,
        fromTrust: senderTrust,
        kind,
        resource,
      });
      doorstep.set(recipient.id, list);
      bumpAction(sender.id);
    }

    // 3. Doorstep open / scan / burn
    const agentById = new Map(agents.map((a) => [a.id, a]));
    for (const recipient of agents) {
      const crates = doorstep.get(recipient.id) ?? [];
      for (const crate of crates) {
        let shouldBurn = false;
        const sCost = scanCostFor(law);
        if (
          recipient.strategy === 'cooperator' &&
          crate.fromTrust < 48 &&
          recipient.power >= sCost
        ) {
          recipient.power = clampStat(recipient.power - sCost);
          bumpAction(recipient.id);
          const jammed = disaster === 'ai_uprising' && rng() < 0.5;
          if (!jammed && crate.kind === 'trojan') {
            shouldBurn = true;
          } else if (jammed && crate.fromTrust < 40) {
            shouldBurn = true;
          }
        } else if (crate.fromTrust < 35 && recipient.strategy !== 'traitor') {
          shouldBurn = true;
        }

        if (shouldBurn) {
          bumpAction(recipient.id);
          continue;
        }

        const res = resolveCrateOpen({
          kind: crate.kind,
          resource: crate.resource,
          recipient: {
            food: recipient.food,
            power: recipient.power,
            health: recipient.health,
            infected: recipient.infected,
          },
          disaster,
          law,
        });
        recipient.food = res.nextFood;
        recipient.power = res.nextPower;
        recipient.health = res.nextHealth;
        recipient.infected = res.nextInfected;
        bumpAction(recipient.id);

        const sender = agentById.get(crate.fromId);
        if (sender) {
          sender.trustGood += res.senderTrustGoodDelta;
          sender.trustTotal += res.senderTrustTotalDelta;
          sender.trustUpdatedAt = day * 100;
          if (crate.kind === 'trojan' && res.senderGain > 0) {
            if (res.stolenStat === 'food') {
              sender.food = clampStat(sender.food + res.senderGain);
            } else if (res.stolenStat === 'power') {
              sender.power = clampStat(sender.power + res.senderGain);
            }
          }
        }
      }
    }

    // 4. Radio broadcasts
    const broadcasts = new Map<string, ClaimId>();
    for (const a of agents) {
      const truthProb =
        a.strategy === 'cooperator'
          ? 0.8
          : a.strategy === 'opportunist'
            ? 0.65
            : 0.25;
      const pool = rng() < truthProb ? trueClaims : falseClaims;
      const pick = pool[Math.floor(rng() * pool.length)] ?? trueClaims[0]!;
      broadcasts.set(a.id, pick);
      bumpAction(a.id);
    }

    // 5. Midnight: upkeep + disaster + infection + broadcast scoring + Warden
    for (const a of agents) {
      const night = applyActiveNight({
        food: a.food,
        power: a.power,
        health: a.health,
        infected: a.infected,
        disaster,
      });
      a.food = night.nextFood;
      a.power = night.nextPower;
      a.health = night.nextHealth;
      a.infected = a.infected || a.health === 0;
      a.daysSurvived = a.infected ? 0 : a.daysSurvived + 1;

      const claim = broadcasts.get(a.id);
      if (claim) {
        a.trustGood += isClaimTrue(claim, disaster) ? 1 : 0;
        a.trustTotal += 1;
        a.trustUpdatedAt = day * 100 + 50;
      }
    }

    const candidates: WardenCandidate[] = agents.map((a) => ({
      userId: a.id,
      infected: a.infected,
      actions: actionsCount.get(a.id) ?? 0,
      trustGood: a.trustGood,
      trustTotal: a.trustTotal,
      daysSurvived: a.daysSurvived,
      trustUpdatedAt: a.trustUpdatedAt,
      joinedAt: a.joinedAt,
    }));
    const winner = electWarden(candidates);
    wardenId = winner ? winner.userId : null;
    if (wardenId) {
      const wAgent = agentById.get(wardenId);
      if (wAgent?.strategy === 'cooperator') coopWardenWins += 1;
      else if (wAgent?.strategy === 'opportunist') oppWardenWins += 1;
      else if (wAgent?.strategy === 'traitor') traitorWardenWins += 1;
    }

    if (day >= 5) {
      steadyDays += 1;
      const coops = agents.filter((a) => a.strategy === 'cooperator');
      coopSurvivedSum += coops.filter((a) => !a.infected).length;
      coopTotalSum += coops.length;
      overallInfectedSum += agents.filter((a) => a.infected).length;
      overallTotalSum += agents.length;
    }
  }

  const coopSurvivalPct = Math.round((coopSurvivedSum / coopTotalSum) * 100);
  const dailyInfectedPct = Math.round(
    (overallInfectedSum / overallTotalSum) * 100
  );

  const avgTrust = (s: Strategy): number => {
    const group = agents.filter((a) => a.strategy === s);
    return Math.round(
      group.reduce(
        (sum, a) => sum + trustPercent(a.trustGood, a.trustTotal),
        0
      ) / group.length
    );
  };

  const coopTrust = avgTrust('cooperator');
  const oppTrust = avgTrust('opportunist');
  const traitorTrust = avgTrust('traitor');

  console.log(
    `[30d sim] days=${steadyDays} coopSurvival=${coopSurvivalPct}% dailyInfected=${dailyInfectedPct}% trust(coop/opp/traitor)=${coopTrust}%/${oppTrust}%/${traitorTrust}% warden(coop/opp/traitor)=${coopWardenWins}/${oppWardenWins}/${traitorWardenWins}`
  );

  assert.equal(coopSurvivalPct >= 65, true);
  assert.equal(dailyInfectedPct >= 5 && dailyInfectedPct <= 40, true);
  assert.equal(coopTrust > oppTrust, true);
  assert.equal(oppTrust > traitorTrust, true);
  assert.equal(coopWardenWins >= oppWardenWins, true);
  assert.equal(traitorWardenWins, 0);
});
