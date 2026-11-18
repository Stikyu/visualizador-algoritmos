import { SEARCH_ALGORITHMS } from './search';
import { SORTING_ALGORITHMS } from './sorting';
import type { AlgorithmMeta, Category } from './types';

export interface CategoryInfo {
  readonly id: Category;
  readonly label: string;
  readonly blurb: string;
}

export const CATEGORIES: readonly CategoryInfo[] = [
  {
    id: 'ordenamiento',
    label: 'Ordenamiento',
    blurb: 'Nueve formas de poner un arreglo en orden.',
  },
  {
    id: 'busqueda',
    label: 'Búsqueda',
    blurb: 'Encontrar un valor y ver cómo se achica el rango.',
  },
];

/** Catálogo de todos los algoritmos (para el inicio, el menú y las páginas de información). */
export const CATALOG: readonly AlgorithmMeta[] = [
  ...SORTING_ALGORITHMS.map((a) => a.meta),
  ...SEARCH_ALGORITHMS.map((a) => a.meta),
];

export const findMeta = (id: string): AlgorithmMeta | undefined => CATALOG.find((m) => m.id === id);

export const byCategory = (c: Category): AlgorithmMeta[] => CATALOG.filter((m) => m.category === c);
