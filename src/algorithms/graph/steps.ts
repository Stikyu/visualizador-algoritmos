import type { StructList } from '../../structures/types';
import type { AlgorithmMeta, BaseStep, Vars } from '../types';
import type { Graph } from './model';

export type NodeState = 'default' | 'frontier' | 'current' | 'visited' | 'done' | 'start' | 'cycle';
export type EdgeState =
  'default' | 'considered' | 'tree' | 'rejected' | 'relaxed' | 'cycle' | 'back';

/**
 * Paso de un algoritmo de grafos. Es un DELTA: sólo trae lo que cambia (estados de nodos y
 * aristas, etiquetas de distancia). Las listas (cola, pila, orden…) y el union-find se
 * reemplazan completos cuando vienen.
 */
export interface GraphStep extends BaseStep {
  readonly nodes?: Readonly<Record<number, NodeState>>;
  readonly edges?: Readonly<Record<number, EdgeState>>;
  readonly labels?: Readonly<Record<number, string>>;
  readonly lists?: readonly StructList[];
  readonly uf?: Readonly<Record<number, number>>;
}

export interface GraphState {
  readonly nodes: Readonly<Record<number, NodeState>>;
  readonly edges: Readonly<Record<number, EdgeState>>;
  readonly labels: Readonly<Record<number, string>>;
  readonly lists: readonly StructList[];
  readonly uf: Readonly<Record<number, number>> | null;
  readonly focus: readonly number[];
  readonly counters: {
    readonly visited: number;
    readonly edges: number;
    readonly relaxations: number;
  };
}

export const initialGraphState = (): GraphState => ({
  nodes: {},
  edges: {},
  labels: {},
  lists: [],
  uf: null,
  focus: [],
  counters: { visited: 0, edges: 0, relaxations: 0 },
});

export function reduceGraph(s: GraphState, step: GraphStep): GraphState {
  const c = s.counters;
  return {
    nodes: step.nodes ? { ...s.nodes, ...step.nodes } : s.nodes,
    edges: step.edges ? { ...s.edges, ...step.edges } : s.edges,
    labels: step.labels ? { ...s.labels, ...step.labels } : s.labels,
    lists: step.lists ?? s.lists,
    uf: step.uf ?? s.uf,
    focus: step.nodes ? Object.keys(step.nodes).map(Number) : [],
    counters: {
      visited: c.visited + (step.type === 'visit' ? 1 : 0),
      // 'edge'/'find' = se examina una arista; 'relax' = se examina y mejora una distancia.
      edges:
        c.edges + (step.type === 'edge' || step.type === 'relax' || step.type === 'find' ? 1 : 0),
      relaxations: c.relaxations + (step.type === 'relax' ? 1 : 0),
    },
  };
}

export type GStep = (
  type: string,
  line: number,
  text: string,
  delta?: Omit<GraphStep, 'type' | 'line' | 'text' | 'vars'> & { vars?: Vars },
) => GraphStep;

/** Fábrica de pasos con firma corta. */
export const gstep: GStep = (type, line, text, delta = {}) => ({
  type,
  line,
  text,
  vars: delta.vars ?? {},
  nodes: delta.nodes,
  edges: delta.edges,
  labels: delta.labels,
  lists: delta.lists,
  uf: delta.uf,
});

export interface GraphAlgorithm<R = unknown> {
  readonly meta: AlgorithmMeta;
  readonly needsStart: boolean;
  /** Sugerencia de grafo de ejemplo para este algoritmo. */
  readonly prefers: 'weighted' | 'unweighted' | 'dag' | 'any';
  readonly run: (g: Graph, start: number) => Generator<GraphStep, R, void>;
}

export const INF_LABEL = '∞';
export const fmtDist = (d: number) => (Number.isFinite(d) ? String(d) : INF_LABEL);
