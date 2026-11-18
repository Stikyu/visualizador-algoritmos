import { UnionFind } from '../../structures/unionFind';
import { adjacency, labelOf, type Graph } from './model';
import { gstep, type GraphAlgorithm } from './steps';

export interface MstResult {
  readonly edges: number[];
  readonly total: number;
}

const undirected = (g: Graph): Graph => (g.directed ? { ...g, directed: false } : g);

export const prim: GraphAlgorithm<MstResult> = {
  needsStart: true,
  prefers: 'weighted',
  meta: {
    id: 'prim',
    name: 'Prim (árbol generador mínimo)',
    category: 'grafos',
    summary:
      'Hace crecer un árbol desde un nodo: en cada paso agrega la arista más liviana que conecta el árbol con un nodo de afuera.',
    pseudocode: [
      'enÁrbol ← {s}',
      'agregar a la cola de prioridad las aristas de s',
      'mientras la cola no esté vacía',
      '  (w, u, v) ← la arista más liviana',
      '  si v ya está en el árbol: descartarla        ▹ cerraría un ciclo',
      '  agregar v y la arista al árbol;  total ← total + w',
      '  agregar a la cola las aristas de v hacia nodos fuera del árbol',
    ],
    complexity: {
      best: 'O(E log V)',
      average: 'O(E log V)',
      worst: 'O(E log V)',
      space: 'O(V + E)',
    },
    whenToUse: [
      'Conectar todo al menor costo: redes eléctricas, cableado, caminos.',
      'Grafos densos (con una matriz de adyacencia queda O(V²), sin heap).',
    ],
    avoidWhen: [
      'El grafo es dirigido: el árbol generador mínimo se define para grafos no dirigidos.',
    ],
  },
  *run(graph, s) {
    const g = undirected(graph);
    const adj = adjacency(g);
    const L = (id: number) => labelOf(g, id);
    const inTree = new Set<number>([s]);
    const chosen: number[] = [];
    let total = 0;
    let pq: { w: number; u: number; v: number; edge: number }[] = [];
    const lists = () => [
      { label: 'cola de prioridad', items: pq.map((x) => `${L(x.u)}–${L(x.v)}:${x.w}`) },
      { label: 'total', items: [total] },
    ];
    if (graph.directed) {
      yield gstep(
        'note',
        0,
        'El grafo es dirigido: para el árbol generador mínimo se ignora la dirección de las aristas.',
        {},
      );
    }
    for (const a of adj.get(s) ?? []) pq.push({ w: a.weight, u: s, v: a.to, edge: a.edge });
    yield gstep('visit', 1, `Empezamos el árbol en ${L(s)}.`, {
      nodes: { [s]: 'done' },
      edges: Object.fromEntries(pq.map((x) => [x.edge, 'considered' as const])),
      lists: lists(),
    });
    while (pq.length) {
      pq.sort((a, b) => a.w - b.w || a.edge - b.edge);
      const { w, u, v, edge } = pq.shift()!;
      yield gstep('edge', 4, `La arista más liviana en la cola es ${L(u)}–${L(v)} (peso ${w}).`, {
        edges: { [edge]: 'considered' },
        lists: lists(),
        vars: { u: L(u), v: L(v), w },
      });
      if (inTree.has(v)) {
        yield gstep(
          'edge',
          5,
          `${L(v)} ya está en el árbol: agregarla cerraría un ciclo. Se descarta.`,
          {
            edges: { [edge]: 'rejected' },
            lists: lists(),
            vars: { u: L(u), v: L(v), w },
          },
        );
        continue;
      }
      inTree.add(v);
      chosen.push(edge);
      total += w;
      yield gstep(
        'visit',
        6,
        `Agregamos ${L(v)} con la arista ${L(u)}–${L(v)}. Total = ${total}.`,
        {
          nodes: { [v]: 'done' },
          edges: { [edge]: 'tree' },
          lists: lists(),
          vars: { v: L(v), w, total },
        },
      );
      const added: Record<number, 'considered'> = {};
      for (const a of adj.get(v) ?? []) {
        if (!inTree.has(a.to)) {
          pq.push({ w: a.weight, u: v, v: a.to, edge: a.edge });
          added[a.edge] = 'considered';
        }
      }
      if (Object.keys(added).length) {
        yield gstep('note', 7, `Sumamos a la cola las aristas de ${L(v)} hacia nodos de afuera.`, {
          edges: added,
          lists: lists(),
        });
      }
    }
    pq = [];
    const missing = g.nodes.length - inTree.size;
    yield gstep(
      'done',
      0,
      missing
        ? `El grafo no es conexo: ${missing} nodo(s) quedaron afuera. Peso del árbol: ${total}.`
        : `Árbol generador mínimo con ${chosen.length} aristas y peso total ${total}.`,
      {
        lists: lists(),
        vars: { total },
      },
    );
    return { edges: chosen, total };
  },
};

