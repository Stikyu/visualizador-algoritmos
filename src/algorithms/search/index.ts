import { step, type ArrayStep, type Item } from '../array/steps';
import type { AlgorithmMeta } from '../types';

/**
 * Contrato de un algoritmo de búsqueda. Retorna el índice encontrado o −1.
 * `requiresSorted` le indica a la interfaz que tiene que ordenar la entrada.
 */
export interface SearchAlgorithm {
  readonly meta: AlgorithmMeta;
  readonly requiresSorted: boolean;
  readonly run: (input: readonly Item[], target: number) => Generator<ArrayStep, number, void>;
}

export const linearSearch: SearchAlgorithm = {
  requiresSorted: false,
  meta: {
    id: 'lineal',
    name: 'Búsqueda lineal',
    category: 'busqueda',
    summary:
      'Revisa los elementos uno por uno, de izquierda a derecha, hasta encontrar el objetivo.',
    pseudocode: ['para i ← 0 hasta n − 1', '  si A[i] = objetivo: retornar i', 'retornar −1'],
    complexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    whenToUse: [
      'Datos desordenados o que cambian todo el tiempo.',
      'Arreglos chicos: no vale la pena ordenar para buscar una vez.',
    ],
    avoidWhen: [
      'Muchas búsquedas sobre los mismos datos: conviene ordenar una vez y usar binaria.',
    ],
  },
  *run(a, target) {
    const n = a.length;
    for (let i = 0; i < n; i++) {
      yield step.range(i, n - 1, {
        line: 1,
        text: `Quedan por revisar A[${i}..${n - 1}].`,
        vars: { i, objetivo: target, n },
      });
      yield step.compare([i], {
        line: 2,
        text: `¿A[${i}] = ${a[i].value} es igual a ${target}?`,
        vars: { i, objetivo: target, 'A[i]': a[i].value },
      });
      if (a[i].value === target) {
        yield step.found(i, {
          line: 2,
          text: `¡Encontrado en la posición ${i} después de ${i + 1} comparaciones!`,
          vars: { i, objetivo: target },
        });
        return i;
      }
    }
    yield step.range(null, null, { line: 3, text: 'Se revisó todo el arreglo.', vars: { n } });
    yield step.found(-1, {
      line: 3,
      text: `${target} no está en el arreglo.`,
      vars: { objetivo: target },
    });
    return -1;
  },
};

const BINARY_META = {
  category: 'busqueda' as const,
  complexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
  whenToUse: [
    'Arreglos ordenados con acceso aleatorio en O(1).',
    'Buscar "el primer valor que cumple X" en cualquier función monótona (búsqueda binaria sobre la respuesta).',
  ],
  avoidWhen: ['Datos desordenados, o listas enlazadas (no se puede saltar al medio).'],
};

export const binarySearch: SearchAlgorithm = {
  requiresSorted: true,
  meta: {
    ...BINARY_META,
    id: 'binaria',
    name: 'Búsqueda binaria (iterativa)',
    summary:
      'Mira el elemento del medio: si no es el objetivo, descarta la mitad donde no puede estar. Cada paso divide el rango por dos.',
    pseudocode: [
      'lo ← 0;  hi ← n − 1',
      'mientras lo ≤ hi',
      '  medio ← ⌊(lo + hi) / 2⌋',
      '  si A[medio] = objetivo: retornar medio',
      '  si A[medio] < objetivo: lo ← medio + 1   ▹ descarta la izquierda',
      '  si no: hi ← medio − 1                    ▹ descarta la derecha',
      'retornar −1',
    ],
  },
  *run(a, target) {
    let lo = 0;
    let hi = a.length - 1;
    let round = 0;
    yield step.range(lo, hi, {
      line: 1,
      text: `El objetivo ${target}, si está, está en A[${lo}..${hi}].`,
      vars: { lo, hi, objetivo: target },
    });
    while (lo <= hi) {
      round++;
      const mid = Math.floor((lo + hi) / 2);
      yield step.range(
        lo,
        hi,
        {
          line: 3,
          text: `Vuelta ${round}: el rango tiene ${hi - lo + 1} elementos; miramos el del medio, posición ${mid}.`,
          vars: { lo, hi, medio: mid, objetivo: target },
        },
        mid,
      );
      yield step.compare([mid], {
        line: 4,
        text: `¿A[${mid}] = ${a[mid].value} es igual a ${target}?`,
        vars: { lo, hi, medio: mid, 'A[medio]': a[mid].value, objetivo: target },
      });
      if (a[mid].value === target) {
        yield step.found(mid, {
          line: 4,
          text: `¡Encontrado en la posición ${mid} en ${round} vueltas!`,
          vars: { lo, hi, medio: mid },
        });
        return mid;
      }
      if (a[mid].value < target) {
        lo = mid + 1;
        yield step.range(lo, hi, {
          line: 5,
          text: `${a[mid].value} < ${target}: el objetivo sólo puede estar a la derecha. Descartamos A[..${mid}].`,
          vars: { lo, hi, medio: mid, objetivo: target },
        });
      } else {
        hi = mid - 1;
        yield step.range(lo, hi, {
          line: 6,
          text: `${a[mid].value} > ${target}: el objetivo sólo puede estar a la izquierda. Descartamos A[${mid}..].`,
          vars: { lo, hi, medio: mid, objetivo: target },
        });
      }
    }
    yield step.found(-1, {
      line: 7,
      text: `El rango quedó vacío (lo = ${lo} > hi = ${hi}): ${target} no está.`,
      vars: { lo, hi, objetivo: target },
    });
    return -1;
  },
};

