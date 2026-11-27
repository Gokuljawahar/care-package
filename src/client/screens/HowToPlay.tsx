import { LAWS, type LawId } from '../../shared/game';

type Props = {
  day: number;
  law: LawId | null;
  onBack: () => void;
};

const RULES: readonly { title: string; body: string }[] = [
  {
    title: 'Midnight (00:00 UTC)',
    body: 'Pay -1 Food & -1 Power plus a hidden disaster. Each missing unit costs 1 Health.',
  },
  {
    title: 'Crates & Scrap',
    body: 'Real gifts give +3 supplies & +Trust. Rig a Trojan (2 Scrap) to steal stock & deal -2 Health.',
  },
  {
    title: 'Infection & Cures',
    body: 'Hit 0 Health and you flip Infected 🧟 (free Trojans only). Open a survivor’s Real crate to cure (Health 5).',
  },
  {
    title: 'Radio & Warden',
    body: 'True Radio claims boost Trust %. Top Trust survivor with ≥3 actions becomes Warden and picks 1 law.',
  },
];

export const HowToPlay = ({ day, law, onBack }: Props) => {
  const lawMeta = law ? LAWS[law] : null;

  return (
    <div className="flex h-full flex-col justify-between gap-2 px-4 pt-2.5 pb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <BackArrow />
          </button>
          <h2 className="font-display text-xl font-bold">How to Play</h2>
        </div>
        <span className="chip">Day {day}</span>
      </div>

      <div className="panel flex flex-1 flex-col justify-between p-3">
        <div className="flex flex-col gap-2">
          {RULES.map((rule) => (
            <div key={rule.title}>
              <p className="text-xs font-bold text-amber">{rule.title}</p>
              <p className="text-[11px] leading-snug text-muted">{rule.body}</p>
            </div>
          ))}
        </div>

        {lawMeta && (
          <div className="rounded-xl bg-surface-2/70 px-2.5 py-1.5 text-[11px] leading-snug">
            <span className="font-bold text-ink">
              Today’s Law — {lawMeta.title}:
            </span>{' '}
            <span className="text-muted">{lawMeta.description}</span>
          </div>
        )}
      </div>

      <button className="btn btn-primary w-full" onClick={onBack}>
        Back to Bunker
      </button>
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
