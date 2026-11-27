import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isRandomDeliveryAllowed,
  resolveCrateOpen,
  rollScavenge,
  samplePlayerBroadcasts,
  scanCostFor,
  trojanCostFor,
  type PlayerBroadcastCandidate,
} from '../../shared/game.ts';

void test('Law 1 (free_scans): scans cost 0 Power instead of 1', () => {
  assert.equal(scanCostFor(undefined), 1);
  assert.equal(scanCostFor('free_scans'), 0);
});

void test('Law 2 (double_trojan_cost): Trojans cost 4 Scrap for survivors, 0 for Infected', () => {
  assert.equal(trojanCostFor(false, undefined), 2);
  assert.equal(trojanCostFor(false, 'double_trojan_cost'), 4);
  assert.equal(trojanCostFor(true, 'double_trojan_cost'), 0);
});

void test('Law 3 (friends_only): random deliveries are disallowed when active', () => {
  assert.equal(isRandomDeliveryAllowed(undefined), true);
  assert.equal(isRandomDeliveryAllowed('friends_only'), false);
});

void test('Law 4 (scavenge_plus_one): scavenging yields +1 extra supply', () => {
  const normal = rollScavenge('pharmacy', undefined, () => 0.1);
  const surged = rollScavenge('pharmacy', 'scavenge_plus_one', () => 0.1);
  assert.equal(normal.foodDelta + normal.powerDelta, 2);
  assert.equal(surged.foodDelta + surged.powerDelta, 3);
  assert.equal(surged.lawBonus, true);
});

void test('Law 5 (hide_low_trust): hides <50% Trust broadcasts including Infected', () => {
  const candidates: readonly PlayerBroadcastCandidate[] = [
    {
      userId: 'u_trusted',
      username: 'trusted',
      trust: 75,
      infected: false,
      claimId: 'stock_power',
    },
    {
      userId: 'u_infected_low',
      username: 'infected_low',
      trust: 33,
      infected: true,
      claimId: 'tonight_zombie',
    },
  ];
  const filtered = samplePlayerBroadcasts({
    day: 2,
    viewerId: 'viewer_1',
    law: 'hide_low_trust',
    candidates,
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.userId, 'u_trusted');
});

void test('Law 6 (real_crate_heals): opening a real crate heals +1 Health for survivors', () => {
  const res = resolveCrateOpen({
    kind: 'real',
    resource: 'food',
    recipient: { food: 4, power: 4, health: 6, infected: false },
    disaster: 'blackout',
    law: 'real_crate_heals',
  });
  assert.equal(res.nextFood, 7);
  assert.equal(res.nextHealth, 7);
  assert.equal(res.lawHealed, true);
});
