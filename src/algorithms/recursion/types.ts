import type { AlgorithmMeta, BaseStep } from '../types';

/** Campo de entrada que la página dibuja para un problema (n, palabras, monedas…). */
export interface Field {
  readonly key: string;
  readonly label: string;
  readonly type: 'number' | 'text' | 'checkbox';
  readonly default: string;
  readonly min?: number;
  readonly max?: number;
  readonly help?: string;
}

export type Input = Readonly<Record<string, string>>;

/**
 * Problema con su propio estado y reductor (recursión y PD). Igual que los demás dominios:
 * el generador emite pasos y el reductor los aplica; la vista sólo dibuja el estado.
 */
export interface Problem<S, St extends BaseStep, R = unknown> {
  readonly meta: AlgorithmMeta;
  readonly fields: readonly Field[];
  readonly initial: (input: Input) => S;
  readonly reduce: (state: S, step: St) => S;
  readonly run: (input: Input) => Generator<St, R, void>;
}

/** Lee un entero de la entrada, acotado a [min, max]. */
export function intField(input: Input, key: string, def: number, min: number, max: number): number {
  const v = Math.trunc(Number(input[key]));
  return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : def;
}

export const boolField = (input: Input, key: string) => input[key] === 'true';

/** Entrada inicial: lo que venga en la URL o, si no, los valores por defecto de cada campo. */
export function defaultInput(
  fields: readonly Field[],
  query?: URLSearchParams,
): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.key, query?.get(f.key) ?? f.default]));
}
