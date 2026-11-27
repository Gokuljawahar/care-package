// Game rules shared by server (authoritative) and client (display only).

export const GRID = 40;
export const PROMPTS_PER_DAY = 5;
export const MIN_CROWD = 10;
/** 1 = the 3x3 neighbourhood from the spec. Raise to 2 (5x5) if scores feel too harsh. */
export const RADIUS = 1;

/** One heatmap cell: [cellX, cellY, count]. */
export type GridCell = [number, number, number];

/** Sparse grid: "x,y" -> count (exactly the redis hash shape). */
export type GridMap = Record<string, number>;

export const toCell = (v: number): number =>
  Math.min(GRID - 1, Math.max(0, Math.floor(v * GRID)));

export const cellKey = (cx: number, cy: number): string => `${cx},${cy}`;

export const parseCellKey = (key: string): [number, number] | null => {
  const [a, b] = key.split(',');
  const cx = Number(a);
  const cy = Number(b);
  if (!Number.isInteger(cx) || !Number.isInteger(cy)) return null;
  if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return null;
  return [cx, cy];
};

/** Redis returns hash values as strings. */
export const gridFromHash = (hash: Record<string, string>): GridMap => {
  const grid: GridMap = {};
  for (const [key, value] of Object.entries(hash)) {
    const n = Number(value);
    if (parseCellKey(key) && Number.isFinite(n) && n > 0) grid[key] = n;
  }
  return grid;
};

export const gridToCells = (grid: GridMap): GridCell[] => {
  const cells: GridCell[] = [];
  for (const [key, count] of Object.entries(grid)) {
    const c = parseCellKey(key);
    if (c) cells.push([c[0], c[1], count]);
  }
  return cells;
};

export const totalTaps = (grid: GridMap): number =>
  Object.values(grid).reduce((a, b) => a + b, 0);

/** Taps in the (2*RADIUS+1)^2 neighbourhood around (cx, cy). */
export const neighbourhood = (
  grid: GridMap,
  cx: number,
  cy: number
): number => {
  let sum = 0;
  for (let dx = -RADIUS; dx <= RADIUS; dx++) {
    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      sum += grid[cellKey(cx + dx, cy + dy)] ?? 0;
    }
  }
  return sum;
};

export type Hotspot = { cx: number; cy: number; count: number };

/**
 * Highest neighbourhood count anywhere in the grid.
 * Each tapped cell spreads its count to its neighbours; the busiest
 * accumulator is the hottest spot. Handles crowds split across hotspots.
 */
export const hottest = (grid: GridMap): Hotspot => {
  const acc = new Map<number, number>();
  let best: Hotspot = { cx: 0, cy: 0, count: 0 };
  for (const [key, count] of Object.entries(grid)) {
    const c = parseCellKey(key);
    if (!c) continue;
    for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        const x = c[0] + dx;
        const y = c[1] + dy;
        if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
        const id = y * GRID + x;
        const v = (acc.get(id) ?? 0) + count;
        acc.set(id, v);
        if (v > best.count) best = { cx: x, cy: y, count: v };
      }
    }
  }
  return best;
};

/** 0-100: your neighbourhood vs the hottest neighbourhood. */
export const promptScore = (grid: GridMap, cx: number, cy: number): number => {
  const max = hottest(grid).count;
  if (max === 0) return 0;
  return Math.round((neighbourhood(grid, cx, cy) / max) * 100);
};

export const npcPercent = (scores: number[]): number =>
  scores.length === 0
    ? 0
    : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

export type Label = 'NPC' | 'Blends in' | 'Side quest' | 'Main Character';

export const labelFor = (npc: number): Label => {
  if (npc >= 80) return 'NPC';
  if (npc >= 50) return 'Blends in';
  if (npc >= 20) return 'Side quest';
  return 'Main Character';
};

/** Milliseconds timestamp of the next 00:00 UTC. */
export const nextResetAt = (now: number): number => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
};
