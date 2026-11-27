import { context, reddit, redis } from '@devvit/web/server';
import { isT3 } from '@devvit/web/shared';
import { GRID, hottest, totalTaps } from '../../shared/game';
import type { DayFinal, Opened } from './day';
import { keys } from './keys';
import { readUser } from './user';

const where = (cx: number, cy: number): string => {
  const third = GRID / 3;
  const col = cx < third ? 'left' : cx < third * 2 ? 'centre' : 'right';
  const row = cy < third ? 'top' : cy < third * 2 ? 'middle' : 'bottom';
  if (row === 'middle' && col === 'centre') return 'dead centre';
  if (row === 'middle') return `${col} side`;
  if (col === 'centre') return `${row} centre`;
  return `${row} ${col}`;
};

const usernamesFor = async (ids: string[]): Promise<Map<string, string>> => {
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

/** "Thumbprint · 7-day streak" for everyone who finished the closed day. */
export const setStreakFlair = async (final: DayFinal): Promise<number> => {
  const ids = [...final.npc.keys()];
  if (ids.length === 0) return 0;
  const names = await usernamesFor(ids);
  const flairs: { username: string; text: string }[] = [];
  for (const id of ids) {
    const username = names.get(id);
    if (!username) continue;
    const { streak } = await readUser(id);
    if (streak > 0) flairs.push({ username, text: `Thumbprint · ${streak}-day streak` });
  }
  for (let i = 0; i < flairs.length; i += 100) {
    await reddit.setUserFlairBatch(context.subredditName, flairs.slice(i, i + 100));
  }
  return flairs.length;
};

export const summaryMarkdown = (final: DayFinal, names: Map<string, string>, next: Opened): string => {
  const scores = [...final.npc.values()];
  const players = scores.length;
  const avg = players ? Math.round(scores.reduce((a, b) => a + b, 0) / players) : 0;

  const rows = final.prompts.map((p) => {
    const grid = final.grids[p.id] ?? {};
    const total = totalTaps(grid);
    if (total === 0) return `| ${p.title} | no taps | - |`;
    const spot = hottest(grid);
    return `| ${p.title} | ${where(spot.cx, spot.cy)} | ${Math.round((spot.count / total) * 100)}% of ${total} taps |`;
  });

  const top = [...final.npc].sort((a, b) => b[1] - a[1])[0];
  const topName = top ? names.get(top[0]) : undefined;
  const nextUrl = `https://www.reddit.com/r/${context.subredditName}/comments/${next.postId.replace(/^t3_/, '')}/`;

  return [
    `**Thumbprint #${final.day} is closed.** ${players} ${players === 1 ? 'player' : 'players'} finished, average NPC score ${avg}%.`,
    '',
    '| Prompt | Where the crowd went | Hotspot |',
    '|---|---|---|',
    ...rows,
    '',
    top && topName ? `Most NPC: u/${topName} (${top[1]}%).` : '',
    '',
    `Thumbprint #${next.day} is up: [play it here](${nextUrl}).`,
  ]
    .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
    .join('\n');
};

/** Pinned-style summary comment on the closed day's post. */
export const postSummary = async (final: DayFinal, next: Opened): Promise<void> => {
  const postId = final.postId;
  if (!isT3(postId)) return;
  const top = [...final.npc].sort((a, b) => b[1] - a[1])[0];
  const names = await usernamesFor(top ? [top[0]] : []);
  const comment = await reddit.submitComment({
    id: postId,
    text: summaryMarkdown(final, names, next),
  });
  try {
    await comment.distinguish(true);
  } catch {
    // Sticky needs mod permissions on the app account; the comment still stands.
  }
};
