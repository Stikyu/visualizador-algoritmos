import type { ArrayStep, Item } from '../array/steps';
import type { AlgorithmMeta, Options } from '../types';

/**
 * Contrato de un algoritmo de ordenamiento: metadatos + generador.
 * El generador recibe la entrada (no la muta), emite pasos y RETORNA el arreglo ordenado.
 * Ese valor de retorno se usa en los tests para verificar que la traza es consistente.
 */
export interface SortAlgorithm {
  readonly meta: AlgorithmMeta;
  readonly run: (input: readonly Item[], options?: Options) => Generator<ArrayStep, Item[], void>;
}

export const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
