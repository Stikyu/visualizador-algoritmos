import { describe, expect, it } from 'vitest';
import { cycleDetection, topoSort } from '../src/algorithms/graph/dag';
import {
  addEdge,
  decodeGraph,
  encodeGraph,
  randomGraph,
  sampleDag,
  sampleGraph,
  type Graph,
} from '../src/algorithms/graph/model';
import { kruskal, prim } from '../src/algorithms/graph/mst';
import { bellmanFord, dijkstra } from '../src/algorithms/graph/shortest';
import { initialGraphState, reduceGraph } from '../src/algorithms/graph/steps';
import { bfs, dfs } from '../src/algorithms/graph/traversal';
import { GRAPH_ALGORITHMS } from '../src/algorithms/graph';
import { drain, record } from '../src/algorithms/record';
import { createRng, randInt } from '../src/algorithms/rng';

const rng = createRng(99);

/** Floyd-Warshall: referencia independiente para caminos mínimos. */
function floyd(g: Graph, unit = false): Map<number, Map<number, number>> {
  const ids = g.nodes.map((n) => n.id);
  const d = new Map(ids.map((i) => [i, new Map(ids.map((j) => [j, i === j ? 0 : Infinity]))]));
  for (const e of g.edges) {
    const w = unit ? 1 : e.weight;
    d.get(e.from)!.set(e.to, Math.min(d.get(e.from)!.get(e.to)!, w));
    if (!g.directed) d.get(e.to)!.set(e.from, Math.min(d.get(e.to)!.get(e.from)!, w));
  }
  for (const k of ids)
    for (const i of ids)
      for (const j of ids) {
        const via = d.get(i)!.get(k)! + d.get(k)!.get(j)!;
        if (via < d.get(i)!.get(j)!) d.get(i)!.set(j, via);
      }
  return d;
}

describe('caminos mínimos', () => {
  it('Dijkstra y Bellman-Ford dan las distancias conocidas en el grafo de ejemplo', () => {
    const g = sampleGraph(false);
    const expected = { 0: 0, 1: 3, 2: 2, 3: 8, 4: 10, 5: 12, 6: 13 };
    for (const algo of [dijkstra, bellmanFord]) {
      const { dist, negativeCycle } = drain(algo.run(g, 0));
      expect(negativeCycle).toBe(false);
      expect(Object.fromEntries(dist)).toEqual(expected);
    }
  });

  it('coinciden con Floyd-Warshall en grafos aleatorios (dirigidos y no dirigidos)', () => {
    for (let t = 0; t < 80; t++) {
      const g = randomGraph(randInt(rng, 2, 12), t, { directed: t % 2 === 0 });
      const ref = floyd(g);
      const s = g.nodes[randInt(rng, 0, g.nodes.length - 1)].id;
      const dj = drain(dijkstra.run(g, s)).dist;
      const bf = drain(bellmanFord.run(g, s)).dist;
      for (const n of g.nodes) {
        expect(dj.get(n.id)).toBe(ref.get(s)!.get(n.id));
        expect(bf.get(n.id)).toBe(ref.get(s)!.get(n.id));
      }
    }
  });

  it('Bellman-Ford maneja pesos negativos y detecta ciclos negativos', () => {
    const base = sampleDag();
    let g: Graph = { ...base, edges: [] };
    g = addEdge(g, 0, 1, 4);
    g = addEdge(g, 0, 2, 5);
    g = addEdge(g, 2, 1, -3);
    g = addEdge(g, 1, 3, 2);
    const r = drain(bellmanFord.run(g, 0));
    expect(r.negativeCycle).toBe(false);
    expect(r.dist.get(1)).toBe(2);
    expect(r.dist.get(3)).toBe(4);
    const withCycle = addEdge(addEdge(g, 3, 4, 1), 4, 2, -10);
    expect(drain(bellmanFord.run(withCycle, 0)).negativeCycle).toBe(true);
  });

  it('BFS da la distancia en cantidad de aristas', () => {
    for (let t = 0; t < 60; t++) {
      const g = randomGraph(randInt(rng, 2, 14), 1000 + t, { directed: t % 3 === 0 });
      const ref = floyd(g, true);
      const s = g.nodes[0].id;
      const { dist, order } = drain(bfs.run(g, s));
      for (const n of g.nodes) expect(dist.get(n.id)).toBe(ref.get(s)!.get(n.id));
      // BFS visita en orden no decreciente de distancia.
      const ds = order.map((v) => dist.get(v)!);
      expect(ds).toEqual(ds.slice().sort((a, b) => a - b));
    }
  });

  it('DFS visita todo lo alcanzable y los tiempos anidan', () => {
    const g = sampleGraph(false);
    const { order, discovery, finish } = drain(dfs.run(g, 0));
    expect(new Set(order).size).toBe(g.nodes.length);
    for (const n of g.nodes) expect(discovery.get(n.id)!).toBeLessThan(finish.get(n.id)!);
  });
});

