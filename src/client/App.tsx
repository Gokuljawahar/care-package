import { useEffect, useState, type ReactNode } from 'react';
import { navigateTo, showLoginPrompt } from '@devvit/web/client';
import type { AppStateResponse } from '../shared/api';
import { LAWS } from '../shared/game';
import { getState } from './api';
import { useCountdown } from './hooks/useCountdown';
import { Leaderboard } from './screens/Leaderboard';

type Screen = 'home' | 'leaderboard';

export const App = () => {
  const [state, setState] = useState<AppStateResponse | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getState()
      .then(setState)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load')
      );
  }, []);

  if (error) {
    return (
      <Shell>
        <p className="font-semibold text-danger">{error}</p>
      </Shell>
    );
  }
  if (!state) {
    return (
      <Shell>
        <span className="loading-dot" aria-label="Loading" />
      </Shell>
    );
  }

  if (screen === 'leaderboard') {
    return (
      <main className="app enter">
        <Leaderboard onBack={() => setScreen('home')} />
      </main>
    );
  }

  return (
    <main className="app enter">
      <HomeStub state={state} onLeaderboard={() => setScreen('leaderboard')} />
    </main>
  );
};

const HomeStub = ({
  state,
  onLeaderboard,
}: {
  state: AppStateResponse;
  onLeaderboard: () => void;
}) => {
  const countdown = useCountdown(state.nextResetAt);
  const lawMeta = state.law ? LAWS[state.law] : null;

  return (
    <div className="flex h-full flex-col justify-between px-4 pt-3 pb-4">
      <div className="flex items-center justify-between gap-2">
        <span className="chip">Day {state.day} · Tonight: ???</span>
        <button
          className="icon-btn"
          onClick={onLeaderboard}
          aria-label="Leaderboard"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M7 4h10v3a5 5 0 0 1-10 0V4Zm-3 1h3v2a3 3 0 0 1-3-2Zm16 0h-3v2a3 3 0 0 0 3-2ZM12 12v4m-4 4h8l-1-4H9l-1 4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="crate-emblem mb-3 flex h-16 w-16 items-center justify-center rounded-2xl">
          <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
            <rect
              x="7"
              y="10"
              width="34"
              height="28"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M7 19h34M24 10v28"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
        </div>
        <h1 className="font-display text-4xl leading-none font-bold tracking-tight">
          {state.gameName}
        </h1>
        <p className="mt-2 max-w-[300px] text-sm text-muted">
          Every gift might be a trap. Every broadcast might be a lie.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="chip">Midnight in {countdown}</span>
          {state.warden && (
            <span className="chip">
              Warden: u/{state.warden.username} ({state.warden.trust}%)
            </span>
          )}
          {lawMeta && <span className="chip">Law: {lawMeta.title}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {state.closed ? (
          <button
            className="btn btn-primary w-full"
            onClick={() =>
              navigateTo(
                state.todayPostUrl ??
                  `https://www.reddit.com/r/${state.subredditName}/`
              )
            }
          >
            Day closed · Open today’s post
          </button>
        ) : !state.loggedIn ? (
          <button
            className="btn btn-primary w-full"
            onClick={() => showLoginPrompt()}
          >
            Log in to claim your bunker
          </button>
        ) : (
          <div className="bunker-ready flex min-h-[48px] items-center justify-center rounded-full px-4 text-center text-sm font-semibold">
            u/{state.username ?? 'survivor'} · Bunker online
          </div>
        )}
      </div>
    </div>
  );
};

const Shell = ({ children }: { children: ReactNode }) => (
  <main className="app flex items-center justify-center p-6 text-center">
    {children}
  </main>
);
