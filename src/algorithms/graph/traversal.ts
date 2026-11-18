import { adjacency, labelOf } from './model';
import { gstep, type GraphAlgorithm, type GraphStep } from './steps';

export interface TraversalResult {
  readonly order: number[];
  readonly dist: Map<number, number>;
  readonly parent: Map<number, number | null>;
}

export const bfs: GraphAlgorithm<TraversalResult> = {
  needsStart: true,
  prefers: 'unweighted',
  meta: {
    id: 'bfs',
    name: 'BFS (recorrido en anchura)',
    category: 'grafos',
    summary:
      'Explora por niveles usando una cola: primero todos los vecinos del origen, después los vecinos de esos, y así. Encuentra caminos con la menor cantidad de aristas.',
    pseudocode: [
      'para cada v: dist[v] ← ∞',
      'dist[s] ← 0;  cola ← [s]',
      'mientras la cola no esté vacía',
      '  u ← desencolar()',
      '  para cada vecino v de u',
      '    si dist[v] = ∞          ▹ todavía no descubierto',
      '      dist[v] ← dist[u] + 1;  padre[v] ← u',
      '      encolar(v)',
    ],
    complexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
    whenToUse: [
      'Camino más corto en grafos SIN pesos (o con todos los pesos iguales).',
      'Recorrer por niveles, encontrar componentes conexas, verificar si un grafo es bipartito.',
    ],
    avoidWhen: ['Las aristas tienen pesos distintos: usá Dijkstra.'],
  },
  *run(g, s) {
    const adj = adjacency(g);
    const L = (id: number) => labelOf(g, id);
    const dist = new Map<number, number>(g.nodes.map((n) => [n.id, Infinity]));
    const parent = new Map<number, number | null>(g.nodes.map((n) => [n.id, null]));
    const order: number[] = [];
    const queue: number[] = [s];
    const lists = () => [
      { label: 'cola', items: queue.map(L) },
      { label: 'orden de visita', items: order.map(L) },
    ];
    yield gstep('note', 1, 'Todas las distancias empiezan en ∞ (nadie fue descubierto).', {
      labels: Object.fromEntries(g.nodes.map((n) => [n.id, '∞'])),
    });
    dist.set(s, 0);
    yield gstep('enqueue', 2, `El origen ${L(s)} está a distancia 0. Lo encolamos.`, {
      nodes: { [s]: 'frontier' },
      labels: { [s]: '0' },
      lists: lists(),
      vars: { s: L(s) },
    });
    while (queue.length) {
      const u = queue.shift()!;
      order.push(u);
      yield gstep(
        'visit',
        4,
        `Desencolamos ${L(u)} (distancia ${dist.get(u)}). Revisamos sus vecinos.`,
        {
          nodes: { [u]: 'current' },
          lists: lists(),
          vars: { u: L(u), 'dist[u]': dist.get(u)! },
        },
      );
      for (const { to: v, edge } of adj.get(u) ?? []) {
        if (dist.get(v) === Infinity) {
          yield gstep('edge', 6, `${L(v)} no fue descubierto todavía.`, {
            edges: { [edge]: 'considered' },
            vars: { u: L(u), v: L(v) },
          });
          dist.set(v, dist.get(u)! + 1);
          parent.set(v, u);
          queue.push(v);
          yield gstep(
            'enqueue',
            7,
            `dist[${L(v)}] = ${dist.get(v)}. Lo encolamos: se visitará cuando terminen los del nivel ${dist.get(u)}.`,
            {
              nodes: { [v]: 'frontier' },
              edges: { [edge]: 'tree' },
              labels: { [v]: String(dist.get(v)) },
              lists: lists(),
              vars: { u: L(u), v: L(v), 'dist[v]': dist.get(v)! },
            },
          );
        } else {
          yield gstep(
            'edge',
            6,
            `${L(v)} ya fue descubierto (distancia ${dist.get(v)}): lo ignoramos.`,
            {
              edges: { [edge]: 'rejected' },
              vars: { u: L(u), v: L(v) },
            },
          );
        }
      }
      yield gstep('note', 3, `${L(u)} terminado.`, { nodes: { [u]: 'done' }, lists: lists() });
    }
    const unreached = g.nodes.filter((n) => dist.get(n.id) === Infinity).map((n) => n.label);
    yield gstep(
      'done',
      0,
      `BFS terminado. Las aristas resaltadas forman el árbol de caminos más cortos (en cantidad de aristas).${unreached.length ? ` Inalcanzables: ${unreached.join(', ')}.` : ''}`,
      {
        lists: lists(),
      },
    );
    return { order, dist, parent };
  },
};

