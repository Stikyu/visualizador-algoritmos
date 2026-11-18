import { adjacency, labelOf, type Graph } from './model';
import { fmtDist, gstep, type EdgeState, type GraphAlgorithm } from './steps';

export interface ShortestResult {
  readonly dist: Map<number, number>;
  readonly parent: Map<number, number | null>;
  readonly negativeCycle: boolean;
}

/** Aristas como pares dirigidos (en no dirigidos, cada arista cuenta en ambos sentidos). */
function directedPairs(g: Graph) {
  const pairs: { u: number; v: number; w: number; edge: number }[] = [];
  for (const e of [...g.edges].sort((a, b) => a.id - b.id)) {
    pairs.push({ u: e.from, v: e.to, w: e.weight, edge: e.id });
    if (!g.directed) pairs.push({ u: e.to, v: e.from, w: e.weight, edge: e.id });
  }
  return pairs;
}

export const dijkstra: GraphAlgorithm<ShortestResult> = {
  needsStart: true,
  prefers: 'weighted',
  meta: {
    id: 'dijkstra',
    name: 'Dijkstra',
    category: 'grafos',
    summary:
      'Camino más corto desde un origen con pesos no negativos: siempre fija al nodo no fijado más cercano, usando una cola de prioridad.',
    pseudocode: [
      'dist[v] ← ∞ para todo v;  dist[s] ← 0',
      'cola de prioridad ← {(0, s)}',
      'mientras la cola no esté vacía',
      '  (d, u) ← extraer el mínimo',
      '  si u ya fue fijado: continuar        ▹ entrada vieja',
      '  fijar u                              ▹ dist[u] ya es definitiva',
      '  para cada vecino v de u con peso w',
      '    si dist[u] + w < dist[v]           ▹ relajación',
      '      dist[v] ← dist[u] + w;  padre[v] ← u',
      '      insertar (dist[v], v) en la cola',
    ],
    complexity: {
      best: 'O((V + E) log V)',
      average: 'O((V + E) log V)',
      worst: 'O((V + E) log V)',
      space: 'O(V + E)',
    },
    whenToUse: [
      'GPS, ruteo de redes, cualquier "camino más barato" con costos ≥ 0.',
      'Es el algoritmo base de A* (que agrega una heurística).',
    ],
    avoidWhen: [
      'Hay pesos negativos: el "fijar" deja de ser válido. Usá Bellman-Ford.',
      'El grafo no tiene pesos: BFS hace lo mismo en O(V + E).',
    ],
  },
  *run(g, s) {
    const adj = adjacency(g);
    const L = (id: number) => labelOf(g, id);
    const dist = new Map<number, number>(g.nodes.map((n) => [n.id, Infinity]));
    const parent = new Map<number, number | null>(g.nodes.map((n) => [n.id, null]));
    const parentEdge = new Map<number, number>();
    const fixed = new Set<number>();
    let pq: [number, number][] = [[0, s]];
    const lists = () => [
      {
        label: 'cola de prioridad',
        items: pq.map(([d, v]) => `${L(v)}:${d}`),
      },
    ];
    if (g.edges.some((e) => e.weight < 0)) {
      yield gstep(
        'note',
        0,
        '⚠ Hay pesos negativos: Dijkstra puede dar resultados incorrectos. Probá con Bellman-Ford.',
        {},
      );
    }
    dist.set(s, 0);
    yield gstep('note', 1, `dist[${L(s)}] = 0 y el resto ∞.`, {
      nodes: { [s]: 'frontier' },
      labels: Object.fromEntries(g.nodes.map((n) => [n.id, n.id === s ? '0' : '∞'])),
      lists: lists(),
    });
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0] || L(a[1]).localeCompare(L(b[1])));
      const [d, u] = pq.shift()!;
      if (fixed.has(u)) {
        yield gstep(
          'note',
          5,
          `Sacamos ${L(u)}:${d}, pero ${L(u)} ya está fijado con ${dist.get(u)}: es una entrada vieja, la ignoramos.`,
          {
            lists: lists(),
            vars: { u: L(u), d },
          },
        );
        continue;
      }
      fixed.add(u);
      yield gstep(
        'visit',
        6,
        `${L(u)} es el más cercano sin fijar (dist = ${d}): su distancia ya es definitiva.`,
        {
          nodes: { [u]: 'current' },
          lists: lists(),
          vars: { u: L(u), 'dist[u]': d },
        },
      );
      for (const { to: v, weight: w, edge } of adj.get(u) ?? []) {
        if (fixed.has(v)) continue;
        const cand = dist.get(u)! + w;
        if (cand < dist.get(v)!) {
          const old = dist.get(v)!;
          const prevEdge = parentEdge.get(v);
          dist.set(v, cand);
          parent.set(v, u);
          parentEdge.set(v, edge);
          pq.push([cand, v]);
          const edges: Record<number, EdgeState> = { [edge]: 'tree' };
          if (prevEdge !== undefined) edges[prevEdge] = 'rejected';
          yield gstep(
            'relax',
            9,
            `Relajamos ${L(u)}→${L(v)}: ${dist.get(u)} + ${w} = ${cand} < ${fmtDist(old)}. ¡Mejora!`,
            {
              nodes: { [v]: 'frontier' },
              edges,
              labels: { [v]: String(cand) },
              lists: lists(),
              vars: { u: L(u), v: L(v), w, 'dist[u] + w': cand, 'dist[v] antes': fmtDist(old) },
            },
          );
        } else {
          yield gstep(
            'edge',
            8,
            `${L(u)}→${L(v)}: ${dist.get(u)} + ${w} = ${cand} no mejora ${fmtDist(dist.get(v)!)}.`,
            {
              edges: { [edge]: parentEdge.get(v) === edge ? 'tree' : 'rejected' },
              vars: { u: L(u), v: L(v), w, 'dist[u] + w': cand, 'dist[v]': fmtDist(dist.get(v)!) },
            },
          );
        }
      }
      yield gstep('note', 3, `${L(u)} listo.`, { nodes: { [u]: 'done' }, lists: lists() });
    }
    pq = [];
    yield gstep(
      'done',
      0,
      'Dijkstra terminado: las aristas resaltadas forman el árbol de caminos más cortos.',
      {
        lists: lists(),
      },
    );
    return { dist, parent, negativeCycle: false };
  },
};

