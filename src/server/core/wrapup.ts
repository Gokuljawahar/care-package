import { context, reddit, redis } from '@devvit/web/server';
import { isT3 } from '@devvit/web/shared';
import {
  CLAIMS,
  DISASTERS,
  GAME_NAME,
  isClaimId,
  isNpcId,
  LAWS,
  trustPercent,
  type DisasterId,
} from '../../shared/game';
import { keys } from './keys';
import { getDayLaw, getDayWarden } from './warden';

const num = (v: string | undefined): number => {
  if (v === undefined) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

export const usernamesFor = async (
  ids: string[]
): Promise<Map<string, string>> => {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const names = await redis.hMGet(keys.usernames(), chunk);
    chunk.forEach((id, j) => {
      const name = names[j];
      if (name) out.set(id, name);
    });
  }
  return out;
};

/**
 * Batch flair updates for active players on `day` (no commas in flair text).
 */
export const setSurvivorFlair = async (day: number): Promise<number> => {
  const activeRows = await redis.zRange(keys.dayActive(day), 0, -1, {
    by: 'rank',
  });
  const ids = activeRows.map((r) => r.member).filter((id) => !isNpcId(id));
  if (ids.length === 0) return 0;

  const [names, nextWardenId, playerHashes] = await Promise.all([
    usernamesFor(ids),
    getDayWarden(day + 1),
    Promise.all(ids.map((id) => redis.hGetAll(keys.player(id)))),
  ]);

  const flairs: { username: string; text: string }[] = [];
  ids.forEach((id, idx) => {
    const username = names.get(id);
    if (!username) return;
    const h = playerHashes[idx] ?? {};
    const infected = h['infected'] === '1';
    if (id === nextWardenId) {
      flairs.push({ username, text: `Warden · Day ${day + 1}` });
    } else if (infected) {
      flairs.push({ username, text: `Infected 🧟 · Day ${day}` });
    } else {
      flairs.push({ username, text: `Survivor · Day ${day}` });
    }
  });

  for (let i = 0; i < flairs.length; i += 100) {
    await reddit.setUserFlairBatch(
      context.subredditName,
      flairs.slice(i, i + 100)
    );
  }
  return flairs.length;
};

export type DramaSummary = {
  day: number;
  disaster: DisasterId;
  survivedCount: number;
  infectedCount: number;
  mostTrusted: string | null;
  biggestTraitor: string | null;
  bestLiar: string | null;
  nextDay: number;
  nextPostId: string;
  nextWardenText: string;
};

export const summaryMarkdown = (s: DramaSummary): string => {
  const meta = DISASTERS[s.disaster];
  const nextUrl = `https://www.reddit.com/r/${context.subredditName}/comments/${s.nextPostId.replace(/^t3_/, '')}/`;

  return [
    `**${GAME_NAME} #${s.day} is over.** Tonight's disaster was **${meta.name}** (${meta.summary})`,
    '',
    `- **Outcome:** ${s.survivedCount} survived · ${s.infectedCount} infected`,
    s.mostTrusted ? `- **Most trusted:** ${s.mostTrusted}` : '',
    s.biggestTraitor ? `- **Biggest traitor:** ${s.biggestTraitor}` : '',
    s.bestLiar ? `- **Best Radio liar:** ${s.bestLiar}` : '',
    `- **Day ${s.nextDay} Warden:** ${s.nextWardenText}`,
    '',
    `${GAME_NAME} #${s.nextDay} is live: [open your bunker](${nextUrl}).`,
  ]
    .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
    .join('\n');
};

