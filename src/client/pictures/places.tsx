import { C, FONT } from './palette';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export const Wall = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.sand} />
    <rect y="80" width="100" height="20" fill={C.rust} />
    <rect y="78" width="100" height="3" fill={C.cream} />
    <rect x="8" y="52" width="34" height="26" rx="3" fill={C.teal} />
    <rect x="8" y="48" width="34" height="8" rx="4" fill={C.sea} />
    <rect x="66" y="40" width="3" height="38" fill={C.ink2} />
    <path d="M60 40 h15 l-4 -10 h-7 Z" fill={C.mustard} />
    <rect x="56" y="78" width="20" height="2" fill={C.ink2} />
  </svg>
);

export const CarPark = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink2} />
    <rect y="44" width="100" height="12" fill={C.ink} />
    {range(6).map((i) => (
      <g key={i}>
        <rect x={4 + i * 16} y="6" width="0.9" height="36" fill={C.cream} />
        <rect x={4 + i * 16} y="58" width="0.9" height="36" fill={C.cream} />
      </g>
    ))}
    <rect x="94.5" y="6" width="0.9" height="36" fill={C.cream} />
    <rect x="94.5" y="58" width="0.9" height="36" fill={C.cream} />
    {[[1, 0, C.clay], [3, 0, C.teal], [0, 1, C.mustard], [4, 1, C.sky]].map(([col, row, fill]) => (
      <rect key={`${col}-${row}`} x={7 + Number(col) * 16} y={row ? 62 : 10} width="10" height="28" rx="3" fill={String(fill)} />
    ))}
    <text x="50" y="52.5" textAnchor="middle" fontSize="4.5" fontFamily={FONT} fontWeight="700" fill={C.mustard}>
      ← EXIT
    </text>
  </svg>
);

export const Bus = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink} />
    <rect x="22" y="4" width="56" height="92" rx="10" fill={C.mustard} />
    <rect x="26" y="8" width="48" height="84" rx="7" fill={C.cream} />
    <rect x="28" y="10" width="10" height="8" rx="2" fill={C.ink2} />
    {range(8).map((r) =>
      [0, 1, 3, 4].map((c) => (
        <rect key={`${r}-${c}`} x={29 + c * 9} y={24 + r * 8.4} width="7" height="6.4" rx="1.6" fill={C.clay} />
      ))
    )}
  </svg>
);

const BOOKS = [C.clay, C.teal, C.mustard, C.plum, C.sea, C.rose, C.leaf, C.rust];

export const Bookshelf = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink2} />
    {range(3).map((shelf) => {
      let x = 8;
      return (
        <g key={shelf}>
          <rect x="4" y={30 + shelf * 30} width="92" height="3" fill={C.sand} />
          {range(10).map((i) => {
            const w = 4 + ((i * 7 + shelf * 3) % 5);
            const h = 16 + ((i * 5 + shelf) % 8);
            const bx = x;
            x += w + 1.2;
            if (bx + w > 92) return null;
            const lean = shelf === 1 && i === 6;
            return (
              <rect
                key={i}
                x={bx}
                y={30 + shelf * 30 - h}
                width={w}
                height={h}
                rx="1"
                fill={BOOKS[(i + shelf * 3) % BOOKS.length]}
                transform={lean ? `rotate(14 ${bx} ${30 + shelf * 30})` : undefined}
              />
            );
          })}
        </g>
      );
    })}
  </svg>
);

export const Fridge = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.teal} />
    <rect x="24" y="4" width="52" height="92" rx="6" fill={C.cream} />
    <rect x="24" y="36" width="52" height="2" fill={C.sand} />
    <rect x="68" y="16" width="3" height="14" rx="1.5" fill={C.sand} />
    <rect x="68" y="44" width="3" height="20" rx="1.5" fill={C.sand} />
    <rect x="34" y="50" width="16" height="12" fill={C.white} transform="rotate(-6 42 56)" />
    <circle cx="42" cy="50" r="1.8" fill={C.clay} />
  </svg>
);

export const Doors = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.plum} />
    <rect y="84" width="100" height="16" fill={C.ink2} />
    {[C.clay, C.teal, C.mustard].map((fill, i) => (
      <g key={fill}>
        <rect x={8 + i * 30} y="28" width="24" height="56" rx="2" fill={fill} />
        <circle cx={27 + i * 30} cy="58" r="1.8" fill={C.ink} />
        <text x={20 + i * 30} y="22" textAnchor="middle" fontSize="8" fontFamily={FONT} fontWeight="700" fill={C.cream}>
          {i + 1}
        </text>
      </g>
    ))}
  </svg>
);

