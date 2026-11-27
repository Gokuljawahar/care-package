import type { ReactNode } from 'react';
import { C, FONT } from './palette';

type Key = [label: string, width: number];

const KEY_ROWS: Key[][] = [
  [
    ['esc', 1],
    ['F1', 1],
    ['F2', 1],
    ['F3', 1],
    ['F4', 1],
    ['F5', 1],
    ['F6', 1],
    ['F7', 1],
    ['F8', 1],
    ['F9', 1],
    ['F10', 1],
    ['F11', 1],
    ['F12', 1],
    ['ins', 1],
    ['del', 1],
  ],
  [
    ['`', 1],
    ['1', 1],
    ['2', 1],
    ['3', 1],
    ['4', 1],
    ['5', 1],
    ['6', 1],
    ['7', 1],
    ['8', 1],
    ['9', 1],
    ['0', 1],
    ['-', 1],
    ['=', 1],
    ['⌫', 2],
  ],
  [
    ['tab', 1.5],
    ['Q', 1],
    ['W', 1],
    ['E', 1],
    ['R', 1],
    ['T', 1],
    ['Y', 1],
    ['U', 1],
    ['I', 1],
    ['O', 1],
    ['P', 1],
    ['[', 1],
    [']', 1],
    ['\\', 1.5],
  ],
  [
    ['caps', 1.75],
    ['A', 1],
    ['S', 1],
    ['D', 1],
    ['F', 1],
    ['G', 1],
    ['H', 1],
    ['J', 1],
    ['K', 1],
    ['L', 1],
    [';', 1],
    ["'", 1],
    ['enter', 2.25],
  ],
  [
    ['shift', 2.25],
    ['Z', 1],
    ['X', 1],
    ['C', 1],
    ['V', 1],
    ['B', 1],
    ['N', 1],
    ['M', 1],
    [',', 1],
    ['.', 1],
    ['/', 1],
    ['shift', 2.75],
  ],
  [
    ['fn', 1],
    ['ctrl', 1.25],
    ['alt', 1.25],
    ['', 7.25],
    ['alt', 1.25],
    ['←', 1],
    ['↓', 1],
    ['→', 1],
  ],
];

export const Keyboard = () => {
  const unit = 88 / 15;
  const rowH = 7;
  const top = 27;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="2" y="22" width="96" height="56" rx="5" fill={C.ink2} />
      {KEY_ROWS.map((row, r) => {
        let x = 6;
        return row.map(([label, w], i) => {
          const kx = x;
          x += w * unit;
          const ky = top + r * (rowH + 1.1);
          const special = label.length > 1 || w > 1;
          return (
            <g key={`${r}-${i}`}>
              <rect
                x={kx + 0.4}
                y={ky}
                width={w * unit - 0.8}
                height={rowH}
                rx="1.3"
                fill={special ? C.sand : C.cream}
              />
              {label && (
                <text
                  x={kx + (w * unit) / 2}
                  y={ky + rowH / 2 + 0.9}
                  textAnchor="middle"
                  fontSize={label.length > 2 ? 2.1 : 2.6}
                  fontFamily={FONT}
                  fontWeight="600"
                  fill={C.ink}
                >
                  {label}
                </text>
              )}
            </g>
          );
        });
      })}
    </svg>
  );
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const polar = (
  cx: number,
  cy: number,
  r: number,
  deg: number
): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

export const Pizza = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink} />
    <circle cx="50" cy="50" r="42" fill={C.mustard} />
    <circle cx="50" cy="50" r="36" fill={C.clay} />
    {[
      [38, 34],
      [62, 30],
      [70, 52],
      [54, 66],
      [32, 60],
      [46, 48],
      [60, 44],
      [40, 74],
      [72, 68],
      [26, 44],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill={C.rust} />
    ))}
    {range(8).map((i) => {
      const [x, y] = polar(50, 50, 42, i * 45);
      return (
        <line
          key={i}
          x1="50"
          y1="50"
          x2={x}
          y2={y}
          stroke={C.ink}
          strokeWidth="1.2"
        />
      );
    })}
  </svg>
);

