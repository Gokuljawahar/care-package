import { context, reddit, redis } from '@devvit/web/server';
import { isT3 } from '@devvit/web/shared';
import { DISASTERS, GAME_NAME } from '../../shared/game';
import type { DayFinal, Opened } from './day';
import { keys } from './keys';

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

/** Batch flair updates for survivors, infected, and Warden (implemented in Milestone 6). */
export const setSurvivorFlair = async (_final: DayFinal): Promise<number> => 0;

export const summaryMarkdown = (final: DayFinal, next: Opened): string => {
  const meta = DISASTERS[final.disaster];
  const nextUrl = `https://www.reddit.com/r/${context.subredditName}/comments/${next.postId.replace(/^t3_/, '')}/`;

  return [
    `**${GAME_NAME} #${final.day} is over.** Tonight's disaster was **${meta.name}** (${meta.summary})`,
    '',
    `${final.activeCount} ${final.activeCount === 1 ? 'survivor' : 'survivors'} active today.`,
    '',
    `${GAME_NAME} #${next.day} is live: [open your bunker](${nextUrl}).`,
  ].join('\n');
};

/** Pinned-style summary comment on the closed day's post. */
export const postSummary = async (
  final: DayFinal,
  next: Opened
): Promise<void> => {
  const postId = final.postId;
  if (!isT3(postId)) return;
  const comment = await reddit.submitComment({
    id: postId,
    text: summaryMarkdown(final, next),
  });
  try {
    await comment.distinguish(true);
  } catch {
    // Sticky needs mod permissions on the app account; the comment still stands.
  }
};
