import { cycleDetection, topoSort } from './dag';
import { kruskal, prim } from './mst';
import { bellmanFord, dijkstra } from './shortest';
import type { GraphAlgorithm } from './steps';
import { bfs, dfs } from './traversal';

/** Para agregar un algoritmo de grafos: crear su GraphAlgorithm y sumarlo acá. */
export const GRAPH_ALGORITHMS: readonly GraphAlgorithm[] = [
  bfs,
  dfs,
  dijkstra,
  bellmanFord,
  prim,
  kruskal,
  topoSort,
  cycleDetection,
] as readonly GraphAlgorithm<unknown>[];
