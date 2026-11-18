import { createRng, randInt } from '../rng';

/** Coordenadas lógicas: el lienzo mide 1000 × 600 y el renderer lo escala. */
export const CANVAS_W = 1000;
export const CANVAS_H = 600;

export interface GNode {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly label: string;
}

export interface GEdge {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  readonly weight: number;
}

export interface Graph {
  readonly directed: boolean;
  readonly nodes: readonly GNode[];
  readonly edges: readonly GEdge[];
}

/** Vecino en la lista de adyacencia (con la arista que lleva hasta él). */
export interface Adj {
  readonly to: number;
  readonly weight: number;
  readonly edge: number;
}

/** Lista de adyacencia. En grafos no dirigidos cada arista aparece en ambos sentidos. */
export function adjacency(g: Graph): Map<number, Adj[]> {
  const adj = new Map<number, Adj[]>(g.nodes.map((n) => [n.id, []]));
  const sorted = [...g.edges].sort((a, b) => a.id - b.id);
  for (const e of sorted) {
    adj.get(e.from)?.push({ to: e.to, weight: e.weight, edge: e.id });
    if (!g.directed) adj.get(e.to)?.push({ to: e.from, weight: e.weight, edge: e.id });
  }
  // Orden determinista: por etiqueta del vecino (así la traza es reproducible y fácil de seguir).
  const label = new Map(g.nodes.map((n) => [n.id, n.label]));
  for (const list of adj.values()) {
    list.sort((a, b) =>
      (label.get(a.to) ?? '').localeCompare(label.get(b.to) ?? '', 'es', { numeric: true }),
    );
  }
  return adj;
}

export const labelOf = (g: Graph, id: number): string =>
  g.nodes.find((n) => n.id === id)?.label ?? `?${id}`;

/** A, B, …, Z, A1, B1, … */
export function labelFor(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26));
  const round = Math.floor(index / 26);
  return round === 0 ? letter : `${letter}${round}`;
}

export function nextLabel(g: Graph): string {
  const used = new Set(g.nodes.map((n) => n.label));
  for (let i = 0; ; i++) if (!used.has(labelFor(i))) return labelFor(i);
}

const nextId = (items: readonly { id: number }[]) =>
  items.reduce((m, x) => Math.max(m, x.id), -1) + 1;

export function addNode(g: Graph, x: number, y: number): Graph {
  return { ...g, nodes: [...g.nodes, { id: nextId(g.nodes), x, y, label: nextLabel(g) }] };
}

export function addEdge(g: Graph, from: number, to: number, weight: number): Graph {
  if (from === to) return g;
  const exists = g.edges.some(
    (e) => (e.from === from && e.to === to) || (!g.directed && e.from === to && e.to === from),
  );
  if (exists) return g;
  return { ...g, edges: [...g.edges, { id: nextId(g.edges), from, to, weight }] };
}

export function removeNode(g: Graph, id: number): Graph {
  return {
    ...g,
    nodes: g.nodes.filter((n) => n.id !== id),
    edges: g.edges.filter((e) => e.from !== id && e.to !== id),
  };
}

export const removeEdge = (g: Graph, id: number): Graph => ({
  ...g,
  edges: g.edges.filter((e) => e.id !== id),
});

export const moveNode = (g: Graph, id: number, x: number, y: number): Graph => ({
  ...g,
  nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
});

export const setWeight = (g: Graph, id: number, weight: number): Graph => ({
  ...g,
  edges: g.edges.map((e) => (e.id === id ? { ...e, weight } : e)),
});

/**
 * Grafo aleatorio conexo: primero un árbol generador al azar (garantiza conexidad) y después
 * aristas extra entre nodos cercanos. Los nodos se ubican en una grilla con ruido para que
 * no se encimen.
 */
