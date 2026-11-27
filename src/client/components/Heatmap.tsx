import { useEffect, useRef } from 'react';
import { GRID, type GridCell } from '../../shared/game';

const RES = 160; // canvas pixels; CSS scales it to the picture size

// Neon ramp: cool blue -> yellow -> hot pink.
const STOPS: [number, string][] = [
  [0, '#3157ff'],
  [0.32, '#22d3ff'],
  [0.62, '#ffe03f'],
  [1, '#ff2e93'],
];

let palette: Uint8ClampedArray | null = null;
const getPalette = (): Uint8ClampedArray => {
  if (palette) return palette;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 1;
  const ctx = c.getContext('2d');
  if (!ctx) return new Uint8ClampedArray(1024);
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  for (const [at, color] of STOPS) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 1);
  palette = ctx.getImageData(0, 0, 256, 1).data;
  return palette;
};

const drawHeat = (canvas: HTMLCanvasElement, cells: GridCell[]) => {
  canvas.width = RES;
  canvas.height = RES;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  ctx.clearRect(0, 0, RES, RES);
  if (cells.length === 0) return;

  const max = Math.max(...cells.map((c) => c[2]));
  const cellPx = RES / GRID;
  const radius = cellPx * 3.4;

  // 1. Accumulate intensity in the alpha channel.
  for (const [cx, cy, count] of cells) {
    const x = (cx + 0.5) * cellPx;
    const y = (cy + 0.5) * cellPx;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = Math.min(1, 0.18 + 0.82 * (count / max));
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.globalAlpha = 1;

  // 2. Colourise: map alpha through the neon ramp.
  const img = ctx.getImageData(0, 0, RES, RES);
  const px = img.data;
  const pal = getPalette();
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] ?? 0;
    if (a === 0) continue;
    const o = a * 4;
    px[i] = pal[o] ?? 0;
    px[i + 1] = pal[o + 1] ?? 0;
    px[i + 2] = pal[o + 2] ?? 0;
    px[i + 3] = Math.min(235, a * 1.5);
  }
  ctx.putImageData(img, 0, 0);
};

export const Heatmap = ({
  cells,
  className,
}: {
  cells: GridCell[];
  className?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawHeat(ref.current, cells);
  }, [cells]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full pointer-events-none ${className ?? ''}`}
    />
  );
};
