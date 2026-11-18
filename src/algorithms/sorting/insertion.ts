import { step } from '../array/steps';
import { range, type SortAlgorithm } from './types';

export const insertionSort: SortAlgorithm = {
  meta: {
    id: 'insercion',
    name: 'Inserción',
    category: 'ordenamiento',
    summary:
      'Como ordenar cartas en la mano: toma el siguiente elemento y lo desliza hacia la izquierda hasta su lugar dentro de la parte ya ordenada.',
    pseudocode: [
      'para i ← 1 hasta n − 1',
      '  llave ← A[i]',
      '  j ← i − 1',
      '  mientras j ≥ 0 y A[j] > llave',
      '    A[j + 1] ← A[j]',
      '    j ← j − 1',
      '  A[j + 1] ← llave',
    ],
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    stable: true,
    inPlace: true,
    whenToUse: [
      'Arreglos chicos (por eso Timsort e introsort lo usan para tramos de menos de 16–32 elementos).',
      'Datos casi ordenados: es prácticamente lineal.',
      'Datos que llegan de a uno (ordenamiento en línea).',
    ],
    avoidWhen: ['Arreglos grandes y desordenados: los desplazamientos son O(n²).'],
  },
  *run(input) {
    const a = input.slice();
    const n = a.length;
    for (let i = 1; i < n; i++) {
      const key = a[i];
      yield step.auxInit('llave', [key.value], {
        line: 2,
        text: `Tomamos la llave A[${i}] = ${key.value} para insertarla en A[0..${i - 1}], que ya está ordenado.`,
        vars: { i, llave: key.value },
      });
      let j = i - 1;
      yield step.read(i, {
        line: 3,
        text: `Empezamos a comparar desde j = ${j}.`,
        vars: { i, j, llave: key.value },
      });
      while (j >= 0) {
        yield step.compare([j], {
          line: 4,
          text: `¿A[${j}] = ${a[j].value} es mayor que la llave ${key.value}?`,
          vars: { i, j, llave: key.value, 'A[j]': a[j].value },
        });
        if (!(a[j].value > key.value)) break;
        a[j + 1] = a[j];
        yield step.set(j + 1, a[j], {
          line: 5,
          text: `Sí: ${a[j].value} se corre una posición a la derecha.`,
          vars: { i, j, llave: key.value },
        });
        j--;
      }
      a[j + 1] = key;
      yield step.set(j + 1, key, {
        line: 7,
        text:
          j + 1 === i
            ? `La llave ${key.value} ya estaba en su lugar.`
            : `La llave ${key.value} se inserta en la posición ${j + 1}.`,
        vars: { i, j, llave: key.value },
      });
    }
    yield step.auxClear('llave', { line: 0, text: 'Terminaron las inserciones.', vars: { n } });
    yield step.mark(range(n), { line: 0, text: 'Arreglo ordenado.', vars: { n } });
    return a;
  },
};
