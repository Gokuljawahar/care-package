import type { ErrorResponse, TapRequest, TapResponse, TodayResponse } from '../shared/api';

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
  if (!res.ok || data === null) throw new ApiError(`HTTP ${res.status}`, res.status);
  return data;
};

export const getToday = () => call<TodayResponse>('/api/today');

export const postTap = (body: TapRequest) =>
  call<TapResponse>('/api/tap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
