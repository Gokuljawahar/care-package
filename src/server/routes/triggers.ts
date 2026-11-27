import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { GAME_NAME } from '../../shared/game';
import { getCurrentDay, runDailyReset } from '../core/day';

export const triggers = new Hono();

// First install: create Care Package #1 straight away.
triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req.json<OnAppInstallRequest>();
    if ((await getCurrentDay()) > 0) {
      return c.json<TriggerResponse>(
        { status: 'success', message: 'Already set up' },
        200
      );
    }
    const { opened } = await runDailyReset();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Created ${GAME_NAME} #${opened.day} (${opened.postId}) on ${input.type}`,
      },
      200
    );
  } catch (error) {
    console.error('Install setup failed', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to create the first post' },
      400
    );
  }
});
