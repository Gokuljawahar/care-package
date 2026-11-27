import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { GRID, MIN_CROWD } from '../../shared/game';
import type { PromptReveal } from '../../shared/api';
import type { Prompt } from '../../shared/prompts';
import { postTap } from '../api';
import { Heatmap } from '../components/Heatmap';
import { Thumb } from '../components/Thumb';
import { useSquare } from '../hooks/useSquare';
import { Picture } from '../pictures';

type Props = {
  prompt: Prompt;
  index: number;
  count: number;
  /** Set when the player already tapped this prompt (e.g. after reload). */
  existing: PromptReveal | null;
  onReveal: (reveal: PromptReveal, done: boolean) => void;
  onNext: () => void;
  nextLabel: string;
};

const BLOOM_MS = 600;

type VarStyle = CSSProperties & Record<`--${string}`, string>;
const originStyle = (x: number, y: number): VarStyle => ({
  '--ox': `${x * 100}%`,
  '--oy': `${y * 100}%`,
});

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const Play = ({ prompt, index, count, existing, onReveal, onNext, nextLabel }: Props) => {
  const { ref, size } = useSquare<HTMLDivElement>();
  const [tap, setTap] = useState<{ x: number; y: number } | null>(
    existing ? { x: (existing.cx + 0.5) / GRID, y: (existing.cy + 0.5) / GRID } : null
  );
  const [reveal, setReveal] = useState<PromptReveal | null>(existing);
  const [bloomed, setBloomed] = useState(Boolean(existing));
  const [showNext, setShowNext] = useState(Boolean(existing));
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  // Only the value at mount matters: App adds new reveals to its list, which
  // would otherwise flip this mid-animation and cancel the bloom.
  const [replay] = useState(Boolean(existing));

  // After the reveal arrives: bloom the heat outward, then offer Next.
  useEffect(() => {
    if (!reveal || replay) return;
    const quick = reducedMotion();
    const raf = requestAnimationFrame(() => setBloomed(true));
    const t = window.setTimeout(() => setShowNext(true), quick ? 0 : BLOOM_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [reveal, replay]);

  const onTap = async (e: MouseEvent<HTMLDivElement>) => {
    if (tap || sending.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    sending.current = true;
    setTap({ x, y });
    setError(null);
    try {
      const res = await postTap({ promptId: prompt.id, x, y });
      setReveal(res.reveal);
      onReveal(res.reveal, res.done);
    } catch (err) {
      setTap(null);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      sending.current = false;
    }
  };

  return (
    <div className="flex h-full flex-col px-4 pt-3 pb-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-label={`Prompt ${index + 1} of ${count}`}>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className="dot" data-state={i < index ? 'done' : i === index ? 'now' : 'todo'} />
          ))}
        </div>
        <span className="text-xs font-semibold text-muted">
          {index + 1}/{count}
        </span>
      </div>

      <h2 className="mt-2 text-center font-display text-[22px] leading-tight font-semibold text-ink">
        {prompt.title}
      </h2>

      <div ref={ref} className="mt-2 flex min-h-0 flex-1 items-center justify-center">
        <div
          className="stage relative overflow-hidden rounded-2xl"
          style={{ width: size, height: size }}
          data-revealed={Boolean(reveal)}
          data-hot={Boolean(reveal?.hottest) && !replay}
          onClick={(e) => void onTap(e)}
          role="button"
          aria-label={tap ? 'Tapped' : `Tap the picture: ${prompt.title}`}
        >
          <div className="picture absolute inset-0">
            <Picture name={prompt.svgComponentName} />
          </div>
          {reveal && tap && (
            <div
              className="bloom absolute inset-0"
              data-on={bloomed}
              style={originStyle(tap.x, tap.y)}
            >
              <Heatmap cells={reveal.grid} />
            </div>
          )}
          {tap && <Thumb x={tap.x} y={tap.y} pulse={Boolean(reveal) && !replay} />}
        </div>
      </div>

      <div className="mt-2 flex h-[60px] shrink-0 items-center justify-center">
        {error ? (
          <p className="text-sm font-semibold text-pink">{error}</p>
        ) : reveal && showNext ? (
          <div className="flex w-full items-center gap-3">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-display text-lg font-semibold text-ink">
                {reveal.hottest ? 'Bang on the hotspot' : `${reveal.score}% crowd match`}
              </p>
              <p className="text-[11px] leading-snug text-muted">
                {reveal.total < MIN_CROWD
                  ? `You're one of the first ${reveal.total}. Check back after reset for the real crowd.`
                  : `${reveal.total} taps so far`}
              </p>
            </div>
            <button className="btn btn-primary shrink-0" onClick={onNext}>
              {nextLabel}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">{tap ? 'Reading the crowd…' : 'One tap. Think crowd.'}</p>
        )}
      </div>
    </div>
  );
};
