import { useState } from 'react';
import type { ScavengeOutcome, ScavengeResponse } from '../../shared/api';
import {
  SCAVENGE_SITE_IDS,
  SCAVENGE_SITES,
  type ScavengeSiteId,
} from '../../shared/game';
import { postScavenge } from '../api';

type Props = {
  initialOutcome: ScavengeOutcome | null;
  onComplete: (res: ScavengeResponse) => void;
  onBack: () => void;
};

export const Scavenge = ({ initialOutcome, onComplete, onBack }: Props) => {
  const [wasDoneOnOpen] = useState(() => Boolean(initialOutcome));
  const [outcome, setOutcome] = useState<ScavengeOutcome | null>(
    initialOutcome
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickSite = async (site: ScavengeSiteId) => {
    if (pending || outcome) return;
    setPending(true);
    setError(null);
    try {
      const res = await postScavenge({ site });
      setOutcome(res.outcome);
      onComplete(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not scavenge');
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
          <h2 className="font-display text-xl font-bold">Scavenge</h2>
        </div>
        <span className="chip">{outcome ? 'Done today' : '1 run / day'}</span>
      </div>

      {!outcome ? (
        <div className="flex flex-1 flex-col justify-center gap-2">
          {SCAVENGE_SITE_IDS.map((id) => {
            const site = SCAVENGE_SITES[id];
            return (
              <button
                key={id}
                className="site-card"
                disabled={pending}
                onClick={() => void pickSite(id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold">{site.name}</span>
                  <span
                    className={`pill ${id === 'pharmacy' ? 'text-toxic' : id === 'mall' ? 'text-amber' : 'text-danger'}`}
                  >
                    {site.riskLabel}
                  </span>
                </div>
                <span className="text-xs text-muted">{site.tagline}</span>
              </button>
            );
          })}
          {error && (
            <p className="text-center text-xs font-semibold text-danger">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="panel flex flex-1 flex-col justify-between p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-bold">
                {SCAVENGE_SITES[outcome.site].name}
              </span>
              <span className="pill">
                {wasDoneOnOpen ? 'Earlier today' : 'Haul secured'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{outcome.note}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {outcome.foodDelta > 0 && (
                <span className="pill text-toxic">
                  +{outcome.foodDelta} Food
                </span>
              )}
              {outcome.powerDelta > 0 && (
                <span className="pill text-amber">
                  +{outcome.powerDelta} Power
                </span>
              )}
              {outcome.scrapDelta > 0 && (
                <span className="pill">+{outcome.scrapDelta} Scrap</span>
              )}
              {outcome.healthDelta > 0 && (
                <span className="pill text-toxic">
                  +{outcome.healthDelta} Health
                </span>
              )}
              {outcome.healthDelta < 0 && (
                <span className="pill text-danger">
                  {outcome.healthDelta} Health
                </span>
              )}
              {outcome.lawBonus && (
                <span className="pill text-amber">Warden +1</span>
              )}
            </div>

            {outcome.loot.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Found in the rubble
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {outcome.loot.map((item) => (
                    <span key={item} className="chip text-xs">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {outcome.becameInfected && (
              <p className="mt-3 rounded-xl bg-toxic/15 px-3 py-2 text-xs font-bold text-toxic">
                Your Health hit 0. You are now Infected 🧟
              </p>
            )}
          </div>

          <button className="btn btn-primary w-full" onClick={onBack}>
            Back to Bunker
          </button>
        </div>
      )}

      {!outcome && (
        <p className="text-center text-[11px] text-muted">
          One run before dark. Riskier ruins hide more Scrap.
        </p>
      )}
    </div>
  );
};