export const bellmanFord: GraphAlgorithm<ShortestResult> = {
  needsStart: true,
  prefers: 'weighted',
  meta: {
    id: 'bellman-ford',
    name: 'Bellman-Ford',
    category: 'grafos',
    summary:
      'Relaja TODAS las aristas |V| − 1 veces. Más lento que Dijkstra, pero admite pesos negativos y detecta ciclos negativos.',
    pseudocode: [
      'dist[v] ← ∞ para todo v;  dist[s] ← 0',
      'repetir |V| − 1 veces',
      '  para cada arista (u, v, w)',
      '    si dist[u] + w < dist[v]',
      '      dist[v] ← dist[u] + w;  padre[v] ← u',
      '  si en la ronda no cambió nada: terminar antes',
      'para cada arista (u, v, w)',
      '  si dist[u] + w < dist[v]: hay un ciclo negativo',
    ],
    complexity: { best: 'O(E)', average: 'O(V · E)', worst: 'O(V · E)', space: 'O(V)' },
    whenToUse: [
      'Grafos con pesos negativos (por ejemplo, arbitraje de monedas).',
      'Detectar ciclos negativos.',
      'Algoritmos distribuidos (protocolos de ruteo por vector de distancias).',
    ],
    avoidWhen: ['Todos los pesos son ≥ 0: Dijkstra es mucho más rápido.'],
  },
  *run(g, s) {
    const L = (id: number) => labelOf(g, id);
    const pairs = directedPairs(g);
    const dist = new Map<number, number>(g.nodes.map((n) => [n.id, Infinity]));
    const parent = new Map<number, number | null>(g.nodes.map((n) => [n.id, null]));
    const parentEdge = new Map<number, number>();
    dist.set(s, 0);
    yield gstep('note', 1, `dist[${L(s)}] = 0 y el resto ∞.`, {
      nodes: { [s]: 'frontier' },
      labels: Object.fromEntries(g.nodes.map((n) => [n.id, n.id === s ? '0' : '∞'])),
    });
    if (!g.directed && g.edges.some((e) => e.weight < 0)) {
      yield gstep(
        'note',
        0,
        'Ojo: en un grafo NO dirigido, una arista negativa ya es un ciclo negativo (ida y vuelta).',
        {},
      );
    }
    const V = g.nodes.length;
    for (let round = 1; round <= V - 1; round++) {
      let changed = false;
      yield gstep('note', 2, `Ronda ${round} de ${V - 1}: recorremos todas las aristas.`, {
        vars: { ronda: round },
      });
      for (const { u, v, w, edge } of pairs) {
        if (dist.get(u) === Infinity) {
          yield gstep(
            'edge',
            4,
            `${L(u)}→${L(v)}: dist[${L(u)}] es ∞, todavía no se puede relajar.`,
            {
              edges: { [edge]: parentEdge.get(v) === edge ? 'tree' : 'considered' },
              vars: { ronda: round, u: L(u), v: L(v), w },
            },
          );
          continue;
        }
        const cand = dist.get(u)! + w;
        if (cand < dist.get(v)!) {
          const old = dist.get(v)!;
          const prevEdge = parentEdge.get(v);
          dist.set(v, cand);
          parent.set(v, u);
          parentEdge.set(v, edge);
          changed = true;
          const edges: Record<number, EdgeState> = { [edge]: 'tree' };
          if (prevEdge !== undefined && prevEdge !== edge) edges[prevEdge] = 'rejected';
          yield gstep(
            'relax',
            5,
            `${L(u)}→${L(v)}: ${dist.get(u)} + ${w} = ${cand} < ${fmtDist(old)}. Mejora.`,
            {
              nodes: { [v]: 'frontier' },
              edges,
              labels: { [v]: String(cand) },
              vars: { ronda: round, u: L(u), v: L(v), w, 'dist[v]': cand },
            },
          );
        } else {
          yield gstep(
            'edge',
            4,
            `${L(u)}→${L(v)}: ${dist.get(u)} + ${w} = ${cand} no mejora ${fmtDist(dist.get(v)!)}.`,
            {
              edges: { [edge]: parentEdge.get(v) === edge ? 'tree' : 'rejected' },
              vars: { ronda: round, u: L(u), v: L(v), w },
            },
          );
        }
      }
      if (!changed) {
        yield gstep(
          'note',
          6,
          `En la ronda ${round} no cambió nada: las distancias ya son definitivas.`,
          { vars: { ronda: round } },
        );
        break;
      }
    }
    let negativeCycle = false;
    for (const { u, v, w, edge } of pairs) {
      if (dist.get(u)! !== Infinity && dist.get(u)! + w < dist.get(v)!) {
        negativeCycle = true;
        yield gstep(
          'done',
          8,
          `¡${L(u)}→${L(v)} todavía mejora después de |V| − 1 rondas! Hay un ciclo negativo alcanzable: las distancias no están definidas.`,
          {
            nodes: { [u]: 'cycle', [v]: 'cycle' },
            edges: { [edge]: 'cycle' },
          },
        );
        break;
      }
    }
    if (!negativeCycle) {
      yield gstep(
        'done',
        7,
        'Verificación: ninguna arista mejora. No hay ciclos negativos y las distancias son correctas.',
        {
          nodes: Object.fromEntries(
            g.nodes.filter((n) => dist.get(n.id) !== Infinity).map((n) => [n.id, 'done' as const]),
          ),
        },
      );
    }
    return { dist, parent, negativeCycle };
  },
};
