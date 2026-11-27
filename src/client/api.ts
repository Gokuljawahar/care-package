import type {
  AppStateResponse,
  ErrorResponse,
  LeaderboardResponse,
  ScavengeRequest,
  ScavengeResponse,
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

export const getState = () => call<AppStateResponse>('/api/state');

export const postScavenge = (body: ScavengeRequest) =>
  call<ScavengeResponse>('/api/scavenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const getLeaderboard = () =>
  call<LeaderboardResponse>('/api/leaderboard');
