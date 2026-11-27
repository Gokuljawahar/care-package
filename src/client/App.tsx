import { useEffect, useState, type ReactNode } from 'react';
import type { AppStateResponse, ScavengeResponse } from '../shared/api';
import { getState } from './api';
import { Home } from './screens/Home';
import { Leaderboard } from './screens/Leaderboard';
import { Scavenge } from './screens/Scavenge';

type Screen = 'home' | 'scavenge' | 'leaderboard';

export const App = () => {
  const [state, setState] = useState<AppStateResponse | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
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

  return (
    <main className="app enter">
      <Home
        state={state}
        onScavenge={() => setScreen('scavenge')}
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
