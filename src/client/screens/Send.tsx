import { useState } from 'react';
import type {
  BunkerState,
  CrateSendResponse,
  SentCrateSummary,
} from '../../shared/api';
import {
  REAL_CRATE_COST,
  trojanCostFor,
  type CrateKind,
  type CrateResource,
  type CrateTargetMode,
  type LawId,
} from '../../shared/game';
import { postCrateSend } from '../api';

type Props = {
  bunker: BunkerState;
  law: LawId | null;
  initialSent: SentCrateSummary | null;
  prefillRecipient: string | null;
  onComplete: (res: CrateSendResponse) => void;
  onBack: () => void;
};

export const Send = ({
  bunker,
  law,
  initialSent,
  prefillRecipient,
  onComplete,
  onBack,
}: Props) => {
  const [wasSentOnOpen] = useState(() => Boolean(initialSent));
  const [summary, setSummary] = useState<SentCrateSummary | null>(initialSent);
  const friendsOnly = law === 'friends_only';
  const [targetMode, setTargetMode] = useState<CrateTargetMode>(
    prefillRecipient || friendsOnly ? 'friend' : 'random'
  );
  const [recipient, setRecipient] = useState(prefillRecipient ?? '');
  const [kind, setKind] = useState<CrateKind>(
    bunker.infected ? 'trojan' : 'real'
  );
  const [resource, setResource] = useState<CrateResource>(
    bunker.food >= bunker.power ? 'food' : 'power'
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trojanCost = trojanCostFor(bunker.infected, law ?? undefined);
  const canReal =
    !bunker.infected &&
    (resource === 'food'
      ? bunker.food >= REAL_CRATE_COST
      : bunker.power >= REAL_CRATE_COST);
  const canTrojan = bunker.scrap >= trojanCost;
  const canSubmit =
    !pending &&
    (kind === 'real' ? canReal : canTrojan) &&
    (targetMode === 'random' || recipient.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || summary) return;
    setPending(true);
    setError(null);
    try {
      const res = await postCrateSend({
        targetMode,
        recipientUsername: targetMode === 'friend' ? recipient.trim() : undefined,
        kind,
        resource: kind === 'real' ? resource : undefined,
      });
      setSummary(res.summary);
      onComplete(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send crate');
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
          <h2 className="font-display text-xl font-bold">Send Crate</h2>
        </div>
        <span className="chip">{summary ? 'Sent today' : '1 / day'}</span>
      </div>

      {summary ? (
        <div className="panel flex flex-1 flex-col justify-between p-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-bold">
                {summary.kind === 'real' ? 'Care Package Sent' : 'Trojan Sent'}
              </span>
              <span className="pill">
                {wasSentOnOpen ? 'Earlier today' : 'Dispatched'}
              </span>
            </div>
            <p className="mt-2 text-sm">
              Dropped on <strong>u/{summary.recipientUsername}</strong>’s
              doorstep.
            </p>
            <p className="mt-1 text-xs text-muted">
              {summary.kind === 'real'
                ? `Packed 2 ${summary.resource ?? 'supplies'} (they receive 3).`
                : 'Looks identical to a real crate until opened or scanned.'}
            </p>
            {summary.rerouted && (
              <p className="mt-2 rounded-xl bg-amber/15 px-3 py-2 text-xs font-semibold text-amber">
                Friend’s doorstep already had 3 crates today — rerouted to a
                random survivor.
              </p>
            )}
          </div>
          <button className="btn btn-primary w-full" onClick={onBack}>
            Back to Bunker
          </button>
        </div>
      ) : (
        <div className="panel flex flex-1 flex-col justify-between p-3">
          <div className="flex flex-col gap-2.5">
            <div>
              <p className="mb-1 text-[11px] font-bold tracking-wide text-muted uppercase">
                Recipient
              </p>
              <div className="tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={targetMode === 'random'}
                  disabled={friendsOnly}
                  className="tab text-sm disabled:opacity-40"
                  onClick={() => setTargetMode('random')}
                >
                  Random
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={targetMode === 'friend'}
                  className="tab text-sm"
                  onClick={() => setTargetMode('friend')}
                >
                  Friend
                </button>
              </div>
              {targetMode === 'friend' && (
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="u/username"
                  aria-label="Friend username"
                  className="field mt-2 w-full"
                />
              )}
              {friendsOnly && (
                <p className="mt-1 text-[11px] text-amber">
                  Warden law: random deliveries suspended today.
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold tracking-wide text-muted uppercase">
                Package Type
              </p>
              <div className="tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={kind === 'real'}
                  disabled={bunker.infected}
                  className="tab text-sm disabled:opacity-40"
                  onClick={() => setKind('real')}
                >
                  Real (-2)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={kind === 'trojan'}
                  className="tab text-sm"
                  onClick={() => setKind('trojan')}
                >
                  Trojan ({trojanCost === 0 ? 'Free' : `-${trojanCost} Scrap`})
                </button>
              </div>
            </div>

            {kind === 'real' ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="choice-pill"
                  data-active={resource === 'food' ? 'true' : 'false'}
                  onClick={() => setResource('food')}
                >
                  Food ({bunker.food})
                </button>
                <button
                  type="button"
                  className="choice-pill"
                  data-active={resource === 'power' ? 'true' : 'false'}
                  onClick={() => setResource('power')}
                >
                  Power ({bunker.power})
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted">
                {bunker.infected
                  ? 'Infected crates are always free Trojans.'
                  : 'Steals 3 of their highest stat and deals -2 Health.'}
              </p>
            )}

            {error && (
              <p className="text-center text-xs font-semibold text-danger">
                {error}
              </p>
            )}
          </div>

          <button
            className="btn btn-primary w-full"
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {pending ? 'Dispatching…' : 'Send Care Package'}
          </button>
        </div>
      )}
    </div>
  );
};
