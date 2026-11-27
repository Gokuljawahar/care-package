import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampStat,
  isClaimTrue,
  rollScavenge,
  trustPercent,
} from '../../shared/game.ts';

const seqRng = (values: readonly number[]): (() => number) => {
  let i = 0;
  return () => {
    const v = values[i] ?? 0.5;
    i += 1;
    return v;
  };
};

void test('pharmacy grants +2 Food or +2 Power with no scrap or injury', () => {
  const foodRun = rollScavenge('pharmacy', undefined, seqRng([0.1, 0.2]));
  assert.equal(foodRun.foodDelta, 2);
  assert.equal(foodRun.powerDelta, 0);
  assert.equal(foodRun.scrapDelta, 0);
  assert.equal(foodRun.healthDelta, 0);
  assert.equal(foodRun.lawBonus, false);

  const powerRun = rollScavenge('pharmacy', undefined, seqRng([0.9, 0.2]));
  assert.equal(powerRun.foodDelta, 0);
  assert.equal(powerRun.powerDelta, 2);
  assert.equal(powerRun.scrapDelta, 0);
  assert.equal(powerRun.healthDelta, 0);
});

void test('mall splits +3 supplies, +1 scrap, and hurts 20% of the time', () => {
  const hurtRun = rollScavenge('mall', undefined, seqRng([0.5, 0.19, 0.1, 0.2]));
  assert.equal(hurtRun.foodDelta + hurtRun.powerDelta, 3);
  assert.equal(hurtRun.scrapDelta, 1);
  assert.equal(hurtRun.healthDelta, -2);

  const safeRun = rollScavenge('mall', undefined, seqRng([0.5, 0.2, 0.1, 0.2]));
  assert.equal(safeRun.foodDelta + safeRun.powerDelta, 3);
  assert.equal(safeRun.scrapDelta, 1);
  assert.equal(safeRun.healthDelta, 0);
});

void test('military splits +5 supplies, +2 scrap, and hurts 45% of the time', () => {
  const hurtRun = rollScavenge(
    'military',
    undefined,
    seqRng([0.3, 0.44, 0.1, 0.2, 0.3])
  );
  assert.equal(hurtRun.foodDelta + hurtRun.powerDelta, 5);
  assert.equal(hurtRun.scrapDelta, 2);
  assert.equal(hurtRun.healthDelta, -4);

  const safeRun = rollScavenge(
    'military',
    undefined,
    seqRng([0.3, 0.45, 0.1, 0.2, 0.3])
  );
  assert.equal(safeRun.foodDelta + safeRun.powerDelta, 5);
  assert.equal(safeRun.scrapDelta, 2);
  assert.equal(safeRun.healthDelta, 0);
});

void test('scavenge_plus_one law adds +1 total supply', () => {
  const boosted = rollScavenge(
    'pharmacy',
    'scavenge_plus_one',
    seqRng([0.1, 0.2])
  );
  assert.equal(boosted.foodDelta + boosted.powerDelta, 3);
  assert.equal(boosted.lawBonus, true);
});

void test('trustPercent, clampStat, and isClaimTrue follow core rules', () => {
  assert.equal(trustPercent(0, 0), 50);
  assert.equal(clampStat(-5), 0);
  assert.equal(clampStat(14), 10);
  assert.equal(isClaimTrue('tonight_blackout', 'blackout'), true);
  assert.equal(isClaimTrue('not_blackout', 'blackout'), false);
  assert.equal(isClaimTrue('barricade_health', 'zombie'), true);
  assert.equal(isClaimTrue('stock_food', 'nuclear'), true);
});
