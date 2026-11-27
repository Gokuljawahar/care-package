import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { PromptReveal, ResultResponse, TodayResponse } from '../shared/api';
import { getResult, getToday } from './api';
import { Leaderboard } from './screens/Leaderboard';
import { Play } from './screens/Play';
import { Result } from './screens/Result';
import { Start } from './screens/Start';

type Screen = 'start' | 'play' | 'result' | 'leaderboard';

const firstOpenIndex = (t: TodayResponse) => {
  const i = t.prompts.findIndex((p) => !t.reveals.some((r) => r.promptId === p.id));
  return i === -1 ? t.prompts.length : i;
};

export const App = () => {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [screen, setScreen] = useState<Screen>('start');
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadResult = useCallback(() => {
    setScreen('result');
    getResult()
      .then(setResult)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load result'));
  }, []);

  useEffect(() => {
    getToday()
      .then((t) => {
        setToday(t);
        const i = firstOpenIndex(t);
        setIndex(Math.min(i, t.prompts.length - 1));
        // Already finished today: straight to the result card.
        if (t.prompts.length > 0 && i === t.prompts.length) loadResult();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load'));
  }, [loadResult]);

  const addReveal = (reveal: PromptReveal) =>
    setToday((t) => (t ? { ...t, reveals: [...t.reveals, reveal] } : t));

  if (error) return <Shell><p className="font-semibold text-pink">{error}</p></Shell>;
  if (!today) return <Shell><p className="text-muted">Loading…</p></Shell>;

  if (screen === 'start') {
    return (
      <main className="app">
        <Start today={today} onPlay={() => setScreen('play')} onLeaderboard={() => setScreen('leaderboard')} />
      </main>
    );
  }
  if (screen === 'leaderboard') {
    return (
      <main className="app">
        <Leaderboard onBack={() => setScreen('start')} />
      </main>
    );
  }
  if (screen === 'result') {
    return result ? (
      <main className="app">
        <Result result={result} prompts={today.prompts} />
      </main>
    ) : (
      <Shell><p className="text-muted">Counting the crowd…</p></Shell>
    );
  }

  const prompt = today.prompts[index];
  if (!prompt) return <Shell><p className="text-muted">No prompts today.</p></Shell>;
  const isLast = index === today.prompts.length - 1;

  return (
    <main className="app">
      <Play
        key={prompt.id}
        prompt={prompt}
        index={index}
        count={today.prompts.length}
        existing={today.reveals.find((r) => r.promptId === prompt.id) ?? null}
        onReveal={addReveal}
        onNext={() => (isLast ? loadResult() : setIndex(index + 1))}
        nextLabel={isLast ? 'See result' : 'Next'}
      />
    </main>
  );
};

const Shell = ({ children }: { children: ReactNode }) => (
  <main className="app flex items-center justify-center p-6 text-center">{children}</main>
);
