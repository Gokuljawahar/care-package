import { Hono } from 'hono';
import { runDailyReset } from '../core/day';

export const scheduler = new Hono();

// Cron "0 0 * * *" (00:00 UTC), see devvit.json.
scheduler.post('/daily-reset', async (c) => {
  try {
    const result = await runDailyReset();
    console.log(`Daily reset: closed day ${result.closed ?? '-'}, opened day ${result.opened.day} (${result.opened.postId}), ${result.flairs} flairs, comment ${result.commented ? 'posted' : 'skipped'}`);
    return c.json({ status: 'ok', ...result }, 200);
  } catch (error) {
    console.error('Daily reset failed', error);
    return c.json({ status: 'error', message: String(error) }, 500);
  }
});
