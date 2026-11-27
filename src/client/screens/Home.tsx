import { useState } from 'react';
import { navigateTo, showLoginPrompt } from '@devvit/web/client';
import type { AppStateResponse } from '../../shared/api';
import {
  LAWS,
  START_FOOD,
  START_HEALTH,
  START_POWER,
} from '../../shared/game';
import { StatBar } from '../components/StatBar';
import { useCountdown } from '../hooks/useCountdown';

type Props = {
  state: AppStateResponse;
  onScavenge: () => void;
  onDoorstep: () => void;
  onSend: () => void;
  onRadio: () => void;
  onWarden: () => void;
  onLeaderboard: () => void;
};

export const Home = ({
  state,
  onScavenge,
  onDoorstep,
  onSend,
  onRadio,
  onWarden,
  onLeaderboard,
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
          <button
            className="icon-btn"
            onClick={onLeaderboard}
            aria-label="Leaderboard"
          >
            <TrophyIcon />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-3xl leading-none font-bold tracking-tight">
            {state.gameName}
          </h1>
          <p className="mt-1.5 max-w-[300px] text-xs text-muted">
            Every gift might be a trap. Every broadcast might be a lie.
          </p>

          <div className="panel mt-3 flex w-full flex-col gap-2 p-3 text-left">
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

  return (
    <div
      className={`flex h-full flex-col justify-between gap-1.5 px-4 pt-2.5 pb-3 ${
        bunker.infected ? 'infected-home' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="chip truncate">Day {state.day} · Tonight: ???</span>
        <div className="flex items-center gap-1.5">
          <span className="chip tabular-nums">{countdown}</span>
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
        className={`panel flex flex-col gap-1.5 px-3 py-2 ${bunker.infected ? 'infected-panel' : ''}`}
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

      <div className="flex flex-col gap-0.5 text-center text-[11px] font-semibold text-muted">
        <p className="truncate">
          {state.warden
            ? `Warden: u/${state.warden.username} (${state.warden.trust}%)${lawMeta ? ` · ${lawMeta.title}` : ''}`
            : `📻 ${ticker}`}
        </p>
        <p className="truncate text-ink/90">
          {`Scavenge ${checklist.scavenged ? '✔' : '✗'} · Doorstep ${checklist.doorstepWaiting} waiting · Send ${checklist.sent ? '✔' : '✗'} · Radio ${checklist.broadcast ? '✔' : '✗'}`}
        </p>
      </div>

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

          <button className="action-card" onClick={onDoorstep}>
            <span className="text-sm font-bold">Doorstep</span>
            <span className="text-[11px] text-muted">
              {checklist.doorstepWaiting} waiting
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
              {radioFeed.length} {radioFeed.length === 1 ? 'signal' : 'signals'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

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