export const kruskal: GraphAlgorithm<MstResult> = {
  needsStart: false,
  prefers: 'weighted',
  meta: {
    id: 'kruskal',
    name: 'Kruskal (árbol generador mínimo)',
    category: 'grafos',
    summary:
      'Recorre las aristas de la más liviana a la más pesada y agrega cada una si une dos componentes distintas. Usa union-find para saberlo rápido.',
    pseudocode: [
      'ordenar las aristas por peso',
      'cada nodo es su propio conjunto (union-find)',
      'para cada arista (u, v, w) en orden',
      '  si find(u) ≠ find(v)            ▹ componentes distintas',
      '    union(u, v);  agregar la arista;  total ← total + w',
      '  si no: descartarla              ▹ cerraría un ciclo',
      '  si ya hay |V| − 1 aristas: terminar',
    ],
    complexity: {
      best: 'O(E log E)',
      average: 'O(E log E)',
      worst: 'O(E log E)',
      space: 'O(V + E)',
    },
    whenToUse: [
      'Grafos ralos (pocas aristas) o cuando las aristas ya vienen ordenadas.',
      'Clustering: cortar las k − 1 aristas más pesadas del árbol deja k grupos.',
    ],
    avoidWhen: ['Grafos muy densos: ordenar E ≈ V² aristas pesa; Prim con matriz es mejor.'],
  },
  *run(graph) {
    const g = undirected(graph);
    const L = (id: number) => labelOf(g, id);
    const sorted = [...g.edges].sort((a, b) => a.weight - b.weight || a.id - b.id);
    const uf = new UnionFind(g.nodes.map((n) => n.id));
    const chosen: number[] = [];
    let total = 0;
    let idx = 0;
    const lists = () => [
      {
        label: 'aristas por peso',
        items: sorted.slice(idx).map((e) => `${L(e.from)}–${L(e.to)}:${e.weight}`),
      },
      { label: 'conjuntos', items: uf.sets().map((set) => `{${set.map(L).join(',')}}`) },
      { label: 'total', items: [total] },
    ];
    if (graph.directed) {
      yield gstep(
        'note',
        0,
        'El grafo es dirigido: para el árbol generador mínimo se ignora la dirección de las aristas.',
        {},
      );
    }
    yield gstep('note', 1, `Ordenamos las ${sorted.length} aristas por peso.`, { lists: lists() });
    yield gstep('union', 2, 'Al principio cada nodo es su propia componente: parent[v] = v.', {
      lists: lists(),
      uf: uf.snapshot(),
    });
    for (; idx < sorted.length;) {
      const e = sorted[idx++];
      const ru = uf.find(e.from);
      const rv = uf.find(e.to);
      yield gstep(
        'find',
        4,
        `Arista ${L(e.from)}–${L(e.to)} (peso ${e.weight}): find(${L(e.from)}) = ${L(ru)}, find(${L(e.to)}) = ${L(rv)}.`,
        {
          nodes: { [e.from]: 'current', [e.to]: 'current' },
          edges: { [e.id]: 'considered' },
          lists: lists(),
          uf: uf.snapshot(),
          vars: { u: L(e.from), v: L(e.to), w: e.weight, 'find(u)': L(ru), 'find(v)': L(rv) },
        },
      );
      if (ru !== rv) {
        uf.union(e.from, e.to);
        chosen.push(e.id);
        total += e.weight;
        yield gstep(
          'union',
          5,
          `Representantes distintos: la agregamos y unimos las dos componentes. Total = ${total}.`,
          {
            nodes: { [e.from]: 'done', [e.to]: 'done' },
            edges: { [e.id]: 'tree' },
            lists: lists(),
            uf: uf.snapshot(),
            vars: { total },
          },
        );
      } else {
        yield gstep(
          'discard',
          6,
          `Mismo representante (${L(ru)}): ya están conectados, esta arista cerraría un ciclo. Se descarta.`,
          {
            nodes: { [e.from]: 'done', [e.to]: 'done' },
            edges: { [e.id]: 'rejected' },
            lists: lists(),
            vars: { total },
          },
        );
      }
      if (chosen.length === g.nodes.length - 1) {
        yield gstep(
          'note',
          7,
          `Ya hay |V| − 1 = ${chosen.length} aristas: el árbol está completo.`,
          { lists: lists() },
        );
        break;
      }
    }
    yield gstep(
      'done',
      0,
      `Árbol generador mínimo con ${chosen.length} aristas y peso total ${total}.`,
      {
        lists: lists(),
        vars: { total },
      },
    );
    return { edges: chosen, total };
  },
};
