import type { LawId, ScavengeOutcome, ScavengeSiteId } from './game';

export type { ScavengeOutcome } from './game';

export type ErrorResponse = {
  status: 'error';
  message: string;
};

export type WardenBanner = {
  username: string;
  trust: number;
};

export type BunkerState = {
  food: number;
  power: number;
  health: number;
  scrap: number;
  infected: boolean;
  daysSurvived: number;
  bestSurvival: number;
  trust: number;
  cures: number;
};

export type DayChecklist = {
  scavenged: boolean;
  doorstepWaiting: number;
  sent: boolean;
  broadcast: boolean;
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
  bunker: BunkerState | null;
  checklist: DayChecklist;
  lastScavenge: ScavengeOutcome | null;
};

export type ScavengeRequest = {
  site: ScavengeSiteId;
};

export type ScavengeResponse = {
  type: 'scavenge';
  outcome: ScavengeOutcome;
  bunker: BunkerState;
  checklist: DayChecklist;
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
