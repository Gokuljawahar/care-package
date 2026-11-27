import type { GridCell } from './game';
import type { Prompt } from './prompts';

export type ErrorResponse = {
  status: 'error';
  message: string;
};

/** The player's tap on one prompt plus the crowd so far. */
export type PromptReveal = {
  promptId: string;
  /** Player's cell (0..GRID-1). */
  cx: number;
  cy: number;
  grid: GridCell[];
  total: number;
  score: number;
  /** True if the player's neighbourhood is the hottest spot. */
  hottest: boolean;
};

export type TodayResponse = {
  type: 'today';
  day: number;
  closed: boolean;
  loggedIn: boolean;
  prompts: Prompt[];
  reveals: PromptReveal[];
  streak: number;
  bestStreak: number;
  nextResetAt: number;
  subredditName: string;
  /** Link to the current day's post when this post is an older, closed day. */
  todayPostUrl: string | null;
};

export type TapRequest = {
  promptId: string;
  x: number;
  y: number;
};

export type TapResponse = {
  type: 'tap';
  reveal: PromptReveal;
  done: boolean;
};

export type ResultResponse = {
  type: 'result';
  day: number;
  npc: number;
  label: string;
  reveals: PromptReveal[];
  streak: number;
  bestStreak: number;
  /** "Top X%" among today's finishers (1 = best). */
  topPercent: number;
  players: number;
  nextResetAt: number;
  postUrl: string | null;
  subredditName: string;
};

export type LeaderboardEntry = { username: string; value: number };

export type LeaderboardResponse = {
  type: 'leaderboard';
  day: number;
  /** Today's top 10 by NPC %. */
  today: LeaderboardEntry[];
  /** All-time top 10 by best streak. */
  streaks: LeaderboardEntry[];
};
