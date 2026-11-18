import { step, type ArrayStep, type Item } from '../array/steps';
import { createRng } from '../rng';
import { range, type SortAlgorithm } from './types';

type PivotStrategy = 'ultimo' | 'primero' | 'medio' | 'aleatorio' | 'mediana3';

const STRATEGY_TEXT: Record<PivotStrategy, string> = {
  ultimo: 'el último elemento',
  primero: 'el primer elemento',
  medio: 'el elemento del medio',
  aleatorio: 'un elemento al azar',
  mediana3: 'la mediana entre el primero, el del medio y el último',
};

function choosePivot(
  a: readonly Item[],
  lo: number,
  hi: number,
  strategy: PivotStrategy,
  rng: () => number,
): number {
  switch (strategy) {
    case 'ultimo':
      return hi;
    case 'primero':
      return lo;
    case 'medio':
      return Math.floor((lo + hi) / 2);
    case 'aleatorio':
      return lo + Math.floor(rng() * (hi - lo + 1));
    case 'mediana3': {
      const mid = Math.floor((lo + hi) / 2);
      const x = a[lo].value;
      const y = a[mid].value;
      const z = a[hi].value;
      if ((x <= y && y <= z) || (z <= y && y <= x)) return mid;
      if ((y <= x && x <= z) || (z <= x && x <= y)) return lo;
      return hi;
    }
  }
}

export const quickSort: SortAlgorithm = {
  meta: {
    id: 'quick',
    name: 'Quick sort',
    category: 'ordenamiento',
    summary:
      'Elige un pivote, deja a su izquierda los menores y a su derecha los mayores (partición), y repite en cada lado.',
    pseudocode: [
      'quickSort(A, lo, hi):',
      '  si lo ≥ hi: retornar',
      '  p ← elegirPivote(A, lo, hi);  intercambiar A[p] y A[hi]',
      '  pivote ← A[hi];  i ← lo',
      '  para j ← lo hasta hi − 1',
      '    si A[j] < pivote',
      '      intercambiar A[i] y A[j];  i ← i + 1',
      '  intercambiar A[i] y A[hi]   ▹ el pivote queda en su lugar',
      '  quickSort(A, lo, i − 1)',
      '  quickSort(A, i + 1, hi)',
    ],
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
    stable: false,
    inPlace: true,
    whenToUse: [
      'Ordenamiento general en memoria: en la práctica suele ser el más rápido (buena localidad de caché).',
      'Con pivote aleatorio o mediana de tres, el peor caso es muy improbable.',
    ],
    avoidWhen: [
      'Con pivote fijo (primero/último) sobre datos ya ordenados: cae en O(n²).',
      'Cuando necesitás estabilidad o un peor caso garantizado.',
    ],
    options: [
      {
        key: 'pivote',
        label: 'Pivote',
        default: 'ultimo',
        choices: [
          { value: 'ultimo', label: 'Último (Lomuto)' },
          { value: 'primero', label: 'Primero' },
          { value: 'medio', label: 'Del medio' },
          { value: 'aleatorio', label: 'Aleatorio' },
          { value: 'mediana3', label: 'Mediana de tres' },
        ],
      },
    ],
  },
  *run(input, options = {}) {
    const a = input.slice();
    const n = a.length;
    const strategy = (options.pivote ?? 'ultimo') as PivotStrategy;
    const rng = createRng(Number(options.semilla ?? 7));

    function* sort(lo: number, hi: number): Generator<ArrayStep, void, void> {
      yield step.range(lo, hi, {
        line: 1,
        text: `quickSort(A, ${lo}, ${hi}).`,
        vars: { lo, hi },
      });
      if (lo >= hi) {
        if (lo === hi) {
          yield step.mark([lo], {
            line: 2,
            text: `Un solo elemento (${a[lo].value}): ya está en su lugar.`,
            vars: { lo, hi },
          });
        }
        return;
      }
      const p = choosePivot(a, lo, hi, strategy, rng);
      yield step.pivot(p, {
        line: 3,
        text: `Elegimos como pivote ${STRATEGY_TEXT[strategy]}: A[${p}] = ${a[p].value}.`,
        vars: { lo, hi, p, pivote: a[p].value },
      });
      if (p !== hi) {
        [a[p], a[hi]] = [a[hi], a[p]];
        yield step.swap(p, hi, {
          line: 3,
          text: 'Movemos el pivote al final del rango para particionar.',
          vars: { lo, hi, p },
        });
        yield step.pivot(hi, { line: 3, text: 'El pivote queda en A[hi].', vars: { lo, hi } });
      }
      const pivot = a[hi].value;
      let i = lo;
      yield step.note({
        line: 4,
        text: `Partición: todo lo menor que ${pivot} irá a la izquierda de i.`,
        vars: { lo, hi, pivote: pivot, i },
      });
      for (let j = lo; j < hi; j++) {
        yield step.compare([j, hi], {
          line: 6,
          text: `¿A[${j}] = ${a[j].value} es menor que el pivote ${pivot}?`,
          vars: { lo, hi, pivote: pivot, i, j, 'A[j]': a[j].value },
        });
        if (a[j].value < pivot) {
          if (i !== j) {
            [a[i], a[j]] = [a[j], a[i]];
            yield step.swap(i, j, {
              line: 7,
              text: `Sí: lo mandamos a la zona de menores (posición ${i}).`,
              vars: { lo, hi, pivote: pivot, i, j },
            });
          } else {
            yield step.note({
              line: 7,
              text: `Sí, y ya está en la zona de menores (i = j = ${i}).`,
              vars: { lo, hi, pivote: pivot, i, j },
            });
          }
          i++;
        }
      }
      if (i !== hi) {
        [a[i], a[hi]] = [a[hi], a[i]];
        yield step.swap(i, hi, {
          line: 8,
          text: `El pivote ${pivot} va a la posición ${i}: a su izquierda todo es menor, a su derecha todo es mayor o igual.`,
          vars: { lo, hi, pivote: pivot, i },
        });
      }
      yield step.pivot(null, {
        line: 8,
        text: `${pivot} quedó en su posición definitiva.`,
        vars: { i },
      });
      yield step.mark([i], {
        line: 8,
        text: `A[${i}] = ${pivot} ya está ordenado.`,
        vars: { lo, hi, i },
      });
      yield* sort(lo, i - 1);
      yield* sort(i + 1, hi);
    }

    if (n > 0) yield* sort(0, n - 1);
    yield step.range(null, null, { line: 0, text: 'Terminó la recursión.', vars: { n } });
    yield step.mark(range(n), { line: 0, text: 'Arreglo ordenado.', vars: { n } });
    return a;
  },
};
