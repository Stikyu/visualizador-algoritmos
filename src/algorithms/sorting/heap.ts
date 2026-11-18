import { step, type ArrayStep } from '../array/steps';
import { range, type SortAlgorithm } from './types';

export const heapSort: SortAlgorithm = {
  meta: {
    id: 'heap',
    name: 'Heap sort',
    category: 'ordenamiento',
    summary:
      'Convierte el arreglo en un max-heap y extrae el máximo una y otra vez, dejándolo al final.',
    pseudocode: [
      'construir max-heap:',
      '  para i ← ⌊n/2⌋ − 1 bajando hasta 0: hundir(A, i, n)',
      'para fin ← n − 1 bajando hasta 1',
      '  intercambiar A[0] y A[fin]   ▹ el máximo va al final',
      '  marcar A[fin] como ordenado',
      '  hundir(A, 0, fin)',
      'hundir(A, i, tam):',
      '  mayor ← i;  izq ← 2i + 1;  der ← 2i + 2',
      '  si izq < tam y A[izq] > A[mayor]: mayor ← izq',
      '  si der < tam y A[der] > A[mayor]: mayor ← der',
      '  si mayor ≠ i: intercambiar A[i] y A[mayor]; hundir(A, mayor, tam)',
    ],
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
    stable: false,
    inPlace: true,
    whenToUse: [
      'Cuando necesitás O(n log n) garantizado sin memoria extra.',
      'Como respaldo de quick sort (introsort) cuando la recursión se hace demasiado profunda.',
    ],
    avoidWhen: [
      'Cuando importa la velocidad real: salta por la memoria y aprovecha mal la caché.',
      'Cuando necesitás estabilidad.',
    ],
  },
  *run(input) {
    const a = input.slice();
    const n = a.length;

    function* siftDown(start: number, size: number): Generator<ArrayStep, void, void> {
      let i = start;
      for (;;) {
        let largest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        yield step.pivot(i, {
          line: 8,
          text: `Hundimos A[${i}] = ${a[i].value}: sus hijos son las posiciones ${l} y ${r}.`,
          vars: { i, izq: l, der: r, tam: size },
        });
        if (l < size) {
          yield step.compare([l, largest], {
            line: 9,
            text: `¿El hijo izquierdo A[${l}] = ${a[l].value} es mayor que A[${largest}] = ${a[largest].value}?`,
            vars: { i, izq: l, mayor: largest, tam: size },
          });
          if (a[l].value > a[largest].value) largest = l;
        }
        if (r < size) {
          yield step.compare([r, largest], {
            line: 10,
            text: `¿El hijo derecho A[${r}] = ${a[r].value} es mayor que A[${largest}] = ${a[largest].value}?`,
            vars: { i, der: r, mayor: largest, tam: size },
          });
          if (a[r].value > a[largest].value) largest = r;
        }
        if (largest === i) {
          yield step.pivot(null, {
            line: 11,
            text: `A[${i}] ya es mayor o igual que sus hijos: se cumple la propiedad de heap.`,
            vars: { i, mayor: largest },
          });
          return;
        }
        [a[i], a[largest]] = [a[largest], a[i]];
        yield step.swap(i, largest, {
          line: 11,
          text: `Intercambiamos con el hijo mayor (posición ${largest}) y seguimos hundiendo.`,
          vars: { i, mayor: largest },
        });
        i = largest;
      }
    }

    yield step.note({
      line: 1,
      text: 'Fase 1: convertimos el arreglo en un max-heap (cada padre ≥ sus hijos).',
      vars: { n },
    });
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      yield step.note({ line: 2, text: `Hundir desde el nodo ${i}.`, vars: { i, n } });
      yield* siftDown(i, n);
    }
    for (let end = n - 1; end >= 1; end--) {
      [a[0], a[end]] = [a[end], a[0]];
      yield step.swap(0, end, {
        line: 4,
        text: `La raíz (${a[end].value}) es el máximo del heap: va a la posición ${end}.`,
        vars: { fin: end },
      });
      yield step.mark([end], {
        line: 5,
        text: `${a[end].value} ya está en su lugar.`,
        vars: { fin: end },
      });
      yield* siftDown(0, end);
    }
    yield step.mark(range(n), { line: 0, text: 'Arreglo ordenado.', vars: { n } });
    return a;
  },
};
