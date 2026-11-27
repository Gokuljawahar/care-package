import type { LawId } from './game';

export type ErrorResponse = {
  status: 'error';
  message: string;
};

export type WardenBanner = {
  username: string;
  trust: number;
};

export type AppStateResponse = {
  type: 'state';
  gameName: string;
  day: number;
  closed: boolean;
  loggedIn: boolean;
  username: string | null;
  nextResetAt: number;
  subredditName: string;
  todayPostUrl: string | null;
  warden: WardenBanner | null;
  law: LawId | null;
};

export type LeaderboardTab = 'streak' | 'trust' | 'medic';

export type LeaderboardEntry = {
  username: string;
  value: number;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  day: number;
  streak: LeaderboardEntry[];
  trust: LeaderboardEntry[];
  medic: LeaderboardEntry[];
};
