import { describe, expect, it } from 'vitest';
import { initialArrayState, reduceArray } from '../src/algorithms/array/state';
import { toItems, type Item } from '../src/algorithms/array/steps';
import { record } from '../src/algorithms/record';
import { createRng, randInt } from '../src/algorithms/rng';
import { SORTING_ALGORITHMS } from '../src/algorithms/sorting';
import { Timeline } from '../src/player/timeline';

const rng = createRng(20261118);

/** Casos borde + cientos de arreglos aleatorios (con negativos y muchos repetidos). */
function cases(): number[][] {
  const out: number[][] = [[], [5], [2, 1], [1, 2], [3, 3, 3], [-1, -5, 0, 7, -5]];
  for (let t = 0; t < 300; t++) {
    const n = randInt(rng, 0, 40);
    const spread = t % 3 === 0 ? 4 : t % 3 === 1 ? 50 : 1000; // pocos valores → muchos repetidos
    out.push(Array.from({ length: n }, () => randInt(rng, -spread, spread)));
  }
  out.push(Array.from({ length: 60 }, (_, i) => i)); // ya ordenado
  out.push(Array.from({ length: 60 }, (_, i) => 60 - i)); // invertido
  return out;
}

const CASES = cases();

const optionVariants: Record<string, Record<string, string>[]> = {
  quick: ['ultimo', 'primero', 'medio', 'aleatorio', 'mediana3'].map((pivote) => ({ pivote })),
  shell: [{ brechas: 'shell' }, { brechas: 'knuth' }],
};

describe.each(SORTING_ALGORITHMS.map((a) => [a.meta.name, a] as const))('%s', (_name, algo) => {
  const variants = optionVariants[algo.meta.id] ?? [{}];

  it.each(variants.map((v) => [JSON.stringify(v), v] as const))(
    'ordena igual que Array.prototype.sort %s',
    (_label, options) => {
      for (const values of CASES) {
        const expected = values.slice().sort((x, y) => x - y);
        const { result } = record(algo.run(toItems(values), options));
        expect(result.map((it) => it.value)).toEqual(expected);
      }
    },
  );

  it('no muta la entrada', () => {
    const input = toItems([3, 1, 2]);
    const copy = input.slice();
    record(algo.run(input));
    expect(input).toEqual(copy);
  });

  it('reproducir la traza desde el estado inicial da exactamente el estado final', () => {
    for (const values of CASES.slice(0, 120)) {
      for (const options of variants) {
        const items = toItems(values);
        const { steps, result } = record(algo.run(items, options));
        const final = steps.reduce(reduceArray, initialArrayState(items));
        expect(final.items).toEqual(result);
        // Al terminar, todas las posiciones quedan marcadas como ordenadas.
        expect(final.sorted.every(Boolean)).toBe(true);
        // Los índices de cada paso están dentro del arreglo.
        for (const s of steps) {
          if (s.type === 'compare')
            for (const i of s.indices) expect(i).toBeLessThan(values.length);
          if (s.type === 'swap') expect(Math.max(s.i, s.j)).toBeLessThan(values.length);
          if (s.line > 0) expect(s.line).toBeLessThanOrEqual(algo.meta.pseudocode.length);
        }
      }
    }
  });

  it('la línea de tiempo con checkpoints coincide con aplicar los pasos uno por uno', () => {
    const items = toItems([5, -2, 9, 1, 5, 6, 0, 3, 3, 8, -7, 4]);
    const { steps } = record(algo.run(items));
    const timeline = new Timeline(initialArrayState(items), steps, reduceArray, 8);
    let state = initialArrayState(items);
    const states = [state];
    for (const s of steps) states.push((state = reduceArray(state, s)));
    // Acceso en orden aleatorio: hacia adelante, hacia atrás y saltos.
    const order = states.map((_, i) => i).sort(() => rng() - 0.5);
    for (const p of order) expect(timeline.stateAt(p)).toEqual(states[p]);
  });

  if (algo.meta.stable) {
    it('es estable: los iguales conservan su orden original', () => {
      for (const values of CASES) {
        const { result } = record(algo.run(toItems(values)));
        for (let i = 1; i < result.length; i++) {
          const prev: Item = result[i - 1];
          const cur: Item = result[i];
          if (prev.value === cur.value) expect(prev.id).toBeLessThan(cur.id);
        }
      }
    });
  }
});

describe('contadores', () => {
  it('se derivan de los pasos', () => {
    const algo = SORTING_ALGORITHMS.find((a) => a.meta.id === 'burbuja')!;
    const items = toItems([3, 2, 1]);
    const { steps } = record(algo.run(items));
    const final = steps.reduce(reduceArray, initialArrayState(items));
    expect(final.counters.comparisons).toBe(3);
    expect(final.counters.swaps).toBe(3);
  });
});
