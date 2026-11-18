import type { BaseStep } from '../types';

export type Cell = readonly [number, number];

/**
 * Paso de programación dinámica: llenar UNA celda de la tabla, indicando de qué celdas
 * depende (así se ve la recurrencia), o marcar el camino de reconstrucción.
 */
export interface DPStep extends BaseStep {
  readonly type: 'fill' | 'path' | 'note' | 'done';
  readonly cell?: Cell;
  readonly value?: string;
  readonly deps?: readonly Cell[];
  /** Celda elegida entre las dependencias (la que dio el óptimo). */
  readonly chosen?: Cell;
  /** Texto extra para la solución reconstruida (por ejemplo, la subsecuencia). */
  readonly solution?: string;
}

export interface DPState {
  readonly rows: number;
  readonly cols: number;
  readonly values: readonly (readonly (string | null)[])[];
  readonly current: Cell | null;
  readonly deps: readonly Cell[];
  readonly chosen: Cell | null;
  readonly path: readonly Cell[];
  readonly filled: number;
  readonly solution: string | null;
}

export interface DPTableShape {
  readonly rowHeaders: readonly string[];
  readonly colHeaders: readonly string[];
  readonly corner?: string;
}

export const initialDPState = (rows: number, cols: number): DPState => ({
  rows,
  cols,
  values: Array.from({ length: rows }, () => new Array<string | null>(cols).fill(null)),
  current: null,
  deps: [],
  chosen: null,
  path: [],
  filled: 0,
  solution: null,
});

export function reduceDP(s: DPState, step: DPStep): DPState {
  switch (step.type) {
    case 'fill': {
      const [r, c] = step.cell!;
      const row = s.values[r].slice();
      const wasEmpty = row[c] === null;
      row[c] = step.value!;
      const values = s.values.slice();
      values[r] = row;
      return {
        ...s,
        values,
        current: step.cell!,
        deps: step.deps ?? [],
        chosen: step.chosen ?? null,
        filled: s.filled + (wasEmpty ? 1 : 0),
      };
    }
    case 'path':
      return {
        ...s,
        current: step.cell ?? null,
        deps: [],
        chosen: null,
        path: step.cell ? [...s.path, step.cell] : s.path,
        solution: step.solution ?? s.solution,
      };
    case 'note':
      return { ...s, current: step.cell ?? null, deps: step.deps ?? [], chosen: null };
    case 'done':
      return { ...s, current: null, deps: [], chosen: null, solution: step.solution ?? s.solution };
  }
}

export const fill = (
  cell: Cell,
  value: number | string,
  line: number,
  text: string,
  extra: { deps?: Cell[]; chosen?: Cell; vars?: Record<string, number | string> } = {},
): DPStep => ({
  type: 'fill',
  cell,
  value: typeof value === 'number' && !Number.isFinite(value) ? '∞' : String(value),
  deps: extra.deps,
  chosen: extra.chosen,
  line,
  text,
  vars: extra.vars ?? {},
});