export const Checkout = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.cream} />
    {range(5).map((lane) => {
      const x = 6 + lane * 19;
      const queue = [3, 1, 4, 0, 2][lane] ?? 0;
      return (
        <g key={lane}>
          <rect x={x} y="8" width="12" height="18" rx="2" fill={C.ink2} />
          <text x={x + 6} y="19" textAnchor="middle" fontSize="6" fontFamily={FONT} fontWeight="700" fill={C.mustard}>
            {lane + 1}
          </text>
          {range(queue).map((q) => (
            <circle key={q} cx={x + 6} cy={36 + q * 13} r="4.6" fill={[C.clay, C.teal, C.plum, C.sea][q % 4]} />
          ))}
        </g>
      );
    })}
  </svg>
);

export const Bed = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink2} />
    <rect x="16" y="6" width="68" height="10" rx="3" fill={C.rust} />
    <rect x="18" y="14" width="64" height="80" rx="5" fill={C.cream} />
    <rect x="24" y="18" width="24" height="12" rx="5" fill={C.white} />
    <rect x="52" y="18" width="24" height="12" rx="5" fill={C.white} />
    <rect x="18" y="40" width="64" height="54" rx="5" fill={C.teal} />
    <rect x="18" y="40" width="64" height="6" rx="3" fill={C.sea} />
  </svg>
);

export const Desk = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink} />
    <rect x="4" y="10" width="92" height="80" rx="4" fill={C.sand} />
    <rect x="30" y="22" width="40" height="28" rx="2" fill={C.ink2} />
    <rect x="26" y="50" width="48" height="16" rx="2" fill={C.cream} />
    <rect x="76" y="20" width="12" height="16" rx="1" fill={C.white} />
    <rect x="10" y="60" width="10" height="14" rx="2" fill={C.leaf} />
    <circle cx="15" cy="58" r="6" fill={C.leaf} />
  </svg>
);

export const Stairs = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.sky} />
    {range(7).map((i) => (
      <g key={i}>
        <rect x={6 + i * 12.5} y={86 - i * 11} width={94 - i * 12.5} height="11" fill={i % 2 ? C.clay : C.rust} />
        <rect x={6 + i * 12.5} y={86 - i * 11} width={94 - i * 12.5} height="2" fill={C.cream} />
      </g>
    ))}
  </svg>
);

export const Pool = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.cream} />
    <rect x="8" y="8" width="84" height="84" rx="4" fill={C.sky} />
    {range(5).map((i) => (
      <g key={i}>
        <line x1={8 + (i + 1) * 14} y1="12" x2={8 + (i + 1) * 14} y2="88" stroke={C.white} strokeWidth="1" strokeDasharray="3 2" />
      </g>
    ))}
    {range(6).map((i) => (
      <text key={i} x={15 + i * 14} y="96" textAnchor="middle" fontSize="4.5" fontFamily={FONT} fontWeight="700" fill={C.ink}>
        {i + 1}
      </text>
    ))}
    <circle cx="29" cy="40" r="3" fill={C.clay} />
    <circle cx="71" cy="62" r="3" fill={C.mustard} />
  </svg>
);

export const Lockers = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.ink} />
    {range(20).map((i) => {
      const x = 6 + (i % 5) * 18;
      const y = 6 + Math.floor(i / 5) * 22.5;
      return (
        <g key={i}>
          <rect x={x} y={y} width="16" height="20.5" rx="1.6" fill={i % 7 === 3 ? C.clay : C.sea} />
          <rect x={x + 3} y={y + 3} width="10" height="1.2" fill={C.ink} opacity="0.5" />
          <rect x={x + 3} y={y + 5.5} width="10" height="1.2" fill={C.ink} opacity="0.5" />
          <text x={x + 8} y={y + 15} textAnchor="middle" fontSize="5" fontFamily={FONT} fontWeight="700" fill={C.cream}>
            {i + 1}
          </text>
        </g>
      );
    })}
  </svg>
);

export const FloorPlan = () => (
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill={C.sand} />
    <rect x="6" y="6" width="88" height="88" fill={C.cream} stroke={C.ink} strokeWidth="2.4" />
    <line x1="54" y1="6" x2="54" y2="58" stroke={C.ink} strokeWidth="2.4" />
    <line x1="6" y1="58" x2="40" y2="58" stroke={C.ink} strokeWidth="2.4" />
    <rect x="10" y="10" width="26" height="34" rx="2" fill={C.teal} />
    <rect x="60" y="10" width="30" height="10" rx="1" fill={C.rust} />
    <rect x="60" y="40" width="14" height="14" rx="7" fill={C.mustard} />
    <rect x="10" y="64" width="34" height="12" rx="2" fill={C.plum} />
    <rect x="66" y="70" width="24" height="20" rx="1" fill={C.clay} />
    <rect x="86" y="30" width="4" height="22" fill={C.sky} />
  </svg>
);
