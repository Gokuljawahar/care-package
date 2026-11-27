import { useState } from 'react';
import { LAWS, type LawId } from '../../shared/game';
import { postWardenLaw } from '../api';

type Props = {
  day: number;
  options: LawId[];
  currentLaw: LawId | null;
  onDecreed: (law: LawId) => void;
  onBack: () => void;
};

export const Warden = ({
  day,
  options,
  currentLaw,
  onDecreed,
  onBack,
}: Props) => {
  const [law, setLaw] = useState<LawId | null>(currentLaw);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (lawId: LawId) => {
    if (pending || law) return;
    setPending(true);
    setError(null);
    try {
      const res = await postWardenLaw({ lawId });
      setLaw(res.law);
      onDecreed(res.law);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not decree law');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between gap-2 px-4 pt-2.5 pb-3">
      <div className="flex items-center justify-between gap-2">
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
          <h2 className="font-display text-xl font-bold">Warden Decree</h2>
        </div>
        <span className="chip">Day {day}</span>
      </div>

      {law ? (
        <div className="panel real-panel flex flex-1 flex-col justify-between p-4">
          <div className="my-auto text-center">
            <span className="pill text-amber">Active Today</span>
            <h3 className="mt-2 text-2xl font-bold">{LAWS[law].title}</h3>
            <p className="mt-1 text-sm text-muted">{LAWS[law].description}</p>
          </div>
          <button className="btn btn-primary w-full" onClick={onBack}>
            Back to Bunker
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-2">
          <p className="text-center text-xs text-muted">
            Pick one law for the entire city today (auto-picks at 12:00 UTC).
          </p>
          {options.map((id) => {
            const meta = LAWS[id];
            return (
              <button
                key={id}
                className="site-card"
                disabled={pending}
                onClick={() => void pick(id)}
              >
                <span className="text-base font-bold text-amber">
                  {meta.title}
                </span>
                <span className="text-xs text-muted">{meta.description}</span>
              </button>
            );
          })}
          {error && (
            <p className="text-center text-xs font-semibold text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
