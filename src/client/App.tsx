import { useEffect, useState, type ReactNode } from 'react';
import type { PromptReveal, TodayResponse } from '../shared/api';
import { getToday } from './api';
import { Play } from './screens/Play';

export const App = () => {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    getToday()
      .then((t) => {
        setToday(t);
        const firstOpen = t.prompts.findIndex((p) => !t.reveals.some((r) => r.promptId === p.id));
        setIndex(firstOpen === -1 ? Math.max(0, t.prompts.length - 1) : firstOpen);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load'));
  }, []);

  const addReveal = (reveal: PromptReveal) =>
    setToday((t) => (t ? { ...t, reveals: [...t.reveals, reveal] } : t));

  if (error) return <Shell><p className="text-pink">{error}</p></Shell>;
  if (!today) return <Shell><p className="text-muted">Loading…</p></Shell>;
  const prompt = today.prompts[index];
  if (!prompt) return <Shell><p className="text-muted">No prompts today.</p></Shell>;

  return (
    <main className="app">
      <Play
        key={prompt.id}
        prompt={prompt}
        index={index}
        count={today.prompts.length}
        existing={today.reveals.find((r) => r.promptId === prompt.id) ?? null}
        onReveal={addReveal}
        onNext={() => setIndex((i) => Math.min(i + 1, today.prompts.length - 1))}
        nextLabel="Next"
      />
    </main>
  );
};

const Shell = ({ children }: { children: ReactNode }) => (
  <main className="app flex items-center justify-center p-6 text-center">{children}</main>
);
