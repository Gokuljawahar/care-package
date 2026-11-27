import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isClaimId,
  isClaimTrue,
  isNpcId,
  NPCS,
  officialSignalForDay,
  pickDayOneNpcCrateSpecs,
  pickNpcBroadcastSpecs,
} from '../../shared/game.ts';

void test('all 5 NPCs are clearly labeled [NPC] and have npc_ ids', () => {
  assert.equal(NPCS.length, 5);
  for (const npc of NPCS) {
    assert.equal(npc.name.startsWith('[NPC] '), true);
    assert.equal(isNpcId(npc.id), true);
  }
});

void test('Day-1 NPC crates always provide 1 real and 1 Trojan from distinct NPCs', () => {
  const [first, second] = pickDayOneNpcCrateSpecs(() => 0.4);
  assert.equal(first.kind, 'real');
  assert.equal(second.kind, 'trojan');
  assert.notEqual(first.npc.id, second.npc.id);
  assert.equal(first.npc.name.startsWith('[NPC] '), true);
  assert.equal(second.npc.name.startsWith('[NPC] '), true);
});

void test('NPC broadcasts produce 1-2 valid claims and mostly true signals', () => {
  const day1 = pickNpcBroadcastSpecs(1, 'blackout', () => 0.1);
  assert.equal(day1.length, 2);
  assert.notEqual(day1[0]?.npcId, day1[1]?.npcId);
  for (const b of day1) {
    assert.equal(isClaimId(b.claimId), true);
    assert.equal(isClaimTrue(b.claimId, 'blackout'), true);
  }

  const single = pickNpcBroadcastSpecs(2, 'zombie', () => 0.1);
  assert.equal(single.length, 1);
  assert.equal(isClaimTrue(single[0]!.claimId, 'zombie'), true);

  assert.equal(officialSignalForDay(1, 'blackout').length > 0, true);
});