export function randomGraph(
  n: number,
  seed: number,
  opts: { directed?: boolean; extra?: number; maxWeight?: number; dag?: boolean } = {},
): Graph {
  const rng = createRng(seed);
  const cols = Math.ceil(Math.sqrt(n * 1.6));
  const rows = Math.ceil(n / cols);
  const cellW = (CANVAS_W - 120) / cols;
  const cellH = (CANVAS_H - 100) / Math.max(1, rows);
  const slots = Array.from({ length: cols * rows }, (_, i) => i)
    .sort(() => rng() - 0.5)
    .slice(0, n);
  const nodes: GNode[] = slots.map((s, i) => ({
    id: i,
    label: labelFor(i),
    x: Math.round(60 + (s % cols) * cellW + cellW / 2 + (rng() - 0.5) * cellW * 0.5),
    y: Math.round(50 + Math.floor(s / cols) * cellH + cellH / 2 + (rng() - 0.5) * cellH * 0.5),
  }));
  const maxW = opts.maxWeight ?? 9;
  const directed = opts.directed ?? false;
  let g: Graph = { directed, nodes, edges: [] };
  const dist = (a: GNode, b: GNode) => Math.hypot(a.x - b.x, a.y - b.y);
  // En un DAG las aristas van siempre de menor a mayor índice (orden topológico implícito).
  const orient = (a: number, b: number) =>
    opts.dag ? [Math.min(a, b), Math.max(a, b)] : rng() < 0.5 ? [a, b] : [b, a];
  for (let i = 1; i < n; i++) {
    // Conectar i con uno de los anteriores, preferentemente cercano.
    const prev = nodes.slice(0, i).sort((a, b) => dist(a, nodes[i]) - dist(b, nodes[i]));
    const j = prev[Math.min(prev.length - 1, randInt(rng, 0, 1))].id;
    const [a, b] = orient(i, j);
    g = addEdge(g, a, b, randInt(rng, 1, maxW));
  }
  const extra = opts.extra ?? Math.round(n * 0.6);
  for (let k = 0, tries = 0; k < extra && tries < extra * 20; tries++) {
    const a = randInt(rng, 0, n - 1);
    const near = nodes
      .filter((x) => x.id !== a)
      .sort((p, q) => dist(p, nodes[a]) - dist(q, nodes[a]))
      .slice(0, 4);
    const b = near[randInt(rng, 0, near.length - 1)]?.id;
    if (b === undefined) continue;
    const [u, v] = orient(a, b);
    const before = g.edges.length;
    g = addEdge(g, u, v, randInt(rng, 1, maxW));
    if (g.edges.length > before) k++;
  }
  return g;
}

/** Grafo de ejemplo fijo (el mismo que se usa en los tests con resultados conocidos). */
export function sampleGraph(directed = false): Graph {
  const pos: [number, number][] = [
    [120, 300],
    [320, 140],
    [320, 460],
    [540, 300],
    [760, 140],
    [760, 460],
    [900, 300],
  ];
  const nodes = pos.map(([x, y], i) => ({ id: i, x, y, label: labelFor(i) }));
  const raw: [number, number, number][] = [
    [0, 1, 4],
    [0, 2, 2],
    [1, 2, 1],
    [1, 3, 5],
    [2, 3, 8],
    [2, 5, 10],
    [3, 4, 2],
    [3, 5, 6],
    [4, 6, 3],
    [5, 6, 1],
    [4, 5, 4],
  ];
  return {
    directed,
    nodes,
    edges: raw.map(([from, to, weight], id) => ({ id, from, to, weight })),
  };
}

/** Un DAG de ejemplo (materias con correlativas) para orden topológico. */
export function sampleDag(): Graph {
  const pos: [number, number][] = [
    [100, 150],
    [100, 450],
    [330, 100],
    [330, 300],
    [330, 500],
    [580, 200],
    [580, 420],
    [840, 300],
  ];
  const nodes = pos.map(([x, y], i) => ({ id: i, x, y, label: labelFor(i) }));
  const raw: [number, number][] = [
    [0, 2],
    [0, 3],
    [1, 3],
    [1, 4],
    [2, 5],
    [3, 5],
    [3, 6],
    [4, 6],
    [5, 7],
    [6, 7],
  ];
  return {
    directed: true,
    nodes,
    edges: raw.map(([from, to], id) => ({ id, from, to, weight: 1 })),
  };
}

// ---------------------------------------------------------------------------
// Serialización compacta para compartir por URL:  d|x,y;x,y;…|a-b-w;…
// ---------------------------------------------------------------------------

export function encodeGraph(g: Graph): string {
  const idx = new Map(g.nodes.map((n, i) => [n.id, i]));
  const nodes = g.nodes.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`).join(';');
  const edges = g.edges.map((e) => `${idx.get(e.from)}-${idx.get(e.to)}-${e.weight}`).join(';');
  return `${g.directed ? 'd' : 'u'}|${nodes}|${edges}`;
}

export function decodeGraph(text: string): Graph | null {
  const [kind, nodesPart = '', edgesPart = ''] = text.split('|');
  if (kind !== 'd' && kind !== 'u') return null;
  const nodes: GNode[] = [];
  for (const [i, chunk] of nodesPart.split(';').filter(Boolean).entries()) {
    const [x, y] = chunk.split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    nodes.push({
      id: i,
      x: Math.max(0, Math.min(CANVAS_W, x)),
      y: Math.max(0, Math.min(CANVAS_H, y)),
      label: labelFor(i),
    });
  }
  if (nodes.length > 60) return null;
  let g: Graph = { directed: kind === 'd', nodes, edges: [] };
  for (const chunk of edgesPart.split(';').filter(Boolean)) {
    const [a, b, w] =
      chunk.split('-').length === 3 ? chunk.split('-').map(Number) : parseNegative(chunk);
    if (![a, b, w].every(Number.isFinite) || a >= nodes.length || b >= nodes.length) return null;
    g = addEdge(g, a, b, w);
  }
  return g;
}

/** Soporta pesos negativos en la codificación: "0-1--3" → [0, 1, -3]. */
function parseNegative(chunk: string): number[] {
  const m = /^(\d+)-(\d+)-(-?\d+)$/.exec(chunk);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [NaN, NaN, NaN];
}
