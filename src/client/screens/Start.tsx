import { navigateTo } from '@devvit/web/client';
import type { TodayResponse } from '../../shared/api';
import { Logo } from '../components/Logo';

type Props = { today: TodayResponse; onPlay: () => void; onLeaderboard: () => void };

export const Start = ({ today, onPlay, onLeaderboard }: Props) => {
  const blocked = !today.loggedIn || today.closed;
  return (
    <div className="flex h-full flex-col px-5 pt-3 pb-5">
      <div className="flex items-center justify-between">
        <span className="chip">Day {today.day}</span>
        <button className="icon-btn" onClick={onLeaderboard} aria-label="Leaderboard">
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

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Logo />
        <p className="mt-3 text-lg text-muted">Tap where everyone else taps.</p>
        <p className="streak-chip mt-5">
          {today.streak > 0 ? `🔥 ${today.streak}-day streak` : 'Start a streak today'}
        </p>
      </div>

      {today.closed ? (
        <button
          className="btn btn-primary w-full"
          onClick={() =>
            navigateTo(today.todayPostUrl ?? `https://www.reddit.com/r/${today.subredditName}/`)
          }
        >
          Day closed. Play today’s
        </button>
      ) : (
        <button className="btn btn-primary btn-xl w-full" onClick={onPlay} disabled={blocked}>
          {today.loggedIn ? 'Play' : 'Log in to play'}
        </button>
      )}
    </div>
  );
};
