import { useState } from 'react';
import { showShareSheet, showToast } from '@devvit/web/client';
import type { NightReportData } from '../../shared/api';
import { DISASTERS, GAME_NAME } from '../../shared/game';
import { postReportSeen } from '../api';

type Props = {
  report: NightReportData;
  onDismiss: () => void;
};

const shareTextFor = (r: NightReportData): string => {
  if (r.away) {
    return `${GAME_NAME} #${r.day} · Back in the bunker · Trust ${r.trust}%`;
  }
  const status = r.infected ? 'Infected 🧟' : 'Survived';
  const disaster = r.disasterName ?? 'the night';
  const curePart = r.cures > 0 ? ` · 🧟 cured ${r.cures}` : '';
  return `${GAME_NAME} #${r.day} · ${status} ${disaster} · Trust ${r.trust}%${curePart}`;
};

export const NightReport = ({ report, onDismiss }: Props) => {
  const [pending, setPending] = useState(false);

  const share = async () => {
    const text = shareTextFor(report);
    try {
      await showShareSheet({
        title: `${GAME_NAME} #${report.day}`,
        text,
      });
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Result copied');
      } catch {
        showToast('Could not open sharing');
      }
    }
  };

  const enterBunker = async () => {
    if (pending) return;
    setPending(true);
    try {
      await postReportSeen({ day: report.day });
    } catch {
      // Dismiss even if offline/transient error so player isn't blocked.
    } finally {
      setPending(false);
      onDismiss();
    }
  };

  const accent = report.disaster ? DISASTERS[report.disaster].accent : '#ffbe3b';

  return (
    <div className="flex h-full flex-col justify-between gap-2 px-4 pt-2.5 pb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="chip">
          {report.away ? 'Welcome Back' : `Night #${report.day} Report`}
        </span>
        <span className="chip">
          {report.infected ? '🧟 Infected' : `Survived · ${report.daysSurvived}d`}
        </span>
      </div>

      <div
        className={`panel flex flex-1 flex-col justify-between p-3.5 ${
          report.infected ? 'infected-panel' : ''
        }`}
      >
        <div>
          {report.away ? (
            <>
              <h2 className="font-display text-2xl font-bold text-amber">
                Away {report.missedNights}{' '}
                {report.missedNights === 1 ? 'night' : 'nights'}
              </h2>
              <p className="mt-1 text-sm font-semibold">
                {report.awaySummary}
              </p>
              <p className="mt-2 text-xs text-muted">
                Missed nights apply upkeep only (capped at 3) and never drop
                Health below 1.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2
                  className="font-display text-2xl leading-tight font-bold"
                  style={{ color: accent }}
                >
                  {report.disasterName ?? 'Midnight'}
                </h2>
                <span className="pill">Trust {report.trust}%</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {report.disaster
                  ? DISASTERS[report.disaster].summary
                  : 'Night resolved.'}
              </p>
            </>
          )}

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {report.foodDelta !== 0 && (
              <span
                className={`pill ${report.foodDelta > 0 ? 'text-toxic' : 'text-danger'}`}
              >
                {report.foodDelta > 0 ? `+${report.foodDelta}` : report.foodDelta}{' '}
                Food
              </span>
            )}
            {report.powerDelta !== 0 && (
              <span
                className={`pill ${report.powerDelta > 0 ? 'text-amber' : 'text-danger'}`}
              >
                {report.powerDelta > 0
                  ? `+${report.powerDelta}`
                  : report.powerDelta}{' '}
                Power
              </span>
            )}
            {report.healthDelta !== 0 && (
              <span
                className={`pill ${report.healthDelta > 0 ? 'text-toxic' : 'text-danger'}`}
              >
                {report.healthDelta > 0
                  ? `+${report.healthDelta}`
                  : report.healthDelta}{' '}
                Health
              </span>
            )}
          </div>

          {!report.away && (
            <div className="mt-2.5 flex flex-col gap-1 text-xs">
              {report.sentCrateNote && (
                <p className="text-ink/90">📦 {report.sentCrateNote}</p>
              )}
              {report.broadcastClaimText && (
                <p
                  className={
                    report.broadcastTrue ? 'text-toxic' : 'text-danger'
                  }
                >
                  📻 Your claim “{report.broadcastClaimText}” was{' '}
                  {report.broadcastTrue ? 'TRUE (+Trust)' : 'FALSE (-Trust)'}.
                </p>
              )}
              {report.liarCallout && (
                <p className="text-muted">🕵️ {report.liarCallout}</p>
              )}
              {report.nextWardenName && (
                <p className="text-amber">
                  👑 New Warden: u/{report.nextWardenName}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {!report.away && (
            <button
              className="btn btn-secondary w-full"
              onClick={() => void share()}
            >
              Share Result
            </button>
          )}
          <button
            className="btn btn-primary w-full"
            disabled={pending}
            onClick={() => void enterBunker()}
          >
            Enter Bunker
          </button>
        </div>
      </div>
    </div>
  );
};
