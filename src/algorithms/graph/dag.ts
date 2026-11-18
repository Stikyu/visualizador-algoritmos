import { adjacency, labelOf, type Graph } from './model';
import {
  gstep,
  type EdgeState,
  type GraphAlgorithm,
  type GraphStep,
  type NodeState,
} from './steps';

export const topoSort: GraphAlgorithm<number[] | null> = {
  needsStart: false,
  prefers: 'dag',
  meta: {
    id: 'topologico',
    name: 'Orden topológico (Kahn)',
    category: 'grafos',
    summary:
      'Ordena los nodos de un grafo dirigido acíclico de modo que toda arista vaya "hacia adelante": siempre se toma un nodo sin dependencias pendientes.',
    pseudocode: [
      'calcular el grado de entrada de cada nodo',
      'cola ← nodos con grado de entrada 0',
      'mientras la cola no esté vacía',
      '  u ← desencolar();  orden.agregar(u)',
      '  para cada arista u → v',
      '    grado[v] ← grado[v] − 1',
      '    si grado[v] = 0: encolar(v)',
      'si el orden no tiene a todos: hay un ciclo (no existe orden)',
    ],
    complexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
    whenToUse: [
      'Planificar tareas con dependencias: materias correlativas, compilación, pipelines.',
      'Resolver PD sobre DAGs (camino más largo, contar caminos).',
    ],
    avoidWhen: ['El grafo tiene ciclos o no es dirigido: el orden no existe.'],
  },
  *run(g: Graph) {
    const L = (id: number) => labelOf(g, id);
    if (!g.directed) {
      yield gstep(
        'done',
        0,
        'El orden topológico sólo existe en grafos DIRIGIDOS acíclicos. Activá "dirigido" o cargá el DAG de ejemplo.',
        {},
      );
      return null;
    }
    const adj = adjacency(g);
    const indeg = new Map<number, number>(g.nodes.map((n) => [n.id, 0]));
    for (const e of g.edges) indeg.set(e.to, indeg.get(e.to)! + 1);
    const order: number[] = [];
    const queue = g.nodes
      .filter((n) => indeg.get(n.id) === 0)
      .map((n) => n.id)
      .sort((a, b) => L(a).localeCompare(L(b)));
    const lists = () => [
      { label: 'cola (grado 0)', items: queue.map(L) },
      { label: 'orden', items: order.map(L) },
    ];
    yield gstep(
      'note',
      1,
      'Grado de entrada = cuántas aristas llegan a cada nodo (cuántas dependencias tiene).',
      {
        labels: Object.fromEntries([...indeg].map(([id, d]) => [id, `in:${d}`])),
      },
    );
    yield gstep('enqueue', 2, `Sin dependencias: ${queue.map(L).join(', ') || 'ninguno'}.`, {
      nodes: Object.fromEntries(queue.map((id) => [id, 'frontier' as const])),
      lists: lists(),
    });
    while (queue.length) {
      const u = queue.shift()!;
      order.push(u);
      yield gstep(
        'visit',
        4,
        `${L(u)} no tiene dependencias pendientes: va en la posición ${order.length} del orden.`,
        {
          nodes: { [u]: 'current' },
          labels: { [u]: `#${order.length}` },
          lists: lists(),
          vars: { u: L(u) },
        },
      );
      for (const { to: v, edge } of adj.get(u) ?? []) {
        indeg.set(v, indeg.get(v)! - 1);
        const zero = indeg.get(v) === 0;
        if (zero) queue.push(v);
        yield gstep(
          'edge',
          zero ? 7 : 6,
          `Quitamos la arista ${L(u)}→${L(v)}: grado[${L(v)}] = ${indeg.get(v)}.${zero ? ` ¡Llegó a 0, lo encolamos!` : ''}`,
          {
            nodes: zero ? { [v]: 'frontier' } : undefined,
            edges: { [edge]: 'tree' },
            labels: { [v]: `in:${indeg.get(v)}` },
            lists: lists(),
            vars: { u: L(u), v: L(v), 'grado[v]': indeg.get(v)! },
          },
        );
      }
      yield gstep('note', 3, `${L(u)} listo.`, { nodes: { [u]: 'done' }, lists: lists() });
    }
    if (order.length < g.nodes.length) {
      const stuck = g.nodes.filter((n) => !order.includes(n.id));
      yield gstep(
        'done',
        8,
        `Quedaron nodos con dependencias que nunca se liberan (${stuck.map((n) => n.label).join(', ')}): hay un ciclo, no existe orden topológico.`,
        {
          nodes: Object.fromEntries(stuck.map((n) => [n.id, 'cycle' as const])),
          lists: lists(),
        },
      );
      return null;
    }
    yield gstep('done', 0, `Orden topológico: ${order.map(L).join(' → ')}.`, { lists: lists() });
    return order;
  },
};

export interface CycleResult {
  readonly hasCycle: boolean;
  readonly cycle: number[];
}

