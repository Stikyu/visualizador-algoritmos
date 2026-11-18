import type { AlgorithmMeta, BaseStep, Vars } from '../algorithms/types';

/**
 * Las estructuras de datos se modelan como VALORES inmutables ("snapshots") y cada operación
 * es un generador puro:  (snapshot, argumentos) → pasos… → snapshot nuevo.
 *
 *  - Para animar, cada paso lleva el snapshot completo de ese instante (son estructuras chicas,
 *    así que copiar es barato y el reductor queda trivial: "el estado es el último snapshot").
 *  - Para testear, se descarta la traza con drain() y se verifican invariantes sobre el valor
 *    devuelto. Es exactamente el mismo código el que se anima y el que se testea.
 */

/** Rol visual de un elemento en un paso. */
export type Mark =
  | 'current'
  | 'compare'
  | 'found'
  | 'new'
  | 'remove'
  | 'path'
  | 'rotate'
  | 'visited'
  | 'swap'
  | 'error';

export interface StructList {
  readonly label: string;
  readonly items: readonly (number | string)[];
}

export interface StructStep<S> extends BaseStep {
  readonly snap: S;
  /** id del elemento (o "slot-i" para posiciones) → rol visual. */
  readonly marks: Readonly<Record<string, Mark>>;
  /** Punteros con nombre (tope, frente, actual…) → id del elemento o índice. */
  readonly pointers: Readonly<Record<string, number | null>>;
  /** Listas auxiliares: salida de un recorrido, cola del BFS, pila de llamadas… */
  readonly lists: readonly StructList[];
}

export interface StructState<S> {
  readonly snap: S;
  readonly marks: Readonly<Record<string, Mark>>;
  readonly pointers: Readonly<Record<string, number | null>>;
  readonly lists: readonly StructList[];
}

export const initialStructState = <S>(snap: S): StructState<S> => ({
  snap,
  marks: {},
  pointers: {},
  lists: [],
});

/** Reductor del dominio "estructuras": cada paso trae el estado completo. */
export const reduceStruct = <S>(_state: StructState<S>, step: StructStep<S>): StructState<S> => ({
  snap: step.snap,
  marks: step.marks,
  pointers: step.pointers,
  lists: step.lists,
});

export interface StepExtra {
  readonly vars?: Vars;
  readonly marks?: Readonly<Record<string, Mark>>;
  readonly pointers?: Readonly<Record<string, number | null>>;
  readonly lists?: readonly StructList[];
}

/**
 * Crea una función `emit` que arma pasos con una copia del estado de trabajo actual.
 * Uso:  const emit = emitter(() => clone(work));  yield emit('visit', 3, 'texto', {...});
 */
export function emitter<S>(snapshot: () => S) {
  return (type: string, line: number, text: string, extra: StepExtra = {}): StructStep<S> => ({
    type,
    line,
    text,
    vars: extra.vars ?? {},
    snap: snapshot(),
    marks: extra.marks ?? {},
    pointers: extra.pointers ?? {},
    lists: extra.lists ?? [],
  });
}

export const clone = <T>(x: T): T => structuredClone(x);

/** Elemento con identidad estable (para animar movimientos). */
export interface Cell {
  readonly id: number;
  readonly value: number;
}

export type OpInput = 'value' | 'none' | 'value+index';

export interface OpDef<S> {
  readonly id: string;
  readonly label: string;
  readonly input: OpInput;
  readonly pseudocode: readonly string[];
  readonly run: (snap: S, value: number, index: number) => Generator<StructStep<S>, S, void>;
}

export type StructureView =
  'stack' | 'queue' | 'circular' | 'list' | 'bst' | 'avl' | 'heap' | 'hash-chain' | 'hash-open';

export interface StructureDef<S> {
  readonly meta: AlgorithmMeta;
  readonly view: StructureView;
  /** Costo de cada operación (se muestra en la ficha). */
  readonly opCosts: readonly { readonly op: string; readonly cost: string }[];
  /** Estado inicial con algunos datos de ejemplo. */
  readonly initial: () => S;
  readonly empty: () => S;
  readonly ops: readonly OpDef<S>[];
}

/** Borra el parámetro de tipo para poder guardar estructuras distintas en una misma lista. */
export const erase = <S>(def: StructureDef<S>): StructureDef<unknown> =>
  def as unknown as StructureDef<unknown>;
