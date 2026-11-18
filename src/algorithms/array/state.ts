import type { ArrayStep, Item } from './steps';

export interface ArrayCounters {
  readonly comparisons: number;
  readonly swaps: number;
  readonly writes: number;
  readonly accesses: number;
}

/**
 * Estado visual del dominio "arreglo". Es lo que el renderer de barras dibuja.
 * Los campos `comparing`, `swapping` y `written` son transitorios: sólo valen para el paso
 * actual y se limpian al aplicar el siguiente.
 */
export interface ArrayState {
  readonly items: readonly Item[];
  readonly comparing: readonly number[];
  readonly swapping: readonly number[];
  readonly written: readonly number[];
  readonly sorted: readonly boolean[];
  readonly pivot: number | null;
  readonly range: { readonly lo: number; readonly hi: number } | null;
  readonly mid: number | null;
  readonly found: number | null; // índice encontrado, -1 = no está, null = sin resultado aún
  readonly aux: Readonly<Record<string, readonly (number | null)[]>>;
  readonly auxWritten: { readonly name: string; readonly index: number } | null;
  readonly counters: ArrayCounters;
}

export const ZERO_COUNTERS: ArrayCounters = { comparisons: 0, swaps: 0, writes: 0, accesses: 0 };

export function initialArrayState(items: readonly Item[]): ArrayState {
  return {
    items,
    comparing: [],
    swapping: [],
    written: [],
    sorted: items.map(() => false),
    pivot: null,
    range: null,
    mid: null,
    found: null,
    aux: {},
    auxWritten: null,
    counters: ZERO_COUNTERS,
  };
}

const NONE: readonly number[] = [];

/**
 * Reducer puro: estado + paso → estado siguiente. Nunca muta su entrada, por eso el
 * reproductor puede guardar estados intermedios (checkpoints) y volver atrás sin miedo.
 *
 * Los contadores se derivan de los pasos, no los lleva el algoritmo: así es imposible que
 * el contador y la animación se desincronicen.
 */
export function reduceArray(state: ArrayState, s: ArrayStep): ArrayState {
  const c = state.counters;
  const cleared: ArrayState =
    state.comparing.length || state.swapping.length || state.written.length || state.auxWritten
      ? { ...state, comparing: NONE, swapping: NONE, written: NONE, auxWritten: null }
      : state;

  switch (s.type) {
    case 'compare':
      return {
        ...cleared,
        comparing: s.indices,
        counters: {
          ...c,
          comparisons: c.comparisons + 1,
          accesses: c.accesses + s.indices.length,
        },
      };
    case 'swap': {
      const items = state.items.slice();
      const tmp = items[s.i];
      items[s.i] = items[s.j];
      items[s.j] = tmp;
      return {
        ...cleared,
        items,
        swapping: [s.i, s.j],
        counters: { ...c, swaps: c.swaps + 1, writes: c.writes + 2, accesses: c.accesses + 4 },
      };
    }
    case 'set': {
      const items = state.items.slice();
      items[s.index] = s.item;
      return {
        ...cleared,
        items,
        written: [s.index],
        counters: { ...c, writes: c.writes + 1, accesses: c.accesses + 1 },
      };
    }
    case 'read':
      return {
        ...cleared,
        comparing: [s.index],
        counters: { ...c, accesses: c.accesses + 1 },
      };
    case 'mark': {
      const sorted = state.sorted.slice();
      for (const i of s.indices) sorted[i] = true;
      return { ...cleared, sorted };
    }
    case 'pivot':
      return { ...cleared, pivot: s.index };
    case 'range':
      return {
        ...cleared,
        range: s.lo === null || s.hi === null ? null : { lo: s.lo, hi: s.hi },
        mid: s.mid ?? null,
      };
    case 'auxInit':
      return { ...cleared, aux: { ...state.aux, [s.name]: s.values } };
    case 'auxSet': {
      const arr = (state.aux[s.name] ?? []).slice();
      arr[s.index] = s.value;
      return {
        ...cleared,
        aux: { ...state.aux, [s.name]: arr },
        auxWritten: { name: s.name, index: s.index },
        counters: { ...c, writes: c.writes + 1 },
      };
    }
    case 'auxClear': {
      const aux = { ...state.aux };
      delete aux[s.name];
      return { ...cleared, aux };
    }
    case 'found':
      return { ...cleared, found: s.index, mid: s.index >= 0 ? s.index : state.mid };
    case 'note':
      return cleared;
  }
}
