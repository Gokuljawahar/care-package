import test from 'node:test';
import assert from 'node:assert/strict';
import { canOverwriteFlair } from '../../shared/game.ts';

void test('canOverwriteFlair allows empty flair and Care Package prefixes only', () => {
  assert.equal(canOverwriteFlair(undefined), true);
  assert.equal(canOverwriteFlair(''), true);
  assert.equal(canOverwriteFlair('   '), true);
  assert.equal(canOverwriteFlair('Survivor · Day 3'), true);
  assert.equal(canOverwriteFlair('Infected 🧟 · Day 2'), true);
  assert.equal(canOverwriteFlair('Warden · Day 4'), true);

  assert.equal(canOverwriteFlair('Subreddit Mod'), false);
  assert.equal(canOverwriteFlair('OG Member'), false);
  assert.equal(canOverwriteFlair('Founder'), false);
});
