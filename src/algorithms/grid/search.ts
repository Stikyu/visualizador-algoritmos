import type { AlgorithmMeta, BaseStep } from '../types';
import { cost, manhattan, neighbors, rowOf, colOf, type Grid } from './model';

// ---------------------------------------------------------------------------
// Pasos y estado
// ---------------------------------------------------------------------------

export const NONE = 0;
export const FRONTIER = 1;
export const VISITED = 2;
export const PATH = 3;
export const CURRENT = 4;

export interface GridStep extends BaseStep {
  /** Celdas que cambian de marca en este paso. */
  readonly cells: readonly number[];
  readonly mark: typeof FRONTIER | typeof VISITED | typeof PATH | typeof CURRENT | typeof NONE;
}

export interface GridState {
  readonly marks: readonly number[];
  readonly current: number | null;
  readonly explored: number;
  readonly frontier: number;
  readonly pathLength: number;
}

export const initialGridState = (g: Grid): GridState => ({
  marks: new Array<number>(g.cells.length).fill(NONE),
  current: null,
  explored: 0,
  frontier: 0,
  pathLength: 0,
});

export function reduceGrid(s: GridState, step: GridStep): GridState {
  const marks = s.marks.slice();
  let { explored, frontier, pathLength } = s;
  let current: number | null = s.current;
  for (const i of step.cells) {
    const before = marks[i];
    if (step.mark === CURRENT) {
      current = i;
      if (before !== VISITED) explored++;
      if (before === FRONTIER) frontier--;
      marks[i] = VISITED;
      continue;
    }
    if (step.mark === FRONTIER && before === NONE) frontier++;
    if (step.mark === PATH) pathLength++;
    marks[i] = step.mark;
  }
  return {
    marks,
    current: step.mark === CURRENT ? current : step.mark === PATH ? null : current,
    explored,
    frontier,
    pathLength,
  };
}

// ---------------------------------------------------------------------------
// Cola de prioridad (min-heap binario genérico)
// ---------------------------------------------------------------------------