describe('árbol generador mínimo', () => {
  it('peso conocido en el grafo de ejemplo', () => {
    const g = sampleGraph(false);
    expect(drain(prim.run(g, 0)).total).toBe(14);
    expect(drain(kruskal.run(g, 0)).total).toBe(14);
  });

  it('Prim y Kruskal dan el mismo peso total en grafos aleatorios', () => {
    for (let t = 0; t < 120; t++) {
      const n = randInt(rng, 1, 16);
      const g = randomGraph(n, 5000 + t, { maxWeight: 20 });
      const p = drain(prim.run(g, g.nodes[0].id));
      const k = drain(kruskal.run(g, 0));
      expect(p.total).toBe(k.total);
      expect(p.edges.length).toBe(n - 1);
      expect(k.edges.length).toBe(n - 1);
    }
  });

  it('las aristas marcadas como árbol al final de la traza son las del resultado', () => {
    const g = randomGraph(10, 42);
    const { steps, result } = record(kruskal.run(g, 0));
    const final = steps.reduce(reduceGraph, initialGraphState());
    const tree = Object.entries(final.edges)
      .filter(([, s]) => s === 'tree')
      .map(([id]) => Number(id))
      .sort((a, b) => a - b);
    expect(tree).toEqual(result.edges.slice().sort((a, b) => a - b));
  });
});

describe('orden topológico y ciclos', () => {
  const valid = (g: Graph, order: number[]) => {
    const pos = new Map(order.map((v, i) => [v, i]));
    return (
      order.length === g.nodes.length && g.edges.every((e) => pos.get(e.from)! < pos.get(e.to)!)
    );
  };

  it('el orden es válido en DAGs aleatorios y en el de ejemplo', () => {
    expect(valid(sampleDag(), drain(topoSort.run(sampleDag(), 0))!)).toBe(true);
    for (let t = 0; t < 80; t++) {
      const g = randomGraph(randInt(rng, 1, 14), 9000 + t, { directed: true, dag: true });
      const order = drain(topoSort.run(g, 0));
      expect(order).not.toBeNull();
      expect(valid(g, order!)).toBe(true);
    }
  });

  it('no hay orden si hay un ciclo', () => {
    const g = addEdge(sampleDag(), 7, 0, 1);
    expect(drain(topoSort.run(g, 0))).toBeNull();
  });

  it('la detección de ciclos coincide con una verificación independiente', () => {
    for (let t = 0; t < 150; t++) {
      const directed = t % 2 === 0;
      const g = randomGraph(randInt(rng, 1, 10), 20000 + t, {
        directed,
        extra: randInt(rng, 0, 4),
      });
      const { hasCycle, cycle } = drain(cycleDetection.run(g, 0));
      // Dirigido: hay ciclo ⇔ Kahn no logra ordenar. No dirigido: ⇔ E > V − componentes (= V − 1, son conexos).
      const expected = directed
        ? drain(topoSort.run(g, 0)) === null
        : g.edges.length > g.nodes.length - 1;
      expect(hasCycle).toBe(expected);
      if (hasCycle) expect(cycle.length).toBeGreaterThanOrEqual(directed ? 2 : 3);
    }
  });
});

describe('modelo de grafo', () => {
  it('codificar y decodificar es la identidad (salvo ids/etiquetas)', () => {
    const g = randomGraph(9, 3, { directed: true });
    const back = decodeGraph(encodeGraph(g))!;
    expect(back.directed).toBe(true);
    expect(back.nodes.map((n) => [n.x, n.y])).toEqual(g.nodes.map((n) => [n.x, n.y]));
    expect(back.edges.map((e) => [e.from, e.to, e.weight])).toEqual(
      g.edges.map((e) => [e.from, e.to, e.weight]),
    );
    expect(decodeGraph('basura')).toBeNull();
  });

  it('todos los algoritmos terminan con un paso "done" y líneas válidas', () => {
    for (const algo of GRAPH_ALGORITHMS) {
      for (const g of [sampleGraph(false), sampleGraph(true), sampleDag()]) {
        const { steps } = record(algo.run(g, 0));
        expect(steps[steps.length - 1].type).toBe('done');
        for (const s of steps) expect(s.line).toBeLessThanOrEqual(algo.meta.pseudocode.length);
      }
    }
  });
});
