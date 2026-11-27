import { useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardResponse } from '../../shared/api';
import { getLeaderboard } from '../api';

type Tab = 'today' | 'streaks';

export const Leaderboard = ({ onBack }: { onBack: () => void }) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => {
    getLeaderboard()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load'));
  }, []);

  const rows: LeaderboardEntry[] = data ? data[tab] : [];
  const unit = tab === 'today' ? '%' : 'd';

  return (
    <div className="flex h-full flex-col px-4 pt-3 pb-3">
      <div className="flex items-center gap-2">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="font-display text-2xl font-bold">Leaderboard</h2>
      </div>

      <div className="tabs mt-3" role="tablist">
        {(['today', 'streaks'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className="tab" onClick={() => setTab(t)}>
            {t === 'today' ? 'Most NPC today' : 'Best streaks'}
          </button>
        ))}
      </div>

      <ol className="mt-2 min-h-0 flex-1">
        {error && <li className="p-4 text-center text-pink">{error}</li>}
        {!error && !data && <li className="p-4 text-center text-muted">Loading…</li>}
        {data && rows.length === 0 && (
          <li className="p-4 text-center text-muted">Nobody yet. Be the first.</li>
        )}
        {rows.map((r, i) => (
          <li key={r.username} className="lb-row">
            <span className="w-6 text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">u/{r.username}</span>
            <span className="font-bold">
              {r.value}
              {unit}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};
