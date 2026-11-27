import { context, reddit, redis } from '@devvit/web/server';
import { isT3 } from '@devvit/web/shared';
import { DISASTERS, GAME_NAME, type DisasterId } from '../../shared/game';
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

/** Batch flair updates for survivors, infected, and Warden (expanded in Milestone 6). */
export const setSurvivorFlair = async (_day: number): Promise<number> => 0;

export const summaryMarkdown = (params: {
  day: number;
  disaster: DisasterId;
  activeCount: number;
  nextDay: number;
  nextPostId: string;
  nextWardenName: string | null;
}): string => {
  const meta = DISASTERS[params.disaster];
  const nextUrl = `https://www.reddit.com/r/${context.subredditName}/comments/${params.nextPostId.replace(/^t3_/, '')}/`;

  return [
    `**${GAME_NAME} #${params.day} is over.** Tonight's disaster was **${meta.name}** (${meta.summary})`,
    '',
    `${params.activeCount} ${params.activeCount === 1 ? 'survivor' : 'survivors'} active today.`,
    params.nextWardenName
      ? `**Day ${params.nextDay} Warden:** u/${params.nextWardenName}.`
      : `**Day ${params.nextDay} Warden:** None elected.`,
    '',
    `${GAME_NAME} #${params.nextDay} is live: [open your bunker](${nextUrl}).`,
  ].join('\n');
};

/** Pinned-style summary comment on the closed day's post. */
export const postSummary = async (params: {
  day: number;
  postId: string | undefined;
  disaster: DisasterId;
  nextDay: number;
  nextPostId: string;
  nextWardenId: string | null;
}): Promise<boolean> => {
  if (!isT3(params.postId)) return false;
  const [activeCount, nextWardenName] = await Promise.all([
    redis.zCard(keys.dayActive(params.day)),
    params.nextWardenId
      ? redis.hGet(keys.usernames(), params.nextWardenId)
      : Promise.resolve(undefined),
  ]);

  const comment = await reddit.submitComment({
    id: params.postId,
    text: summaryMarkdown({
      day: params.day,
      disaster: params.disaster,
      activeCount,
      nextDay: params.nextDay,
      nextPostId: params.nextPostId,
      nextWardenName: nextWardenName ?? null,
    }),
  });
  try {
    await comment.distinguish(true);
  } catch {
    // Sticky needs mod permissions on the app account; the comment still stands.
  }
  return true;
};
