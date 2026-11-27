import { useEffect, useState, type ReactNode } from 'react';
import type {
  AppStateResponse,
  CrateBurnResponse,
  CrateOpenResponse,
  CrateScanResponse,
  CrateSendResponse,
  ScavengeResponse,
} from '../shared/api';
import { getState } from './api';
import { Doorstep } from './screens/Doorstep';
import { Home } from './screens/Home';
import { Leaderboard } from './screens/Leaderboard';
import { Radio } from './screens/Radio';
import { Scavenge } from './screens/Scavenge';
import { Send } from './screens/Send';

type Screen =
  | 'home'
  | 'scavenge'
  | 'doorstep'
  | 'send'
  | 'radio'
  | 'leaderboard';

export const App = () => {
  const [state, setState] = useState<AppStateResponse | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [sendPrefill, setSendPrefill] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getState()
      .then(setState)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load')
      );
  }, []);

  const handleScavengeComplete = (res: ScavengeResponse) => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            bunker: res.bunker,
            checklist: res.checklist,
            lastScavenge: res.outcome,
          }
        : prev
    );
  };

  const handleCrateSendComplete = (res: CrateSendResponse) => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            bunker: res.bunker,
            checklist: res.checklist,
            lastSent: res.summary,
          }
        : prev
    );
  };

  const handleCrateUpdate = (
    res: CrateScanResponse | CrateOpenResponse | CrateBurnResponse
  ) => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            bunker: res.bunker,
            checklist: res.checklist,
            crates: res.crates,
          }
        : prev
    );
  };

  if (error) {
    return (
      <Shell>
        <p className="font-semibold text-danger">{error}</p>
      </Shell>
    );
  }
  if (!state) {
    return (
      <Shell>
        <span className="loading-dot" aria-label="Loading" />
      </Shell>
    );
  }

  if (screen === 'leaderboard') {
    return (
      <main className="app enter">
        <Leaderboard onBack={() => setScreen('home')} />
      </main>
    );
  }

  if (screen === 'scavenge') {
    return (
      <main className="app enter">
        <Scavenge
          initialOutcome={state.lastScavenge}
          onComplete={handleScavengeComplete}
          onBack={() => setScreen('home')}
        />
      </main>
    );
  }

  if (screen === 'doorstep' && state.bunker) {
    return (
      <main className="app enter">
        <Doorstep
          crates={state.crates}
          bunker={state.bunker}
          law={state.law}
          sentToday={state.checklist.sent}
          onScanned={handleCrateUpdate}
          onOpened={handleCrateUpdate}
          onBurned={handleCrateUpdate}
          onSendBack={(username) => {
            setSendPrefill(username);
            setScreen('send');
          }}
          onBack={() => setScreen('home')}
        />
      </main>
    );
  }

  if (screen === 'send' && state.bunker) {
    return (
      <main className="app enter">
        <Send
          bunker={state.bunker}
          law={state.law}
          initialSent={state.lastSent}
          prefillRecipient={sendPrefill}
          onComplete={handleCrateSendComplete}
          onBack={() => {
            setSendPrefill(null);
            setScreen('home');
          }}
        />
      </main>
    );
  }

  if (screen === 'radio') {
    return (
      <main className="app enter">
        <Radio
          day={state.day}
          feed={state.radioFeed}
          onBack={() => setScreen('home')}
        />
      </main>
    );
  }

  return (
    <main className="app enter">
      <Home
        state={state}
        onScavenge={() => setScreen('scavenge')}
        onDoorstep={() => setScreen('doorstep')}
        onSend={() => {
          setSendPrefill(null);
          setScreen('send');
        }}
        onRadio={() => setScreen('radio')}
        onLeaderboard={() => setScreen('leaderboard')}
      />
    </main>
  );
};

const Shell = ({ children }: { children: ReactNode }) => (
  <main className="app flex items-center justify-center p-6 text-center">
    {children}
  </main>
);
