import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { runDailyReset } from '../core/day';

export const menu = new Hono();

// "Create today's Thumbprint post": same steps as the midnight job, run by hand.
menu.post('/create-today', async (c) => {
  try {
    const { opened } = await runDailyReset();
    return c.json<UiResponse>(
      {
        showToast: `Thumbprint #${opened.day} is live`,
        navigateTo: `https://www.reddit.com/r/${context.subredditName}/comments/${opened.postId.replace(/^t3_/, '')}/`,
      },
      200
    );
  } catch (error) {
    console.error('Create today failed', error);
    const message = error instanceof Error ? error.message : 'Failed to create the post';
    return c.json<UiResponse>({ showToast: message }, 200);
  }
});
