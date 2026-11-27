import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppStateResponse } from '../../shared/api.ts';
import {
  CLAIM_IDS,
  DISASTER_IDS,
  DISASTERS,
  GAME_NAME,
  isClaimTrue,
  officialSignalForDay,
  samplePlayerBroadcasts,
  type ClaimId,
  type DisasterId,
  type PlayerBroadcastCandidate,
} from '../../shared/game.ts';

void test('claim truth mapping matches specification across all 13 claims and 5 disasters', () => {
  const expected: Record<ClaimId, readonly DisasterId[]> = {
    tonight_blackout: ['blackout'],
    tonight_zombie: ['zombie'],
    tonight_nuclear: ['nuclear'],
    tonight_civil_war: ['civil_war'],
    tonight_ai_uprising: ['ai_uprising'],
    not_blackout: ['zombie', 'nuclear', 'civil_war', 'ai_uprising'],
    not_zombie: ['blackout', 'nuclear', 'civil_war', 'ai_uprising'],
    not_nuclear: ['blackout', 'zombie', 'civil_war', 'ai_uprising'],
    not_civil_war: ['blackout', 'zombie', 'nuclear', 'ai_uprising'],
    not_ai_uprising: ['blackout', 'zombie', 'nuclear', 'civil_war'],
    stock_food: ['nuclear', 'civil_war'],
    stock_power: ['blackout', 'ai_uprising', 'zombie'],
    barricade_health: ['zombie'],
  };

  for (const claim of CLAIM_IDS) {
    for (const disaster of DISASTER_IDS) {
      assert.equal(
        isClaimTrue(claim, disaster),
        expected[claim].includes(disaster),
        `Mismatch for ${claim} on ${disaster}`
      );
    }
  }
});

void test('samplePlayerBroadcasts is stable per (day, viewerId), prefers high Trust with >=1 low Trust, and respects hide_low_trust over Infected', () => {
  const candidates: readonly PlayerBroadcastCandidate[] = [
    {
      userId: 'u1',
      username: 'trusted_one',
      trust: 88,
      infected: false,
      claimId: 'stock_power',
    },
    {
      userId: 'u2',
      username: 'trusted_two',
      trust: 76,
      infected: false,
      claimId: 'not_zombie',
    },
    {
      userId: 'u3',
      username: 'trusted_three',
      trust: 67,
      infected: false,
      claimId: 'stock_food',
    },
    {
      userId: 'u4',
      username: 'shady_low',
      trust: 25,
      infected: false,
      claimId: 'tonight_zombie',
    },
    {
      userId: 'u5',
      username: 'patient_zero',
      trust: 33,
      infected: true,
      claimId: 'tonight_blackout',
    },
  ];

  const first = samplePlayerBroadcasts({
    day: 4,
    viewerId: 'viewer_a',
    law: undefined,
    candidates,
  });
  const second = samplePlayerBroadcasts({
    day: 4,
    viewerId: 'viewer_a',
    law: undefined,
    candidates,
  });
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.equal(first.some((c) => c.userId === 'u5'), true);
  assert.equal(first.some((c) => c.trust < 50), true);

  // Under hide_low_trust, <50% Trust players (including Infected u5) are hidden.
  const filtered = samplePlayerBroadcasts({
    day: 4,
    viewerId: 'viewer_a',
    law: 'hide_low_trust',
    candidates,
  });
  assert.equal(filtered.some((c) => c.trust < 50), false);
  assert.equal(filtered.some((c) => c.userId === 'u5'), false);
  assert.equal(filtered.length, 3);
});

void test('/api/state serialized response never leaks tonight disaster id or name', () => {
  for (const disaster of DISASTER_IDS) {
    for (let day = 1; day <= 3; day++) {
      const hint = officialSignalForDay(day, disaster);
      const state: AppStateResponse = {
        type: 'state',
        gameName: GAME_NAME,
        day,
        closed: false,
        loggedIn: true,
        username: 'survivor_a',
        nextResetAt: 1700000000000,
        subredditName: 'thumbprint_daily_dev',
        todayPostUrl: null,
        warden: null,
        law: null,
        bunker: {
          food: 6,
          power: 6,
          health: 10,
          scrap: 2,
          infected: false,
          daysSurvived: 0,
          bestSurvival: 0,
          trust: 50,
          cures: 0,
        },
        checklist: {
          scavenged: false,
          doorstepWaiting: 2,
          sent: false,
          broadcast: false,
        },
        lastScavenge: null,
        crates: [
          {
            id: 'c1_npc_1',
            fromUsername: '[NPC] Old Radio Guy',
            fromTrust: 78,
            fromIsNpc: true,
            day,
            scanStatus: 'unscanned',
          },
        ],
        lastSent: null,
        radioFeed: [
          {
            id: `official_${day}`,
            senderName: 'OFFICIAL SIGNAL',
            senderTrust: null,
            isNpc: false,
            isOfficial: true,
            claimId: null,
            text: hint,
          },
        ],
        myBroadcast: null,
        isWarden: false,
        wardenLawOptions: [],
        awayNotice: null,
      };

      assert.equal('disaster' in state, false);
      const json = JSON.stringify(state).toLowerCase();
      assert.equal(json.includes(disaster), false);
      assert.equal(json.includes(DISASTERS[disaster].name.toLowerCase()), false);
    }
  }
});
