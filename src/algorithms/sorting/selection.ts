import { step } from '../array/steps';
import { range, type SortAlgorithm } from './types';

export const selectionSort: SortAlgorithm = {
  meta: {
    id: 'seleccion',
    name: 'Selección',
    category: 'ordenamiento',
    summary:
      'En cada vuelta busca el mínimo de la parte desordenada y lo coloca al principio de esa parte.',
    pseudocode: [
      'para i ← 0 hasta n − 2',
      '  mín ← i',
      '  para j ← i + 1 hasta n − 1',
      '    si A[j] < A[mín]',
      '      mín ← j',
      '  intercambiar A[i] y A[mín]',
      '  marcar A[i] como ordenado',
    ],
    complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    stable: false,
    inPlace: true,
    whenToUse: [
      'Cuando escribir en memoria es caro: hace como máximo n − 1 intercambios.',
      'Arreglos chicos donde la simplicidad importa más que la velocidad.',
    ],
    avoidWhen: [
      'Datos casi ordenados: no lo aprovecha, siempre hace n²/2 comparaciones.',
      'Cuando necesitás estabilidad.',
    ],
  },
  *run(input) {
    const a = input.slice();
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      yield step.pivot(min, {
        line: 2,
        text: `Suponemos que el mínimo de A[${i}..${n - 1}] es A[${i}] = ${a[i].value}.`,
        vars: { i, mín: min, 'A[mín]': a[min].value },
      });
      for (let j = i + 1; j < n; j++) {
        yield step.compare([j, min], {
          line: 4,
          text: `¿A[${j}] = ${a[j].value} es menor que el mínimo actual ${a[min].value}?`,
          vars: { i, j, mín: min, 'A[j]': a[j].value, 'A[mín]': a[min].value },
        });
        if (a[j].value < a[min].value) {
          min = j;
          yield step.pivot(min, {
            line: 5,
            text: `Sí: el nuevo mínimo es ${a[min].value} (posición ${min}).`,
            vars: { i, j, mín: min, 'A[mín]': a[min].value },
          });
        }
      }
      if (min !== i) {
        [a[i], a[min]] = [a[min], a[i]];
        yield step.swap(i, min, {
          line: 6,
          text: `Se intercambia A[${i}] con el mínimo encontrado en la posición ${min}.`,
          vars: { i, mín: min },
        });
      } else {
        yield step.note({
          line: 6,
          text: `El mínimo ya estaba en la posición ${i}: no hace falta intercambiar.`,
          vars: { i, mín: min },
        });
      }
      yield step.pivot(null, {
        line: 7,
        text: `${a[i].value} queda fijo en la posición ${i}.`,
        vars: { i },
      });
      yield step.mark([i], { line: 7, text: `A[0..${i}] ya está ordenado.`, vars: { i } });
    }
    yield step.mark(range(n), { line: 0, text: 'Arreglo ordenado.', vars: { n } });
    return a;
  },
};
