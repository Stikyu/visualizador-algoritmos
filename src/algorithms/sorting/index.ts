import { bubbleSort } from './bubble';
import { countingSort } from './counting';
import { heapSort } from './heap';
import { insertionSort } from './insertion';
import { mergeSort } from './merge';
import { quickSort } from './quick';
import { radixSort } from './radix';
import { selectionSort } from './selection';
import { shellSort } from './shell';
import type { SortAlgorithm } from './types';

/** Para agregar un ordenamiento nuevo: crear su archivo y sumarlo a esta lista. */
export const SORTING_ALGORITHMS: readonly SortAlgorithm[] = [
  bubbleSort,
  selectionSort,
  insertionSort,
  mergeSort,
  quickSort,
  heapSort,
  shellSort,
  countingSort,
  radixSort,
];

export type { SortAlgorithm };
