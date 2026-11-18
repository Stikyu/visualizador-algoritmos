import { step, type ArrayStep, type Item } from '../array/steps';
import { range, type SortAlgorithm } from './types';

export const mergeSort: SortAlgorithm = {
  meta: {
    id: 'merge',
    name: 'Merge sort',
    category: 'ordenamiento',
    summary:
      'Divide y vencerás: parte el arreglo a la mitad, ordena cada mitad recursivamente y después las mezcla en orden.',
    pseudocode: [
      'mergeSort(A, izq, der):',
      '  si izq ≥ der: retornar',
      '  medio ← ⌊(izq + der) / 2⌋',
      '  mergeSort(A, izq, medio)',
      '  mergeSort(A, medio + 1, der)',
      '  mezclar(A, izq, medio, der)',
      'mezclar(A, izq, medio, der):',
      '  i ← izq;  j ← medio + 1',
      '  mientras i ≤ medio y j ≤ der',
      '    si A[i] ≤ A[j]: temp.agregar(A[i]); i ← i + 1',
      '    si no: temp.agregar(A[j]); j ← j + 1',
      '  agregar a temp lo que quede de cada mitad',
      '  copiar temp en A[izq..der]',
    ],
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
    stable: true,
    inPlace: false,
    whenToUse: [
      'Cuando necesitás O(n log n) garantizado y estabilidad.',
      'Listas enlazadas (se mezcla sin memoria extra) y ordenamiento externo (archivos enormes).',
    ],
    avoidWhen: ['Memoria muy limitada: usa O(n) adicional.'],
  },
  *run(input) {
    const a = input.slice();
    const n = a.length;

    function* merge(lo: number, mid: number, hi: number): Generator<ArrayStep, void, void> {
      const temp: Item[] = [];
      yield step.auxInit('temp', new Array<number | null>(hi - lo + 1).fill(null), {
        line: 8,
        text: `Mezclamos A[${lo}..${mid}] y A[${mid + 1}..${hi}] (cada mitad ya está ordenada) en un arreglo temporal.`,
        vars: { izq: lo, medio: mid, der: hi },
      });
      let i = lo;
      let j = mid + 1;
      while (i <= mid && j <= hi) {
        yield step.compare([i, j], {
          line: 9,
          text: `¿A[${i}] = ${a[i].value} ≤ A[${j}] = ${a[j].value}?`,
          vars: { izq: lo, medio: mid, der: hi, i, j, 'A[i]': a[i].value, 'A[j]': a[j].value },
        });
        if (a[i].value <= a[j].value) {
          temp.push(a[i]);
          yield step.auxSet('temp', temp.length - 1, a[i].value, {
            line: 10,
            text: `Sí: va ${a[i].value} de la mitad izquierda (con ≤ se preserva la estabilidad).`,
            vars: { izq: lo, medio: mid, der: hi, i, j },
          });
          i++;
        } else {
          temp.push(a[j]);
          yield step.auxSet('temp', temp.length - 1, a[j].value, {
            line: 11,
            text: `No: va ${a[j].value} de la mitad derecha.`,
            vars: { izq: lo, medio: mid, der: hi, i, j },
          });
          j++;
        }
      }
      while (i <= mid) {
        temp.push(a[i]);
        yield step.auxSet('temp', temp.length - 1, a[i].value, {
          line: 12,
          text: `Queda ${a[i].value} en la mitad izquierda: se agrega al final.`,
          vars: { izq: lo, medio: mid, der: hi, i, j },
        });
        i++;
      }
      while (j <= hi) {
        temp.push(a[j]);
        yield step.auxSet('temp', temp.length - 1, a[j].value, {
          line: 12,
          text: `Queda ${a[j].value} en la mitad derecha: se agrega al final.`,
          vars: { izq: lo, medio: mid, der: hi, i, j },
        });
        j++;
      }
      for (let k = 0; k < temp.length; k++) {
        a[lo + k] = temp[k];
        yield step.set(lo + k, temp[k], {
          line: 13,
          text: `Copiamos temp[${k}] = ${temp[k].value} en A[${lo + k}].`,
          vars: { izq: lo, der: hi, k },
        });
      }
      yield step.auxClear('temp', {
        line: 13,
        text: `A[${lo}..${hi}] quedó ordenado.`,
        vars: { izq: lo, der: hi },
      });
    }

    function* sort(lo: number, hi: number, depth: number): Generator<ArrayStep, void, void> {
      yield step.range(lo, hi, {
        line: 1,
        text: `mergeSort(A, ${lo}, ${hi}) — profundidad ${depth}.`,
        vars: { izq: lo, der: hi, profundidad: depth },
      });
      if (lo >= hi) {
        yield step.note({
          line: 2,
          text: 'Un solo elemento: ya está ordenado (caso base).',
          vars: { izq: lo, der: hi },
        });
        return;
      }
      const mid = Math.floor((lo + hi) / 2);
      yield step.note({
        line: 3,
        text: `Partimos en A[${lo}..${mid}] y A[${mid + 1}..${hi}].`,
        vars: { izq: lo, medio: mid, der: hi },
      });
      yield* sort(lo, mid, depth + 1);
      yield* sort(mid + 1, hi, depth + 1);
      yield step.range(lo, hi, {
        line: 6,
        text: `Volvemos a mergeSort(A, ${lo}, ${hi}): toca mezclar.`,
        vars: { izq: lo, medio: mid, der: hi },
      });
      yield* merge(lo, mid, hi);
    }

    if (n > 0) yield* sort(0, n - 1, 0);
    yield step.range(null, null, { line: 0, text: 'Terminó la recursión.', vars: { n } });
    yield step.mark(range(n), { line: 0, text: 'Arreglo ordenado.', vars: { n } });
    return a;
  },
};