export const Dartboard = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink2} />
    {[44, 36, 28, 20, 12, 5].map((r, i) => (
      <circle key={r} cx="50" cy="50" r={r} fill={i % 2 ? C.cream : C.ink} />
    ))}
    <circle cx="50" cy="50" r="2.4" fill={C.clay} />
    {range(10).map((i) => {
      const [x, y] = polar(50, 50, 44, i * 36);
      return (
        <line
          key={i}
          x1="50"
          y1="50"
          x2={x}
          y2={y}
          stroke={C.clay}
          strokeWidth="0.8"
        />
      );
    })}
  </svg>
);

export const Clock = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.teal} />
    <circle
      cx="50"
      cy="50"
      r="42"
      fill={C.cream}
      stroke={C.ink}
      strokeWidth="3"
    />
    {range(12).map((i) => {
      const [x, y] = polar(50, 50, 33, i * 30);
      return (
        <text
          key={i}
          x={x}
          y={y + 2.4}
          textAnchor="middle"
          fontSize="7"
          fontFamily={FONT}
          fontWeight="700"
          fill={C.ink}
        >
          {i === 0 ? 12 : i}
        </text>
      );
    })}
    <circle cx="50" cy="50" r="2.5" fill={C.ink} />
  </svg>
);

export const Lift = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.sand} />
    <rect x="26" y="6" width="48" height="88" rx="6" fill={C.ink2} />
    {range(14).map((i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 40 + col * 20;
      const y = 18 + row * 10.5;
      return (
        <g key={i}>
          <circle cx={x} cy={y} r="4.2" fill={C.cream} />
          <text
            x={x}
            y={y + 1.7}
            textAnchor="middle"
            fontSize="4.6"
            fontFamily={FONT}
            fontWeight="700"
            fill={C.ink}
          >
            {i === 12 ? 'G' : i === 13 ? '🔔' : 12 - i}
          </text>
        </g>
      );
    })}
  </svg>
);

const star = (cx: number, cy: number, r: number) =>
  range(10)
    .map((i) => polar(cx, cy, i % 2 ? r * 0.45 : r, i * 36).join(','))
    .join(' ');

export const Stars = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink} />
    {range(5).map((i) => (
      <polygon
        key={i}
        points={star(14 + i * 18, 50, 8)}
        fill="none"
        stroke={C.mustard}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    ))}
  </svg>
);

export const NumberLine = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.cream} />
    {range(10).map((i) => {
      const x = 5 + (i % 5) * 18.5;
      const y = i < 5 ? 26 : 56;
      return (
        <g key={i}>
          <rect
            x={x}
            y={y}
            width="15"
            height="20"
            rx="3"
            fill={i % 3 === 0 ? C.teal : i % 3 === 1 ? C.clay : C.mustard}
          />
          <text
            x={x + 7.5}
            y={y + 14}
            textAnchor="middle"
            fontSize="11"
            fontFamily={FONT}
            fontWeight="700"
            fill={C.white}
          >
            {i + 1}
          </text>
        </g>
      );
    })}
  </svg>
);

const SWATCHES = [
  '#e0714b',
  '#f2b33d',
  '#78b357',
  '#2fae9c',
  '#3a7bff',
  '#7a4a7e',
  '#f19aa6',
  '#2a1b17',
  '#fff8ee',
  '#b9532f',
  '#86c8d8',
  '#ff2e93',
  '#9a8f84',
  '#4f6b2f',
  '#ffd23f',
  '#5b3df5',
];

export const Swatches = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink2} />
    {SWATCHES.map((c, i) => (
      <rect
        key={c}
        x={5 + (i % 4) * 23}
        y={5 + Math.floor(i / 4) * 23}
        width="20"
        height="20"
        rx="4"
        fill={c}
      />
    ))}
  </svg>
);

export const TicTacToe = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.cream} />
    <g stroke={C.ink} strokeWidth="3" strokeLinecap="round">
      <line x1="38" y1="12" x2="38" y2="88" />
      <line x1="62" y1="12" x2="62" y2="88" />
      <line x1="12" y1="38" x2="88" y2="38" />
      <line x1="12" y1="62" x2="88" y2="62" />
    </g>
  </svg>
);

