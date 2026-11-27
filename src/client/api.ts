import type {
  AppStateResponse,
  CrateActionRequest,
  CrateBurnResponse,
  CrateOpenResponse,
  CrateScanResponse,
  CrateSendRequest,
  CrateSendResponse,
  ErrorResponse,
  LeaderboardResponse,
  RadioBroadcastRequest,
  RadioBroadcastResponse,
  ScavengeRequest,
  ScavengeResponse,
  WardenLawRequest,
  WardenLawResponse,
} from '../shared/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const isError = (v: unknown): v is ErrorResponse =>
  typeof v === 'object' && v !== null && 'status' in v && v.status === 'error';

const call = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, init);
  let data: T | ErrorResponse | null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (isError(data)) throw new ApiError(data.message, res.status);
  if (!res.ok || data === null)
    throw new ApiError(`HTTP ${res.status}`, res.status);
  return data;
};

const postJson = <T>(path: string, body: unknown) =>
  call<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const getState = () => call<AppStateResponse>('/api/state');

export const postScavenge = (body: ScavengeRequest) =>
  postJson<ScavengeResponse>('/api/scavenge', body);

export const postCrateSend = (body: CrateSendRequest) =>
  postJson<CrateSendResponse>('/api/crates/send', body);

export const postCrateScan = (body: CrateActionRequest) =>
  postJson<CrateScanResponse>('/api/crates/scan', body);

export const postCrateOpen = (body: CrateActionRequest) =>
  postJson<CrateOpenResponse>('/api/crates/open', body);

export const postCrateBurn = (body: CrateActionRequest) =>
  postJson<CrateBurnResponse>('/api/crates/burn', body);

export const postRadioBroadcast = (body: RadioBroadcastRequest) =>
  postJson<RadioBroadcastResponse>('/api/radio/broadcast', body);

export const postWardenLaw = (body: WardenLawRequest) =>
  postJson<WardenLawResponse>('/api/warden/law', body);

export const getLeaderboard = () =>
  call<LeaderboardResponse>('/api/leaderboard');