export const binarySearchRecursive: SearchAlgorithm = {
  requiresSorted: true,
  meta: {
    ...BINARY_META,
    complexity: { ...BINARY_META.complexity, space: 'O(log n) (pila de llamadas)' },
    id: 'binaria-recursiva',
    name: 'Búsqueda binaria (recursiva)',
    summary:
      'La misma idea que la iterativa, expresada como recursión: cada llamada busca en la mitad que corresponde.',
    pseudocode: [
      'buscar(A, lo, hi, objetivo):',
      '  si lo > hi: retornar −1',
      '  medio ← ⌊(lo + hi) / 2⌋',
      '  si A[medio] = objetivo: retornar medio',
      '  si A[medio] < objetivo: retornar buscar(A, medio + 1, hi, objetivo)',
      '  si no: retornar buscar(A, lo, medio − 1, objetivo)',
    ],
  },
  *run(a, target) {
    const stack: string[] = [];
    function* search(lo: number, hi: number): Generator<ArrayStep, number, void> {
      stack.push(`buscar(${lo}, ${hi})`);
      const vars = () => ({ lo, hi, objetivo: target, pila: stack.slice() });
      yield step.range(lo <= hi ? lo : null, lo <= hi ? hi : null, {
        line: 1,
        text: `Llamada buscar(A, ${lo}, ${hi}). Profundidad de la pila: ${stack.length}.`,
        vars: vars(),
      });
      if (lo > hi) {
        yield step.note({ line: 2, text: 'Rango vacío: caso base, retornamos −1.', vars: vars() });
        stack.pop();
        return -1;
      }
      const mid = Math.floor((lo + hi) / 2);
      yield step.range(
        lo,
        hi,
        { line: 3, text: `medio = ${mid}.`, vars: { ...vars(), medio: mid } },
        mid,
      );
      yield step.compare([mid], {
        line: 4,
        text: `¿A[${mid}] = ${a[mid].value} es igual a ${target}?`,
        vars: { ...vars(), medio: mid, 'A[medio]': a[mid].value },
      });
      let result: number;
      if (a[mid].value === target) {
        yield step.note({
          line: 4,
          text: `Sí: retornamos ${mid}.`,
          vars: { ...vars(), medio: mid },
        });
        result = mid;
      } else if (a[mid].value < target) {
        yield step.note({
          line: 5,
          text: `${a[mid].value} < ${target}: llamamos sobre la mitad derecha.`,
          vars: { ...vars(), medio: mid },
        });
        result = yield* search(mid + 1, hi);
      } else {
        yield step.note({
          line: 6,
          text: `${a[mid].value} > ${target}: llamamos sobre la mitad izquierda.`,
          vars: { ...vars(), medio: mid },
        });
        result = yield* search(lo, mid - 1);
      }
      stack.pop();
      if (stack.length > 0) {
        yield step.note({
          line: 0,
          text: `La llamada buscar(${lo}, ${hi}) retorna ${result} a quien la llamó.`,
          vars: { resultado: result, pila: stack.slice() },
        });
      }
      return result;
    }
    const idx = yield* search(0, a.length - 1);
    yield step.found(idx, {
      line: 0,
      text: idx >= 0 ? `¡Encontrado en la posición ${idx}!` : `${target} no está en el arreglo.`,
      vars: { resultado: idx },
    });
    return idx;
  },
};