export const Piano = () => {
  const whites = 10;
  const w = 90 / whites;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" fill={C.ink} />
      <rect x="3" y="22" width="94" height="60" rx="3" fill={C.rust} />
      {range(whites).map((i) => (
        <rect
          key={i}
          x={5 + i * w}
          y="28"
          width={w - 0.8}
          height="50"
          rx="1.2"
          fill={C.white}
        />
      ))}
      {range(whites - 1)
        .filter((i) => i % 7 !== 2 && i % 7 !== 6)
        .map((i) => (
          <rect
            key={i}
            x={5 + (i + 1) * w - w * 0.3}
            y="28"
            width={w * 0.6}
            height="30"
            rx="1"
            fill={C.ink}
          />
        ))}
    </svg>
  );
};

export const Week = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.sand} />
    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
      <g key={d}>
        <rect
          x="14"
          y={7 + i * 12.6}
          width="72"
          height="11"
          rx="3"
          fill={i > 4 ? C.teal : C.cream}
        />
        <text
          x="50"
          y={14.6 + i * 12.6}
          textAnchor="middle"
          fontSize="6.5"
          fontFamily={FONT}
          fontWeight="600"
          fill={C.ink}
        >
          {d}
        </text>
      </g>
    ))}
  </svg>
);

// Invented apps with generic glyphs only.
const APPS: { bg: string; glyph: (x: number, y: number) => ReactNode }[] = [
  {
    bg: C.clay,
    glyph: (x, y) => <circle cx={x} cy={y} r="4" fill={C.white} />,
  },
  {
    bg: C.teal,
    glyph: (x, y) => (
      <rect x={x - 4} y={y - 3} width="8" height="6" rx="1" fill={C.white} />
    ),
  },
  {
    bg: C.mustard,
    glyph: (x, y) => (
      <path
        d={`M${x - 4} ${y + 3} L${x} ${y - 4} L${x + 4} ${y + 3} Z`}
        fill={C.ink}
      />
    ),
  },
  {
    bg: C.plum,
    glyph: (x, y) => (
      <path
        d={`M${x - 4} ${y} h8 M${x} ${y - 4} v8`}
        stroke={C.white}
        strokeWidth="2"
      />
    ),
  },
  {
    bg: C.sky,
    glyph: (x, y) => (
      <circle
        cx={x}
        cy={y}
        r="4"
        fill="none"
        stroke={C.ink}
        strokeWidth="1.8"
      />
    ),
  },
  {
    bg: C.rose,
    glyph: (x, y) => (
      <path
        d={`M${x} ${y + 4} l-4 -4 a2.4 2.4 0 0 1 4 -2.6 a2.4 2.4 0 0 1 4 2.6 Z`}
        fill={C.white}
      />
    ),
  },
  {
    bg: C.leaf,
    glyph: (x, y) => (
      <path
        d={`M${x - 4} ${y + 2} l3 -5 l2 3 l3 -2`}
        stroke={C.white}
        strokeWidth="1.8"
        fill="none"
      />
    ),
  },
  {
    bg: C.ink,
    glyph: (x, y) => (
      <rect x={x - 3} y={y - 3} width="6" height="6" rx="3" fill={C.mustard} />
    ),
  },
];

export const HomeScreen = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink} />
    <rect
      x="22"
      y="3"
      width="56"
      height="94"
      rx="9"
      fill={C.sea}
      stroke={C.ink2}
      strokeWidth="2"
    />
    {range(16).map((i) => {
      const app = APPS[(i * 5 + 3) % APPS.length];
      if (!app) return null;
      const x = 28 + (i % 4) * 12;
      const y = 14 + Math.floor(i / 4) * 14;
      return (
        <g key={i}>
          <rect x={x} y={y} width="9.5" height="9.5" rx="2.6" fill={app.bg} />
          <g
            transform={`translate(${x + 4.75} ${y + 4.75}) scale(0.55) translate(${-(x + 4.75)} ${-(y + 4.75)})`}
          >
            {app.glyph(x + 4.75, y + 4.75)}
          </g>
        </g>
      );
    })}
    <rect
      x="26"
      y="80"
      width="48"
      height="12"
      rx="5"
      fill={C.ink2}
      opacity="0.7"
    />
    {range(4).map((i) => {
      const app = APPS[i];
      if (!app) return null;
      const x = 28 + i * 12;
      return (
        <rect
          key={i}
          x={x}
          y="81.3"
          width="9.5"
          height="9.5"
          rx="2.6"
          fill={app.bg}
        />
      );
    })}
  </svg>
);