export const cycleDetection: GraphAlgorithm<CycleResult> = {
  needsStart: false,
  prefers: 'any',
  meta: {
    id: 'ciclos',
    name: 'Detección de ciclos',
    category: 'grafos',
    summary:
      'DFS con tres colores: blanco (sin ver), gris (en la pila de llamadas) y negro (terminado). Encontrar una arista hacia un nodo gris es encontrar un ciclo.',
    pseudocode: [
      'color[v] ← blanco para todo v',
      'para cada nodo s blanco: dfs(s)',
      'dfs(u): color[u] ← gris            ▹ está en la pila de llamadas',
      '  para cada vecino v de u',
      '    (no dirigido) si es la arista por la que llegamos: saltearla',
      '    si color[v] = gris: ¡ciclo! (arista hacia atrás)',
      '    si color[v] = blanco: padre[v] ← u;  dfs(v)',
      '  color[u] ← negro                 ▹ terminado',
    ],
    complexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
    whenToUse: [
      'Detectar dependencias circulares (imports, deadlocks, correlativas mal cargadas).',
      'Verificar si un grafo es un árbol o un DAG.',
    ],
    avoidWhen: [
      'Sólo necesitás saber si un grafo no dirigido tiene ciclos: union-find también sirve.',
    ],
  },
  *run(g: Graph) {
    const adj = adjacency(g);
    const L = (id: number) => labelOf(g, id);
    const color = new Map<number, 'blanco' | 'gris' | 'negro'>(
      g.nodes.map((n) => [n.id, 'blanco']),
    );
    const parent = new Map<number, { node: number; edge: number }>();
    const stack: number[] = [];
    let found: number[] = [];
    const lists = () => [{ label: 'pila de llamadas (grises)', items: stack.map(L) }];

    function* dfs(u: number, viaEdge: number | null): Generator<GraphStep, boolean, void> {
      color.set(u, 'gris');
      stack.push(u);
      yield gstep('visit', 3, `dfs(${L(u)}): lo pintamos de gris (está en la pila).`, {
        nodes: { [u]: 'current' },
        lists: lists(),
        vars: { u: L(u) },
      });
      for (const { to: v, edge } of adj.get(u) ?? []) {
        if (!g.directed && edge === viaEdge) {
          yield gstep(
            'edge',
            5,
            `${L(u)}–${L(v)} es la arista por la que llegamos: no cuenta como ciclo.`,
            {
              vars: { u: L(u), v: L(v) },
            },
          );
          continue;
        }
        const c = color.get(v);
        if (c === 'gris') {
          // Reconstruir el ciclo: desde u subiendo por los padres hasta v.
          const cycleNodes = [u];
          const cycleEdges = [edge];
          for (let x = u; x !== v;) {
            const p = parent.get(x)!;
            cycleEdges.push(p.edge);
            cycleNodes.push(p.node);
            x = p.node;
          }
          found = cycleNodes.reverse();
          yield gstep(
            'done',
            6,
            `${L(v)} es gris: la arista ${L(u)}→${L(v)} vuelve a un ancestro. ¡Ciclo: ${found.map(L).join(' → ')} → ${L(v)}!`,
            {
              nodes: Object.fromEntries(found.map((x) => [x, 'cycle' as NodeState])),
              edges: Object.fromEntries(cycleEdges.map((e) => [e, 'cycle' as EdgeState])),
              lists: lists(),
              vars: { u: L(u), v: L(v) },
            },
          );
          return true;
        }
        if (c === 'blanco') {
          parent.set(v, { node: u, edge });
          yield gstep('edge', 7, `${L(v)} es blanco: bajamos.`, {
            nodes: { [u]: 'visited' },
            edges: { [edge]: 'tree' },
            vars: { u: L(u), v: L(v) },
          });
          if (yield* dfs(v, edge)) return true;
          yield gstep('note', 7, `De vuelta en ${L(u)}.`, {
            nodes: { [u]: 'current' },
            lists: lists(),
          });
        } else {
          yield gstep('edge', 4, `${L(v)} es negro (ya terminado): no hay ciclo por acá.`, {
            edges: { [edge]: 'rejected' },
            vars: { u: L(u), v: L(v) },
          });
        }
      }
      color.set(u, 'negro');
      stack.pop();
      yield gstep('note', 8, `${L(u)} terminado: lo pintamos de negro.`, {
        nodes: { [u]: 'done' },
        lists: lists(),
      });
      return false;
    }

    const ordered = [...g.nodes].sort((a, b) =>
      a.label.localeCompare(b.label, 'es', { numeric: true }),
    );
    for (const n of ordered) {
      if (color.get(n.id) !== 'blanco') continue;
      yield gstep('note', 2, `${n.label} sigue blanco: lanzamos un DFS desde ahí.`, {});
      if (yield* dfs(n.id, null)) return { hasCycle: true, cycle: found };
    }
    yield gstep(
      'done',
      0,
      `Todos los nodos quedaron negros sin encontrar aristas hacia atrás: el grafo ${g.directed ? 'es un DAG' : 'es un bosque'} (no tiene ciclos).`,
      {},
    );
    return { hasCycle: false, cycle: [] };
  },
};
