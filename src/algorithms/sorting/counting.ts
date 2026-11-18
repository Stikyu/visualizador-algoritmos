import { step, type Item } from '../array/steps';
import { range, type SortAlgorithm } from './types';

export const countingSort: SortAlgorithm = {
  meta: {
    id: 'counting',
    name: 'Counting sort',
    category: 'ordenamiento',
    summary:
      'No compara: cuenta cuántas veces aparece cada valor y usa las sumas acumuladas para ubicar cada elemento directamente.',
    pseudocode: [
      'mín ← mínimo(A);  máx ← máximo(A)',
      'conteo ← arreglo de (máx − mín + 1) ceros',
      'para cada x en A: conteo[x − mín] ← conteo[x − mín] + 1',
      'para k ← 1 hasta largo(conteo) − 1: conteo[k] ← conteo[k] + conteo[k − 1]',
      'para i ← n − 1 bajando hasta 0',
      '  conteo[A[i] − mín] ← conteo[A[i] − mín] − 1',
      '  salida[conteo[A[i] − mín]] ← A[i]',
      'copiar salida en A',
    ],
    complexity: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n + k)', space: 'O(n + k)' },
    stable: true,
    inPlace: false,
    whenToUse: [
      'Enteros en un rango chico (k = máx − mín no mucho mayor que n): es lineal.',
      'Como subrutina estable de radix sort.',
    ],
    avoidWhen: [
      'Rango de valores enorme (por ejemplo, IDs de 32 bits): la tabla de conteo explota.',
    ],
  },
  *run(input) {
    const a = input.slice();
    const n = a.length;
    if (n === 0) return a;
    let min = a[0].value;
    let max = a[0].value;
    for (let i = 0; i < n; i++) {
      yield step.read(i, {
        line: 1,
        text: `Buscamos mínimo y máximo: leemos A[${i}] = ${a[i].value}.`,
        vars: { i, mín: min, máx: max },
      });
      min = Math.min(min, a[i].value);
      max = Math.max(max, a[i].value);
    }
    const k = max - min + 1;
    const count = new Array<number>(k).fill(0);
    yield step.auxInit('conteo', count.slice(), {
      line: 2,
      text: `Los valores van de ${min} a ${max}: creamos ${k} contadores.`,
      vars: { mín: min, máx: max, k },
    });
    for (let i = 0; i < n; i++) {
      const c = a[i].value - min;
      count[c]++;
      yield step.read(i, {
        line: 3,
        text: `A[${i}] = ${a[i].value}: sumamos 1 en conteo[${c}].`,
        vars: { i, x: a[i].value, 'x − mín': c },
      });
      yield step.auxSet('conteo', c, count[c], {
        line: 3,
        text: `conteo[${c}] = ${count[c]}.`,
        vars: { i, x: a[i].value, 'x − mín': c },
      });
    }
    for (let j = 1; j < k; j++) {
      count[j] += count[j - 1];
      yield step.auxSet('conteo', j, count[j], {
        line: 4,
        text: `Acumulado: conteo[${j}] = ${count[j]} elementos son ≤ ${j + min}.`,
        vars: { k: j },
      });
    }
    const out: (Item | null)[] = new Array<Item | null>(n).fill(null);
    yield step.auxInit('salida', new Array<number | null>(n).fill(null), {
      line: 5,
      text: 'Recorremos A de derecha a izquierda (eso hace que sea estable).',
      vars: { n },
    });
    for (let i = n - 1; i >= 0; i--) {
      const c = a[i].value - min;
      count[c]--;
      yield step.auxSet('conteo', c, count[c], {
        line: 6,
        text: `A[${i}] = ${a[i].value}: su lugar es conteo[${c}] − 1 = ${count[c]}.`,
        vars: { i, 'A[i]': a[i].value, posición: count[c] },
      });
      out[count[c]] = a[i];
      yield step.auxSet('salida', count[c], a[i].value, {
        line: 7,
        text: `salida[${count[c]}] ← ${a[i].value}.`,
        vars: { i, posición: count[c] },
      });
    }
    for (let i = 0; i < n; i++) {
      const item = out[i] as Item;
      a[i] = item;
      yield step.set(i, item, { line: 8, text: `A[${i}] ← ${item.value}.`, vars: { i } });
    }
    yield step.auxClear('conteo', { line: 8, text: 'Listo.', vars: {} });
    yield step.auxClear('salida', { line: 8, text: 'Listo.', vars: {} });
    yield step.mark(range(n), { line: 0, text: 'Arreglo ordenado.', vars: { n } });
    return a;
  },
};
