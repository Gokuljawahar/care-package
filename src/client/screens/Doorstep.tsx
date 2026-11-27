import { useState } from 'react';
import type {
  BunkerState,
  CrateBurnResponse,
  CrateOpenOutcome,
  CrateOpenResponse,
  CrateScanResponse,
  DoorstepCrate,
} from '../../shared/api';
import { scanCostFor, type LawId } from '../../shared/game';
import { postCrateBurn, postCrateOpen, postCrateScan } from '../api';

type Props = {
  crates: DoorstepCrate[];
  bunker: BunkerState;
  law: LawId | null;
  sentToday: boolean;
  onScanned: (res: CrateScanResponse) => void;
  onOpened: (res: CrateOpenResponse) => void;
  onBurned: (res: CrateBurnResponse) => void;
  onSendBack: (username: string) => void;
  onBack: () => void;
};

export const Doorstep = ({
  crates,
  bunker,
  law,
  sentToday,
  onScanned,
  onOpened,
  onBurned,
  onSendBack,
  onBack,
}: Props) => {
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CrateOpenOutcome | null>(null);
  const [burnedMsg, setBurnedMsg] = useState<string | null>(null);

  const scanCost = scanCostFor(law ?? undefined);
  const safeIndex = crates.length === 0 ? 0 : Math.min(index, crates.length - 1);
  const activeCrate = crates[safeIndex] ?? null;

  const handleScan = async (crateId: string) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await postCrateScan({ crateId });
      onScanned(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setPending(false);
    }
  };

  const handleOpen = async (crateId: string) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await postCrateOpen({ crateId });
      setOutcome(res.outcome);
      onOpened(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not open crate');
    } finally {
      setPending(false);
    }
  };

  const senderLabel = (name: string, isNpc: boolean) =>
    isNpc ? name : `u/${name}`;

  const handleBurn = async (crate: DoorstepCrate) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await postCrateBurn({ crateId: crate.id });
      setBurnedMsg(
        `Burned crate from ${senderLabel(crate.fromUsername, crate.fromIsNpc)}. No Trust change.`
      );
      onBurned(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not burn crate');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between gap-2 px-4 pt-2.5 pb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <BackArrow />
          </button>
          <h2 className="font-display text-xl font-bold">Doorstep</h2>
        </div>
        <span className="chip">
          {crates.length} {crates.length === 1 ? 'crate' : 'crates'} waiting
        </span>
      </div>

      {outcome ? (
        <div
          className={`panel flex flex-1 flex-col justify-between p-3.5 ${
            outcome.kind === 'trojan' ? 'trojan-panel' : 'real-panel'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-lg font-bold ${
                  outcome.kind === 'trojan' ? 'text-danger' : 'text-toxic'
                }`}
              >
                {outcome.kind === 'trojan'
                  ? 'Trojan Trap!'
                  : 'Care Package Opened'}
              </span>
              <span className="pill">
                {senderLabel(outcome.fromUsername, outcome.fromIsNpc)} ·{' '}
                {outcome.fromTrust}%
              </span>
            </div>

            <p className="mt-1 text-xs text-muted">
              {outcome.kind === 'trojan'
                ? outcome.stolenAmount > 0 && outcome.stolenStat
                  ? `Booby-trapped! Stole ${outcome.stolenAmount} ${outcome.stolenStat}${outcome.civilWarDouble ? ' (Civil War 2×)' : ''}.`
                  : 'Booby-trapped! Nothing in stock to steal, but the blast hurt.'
                : outcome.cured
                  ? 'Real supplies inside! The rations cured your infection.'
                  : `Real ${outcome.resource ?? 'supplies'} inside (+1 bonus included).`}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {outcome.foodDelta !== 0 && (
                <span
                  className={`pill ${outcome.foodDelta > 0 ? 'text-toxic' : 'text-danger'}`}
                >
                  {outcome.foodDelta > 0
                    ? `+${outcome.foodDelta}`
                    : outcome.foodDelta}{' '}
                  Food
                </span>
              )}
              {outcome.powerDelta !== 0 && (
                <span
                  className={`pill ${outcome.powerDelta > 0 ? 'text-amber' : 'text-danger'}`}
                >
                  {outcome.powerDelta > 0
                    ? `+${outcome.powerDelta}`
                    : outcome.powerDelta}{' '}
                  Power
                </span>
              )}
              {outcome.healthDelta !== 0 && (
                <span
                  className={`pill ${outcome.healthDelta > 0 ? 'text-toxic' : 'text-danger'}`}
                >
                  {outcome.healthDelta > 0
                    ? `+${outcome.healthDelta}`
                    : outcome.healthDelta}{' '}
                  Health
                </span>
              )}
              {outcome.lawHealed && (
                <span className="pill text-toxic">Field Aid +1</span>
              )}
              {outcome.cured && (
                <span className="pill text-toxic">Cured! Health 5</span>
              )}
              {outcome.becameInfected && (
                <span className="pill text-danger">Infected 🧟</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {!outcome.fromIsNpc && !sentToday && (
              <button
                className="btn btn-secondary w-full"
                onClick={() => onSendBack(outcome.fromUsername)}
              >
                Send one back to u/{outcome.fromUsername}
              </button>
            )}
            <button
              className="btn btn-primary w-full"
              onClick={() => {
                if (crates.length > 0) setOutcome(null);
                else onBack();
              }}
            >
              {crates.length > 0 ? 'Next crate' : 'Back to Bunker'}
            </button>
          </div>
        </div>
      ) : burnedMsg ? (
        <div className="panel flex flex-1 flex-col justify-between p-4 text-center">
          <div className="my-auto">
            <p className="text-lg font-bold text-amber">Ashes on the porch</p>
            <p className="mt-1 text-xs text-muted">{burnedMsg}</p>
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              if (crates.length > 0) setBurnedMsg(null);
              else onBack();
            }}
          >
            {crates.length > 0 ? 'Next crate' : 'Back to Bunker'}
          </button>
        </div>
      ) : !activeCrate ? (
        <div className="panel flex flex-1 flex-col justify-between p-4 text-center">
          <div className="my-auto">
            <p className="text-base font-bold">Doorstep is clear</p>
            <p className="mt-1 text-xs text-muted">
              No crates waiting right now. Send one to a survivor to start a
              trade.
            </p>
          </div>
          <button className="btn btn-primary w-full" onClick={onBack}>
            Back to Bunker
          </button>
        </div>
      ) : (
        <div className="panel flex flex-1 flex-col justify-between p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-base font-bold">
                    From{' '}
                    {senderLabel(
                      activeCrate.fromUsername,
                      activeCrate.fromIsNpc
                    )}
                  </p>
                  {activeCrate.fromIsNpc && (
                    <span className="pill text-amber">NPC</span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  Trust {activeCrate.fromTrust}% · Sent Day {activeCrate.day}
                </p>
              </div>
              {crates.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    className="mini-btn"
                    onClick={() =>
                      setIndex((safeIndex - 1 + crates.length) % crates.length)
                    }
                    aria-label="Previous crate"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-bold tabular-nums">
                    {safeIndex + 1}/{crates.length}
                  </span>
                  <button
                    className="mini-btn"
                    onClick={() => setIndex((safeIndex + 1) % crates.length)}
                    aria-label="Next crate"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-2/70 px-3 py-2.5 text-xs font-semibold">
              <span>Scanner reading</span>
              <span
                className={
                  activeCrate.scanStatus === 'real'
                    ? 'text-toxic'
                    : activeCrate.scanStatus === 'trojan'
                      ? 'text-danger'
                      : activeCrate.scanStatus === 'jammed'
                        ? 'text-amber'
                        : 'text-muted'
                }
              >
                {activeCrate.scanStatus === 'real'
                  ? '✔ Verified Real'
                  : activeCrate.scanStatus === 'trojan'
                    ? '⚠ Trojan Detected'
                    : activeCrate.scanStatus === 'jammed'
                      ? '⚡ Signal Jammed'
                      : 'Unscanned'}
              </span>
            </div>

            {error && (
              <p className="mt-2 text-center text-xs font-semibold text-danger">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              className="btn btn-primary w-full"
              disabled={pending}
              onClick={() => void handleOpen(activeCrate.id)}
            >
              Open Crate
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="btn btn-secondary"
                disabled={
                  pending ||
                  activeCrate.scanStatus !== 'unscanned' ||
                  bunker.power < scanCost
                }
                onClick={() => void handleScan(activeCrate.id)}
              >
                {scanCost === 0 ? 'Scan (Free)' : `Scan (${scanCost} Pwr)`}
              </button>
              <button
                className="btn btn-danger"
                disabled={pending}
                onClick={() => void handleBurn(activeCrate)}
              >
                Burn
              </button>
            </div>
          </div>
        </div>
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