/** Pinned-style daily drama summary comment on the closed day's post. */
export const postSummary = async (params: {
  day: number;
  postId: string | undefined;
  disaster: DisasterId;
  nextDay: number;
  nextPostId: string;
  nextWardenId: string | null;
}): Promise<boolean> => {
  if (!isT3(params.postId)) return false;

  const [stats, traitorsMap, liarsMap, lbTrustTop, activeRows, nextLaw] =
    await Promise.all([
      redis.hGetAll(keys.dayStats(params.day)),
      redis.hGetAll(keys.dayTraitors(params.day)),
      redis.hGetAll(keys.dayLiars(params.day)),
      redis.zRange(keys.lbTrust(), 0, 0, { by: 'rank', reverse: true }),
      redis.zRange(keys.dayActive(params.day), 0, -1, { by: 'rank' }),
      getDayLaw(params.nextDay),
    ]);

  const topTraitorEntry = Object.entries(traitorsMap).sort(
    (a, b) => num(b[1]) - num(a[1])
  )[0];

  const liarIds = Object.keys(liarsMap).filter((id) => !isNpcId(id));
  const activeRealIds = activeRows
    .map((r) => r.member)
    .filter((id) => !isNpcId(id));

  const lookupIds = new Set<string>(liarIds);
  if (params.nextWardenId) lookupIds.add(params.nextWardenId);
  if (topTraitorEntry) lookupIds.add(topTraitorEntry[0]);
  if (lbTrustTop[0]) lookupIds.add(lbTrustTop[0].member);
  for (const id of activeRealIds.slice(0, 50)) lookupIds.add(id);

  const idsArr = [...lookupIds];
  const [names, playerHashes] = await Promise.all([
    usernamesFor(idsArr),
    Promise.all(idsArr.map((id) => redis.hGetAll(keys.player(id)))),
  ]);
  const playerMap = new Map<string, Record<string, string>>();
  idsArr.forEach((id, i) => {
    playerMap.set(id, playerHashes[i] ?? {});
  });

  const trustFor = (uid: string): number => {
    const h = playerMap.get(uid) ?? {};
    return trustPercent(num(h['trustGood']), num(h['trustTotal']));
  };

  let mostTrusted: string | null = null;
  if (lbTrustTop[0]) {
    const name = names.get(lbTrustTop[0].member);
    if (name) {
      mostTrusted = `u/${name} (${Math.round(lbTrustTop[0].score)}%)`;
    }
  } else if (activeRealIds.length > 0) {
    const best = [...activeRealIds]
      .map((id) => ({ id, trust: trustFor(id) }))
      .sort((a, b) => b.trust - a.trust)[0];
    if (best) {
      const name = names.get(best.id);
      if (name) mostTrusted = `u/${name} (${best.trust}%)`;
    }
  }

  let biggestTraitor: string | null = null;
  if (topTraitorEntry && num(topTraitorEntry[1]) > 0) {
    const tName = names.get(topTraitorEntry[0]);
    if (tName) {
      const count = num(topTraitorEntry[1]);
      biggestTraitor = `u/${tName} (${count} ${count === 1 ? 'Trojan' : 'Trojans'} opened)`;
    }
  }

  let bestLiar: string | null = null;
  if (liarIds.length > 0) {
    const topLiarId = [...liarIds].sort(
      (a, b) => trustFor(b) - trustFor(a)
    )[0];
    if (topLiarId) {
      const lName = names.get(topLiarId);
      const claim = liarsMap[topLiarId];
      if (lName && isClaimId(claim)) {
        bestLiar = `u/${lName} ("${CLAIMS[claim].text}")`;
      }
    }
  }

  const nextWardenName = params.nextWardenId
    ? names.get(params.nextWardenId)
    : undefined;
  const nextWardenText = nextWardenName
    ? `u/${nextWardenName} (${nextLaw ? `Law: ${LAWS[nextLaw].title}` : 'law pending until 12:00 UTC'})`
    : 'None elected';

  const comment = await reddit.submitComment({
    id: params.postId,
    text: summaryMarkdown({
      day: params.day,
      disaster: params.disaster,
      survivedCount: num(stats['survived']),
      infectedCount: num(stats['infected']),
      mostTrusted,
      biggestTraitor,
      bestLiar,
      nextDay: params.nextDay,
      nextPostId: params.nextPostId,
      nextWardenText,
    }),
  });
  try {
    await comment.distinguish(true);
  } catch {
    // Sticky needs mod permissions on the app account; the comment still stands.
  }
  return true;
};
