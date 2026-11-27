import { useState } from 'react';
import {
  navigateTo,
  showLoginPrompt,
  showShareSheet,
  showToast,
} from '@devvit/web/client';
import type { AppStateResponse } from '../../shared/api';
import {
  LAWS,
  START_FOOD,
  START_HEALTH,
  START_POWER,
} from '../../shared/game';
import { StatBar } from '../components/StatBar';
import { CrateArt } from '../components/CrateArt';
import { DisasterArt } from '../components/DisasterArt';
import { useCountdown } from '../hooks/useCountdown';

type Props = {
  state: AppStateResponse;
  onScavenge: () => void;
  onDoorstep: () => void;
  onSend: () => void;
  onRadio: () => void;
  onWarden: () => void;
  onLeaderboard: () => void;
  onHelp: () => void;
};

export const Home = ({
  state,
  onScavenge,
  onDoorstep,
  onSend,
  onRadio,
  onWarden,
  onLeaderboard,
  onHelp,
}: Props) => {
  const countdown = useCountdown(state.nextResetAt);
  const [awayDismissed, setAwayDismissed] = useState(false);
  const lawMeta = state.law ? LAWS[state.law] : null;
  const bunker = state.bunker;

  if (!state.loggedIn || !bunker) {
    return (
      <div className="flex h-full flex-col justify-between px-4 pt-3 pb-4">
        <div className="flex items-center justify-between gap-2">
          <span className="chip">Day {state.day} · Tonight: ???</span>
          <div className="flex items-center gap-1.5">
            <button
              className="icon-btn"
              onClick={onHelp}
              aria-label="How to Play"
            >
              <HelpIcon />
            </button>
            <button
              className="icon-btn"
              onClick={onLeaderboard}
              aria-label="Leaderboard"
            >
              <TrophyIcon />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <CrateArt state="sealed" size={56} />
          <h1 className="mt-1 font-display text-3xl leading-none font-bold tracking-tight">
            {state.gameName}
          </h1>
          <p className="mt-1 max-w-[300px] text-xs text-muted">
            Every gift might be a trap. Every broadcast might be a lie.
          </p>

          <div className="panel mt-2.5 flex w-full flex-col gap-1.5 p-2.5 text-left">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Starter Bunker</span>
              <span className="text-amber">Scrap 2 · Trust 50%</span>
            </div>
            <StatBar label="Food" value={START_FOOD} tone="food" />
            <StatBar label="Power" value={START_POWER} tone="power" />
            <StatBar label="Health" value={START_HEALTH} tone="health" />
          </div>

          <span className="chip mt-3">Midnight in {countdown}</span>
        </div>

        <button
          className="btn btn-primary w-full"
          onClick={() => showLoginPrompt()}
        >
          Log in to claim your bunker
        </button>
      </div>
    );
  }

  const { checklist, radioFeed } = state;
  const ticker = radioFeed[0]?.text ?? 'Radio silent';
  const showWardenPick =
    state.isWarden &&
    !state.law &&
    !state.closed &&
    state.wardenLawOptions.length > 0;
  const showAway = Boolean(state.awayNotice) && !awayDismissed;
  const allDoneToday =
    !state.closed &&
    checklist.scavenged &&
    checklist.sent &&
    checklist.broadcast &&
    checklist.doorstepWaiting === 0;

  const sharePrep = async () => {
    const text = `${state.gameName} #${state.day} · Bunker sealed (Food ${bunker.food}, Power ${bunker.power}, Health ${bunker.health}) · Trust ${bunker.trust}%`;
    try {
      await showShareSheet({
        title: `${state.gameName} #${state.day}`,
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

  return (
    <div
      className={`flex h-full flex-col justify-between gap-1.5 px-4 pt-2.5 pb-3 ${
        bunker.infected ? 'infected-home' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="chip flex min-w-0 items-center gap-1.5 px-2.5 py-1 text-xs">
          <DisasterArt variant="unknown" size={16} />
          <span className="truncate">Day {state.day} · Tonight: ???</span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            className="icon-btn"
            onClick={onHelp}
            aria-label="How to Play"
          >
            <HelpIcon />
          </button>
          <button
            className="icon-btn"
            onClick={onLeaderboard}
            aria-label="Leaderboard"
          >
            <TrophyIcon />
          </button>
        </div>
      </div>

      <section
        className={`panel flex flex-col gap-1.5 px-3 py-2 ${bunker.infected ? 'infected-panel infected-stripe' : ''}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs font-bold">
          <span className="min-w-0 truncate">
            u/{state.username ?? 'survivor'}
            {bunker.infected ? ' · 🧟 Infected' : ''}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="pill">Trust {bunker.trust}%</span>
            <span className="pill">Scrap {bunker.scrap}</span>
            <span className="pill">{bunker.daysSurvived}d</span>
          </div>
        </div>
        <StatBar label="Food" value={bunker.food} tone="food" />
        <StatBar label="Power" value={bunker.power} tone="power" />
        <StatBar label="Health" value={bunker.health} tone="health" />
        {bunker.infected && (
          <p className="text-[11px] font-semibold text-toxic">
            Find a cure: open a real crate from a surviving player.
          </p>
        )}
      </section>

      {showAway && (
        <button
          className="away-banner flex min-h-[36px] items-center justify-between gap-2 rounded-xl px-3 py-1 text-left text-[11px] font-semibold"
          onClick={() => setAwayDismissed(true)}
        >
          <span className="truncate">{state.awayNotice}</span>
          <span className="shrink-0 text-amber">OK</span>
        </button>
      )}

      {allDoneToday ? (
        <div className="panel real-panel flex items-center justify-between gap-2 px-3 py-1.5">
          <div className="min-w-0">
            <p className="text-xs font-bold text-toxic">
              ✔ Bunker sealed for tonight
            </p>
            <p className="truncate text-[11px] text-muted">
              Disaster hits in {countdown} · Discuss below
            </p>
          </div>
          <button
            className="min-h-[44px] shrink-0 cursor-pointer rounded-full bg-amber px-3.5 text-xs font-bold text-bg"
            onClick={() => void sharePrep()}
          >
            Share
          </button>
        </div>
      ) : (
        <p className="truncate text-center text-[11px] font-semibold text-muted">
          {state.warden
            ? `⏳ ${countdown} · Warden u/${state.warden.username}${lawMeta ? ` · ${lawMeta.title}` : ''}`
            : `⏳ ${countdown} · 📻 ${ticker}`}
        </p>
      )}

      {showWardenPick && (
        <button className="btn btn-primary w-full" onClick={onWarden}>
          You are Warden · Pick Today’s Law
        </button>
      )}

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
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            className="action-card"
            data-done={checklist.scavenged ? 'true' : 'false'}
            onClick={onScavenge}
          >
            <span className="text-sm font-bold">Scavenge</span>
            <span className="text-[11px] text-muted">
              {checklist.scavenged ? '✔ Run logged' : '1 run left'}
            </span>
          </button>

          <button
            className="action-card"
            data-alert={checklist.doorstepWaiting > 0 ? 'true' : 'false'}
            onClick={onDoorstep}
          >
            <div className="flex w-full items-center justify-between gap-1">
              <span className="text-sm font-bold">Doorstep</span>
              {checklist.doorstepWaiting > 0 && (
                <span className="pill text-amber">
                  {checklist.doorstepWaiting}
                </span>
              )}
            </div>
            <span
              className={`text-[11px] ${checklist.doorstepWaiting > 0 ? 'font-semibold text-amber' : 'text-muted'}`}
            >
              {checklist.doorstepWaiting > 0
                ? `${checklist.doorstepWaiting} ${checklist.doorstepWaiting === 1 ? 'crate' : 'crates'} waiting`
                : 'Porch clear'}
            </span>
          </button>

          <button
            className="action-card"
            data-done={checklist.sent ? 'true' : 'false'}
            onClick={onSend}
          >
            <span className="text-sm font-bold">Send Crate</span>
            <span className="text-[11px] text-muted">
              {checklist.sent ? '✔ Sent today' : '1 delivery left'}
            </span>
          </button>

          <button
            className="action-card"
            data-done={checklist.broadcast ? 'true' : 'false'}
            onClick={onRadio}
          >
            <span className="text-sm font-bold">Radio</span>
            <span className="text-[11px] text-muted">
              {checklist.broadcast
                ? '✔ Signal sent'
                : `${radioFeed.length} ${radioFeed.length === 1 ? 'signal' : 'signals'}`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M9.7 9.3a2.4 2.4 0 0 1 4.6.9c0 1.5-2.3 1.9-2.3 3.3m0 3h.01"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrophyIcon = () => (
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
);
