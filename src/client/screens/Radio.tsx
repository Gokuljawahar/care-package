import { useState } from 'react';
import type {
  RadioBroadcast,
  RadioBroadcastResponse,
} from '../../shared/api';
import { CLAIMS, type ClaimId } from '../../shared/game';
import { postRadioBroadcast } from '../api';

type Group = 'tonight' | 'not' | 'advice';

const GROUPS: readonly { id: Group; label: string; claims: readonly ClaimId[] }[] = [
  {
    id: 'tonight',
    label: 'Tonight is…',
    claims: [
      'tonight_blackout',
      'tonight_zombie',
      'tonight_nuclear',
      'tonight_civil_war',
      'tonight_ai_uprising',
    ],
  },
  {
    id: 'not',
    label: 'NOT…',
    claims: [
      'not_blackout',
      'not_zombie',
      'not_nuclear',
      'not_civil_war',
      'not_ai_uprising',
    ],
  },
  {
    id: 'advice',
    label: 'Advice',
    claims: ['stock_food', 'stock_power', 'barricade_health'],
  },
];

type Props = {
  day: number;
  feed: RadioBroadcast[];
  myBroadcast: ClaimId | null;
  loggedIn: boolean;
  closed: boolean;
  onBroadcastComplete: (res: RadioBroadcastResponse) => void;
  onBack: () => void;
};

export const Radio = ({
  day,
  feed,
  myBroadcast,
  loggedIn,
  closed,
  onBroadcastComplete,
  onBack,
}: Props) => {
  const [mode, setMode] = useState<'feed' | 'pick'>('feed');
  const [group, setGroup] = useState<Group>('tonight');
  const [selected, setSelected] = useState<ClaimId>('tonight_blackout');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentClaim, setSentClaim] = useState<ClaimId | null>(myBroadcast);

  const activeGroup = GROUPS.find((g) => g.id === group) ?? GROUPS[0];
  const groupClaims = activeGroup ? activeGroup.claims : [];

  const switchGroup = (next: Group) => {
    setGroup(next);
    const found = GROUPS.find((g) => g.id === next);
    const first = found?.claims[0];
    if (first) setSelected(first);
  };

  const transmit = async () => {
    if (pending || sentClaim) return;
    setPending(true);
    setError(null);
    try {
      const res = await postRadioBroadcast({ claimId: selected });
      setSentClaim(res.claimId);
      onBroadcastComplete(res);
      setMode('feed');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Broadcast failed');
    } finally {
      setPending(false);
    }
  };

  if (mode === 'pick') {
    return (
      <div className="flex h-full flex-col justify-between gap-2 px-4 pt-2.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              className="icon-btn"
              onClick={() => setMode('feed')}
              aria-label="Back to Radio feed"
            >
              <BackArrow />
            </button>
            <h2 className="font-display text-xl font-bold">Broadcast</h2>
          </div>
          <span className="chip">1 / day</span>
        </div>

        <div className="tabs" role="tablist">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              className="tab text-xs"
              onClick={() => switchGroup(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-center gap-1.5">
          {groupClaims.map((claimId) => (
            <button
              key={claimId}
              type="button"
              className="choice-pill px-3 text-left"
              data-active={selected === claimId ? 'true' : 'false'}
              onClick={() => setSelected(claimId)}
            >
              {CLAIMS[claimId].text}
            </button>
          ))}
          {error && (
            <p className="text-center text-xs font-semibold text-danger">
              {error}
            </p>
          )}
        </div>

        <button
          className="btn btn-primary w-full"
          disabled={pending}
          onClick={() => void transmit()}
        >
          {pending ? 'Transmitting…' : 'Transmit Signal'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between gap-2 px-4 pt-2.5 pb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <BackArrow />
          </button>
          <h2 className="font-display text-xl font-bold">Radio</h2>
        </div>
        <span className="chip">
          Day {day} · {feed.length} signals
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
        {feed.map((item) => (
          <div
            key={item.id}
            className={`panel px-3 py-2 ${item.isOfficial ? 'real-panel' : ''}`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="truncate">
                {item.isOfficial || item.isNpc
                  ? item.senderName
                  : `u/${item.senderName}`}
              </span>
              {item.isOfficial ? (
                <span className="pill text-toxic">Verified</span>
              ) : (
                <span className="pill">
                  {item.isNpc ? 'NPC · ' : ''}
                  {item.senderTrust ?? 50}% Trust
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs font-semibold leading-snug">
              {item.text}
            </p>
          </div>
        ))}
      </div>

      {sentClaim ? (
        <div className="bunker-ready flex min-h-[44px] items-center justify-center rounded-full px-3 text-center text-xs font-semibold">
          Your signal: {CLAIMS[sentClaim].text}
        </div>
      ) : loggedIn && !closed ? (
        <button
          className="btn btn-primary w-full"
          onClick={() => setMode('pick')}
        >
          Broadcast on Radio
        </button>
      ) : (
        <p className="text-center text-[11px] text-muted">
          {closed
            ? 'Broadcasts closed for this day.'
            : 'Log in to broadcast your own signal.'}
        </p>
      )}
    </div>
  );
};

const BackArrow = () => (
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
);
