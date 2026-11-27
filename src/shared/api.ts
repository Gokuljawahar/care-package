import type {
  ClaimId,
  CrateKind,
  CrateResource,
  CrateScanStatus,
  CrateTargetMode,
  LawId,
  ScavengeOutcome,
  ScavengeSiteId,
} from './game';

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

export type DoorstepCrate = {
  id: string;
  fromUsername: string;
  fromTrust: number;
  fromIsNpc: boolean;
  day: number;
  scanStatus: CrateScanStatus;
};

export type SentCrateSummary = {
  recipientUsername: string;
  kind: CrateKind;
  resource: CrateResource | null;
  rerouted: boolean;
};

export type RadioBroadcast = {
  id: string;
  senderName: string;
  senderTrust: number | null;
  isNpc: boolean;
  isOfficial: boolean;
  claimId: ClaimId | null;
  text: string;
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
  crates: DoorstepCrate[];
  lastSent: SentCrateSummary | null;
  radioFeed: RadioBroadcast[];
  myBroadcast: ClaimId | null;
  isWarden: boolean;
  wardenLawOptions: LawId[];
  awayNotice: string | null;
};

export type WardenLawRequest = {
  lawId: LawId;
};

export type WardenLawResponse = {
  type: 'warden_law';
  law: LawId;
};

export type RadioBroadcastRequest = {
  claimId: ClaimId;
};

export type RadioBroadcastResponse = {
  type: 'radio_broadcast';
  claimId: ClaimId;
  checklist: DayChecklist;
  radioFeed: RadioBroadcast[];
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

export type CrateSendRequest = {
  targetMode: CrateTargetMode;
  recipientUsername?: string | undefined;
  kind: CrateKind;
  resource?: CrateResource | undefined;
};

export type CrateSendResponse = {
  type: 'crate_send';
  summary: SentCrateSummary;
  bunker: BunkerState;
  checklist: DayChecklist;
};

export type CrateActionRequest = {
  crateId: string;
};

export type CrateScanResponse = {
  type: 'crate_scan';
  crateId: string;
  jammed: boolean;
  scanStatus: CrateScanStatus;
  powerCost: number;
  bunker: BunkerState;
  checklist: DayChecklist;
  crates: DoorstepCrate[];
};

export type CrateOpenOutcome = {
  crateId: string;
  kind: CrateKind;
  fromUsername: string;
  fromTrust: number;
  fromIsNpc: boolean;
  resource: CrateResource | null;
  foodDelta: number;
  powerDelta: number;
  healthDelta: number;
  stolenStat: CrateResource | null;
  stolenAmount: number;
  cured: boolean;
  becameInfected: boolean;
  lawHealed: boolean;
  civilWarDouble: boolean;
};

export type CrateOpenResponse = {
  type: 'crate_open';
  outcome: CrateOpenOutcome;
  bunker: BunkerState;
  checklist: DayChecklist;
  crates: DoorstepCrate[];
};

export type CrateBurnResponse = {
  type: 'crate_burn';
  crateId: string;
  bunker: BunkerState;
  checklist: DayChecklist;
  crates: DoorstepCrate[];
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
