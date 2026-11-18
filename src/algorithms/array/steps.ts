import type { BaseStep, Vars } from '../types';

/**
 * Elemento de un arreglo. El `id` identifica al elemento original (su posición en la entrada)
 * y permite verificar estabilidad: dos elementos con el mismo `value` tienen que terminar en
 * el mismo orden relativo de `id`.
 */
export interface Item {
  readonly id: number;
  readonly value: number;
}

export const toItems = (values: readonly number[]): Item[] =>
  values.map((value, id) => ({ id, value }));

// ---------------------------------------------------------------------------
// Pasos del dominio "arreglo" (ordenamiento y búsqueda)
// ---------------------------------------------------------------------------

/** Compara elementos del arreglo principal (índices). */
export interface CompareStep extends BaseStep {
  readonly type: 'compare';
  readonly indices: readonly number[];
}
/** Intercambia dos posiciones del arreglo. */
export interface SwapStep extends BaseStep {
  readonly type: 'swap';
  readonly i: number;
  readonly j: number;
}
/** Escribe un elemento en una posición (merge sort, inserción, counting sort...). */
export interface SetStep extends BaseStep {
  readonly type: 'set';
  readonly index: number;
  readonly item: Item;
}
/** Lee una posición (cuenta como acceso). */
export interface ReadStep extends BaseStep {
  readonly type: 'read';
  readonly index: number;
}
/** Marca posiciones como definitivas ("ya ordenado"). */
export interface MarkStep extends BaseStep {
  readonly type: 'mark';
  readonly indices: readonly number[];
}
/** Elige el pivote (quick sort) o el elemento "llave" (inserción). */
export interface PivotStep extends BaseStep {
  readonly type: 'pivot';
  readonly index: number | null;
}
/** Subarreglo activo [lo, hi] (null = todo). En búsqueda también indica `mid`. */
export interface RangeStep extends BaseStep {
  readonly type: 'range';
  readonly lo: number | null;
  readonly hi: number | null;
  readonly mid?: number | null;
}
/** Crea/reemplaza un arreglo auxiliar visible (temporal del merge, conteos, salida). */
export interface AuxInitStep extends BaseStep {
  readonly type: 'auxInit';
  readonly name: string;
  readonly values: readonly (number | null)[];
}
export interface AuxSetStep extends BaseStep {
  readonly type: 'auxSet';
  readonly name: string;
  readonly index: number;
  readonly value: number | null;
}
export interface AuxClearStep extends BaseStep {
  readonly type: 'auxClear';
  readonly name: string;
}
/** Resultado de una búsqueda. index = -1 si no se encontró. */
export interface FoundStep extends BaseStep {
  readonly type: 'found';
  readonly index: number;
}
/** Paso puramente explicativo (no cambia el arreglo). */
export interface NoteStep extends BaseStep {
  readonly type: 'note';
}

export type ArrayStep =
  | CompareStep
  | SwapStep
  | SetStep
  | ReadStep
  | MarkStep
  | PivotStep
  | RangeStep
  | AuxInitStep
  | AuxSetStep
  | AuxClearStep
  | FoundStep
  | NoteStep;

// ---------------------------------------------------------------------------
// Fábrica de pasos: azúcar sintáctico para que los algoritmos se lean como pseudocódigo.
// ---------------------------------------------------------------------------

type Info = { line: number; text: string; vars?: Vars };
const base = (info: Info) => ({ line: info.line, text: info.text, vars: info.vars ?? {} });

export const step = {
  compare: (indices: readonly number[], info: Info): CompareStep => ({
    type: 'compare',
    indices,
    ...base(info),
  }),
  swap: (i: number, j: number, info: Info): SwapStep => ({ type: 'swap', i, j, ...base(info) }),
  set: (index: number, item: Item, info: Info): SetStep => ({
    type: 'set',
    index,
    item,
    ...base(info),
  }),
  read: (index: number, info: Info): ReadStep => ({ type: 'read', index, ...base(info) }),
  mark: (indices: readonly number[], info: Info): MarkStep => ({
    type: 'mark',
    indices,
    ...base(info),
  }),
  pivot: (index: number | null, info: Info): PivotStep => ({ type: 'pivot', index, ...base(info) }),
  range: (lo: number | null, hi: number | null, info: Info, mid?: number | null): RangeStep => ({
    type: 'range',
    lo,
    hi,
    mid,
    ...base(info),
  }),
  auxInit: (name: string, values: readonly (number | null)[], info: Info): AuxInitStep => ({
    type: 'auxInit',
    name,
    values,
    ...base(info),
  }),
  auxSet: (name: string, index: number, value: number | null, info: Info): AuxSetStep => ({
    type: 'auxSet',
    name,
    index,
    value,
    ...base(info),
  }),
  auxClear: (name: string, info: Info): AuxClearStep => ({ type: 'auxClear', name, ...base(info) }),
  found: (index: number, info: Info): FoundStep => ({ type: 'found', index, ...base(info) }),
  note: (info: Info): NoteStep => ({ type: 'note', ...base(info) }),
};
