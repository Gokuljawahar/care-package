import { C, FONT } from './palette';

type Key = [label: string, width: number];

const KEY_ROWS: Key[][] = [
  [['esc', 1], ['F1', 1], ['F2', 1], ['F3', 1], ['F4', 1], ['F5', 1], ['F6', 1], ['F7', 1], ['F8', 1], ['F9', 1], ['F10', 1], ['F11', 1], ['F12', 1], ['ins', 1], ['del', 1]],
  [['`', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['⌫', 2]],
  [['tab', 1.5], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1], [']', 1], ['\\', 1.5]],
  [['caps', 1.75], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], [';', 1], ["'", 1], ['enter', 2.25]],
  [['shift', 2.25], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1], ['.', 1], ['/', 1], ['shift', 2.75]],
  [['fn', 1], ['ctrl', 1.25], ['alt', 1.25], ['', 7.25], ['alt', 1.25], ['←', 1], ['↓', 1], ['→', 1]],
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
