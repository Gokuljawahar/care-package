import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCrateOpen,
  scanCostFor,
  trojanCostFor,
} from '../../shared/game.ts';

void test('real crate gives +3 to survivor and +1 health with real_crate_heals law', () => {
  const normal = resolveCrateOpen({
    kind: 'real',
    resource: 'food',
    recipient: { food: 6, power: 6, health: 8, infected: false },
    disaster: 'blackout',
    law: undefined,
  });
  assert.equal(normal.nextFood, 9);
  assert.equal(normal.foodDelta, 3);
  assert.equal(normal.nextHealth, 8);
  assert.equal(normal.senderTrustGoodDelta, 1);
  assert.equal(normal.senderTrustTotalDelta, 1);

  const healed = resolveCrateOpen({
    kind: 'real',
    resource: 'power',
    recipient: { food: 6, power: 6, health: 8, infected: false },
    disaster: 'blackout',
    law: 'real_crate_heals',
  });
  assert.equal(healed.nextPower, 9);
  assert.equal(healed.nextHealth, 9);
  assert.equal(healed.lawHealed, true);
});

void test('real crate cures infected player without +1 bonus and grants medic credit', () => {
  const cured = resolveCrateOpen({
    kind: 'real',
    resource: 'food',
    recipient: { food: 4, power: 2, health: 0, infected: true },
    disaster: 'zombie',
    law: undefined,
  });
  assert.equal(cured.nextFood, 6);
  assert.equal(cured.foodDelta, 2);
  assert.equal(cured.nextHealth, 5);
  assert.equal(cured.nextInfected, false);
  assert.equal(cured.cured, true);
  assert.equal(cured.senderTrustGoodDelta, 3);
  assert.equal(cured.senderTrustTotalDelta, 3);
  assert.equal(cured.senderCuresDelta, 1);
});

void test('trojan steals 3 of highest stat (never negative) and deals 2 health', () => {
  const normal = resolveCrateOpen({
    kind: 'trojan',
    resource: 'food',
    recipient: { food: 7, power: 4, health: 6, infected: false },
    disaster: 'blackout',
    law: undefined,
  });
  assert.equal(normal.stolenStat, 'food');
  assert.equal(normal.stolenAmount, 3);
  assert.equal(normal.senderGain, 1);
  assert.equal(normal.nextFood, 4);
  assert.equal(normal.nextHealth, 4);
  assert.equal(normal.senderTrustGoodDelta, 0);
  assert.equal(normal.senderTrustTotalDelta, 1);

  const clampedLow = resolveCrateOpen({
    kind: 'trojan',
    resource: 'food',
    recipient: { food: 1, power: 2, health: 2, infected: false },
    disaster: 'blackout',
    law: undefined,
  });
  assert.equal(clampedLow.stolenStat, 'power');
  assert.equal(clampedLow.stolenAmount, 2);
  assert.equal(clampedLow.nextPower, 0);
  assert.equal(clampedLow.senderGain, 1);
  assert.equal(clampedLow.nextHealth, 0);
  assert.equal(clampedLow.nextInfected, true);
  assert.equal(clampedLow.becameInfected, true);
});

void test('civil_war doubles trojan steal cap to 6', () => {
  const cw = resolveCrateOpen({
    kind: 'trojan',
    resource: 'food',
    recipient: { food: 8, power: 5, health: 10, infected: false },
    disaster: 'civil_war',
    law: undefined,
  });
  assert.equal(cw.stolenStat, 'food');
  assert.equal(cw.stolenAmount, 6);
  assert.equal(cw.senderGain, 3);
  assert.equal(cw.nextFood, 2);
  assert.equal(cw.civilWarDouble, true);
});

void test('law modifiers apply to scan and trojan costs', () => {
  assert.equal(scanCostFor(undefined), 1);
  assert.equal(scanCostFor('free_scans'), 0);
  assert.equal(trojanCostFor(false, undefined), 2);
  assert.equal(trojanCostFor(false, 'double_trojan_cost'), 4);
  assert.equal(trojanCostFor(true, 'double_trojan_cost'), 0);
});
