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
