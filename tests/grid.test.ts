import { describe, expect, it } from 'vitest';
import {
  WALL,
  cost,
  emptyGrid,
  generateMaze,
  manhattan,
  neighbors,
  randomObstacles,
  decodeGrid,
  encodeGrid,
  type Grid,
} from '../src/algorithms/grid/model';
import {
  GRID_ALGORITHMS,
  gridAstar,
  gridBfs,
  gridDijkstra,
  initialGridState,
  reduceGrid,
} from '../src/algorithms/grid/search';
import { drain, record } from '../src/algorithms/record';

/** BFS independiente: distancia mínima en pasos (o Infinity). */
function stepsBetween(g: Grid): number {
  const dist = new Map([[g.start, 0]]);
  const q = [g.start];
  while (q.length) {
    const c = q.shift()!;
    for (const v of neighbors(g, c)) {
      if (!dist.has(v)) {
        dist.set(v, dist.get(c)! + 1);
        q.push(v);
      }
    }
  }
  return dist.get(g.end) ?? Infinity;
}

function validPath(g: Grid, path: number[]) {
  if (path[0] !== g.start || path[path.length - 1] !== g.end) return false;
  return path.every(
    (c, i) => g.cells[c] !== WALL && (i === 0 || manhattan(g, path[i - 1], c) === 1),
  );
}

const grids: Grid[] = [];
for (let s = 0; s < 40; s++) grids.push(randomObstacles(emptyGrid(15, 25), s, 0.28, 0.15));
for (let s = 0; s < 10; s++) grids.push(generateMaze(15, 25, s, 0.1));

describe('grilla', () => {
  it('BFS encuentra el camino con menos pasos', () => {
    for (const g of grids) {
      const ref = stepsBetween(g);
      const r = drain(gridBfs.run(g));
      if (ref === Infinity) expect(r.path).toEqual([]);
      else {
        expect(r.path.length - 1).toBe(ref);
        expect(validPath(g, r.path)).toBe(true);
      }
    }
  });

  it('Dijkstra y A* encuentran caminos del mismo costo mínimo; A* explora como mucho lo mismo', () => {
    for (const g of grids) {
      const d = drain(gridDijkstra.run(g));
      const a = drain(gridAstar.run(g));
      const b = drain(gridBfs.run(g));
      expect(a.cost).toBe(d.cost);
      if (d.path.length) {
        expect(validPath(g, d.path)).toBe(true);
        expect(validPath(g, a.path)).toBe(true);
        expect(d.cost).toBe(d.path.slice(1).reduce((s, i) => s + cost(g, i), 0));
        // BFS minimiza pasos, no costo: su camino nunca es más barato.
        expect(b.cost).toBeGreaterThanOrEqual(d.cost);
        expect(a.explored).toBeLessThanOrEqual(d.explored);
      }
    }
  });

  it('el laberinto perfecto conecta todas sus celdas', () => {
    const g = generateMaze(21, 41, 123, 0);
    const open = g.cells.flatMap((c, i) => (c === WALL ? [] : [i]));
    const seen = new Set([open[0]]);
    const q = [open[0]];
    while (q.length) {
      for (const v of neighbors(g, q.shift()!)) {
        if (!seen.has(v)) {
          seen.add(v);
          q.push(v);
        }
      }
    }
    expect(seen.size).toBe(open.length);
    // Perfecto = árbol: aristas = vértices − 1.
    const edges = open.reduce((s, i) => s + neighbors(g, i).length, 0) / 2;
    expect(edges).toBe(open.length - 1);
  });

  it('la traza reproduce la cantidad de celdas exploradas y el largo del camino', () => {
    for (const algo of GRID_ALGORITHMS) {
      for (const g of grids.slice(0, 15)) {
        const { steps, result } = record(algo.run(g));
        const final = steps.reduce(reduceGrid, initialGridState(g));
        expect(final.explored).toBe(result.explored);
        expect(final.pathLength).toBe(result.path.length);
      }
    }
  });

  it('codificar y decodificar la grilla', () => {
    const g = generateMaze(11, 15, 5);
    expect(decodeGrid(encodeGrid(g))).toEqual(g);
    expect(decodeGrid('3x3.0.0.01')).toBeNull();
  });
});
