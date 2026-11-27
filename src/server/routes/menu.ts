import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { GAME_NAME } from '../../shared/game';
import { ensureBunker, updatePlayerAtomic } from '../core/bunker';
import { ensureDay, runDailyReset } from '../core/day';
import { keys } from '../core/keys';

/**
 * DEV-ONLY guard for debug menu actions.
 * Remove this constant and `/debug-hurt`, `/debug-infect`, `/debug-reset-actions`
 * (plus the devvit.json menu items) before publishing.
 */
export const DEV_DEBUG_SUBREDDIT = 'care_package';

const isDevSubreddit = (): boolean =>
  context.subredditName.toLowerCase() === DEV_DEBUG_SUBREDDIT;

export const menu = new Hono();

// "Create today's Care Package post": same steps as the midnight job, run by hand.
menu.post('/create-today', async (c) => {
  try {
    const { opened } = await runDailyReset();
    return c.json<UiResponse>(
      {
        showToast: `${GAME_NAME} #${opened.day} is live`,
        navigateTo: `https://www.reddit.com/r/${context.subredditName}/comments/${opened.postId.replace(/^t3_/, '')}/`,
      },
      200
    );
  } catch (error) {
    console.error('Create today failed', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create the post';
    return c.json<UiResponse>({ showToast: message }, 200);
  }
});

// DEV ONLY: sets moderator's Health to 1 and grants +5 Scrap in care_package.
menu.post('/debug-hurt', async (c) => {
  if (!isDevSubreddit()) {
    return c.json<UiResponse>(
      { showToast: 'Debug action is disabled outside the dev subreddit' },
      403
    );
  }

  const { userId, username } = context;
  if (!userId) {
    return c.json<UiResponse>({ showToast: 'Log in first' }, 401);
  }

  try {
    const day = await ensureDay();
    await ensureBunker(userId, username, day);
    const nextScrap = await updatePlayerAtomic(userId, day, (rec) => {
      const scrap = rec.scrap + 5;
      return {
        commit: true,
        fields: {
          health: '1',
          infected: '0',
          scrap: String(scrap),
        },
        result: scrap,
      };
    });
    return c.json<UiResponse>(
      { showToast: `[DEV] Health set to 1, Scrap is now ${nextScrap}` },
      200
    );
  } catch (error) {
    console.error('Debug hurt failed', error);
    return c.json<UiResponse>({ showToast: 'Debug update failed' }, 500);
  }
});

// DEV ONLY: sets Health 0 and Infected immediately in care_package.
menu.post('/debug-infect', async (c) => {
  if (!isDevSubreddit()) {
    return c.json<UiResponse>(
      { showToast: 'Debug action is disabled outside the dev subreddit' },
      403
    );
  }

  const { userId, username } = context;
  if (!userId) {
    return c.json<UiResponse>({ showToast: 'Log in first' }, 401);
  }

  try {
    const day = await ensureDay();
    await ensureBunker(userId, username, day);
    await updatePlayerAtomic(userId, day, () => ({
      commit: true,
      fields: {
        health: '0',
        infected: '1',
        daysSurvived: '0',
      },
      result: true,
    }));
    return c.json<UiResponse>(
      { showToast: '[DEV] You are now Infected (Health 0)' },
      200
    );
  } catch (error) {
    console.error('Debug infect failed', error);
    return c.json<UiResponse>({ showToast: 'Debug infect failed' }, 500);
  }
});

// DEV ONLY: clears caller's daily action flags and send cooldowns in care_package.
menu.post('/debug-reset-actions', async (c) => {
  if (!isDevSubreddit()) {
    return c.json<UiResponse>(
      { showToast: 'Debug action is disabled outside the dev subreddit' },
      403
    );
  }

  const { userId } = context;
  if (!userId) {
    return c.json<UiResponse>({ showToast: 'Log in first' }, 401);
  }

  try {
    const day = await ensureDay();
    await Promise.all([
      redis.del(keys.dayActions(day, userId)),
      redis.del(keys.sentTo(userId)),
      redis.hDel(keys.dayBroadcasts(day), [userId]),
      redis.zRem(keys.dayActive(day), [userId]),
    ]);
    return c.json<UiResponse>(
      { showToast: `[DEV] Cleared Day ${day} actions & send cooldowns` },
      200
    );
  } catch (error) {
    console.error('Debug reset actions failed', error);
    return c.json<UiResponse>({ showToast: 'Debug reset failed' }, 500);
  }
});