export class MinHeap<T> {
  private readonly a: T[] = [];
  constructor(private readonly less: (x: T, y: T) => boolean) {}
  get size() {
    return this.a.length;
  }
  push(x: T) {
    const a = this.a;
    a.push(x);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T | undefined {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// ---------------------------------------------------------------------------
// Algoritmos
// ---------------------------------------------------------------------------

export interface GridResult {
  /** Camino de inicio a fin (incluidos) o [] si no hay. */
  readonly path: number[];
  readonly cost: number;
  readonly explored: number;
}

export interface GridAlgorithm {
  readonly meta: AlgorithmMeta;
  readonly run: (g: Grid) => Generator<GridStep, GridResult, void>;
}

const pos = (g: Grid, i: number) => `(${rowOf(g, i)}, ${colOf(g, i)})`;
const st = (
  line: number,
  text: string,
  mark: GridStep['mark'],
  cells: readonly number[],
  vars = {},
): GridStep => ({
  type:
    mark === CURRENT ? 'visit' : mark === FRONTIER ? 'enqueue' : mark === PATH ? 'path' : 'note',
  line,
  text,
  vars,
  cells,
  mark,
});

function* tracePath(g: Grid, parent: Map<number, number>, line: number, explored: number) {
  const path: number[] = [];
  for (let c: number | undefined = g.end; c !== undefined; c = parent.get(c)) path.push(c);
  path.reverse();
  const total = path.slice(1).reduce((s, i) => s + cost(g, i), 0);
  for (let k = 0; k < path.length; k++) {
    yield st(
      line,
      k === 0
        ? 'Reconstruimos el camino siguiendo los padres desde el fin.'
        : `Camino: ${k} de ${path.length - 1} pasos.`,
      PATH,
      [path[k]],
      {
        largo: path.length - 1,
        costo: total,
      },
    );
  }
  return { path, cost: total, explored };
}

function* noPath(line: number, explored: number): Generator<GridStep, GridResult, void> {
  yield st(line, 'Se exploró todo lo alcanzable y el fin no apareció: no hay camino.', NONE, [], {
    exploradas: explored,
  });
  return { path: [], cost: Infinity, explored };
}

export const gridBfs: GridAlgorithm = {
  meta: {
    id: 'grilla-bfs',
    name: 'BFS',
    category: 'grilla',
    summary:
      'Expande en "ondas" del mismo largo. Encuentra el camino con menos pasos, pero ignora el costo del barro.',
    pseudocode: [
      'cola ← [inicio];  visitado[inicio] ← verdadero',
      'mientras la cola no esté vacía',
      '  c ← desencolar();  si c = fin: reconstruir el camino',
      '  para cada vecino v de c que no es pared',
      '    si no fue visitado: visitado[v] ← verdadero;  padre[v] ← c;  encolar(v)',
      'no hay camino',
    ],
    complexity: { best: 'O(1)', average: 'O(V)', worst: 'O(V)', space: 'O(V)' },
    whenToUse: ['Grillas sin pesos: el camino más corto en cantidad de pasos.'],
    avoidWhen: ['Hay celdas más caras (barro): BFS no lo tiene en cuenta.'],
  },
  *run(g) {
    const parent = new Map<number, number>();
    const seen = new Set([g.start]);
    const queue = [g.start];
    let explored = 0;
    yield st(1, `Encolamos el inicio ${pos(g, g.start)}.`, FRONTIER, [g.start], { cola: 1 });
    while (queue.length) {
      const c = queue.shift()!;
      explored++;
      yield st(3, `Exploramos ${pos(g, c)}.`, CURRENT, [c], {
        c: pos(g, c),
        cola: queue.length,
        exploradas: explored,
      });
      if (c === g.end) return yield* tracePath(g, parent, 3, explored);
      const fresh = neighbors(g, c).filter((v) => !seen.has(v));
      for (const v of fresh) {
        seen.add(v);
        parent.set(v, c);
        queue.push(v);
      }
      if (fresh.length)
        yield st(5, `Encolamos ${fresh.length} vecino(s) nuevo(s).`, FRONTIER, fresh, {
          cola: queue.length,
        });
    }
    return yield* noPath(6, explored);
  },
};

export const gridDijkstra: GridAlgorithm = {
  meta: {
    id: 'grilla-dijkstra',
    name: 'Dijkstra',
    category: 'grilla',
    summary:
      'Expande siempre la celda más barata de alcanzar. Esquiva el barro si conviene, pero explora en todas las direcciones.',
    pseudocode: [
      'dist[inicio] ← 0;  cola de prioridad ← {(0, inicio)}',
      'mientras la cola no esté vacía',
      '  (d, c) ← extraer el mínimo;  si c ya fue fijado: continuar',
      '  si c = fin: reconstruir el camino',
      '  para cada vecino v transitable de c',
      '    si d + costo(v) < dist[v]: dist[v] ← d + costo(v);  padre[v] ← c;  insertar (dist[v], v)',
      'no hay camino',
    ],
    complexity: { best: 'O(1)', average: 'O(V log V)', worst: 'O(V log V)', space: 'O(V)' },
    whenToUse: [
      'Grillas con costos distintos (barro, terreno) cuando no hay una buena heurística.',
    ],
    avoidWhen: ['Sabés dónde está el destino: A* llega explorando mucho menos.'],
  },
  *run(g) {
    const dist = new Map<number, number>([[g.start, 0]]);
    const parent = new Map<number, number>();
    const fixed = new Set<number>();
    const pq = new MinHeap<[number, number]>(
      (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]),
    );
    pq.push([0, g.start]);
    let explored = 0;
    yield st(1, `dist[inicio] = 0.`, FRONTIER, [g.start]);
    while (pq.size) {
      const [d, c] = pq.pop()!;
      if (fixed.has(c)) continue;
      fixed.add(c);
      explored++;
      yield st(3, `Fijamos ${pos(g, c)} con distancia ${d}.`, CURRENT, [c], {
        c: pos(g, c),
        d,
        exploradas: explored,
      });
      if (c === g.end) return yield* tracePath(g, parent, 4, explored);
      const improved: number[] = [];
      for (const v of neighbors(g, c)) {
        const nd = d + cost(g, v);
        if (!fixed.has(v) && nd < (dist.get(v) ?? Infinity)) {
          dist.set(v, nd);
          parent.set(v, c);
          pq.push([nd, v]);
          improved.push(v);
        }
      }
      if (improved.length)
        yield st(6, `Relajamos ${improved.length} vecino(s).`, FRONTIER, improved, { d });
    }
    return yield* noPath(7, explored);
  },
};

export const gridAstar: GridAlgorithm = {
  meta: {
    id: 'grilla-astar',
    name: 'A*',
    category: 'grilla',
    summary:
      'Dijkstra con brújula: prioriza f = g + h, donde g es el costo real y h una estimación (distancia Manhattan) de lo que falta. Como h nunca sobreestima, el camino es óptimo.',
    pseudocode: [
      'g[inicio] ← 0;  abierta ← {(h(inicio), inicio)}      ▹ h = distancia Manhattan al fin',
      'mientras la lista abierta no esté vacía',
      '  c ← el de menor f = g + h;  si c ya fue cerrado: continuar',
      '  si c = fin: reconstruir el camino',
      '  para cada vecino v transitable de c',
      '    si g[c] + costo(v) < g[v]: g[v] ← g[c] + costo(v);  padre[v] ← c;  insertar (g[v] + h(v), v)',
      'no hay camino',
    ],
    complexity: {
      best: 'O(d)',
      average: 'depende de la heurística',
      worst: 'O(V log V)',
      space: 'O(V)',
    },
    whenToUse: [
      'Videojuegos, robótica, mapas: camino óptimo hacia un destino conocido, explorando poco.',
    ],
    avoidWhen: [
      'No hay una heurística admisible (que nunca sobreestime): pierde la garantía de optimalidad.',
    ],
  },
  *run(g) {
    const gScore = new Map<number, number>([[g.start, 0]]);
    const parent = new Map<number, number>();
    const closed = new Set<number>();
    const h = (i: number) => manhattan(g, i, g.end);
    // Desempate: con igual f, preferir mayor g (más cerca del destino) → explora menos.
    const pq = new MinHeap<[number, number, number]>(
      (a, b) => a[0] < b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] < b[2]))),
    );
    pq.push([h(g.start), 0, g.start]);
    let explored = 0;
    yield st(1, `f(inicio) = 0 + h = ${h(g.start)}.`, FRONTIER, [g.start], { h: h(g.start) });
    while (pq.size) {
      const [f, gc, c] = pq.pop()!;
      if (closed.has(c)) continue;
      closed.add(c);
      explored++;
      yield st(3, `Cerramos ${pos(g, c)}: f = g + h = ${gc} + ${h(c)} = ${f}.`, CURRENT, [c], {
        c: pos(g, c),
        g: gc,
        h: h(c),
        f,
        exploradas: explored,
      });
      if (c === g.end) return yield* tracePath(g, parent, 4, explored);
      const improved: number[] = [];
      for (const v of neighbors(g, c)) {
        const ng = gc + cost(g, v);
        if (!closed.has(v) && ng < (gScore.get(v) ?? Infinity)) {
          gScore.set(v, ng);
          parent.set(v, c);
          pq.push([ng + h(v), ng, v]);
          improved.push(v);
        }
      }
      if (improved.length)
        yield st(
          6,
          `Actualizamos ${improved.length} vecino(s) en la lista abierta.`,
          FRONTIER,
          improved,
          { g: gc },
        );
    }
    return yield* noPath(7, explored);
  },
};

export const GRID_ALGORITHMS: readonly GridAlgorithm[] = [gridBfs, gridDijkstra, gridAstar];
