import { C, FONT } from './palette';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export const Cinema = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink} />
    <path d="M10 6 H90 L86 18 H14 Z" fill={C.cream} />
    <rect x="10" y="20" width="80" height="1.5" fill={C.ink2} />
    {range(7).map((r) =>
      range(10).map((c) => {
        const x = 9 + c * 8.3 + (c >= 5 ? 2.5 : 0);
        const y = 30 + r * 9.5;
        return (
          <g key={`${r}-${c}`}>
            <rect x={x} y={y} width="6.4" height="6.2" rx="1.6" fill={C.clay} />
            <rect x={x} y={y + 5} width="6.4" height="2" rx="1" fill={C.rust} />
          </g>
        );
      })
    )}
    <text x="50" y="13.6" textAnchor="middle" fontSize="4" fontFamily={FONT} fontWeight="700" fill={C.ink2}>
      SCREEN
    </text>
  </svg>
);

export const Landscape = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.sky} />
    <path d="M0 62 Q20 48 40 58 T80 52 T100 56 V100 H0 Z" fill={C.sea} />
    <path d="M0 74 Q30 60 55 72 T100 70 V100 H0 Z" fill={C.leaf} />
    <path d="M0 88 Q40 80 100 86 V100 H0 Z" fill={C.teal} />
    <rect x="70" y="58" width="2.4" height="10" fill={C.ink2} />
    <circle cx="71.2" cy="56" r="5" fill={C.teal} />
    <path d="M18 66 l6 -5 l6 5 v7 h-12 Z" fill={C.cream} />
    <rect x="22.5" y="68" width="3" height="5" fill={C.clay} />
  </svg>
);

const EMOJIS = ['😂', '🥲', '💀', '😭', '🫠', '🤡', '🙃', '😎', '🥺', '🤯', '😤', '🫡', '👀', '🔥', '💅', '🤌'];

export const EmojiGrid = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink} />
    {EMOJIS.map((e, i) => {
      const x = 4 + (i % 4) * 23.5;
      const y = 4 + Math.floor(i / 4) * 23.5;
      return (
        <g key={e}>
          <rect x={x} y={y} width="21" height="21" rx="5" fill={C.ink2} />
          <text x={x + 10.5} y={y + 15} textAnchor="middle" fontSize="12">
            {e}
          </text>
        </g>
      );
    })}
  </svg>
);

export const Blob = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.cream} />
    <path
      d="M30 22 C46 8 78 14 82 34 C87 52 70 60 73 76 C76 92 46 94 37 81 C29 69 10 72 12 53 C14 37 19 31 30 22 Z"
      fill={C.clay}
    />
  </svg>
);

export const Island = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.sea} />
    <path d="M18 52 C14 30 40 18 56 24 C76 30 90 42 84 60 C78 80 50 86 34 78 C22 72 20 62 18 52 Z" fill={C.sand} />
    <path d="M30 50 C30 38 48 32 58 36 C70 42 74 52 66 62 C56 72 36 66 30 50 Z" fill={C.leaf} />
    <circle cx="74" cy="34" r="3" fill={C.leaf} />
    <rect x="73.3" y="34" width="1.4" height="8" fill={C.rust} />
    <path d="M10 14 q4 -3 8 0 M80 86 q4 -3 8 0 M8 80 q4 -3 8 0" stroke={C.sky} strokeWidth="1.4" fill="none" />
  </svg>
);

export const Face = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.teal} />
    <ellipse cx="50" cy="54" rx="32" ry="38" fill={C.sand} />
    <path d="M18 46 C18 16 82 16 82 46 C76 30 60 24 50 30 C40 24 24 30 18 46 Z" fill={C.ink2} />
    <ellipse cx="18" cy="56" rx="4" ry="7" fill={C.sand} />
    <ellipse cx="82" cy="56" rx="4" ry="7" fill={C.sand} />
  </svg>
);

export const Cake = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.plum} />
    <ellipse cx="50" cy="52" rx="42" ry="40" fill={C.white} />
    <ellipse cx="50" cy="50" rx="36" ry="34" fill={C.rose} />
    {Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return <circle key={i} cx={50 + Math.cos(a) * 30} cy={50 + Math.sin(a) * 28} r="2.4" fill={C.clay} />;
    })}
    <rect x="48.6" y="40" width="2.8" height="12" fill={C.sky} />
    <path d="M50 34 q3 4 0 6 q-3 -2 0 -6 Z" fill={C.mustard} />
  </svg>
);

export const NightSky = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill="#1d1a3a" />
    <path d="M0 86 Q30 74 60 84 T100 80 V100 H0 Z" fill={C.ink} />
    {[[14, 18, 1.6], [30, 40, 1], [46, 14, 2.2], [62, 30, 1.2], [80, 12, 1.8], [88, 44, 1], [22, 60, 1.2], [70, 58, 1.6], [52, 50, 0.9], [8, 40, 0.9], [38, 70, 0.8], [92, 26, 0.8]].map(([x, y, r]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={C.cream} />
    ))}
  </svg>
);

const GIFT_COLOURS = [C.clay, C.teal, C.mustard, C.plum, C.rose, C.sea, C.leaf, C.rust, C.sky];

export const Gifts = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink2} />
    {GIFT_COLOURS.map((c, i) => {
      const s = [22, 18, 26, 20, 24, 16, 22, 26, 18][i] ?? 20;
      const cx = 18 + (i % 3) * 32;
      const cy = 20 + Math.floor(i / 3) * 31;
      return (
        <g key={i}>
          <rect x={cx - s / 2} y={cy - s / 2 + 3} width={s} height={s} rx="2" fill={c} />
          <rect x={cx - 1.2} y={cy - s / 2 + 3} width="2.4" height={s} fill={C.cream} />
          <path d={`M${cx} ${cy - s / 2 + 3} q-6 -6 -6 0 Z M${cx} ${cy - s / 2 + 3} q6 -6 6 0 Z`} fill={C.cream} />
        </g>
      );
    })}
  </svg>
);

export const IceCream = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.sky} />
    <path d="M34 50 L50 94 L66 50 Z" fill={C.mustard} />
    <path d="M38 56 L62 56 M41 64 L59 64 M44 72 L56 72" stroke={C.rust} strokeWidth="1" />
    <circle cx="50" cy="44" r="17" fill={C.rose} />
    <circle cx="50" cy="24" r="13" fill={C.cream} />
    <path d="M36 52 q4 6 8 0 q4 6 8 0 q4 6 8 0" fill={C.rose} />
  </svg>
);

export const Mountain = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.sky} />
    <path d="M-4 96 L34 30 L52 56 L66 20 L104 96 Z" fill={C.sea} />
    <path d="M34 30 L28 40 L34 37 L39 41 Z M66 20 L58 34 L66 30 L72 35 Z" fill={C.white} />
    <rect y="88" width="100" height="12" fill={C.leaf} />
  </svg>
);
