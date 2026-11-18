import { step } from '../array/steps';
import { range, type SortAlgorithm } from './types';

/** Secuencia de brechas decreciente terminada en 1. */
export function gapSequence(n: number, kind: string): number[] {
  const gaps: number[] = [];
  if (kind === 'knuth') {
    let h = 1;
    while (h < Math.ceil(n / 3)) h = 3 * h + 1;
    for (; h >= 1; h = (h - 1) / 3) gaps.push(h);
  } else {
    for (let g = Math.floor(n / 2); g > 0; g = Math.floor(g / 2)) gaps.push(g);
  }
  return gaps;
}

export const shellSort: SortAlgorithm = {
  meta: {
    id: 'shell',
    name: 'Shell sort',
    category: 'ordenamiento',
    summary:
      'Inserción con saltos: primero ordena elementos separados por una brecha grande y la va achicando hasta 1.',
    pseudocode: [
      'para cada brecha de la secuencia (termina en 1)',
      '  para i ← brecha hasta n − 1',
      '    temp ← A[i];  j ← i',
      '    mientras j ≥ brecha y A[j − brecha] > temp',
      '      A[j] ← A[j − brecha]',
      '      j ← j − brecha',
      '    A[j] ← temp',
    ],
    complexity: {
      best: 'O(n log n)',
      average: 'depende de la brecha (~O(n^1.3))',
      worst: 'O(n²) con n/2; O(n^1.5) con Knuth',
      space: 'O(1)',
    },
    stable: false,
    inPlace: true,
    whenToUse: [
      'Sistemas embebidos: muy poco código, sin recursión ni memoria extra, y bastante rápido.',
      'Arreglos medianos donde inserción se queda corto.',
    ],
    avoidWhen: ['Cuando necesitás estabilidad o garantías teóricas fuertes.'],
    options: [
      {
        key: 'brechas',
        label: 'Brechas',
        default: 'shell',
        choices: [
          { value: 'shell', label: 'n/2, n/4, … (Shell)' },
          { value: 'knuth', label: '1, 4, 13, 40… (Knuth)' },
        ],
      },
    ],
  },
  *run(input, options = {}) {
    const a = input.slice();
    const n = a.length;
    const gaps = gapSequence(n, options.brechas ?? 'shell');
    for (const gap of gaps) {
      yield step.note({
        line: 1,
        text: `Brecha = ${gap}: ordenamos por inserción los elementos separados por ${gap} posiciones.`,
        vars: { brecha: gap, secuencia: gaps },
      });
      for (let i = gap; i < n; i++) {
        const temp = a[i];
        let j = i;
        yield step.auxInit('temp', [temp.value], {
          line: 3,
          text: `temp ← A[${i}] = ${temp.value}.`,
          vars: { brecha: gap, i, j, temp: temp.value },
        });
        while (j >= gap) {
          yield step.compare([j - gap], {
            line: 4,
            text: `¿A[${j - gap}] = ${a[j - gap].value} es mayor que temp = ${temp.value}?`,
            vars: { brecha: gap, i, j, temp: temp.value },
          });
          if (!(a[j - gap].value > temp.value)) break;
          a[j] = a[j - gap];
          yield step.set(j, a[j], {
            line: 5,
            text: `Sí: ${a[j].value} salta ${gap} posiciones a la derecha.`,
            vars: { brecha: gap, i, j, temp: temp.value },
          });
          j -= gap;
        }
        a[j] = temp;
        yield step.set(j, temp, {
          line: 7,
          text: `temp = ${temp.value} se ubica en la posición ${j}.`,
          vars: { brecha: gap, i, j, temp: temp.value },
        });
      }
    }
    yield step.auxClear('temp', { line: 0, text: 'Brecha 1 terminada.', vars: { n } });
    yield step.mark(range(n), { line: 0, text: 'Arreglo ordenado.', vars: { n } });
    return a;
  },
};
