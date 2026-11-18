import { step } from '../array/steps';
import { range, type SortAlgorithm } from './types';

export const bubbleSort: SortAlgorithm = {
  meta: {
    id: 'burbuja',
    name: 'Burbuja',
    category: 'ordenamiento',
    summary:
      'Recorre el arreglo comparando vecinos e intercambiándolos si están desordenados: en cada pasada el mayor "flota" hasta el final.',
    pseudocode: [
      'para i ← 0 hasta n − 2',
      '  intercambió ← falso',
      '  para j ← 0 hasta n − 2 − i',
      '    si A[j] > A[j + 1]',
      '      intercambiar A[j] y A[j + 1]',
      '      intercambió ← verdadero',
      '  marcar A[n − 1 − i] como ordenado',
      '  si no intercambió: terminar',
    ],
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    stable: true,
    inPlace: true,
    whenToUse: [
      'Para enseñar: es el ordenamiento más fácil de seguir a mano.',
      'Arreglos diminutos o casi ordenados (con la salida temprana es O(n)).',
    ],
    avoidWhen: ['Casi siempre en producción: hace muchísimos intercambios.'],
  },
  *run(input) {
    const a = input.slice();
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      yield step.note({
        line: 2,
        text: `Pasada ${i + 1}: el mayor de A[0..${n - 1 - i}] va a terminar en la posición ${n - 1 - i}.`,
        vars: { i, n, intercambió: swapped },
      });
      for (let j = 0; j < n - 1 - i; j++) {
        yield step.compare([j, j + 1], {
          line: 4,
          text: `¿A[${j}] = ${a[j].value} es mayor que A[${j + 1}] = ${a[j + 1].value}?`,
          vars: { i, j, 'A[j]': a[j].value, 'A[j+1]': a[j + 1].value, intercambió: swapped },
        });
        if (a[j].value > a[j + 1].value) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swapped = true;
          yield step.swap(j, j + 1, {
            line: 5,
            text: `Sí: ${a[j + 1].value} > ${a[j].value}, se intercambian.`,
            vars: { i, j, intercambió: swapped },
          });
        }
      }
      yield step.mark([n - 1 - i], {
        line: 7,
        text: `${a[n - 1 - i].value} ya está en su posición final.`,
        vars: { i, intercambió: swapped },
      });
      if (!swapped) {
        yield step.mark(range(n - 1 - i), {
          line: 8,
          text: 'No hubo intercambios en toda la pasada: el arreglo ya está ordenado.',
          vars: { i, intercambió: swapped },
        });
        return a;
      }
    }
    yield step.mark(range(n), { line: 0, text: 'Arreglo ordenado.', vars: { n } });
    return a;
  },
};
