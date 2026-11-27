import { useEffect, useState } from 'react';
import type {
  LeaderboardEntry,
  LeaderboardResponse,
  LeaderboardTab,
} from '../../shared/api';
import { getLeaderboard } from '../api';

const TABS: readonly { id: LeaderboardTab; label: string; unit: string }[] = [
  { id: 'streak', label: 'Survived', unit: 'd' },
  { id: 'trust', label: 'Trusted', unit: '%' },
  { id: 'medic', label: 'Medics', unit: '' },
];

export const Leaderboard = ({ onBack }: { onBack: () => void }) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<LeaderboardTab>('streak');

  useEffect(() => {
    getLeaderboard()
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load')
      );
  }, []);

  const rows: LeaderboardEntry[] = data ? data[tab] : [];
  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const unit = activeTab ? activeTab.unit : '';

  return (
    <div className="flex h-full flex-col px-4 pt-3 pb-3">
      <div className="flex items-center gap-2">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="font-display text-2xl font-bold">Leaderboard</h2>
      </div>

      <div className="tabs mt-3" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className="tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ol className="mt-2 min-h-0 flex-1 overflow-hidden">
        {error && <li className="p-4 text-center text-danger">{error}</li>}
        {!error && !data && (
          <li className="p-4 text-center text-muted">Loading…</li>
        )}
        {data && rows.length === 0 && (
          <li className="p-4 text-center text-muted">
            Nobody yet. Survive Day {data.day} first.
          </li>
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