export interface DfsResult {
  readonly order: number[];
  readonly discovery: Map<number, number>;
  readonly finish: Map<number, number>;
}

export const dfs: GraphAlgorithm<DfsResult> = {
  needsStart: true,
  prefers: 'unweighted',
  meta: {
    id: 'dfs',
    name: 'DFS (recorrido en profundidad)',
    category: 'grafos',
    summary:
      'Avanza lo más lejos posible por un camino y retrocede (backtracking) cuando no hay vecinos nuevos. Usa la pila de llamadas de la recursión.',
    pseudocode: [
      'dfs(u):',
      '  marcar u como visitado;  orden.agregar(u)',
      '  para cada vecino v de u',
      '    si v no fue visitado',
      '      padre[v] ← u;  dfs(v)',
      '  u terminado            ▹ se retrocede a quien lo llamó',
    ],
    complexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V) (pila)' },
    whenToUse: [
      'Detectar ciclos, orden topológico, componentes fuertemente conexas, puentes.',
      'Explorar todas las posibilidades (laberintos, backtracking).',
    ],
    avoidWhen: [
      'Buscás el camino más corto: DFS encuentra UN camino, no el más corto.',
      'Grafos muy profundos con recursión (riesgo de desbordar la pila): usá una pila explícita.',
    ],
  },
  *run(g, s) {
    const adj = adjacency(g);
    const L = (id: number) => labelOf(g, id);
    const visited = new Set<number>();
    const order: number[] = [];
    const discovery = new Map<number, number>();
    const finish = new Map<number, number>();
    const stack: number[] = [];
    let time = 0;
    const lists = () => [
      { label: 'pila de llamadas', items: stack.map((x) => `dfs(${L(x)})`) },
      { label: 'orden de visita', items: order.map(L) },
    ];
    function* visit(u: number): Generator<GraphStep, void, void> {
      visited.add(u);
      order.push(u);
      stack.push(u);
      discovery.set(u, ++time);
      yield gstep(
        'visit',
        2,
        `dfs(${L(u)}): lo marcamos como visitado (descubierto en t = ${time}).`,
        {
          nodes: { [u]: 'current' },
          labels: { [u]: `${time}/` },
          lists: lists(),
          vars: { u: L(u), t: time },
        },
      );
      for (const { to: v, edge } of adj.get(u) ?? []) {
        if (!visited.has(v)) {
          yield gstep(
            'edge',
            4,
            `${L(v)} no fue visitado: bajamos por la arista ${L(u)}–${L(v)}.`,
            {
              nodes: { [u]: 'visited' },
              edges: { [edge]: 'tree' },
              vars: { u: L(u), v: L(v) },
            },
          );
          yield* visit(v);
          yield gstep('note', 5, `Volvimos a ${L(u)} desde ${L(v)}.`, {
            nodes: { [u]: 'current' },
            lists: lists(),
            vars: { u: L(u) },
          });
        } else {
          yield gstep('edge', 4, `${L(v)} ya fue visitado: no lo seguimos.`, {
            edges: { [edge]: 'rejected' },
            vars: { u: L(u), v: L(v) },
          });
        }
      }
      stack.pop();
      finish.set(u, ++time);
      yield gstep(
        'note',
        6,
        `${L(u)} no tiene más vecinos nuevos: terminado en t = ${time}. Retrocedemos.`,
        {
          nodes: { [u]: 'done' },
          labels: { [u]: `${discovery.get(u)}/${time}` },
          lists: lists(),
          vars: { u: L(u), t: time },
        },
      );
    }
    yield* visit(s);
    yield gstep(
      'done',
      0,
      `DFS terminado. Las etiquetas d/f son los tiempos de descubrimiento y finalización.`,
      {
        lists: lists(),
      },
    );
    return { order, discovery, finish };
  },
};