export const interpolationSearch: SearchAlgorithm = {
  requiresSorted: true,
  meta: {
    id: 'interpolacion',
    name: 'Búsqueda por interpolación',
    category: 'busqueda',
    summary:
      'Como buscar en una guía telefónica: en vez del medio, estima dónde debería estar el objetivo según su valor.',
    pseudocode: [
      'lo ← 0;  hi ← n − 1',
      'mientras lo ≤ hi y A[lo] ≤ objetivo ≤ A[hi]',
      '  si A[hi] = A[lo]: pos ← lo',
      '  si no: pos ← lo + ⌊(objetivo − A[lo]) · (hi − lo) / (A[hi] − A[lo])⌋',
      '  si A[pos] = objetivo: retornar pos',
      '  si A[pos] < objetivo: lo ← pos + 1',
      '  si no: hi ← pos − 1',
      'retornar −1',
    ],
    complexity: { best: 'O(1)', average: 'O(log log n)', worst: 'O(n)', space: 'O(1)' },
    whenToUse: ['Datos ordenados y distribuidos de forma bastante uniforme (IDs, timestamps).'],
    avoidWhen: [
      'Distribuciones sesgadas (por ejemplo, exponenciales): degenera a O(n).',
      'Cuando la división es cara comparada con una comparación.',
    ],
  },
  *run(a, target) {
    let lo = 0;
    let hi = a.length - 1;
    yield step.range(lo, hi, {
      line: 1,
      text: 'Empezamos con todo el arreglo.',
      vars: { lo, hi, objetivo: target },
    });
    while (lo <= hi) {
      yield step.compare([lo, hi], {
        line: 2,
        text: `¿${target} está entre A[${lo}] = ${a[lo].value} y A[${hi}] = ${a[hi].value}?`,
        vars: { lo, hi, objetivo: target, 'A[lo]': a[lo].value, 'A[hi]': a[hi].value },
      });
      if (!(a[lo].value <= target && target <= a[hi].value)) break;
      let pos: number;
      if (a[hi].value === a[lo].value) {
        pos = lo;
        yield step.range(
          lo,
          hi,
          { line: 3, text: 'Todos los valores del rango son iguales.', vars: { lo, hi, pos } },
          pos,
        );
      } else {
        pos = lo + Math.floor(((target - a[lo].value) * (hi - lo)) / (a[hi].value - a[lo].value));
        yield step.range(
          lo,
          hi,
          {
            line: 4,
            text: `Estimamos la posición: ${lo} + ⌊(${target} − ${a[lo].value}) · ${hi - lo} / (${a[hi].value} − ${a[lo].value})⌋ = ${pos}.`,
            vars: { lo, hi, pos, objetivo: target },
          },
          pos,
        );
      }
      yield step.compare([pos], {
        line: 5,
        text: `¿A[${pos}] = ${a[pos].value} es igual a ${target}?`,
        vars: { lo, hi, pos, 'A[pos]': a[pos].value },
      });
      if (a[pos].value === target) {
        yield step.found(pos, {
          line: 5,
          text: `¡Encontrado en la posición ${pos}!`,
          vars: { pos },
        });
        return pos;
      }
      if (a[pos].value < target) {
        lo = pos + 1;
        yield step.range(lo, hi, {
          line: 6,
          text: `${a[pos].value} < ${target}: seguimos a la derecha.`,
          vars: { lo, hi, pos },
        });
      } else {
        hi = pos - 1;
        yield step.range(lo, hi, {
          line: 7,
          text: `${a[pos].value} > ${target}: seguimos a la izquierda.`,
          vars: { lo, hi, pos },
        });
      }
    }
    yield step.found(-1, {
      line: 8,
      text: `${target} no está en el arreglo.`,
      vars: { lo, hi, objetivo: target },
    });
    return -1;
  },
};

export const SEARCH_ALGORITHMS: readonly SearchAlgorithm[] = [
  linearSearch,
  binarySearch,
  binarySearchRecursive,
  interpolationSearch,
];
