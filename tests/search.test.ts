import { describe, expect, it } from 'vitest';
import { initialArrayState, reduceArray } from '../src/algorithms/array/state';
import { toItems } from '../src/algorithms/array/steps';
import { record } from '../src/algorithms/record';
import { createRng, randInt } from '../src/algorithms/rng';
import { SEARCH_ALGORITHMS, binarySearch } from '../src/algorithms/search';

const rng = createRng(42);

describe.each(SEARCH_ALGORITHMS.map((a) => [a.meta.name, a] as const))('%s', (_n, algo) => {
  it('encuentra lo que está y devuelve −1 si no está', () => {
    for (let t = 0; t < 400; t++) {
      const n = randInt(rng, 0, 50);
      let values = Array.from({ length: n }, () => randInt(rng, -60, 60));
      if (algo.requiresSorted) values = values.sort((x, y) => x - y);
      const target = t % 2 === 0 && n > 0 ? values[randInt(rng, 0, n - 1)] : randInt(rng, -80, 80);
      const items = toItems(values);
      const { steps, result } = record(algo.run(items, target));
      if (values.includes(target)) {
        expect(values[result]).toBe(target);
      } else {
        expect(result).toBe(-1);
      }
      // El último paso informa el resultado y la traza reproduce el mismo estado final.
      const final = steps.reduce(reduceArray, initialArrayState(items));
      expect(final.found).toBe(result);
      expect(final.items).toEqual(items);
    }
  });
});

describe('búsqueda binaria', () => {
  it('hace a lo sumo ⌊log2 n⌋ + 1 comparaciones', () => {
    const items = toItems(Array.from({ length: 1000 }, (_, i) => i * 2));
    const { steps } = record(binarySearch.run(items, 1));
    const comparisons = steps.filter((s) => s.type === 'compare').length;
    expect(comparisons).toBeLessThanOrEqual(Math.floor(Math.log2(1000)) + 1);
  });
});
