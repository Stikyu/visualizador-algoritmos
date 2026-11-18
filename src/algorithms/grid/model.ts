import { createRng, randInt } from '../rng';

/** Tipo de celda. EMPTY cuesta 1 al entrar; MUD (barro) cuesta 5; WALL no se puede pisar. */
export const EMPTY = 0;
export const WALL = 1;
export const MUD = 2;
export const MUD_COST = 5;

export interface Grid {
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly number[];
  readonly start: number;
  readonly end: number;
}

export const idx = (g: { cols: number }, r: number, c: number) => r * g.cols + c;
export const rowOf = (g: { cols: number }, i: number) => Math.floor(i / g.cols);
export const colOf = (g: { cols: number }, i: number) => i % g.cols;
export const cost = (g: Grid, i: number) => (g.cells[i] === MUD ? MUD_COST : 1);

/** Vecinos transitables en orden fijo: arriba, derecha, abajo, izquierda. */
export function neighbors(g: Grid, i: number): number[] {
  const r = rowOf(g, i);
  const c = colOf(g, i);
  const out: number[] = [];
  if (r > 0) out.push(i - g.cols);
  if (c < g.cols - 1) out.push(i + 1);
  if (r < g.rows - 1) out.push(i + g.cols);
  if (c > 0) out.push(i - 1);
  return out.filter((j) => g.cells[j] !== WALL);
}

export const manhattan = (g: Grid, a: number, b: number) =>
  Math.abs(rowOf(g, a) - rowOf(g, b)) + Math.abs(colOf(g, a) - colOf(g, b));

export function emptyGrid(rows = 21, cols = 41): Grid {
  return {
    rows,
    cols,
    cells: new Array<number>(rows * cols).fill(EMPTY),
    start: idx({ cols }, Math.floor(rows / 2), 4),
    end: idx({ cols }, Math.floor(rows / 2), cols - 5),
  };
}

/**
 * Laberinto con "backtracker recursivo" (un DFS aleatorio sobre las celdas impares).
 * Produce un laberinto perfecto (un único camino entre dos celdas). Con `loops` > 0 se
 * abren paredes extra al azar, así hay varios caminos y los algoritmos se diferencian.
 */
export function generateMaze(rows: number, cols: number, seed: number, loops = 0.08): Grid {
  const rng = createRng(seed);
  const cells = new Array<number>(rows * cols).fill(WALL);
  const at = (r: number, c: number) => r * cols + c;
  const stack: [number, number][] = [[1, 1]];
  cells[at(1, 1)] = EMPTY;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const options = (
      [
        [-2, 0],
        [0, 2],
        [2, 0],
        [0, -2],
      ] as const
    ).filter(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      return nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && cells[at(nr, nc)] === WALL;
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [dr, dc] = options[randInt(rng, 0, options.length - 1)];
    cells[at(r + dr / 2, c + dc / 2)] = EMPTY;
    cells[at(r + dr, c + dc)] = EMPTY;
    stack.push([r + dr, c + dc]);
  }
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const i = at(r, c);
      if (cells[i] !== WALL || rng() >= loops) continue;
      // Sólo abrir paredes que separan dos pasillos (horizontal o vertical).
      const horiz = cells[at(r, c - 1)] !== WALL && cells[at(r, c + 1)] !== WALL;
      const vert = cells[at(r - 1, c)] !== WALL && cells[at(r + 1, c)] !== WALL;
      if (horiz !== vert) cells[i] = EMPTY;
    }
  }
  return { rows, cols, cells, start: at(1, 1), end: at(rows - 2, cols - 2) };
}

/** Paredes y barro al azar (manteniendo libres inicio y fin). */
export function randomObstacles(base: Grid, seed: number, wallP = 0.25, mudP = 0.12): Grid {
  const rng = createRng(seed);
  const cells = base.cells.map((_, i) => {
    if (i === base.start || i === base.end) return EMPTY;
    const x = rng();
    return x < wallP ? WALL : x < wallP + mudP ? MUD : EMPTY;
  });
  return { ...base, cells };
}

/** Codificación compacta para compartir: filas×columnas, inicio, fin y celdas en base 3 → texto. */
export function encodeGrid(g: Grid): string {
  return `${g.rows}x${g.cols}.${g.start}.${g.end}.${g.cells.join('')}`;
}

export function decodeGrid(text: string): Grid | null {
  const m = /^(\d+)x(\d+)\.(\d+)\.(\d+)\.([012]+)$/.exec(text);
  if (!m) return null;
  const rows = Number(m[1]);
  const cols = Number(m[2]);
  const cells = m[5].split('').map(Number);
  if (rows < 3 || cols < 3 || rows > 61 || cols > 101 || cells.length !== rows * cols) return null;
  const start = Number(m[3]);
  const end = Number(m[4]);
  if (start >= cells.length || end >= cells.length) return null;
  return { rows, cols, cells, start, end };
}
