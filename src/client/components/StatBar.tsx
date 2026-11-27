import { STAT_MAX } from '../../shared/game';

type Tone = 'food' | 'power' | 'health';

type Props = {
  label: string;
  value: number;
  max?: number;
  tone: Tone;
};

export const StatBar = ({ label, value, max = STAT_MAX, tone }: Props) => {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="flex items-center gap-2 text-xs font-semibold">
      <span className="w-12 shrink-0 text-muted">{label}</span>
      <div
        className="stat-track flex-1"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="stat-fill"
          data-tone={tone}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right tabular-nums">
        {value}/{max}
      </span>
    </div>
  );
};
