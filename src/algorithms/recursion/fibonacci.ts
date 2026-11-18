import type { BaseStep } from '../types';
import { boolField, intField, type Problem } from './types';

export interface CallNode {
  readonly id: number;
  readonly n: number;
  readonly parent: number | null;
  readonly children: readonly number[];
  readonly status: 'active' | 'done' | 'memo';
  readonly value: number | null;
}

export interface FibStep extends BaseStep {
  readonly type: 'call' | 'return' | 'memo' | 'store' | 'note';
  readonly id?: number;
  readonly parent?: number | null;
  readonly n?: number;
  readonly value?: number;
}

export interface FibState {
  readonly nodes: Readonly<Record<number, CallNode>>;
  readonly root: number | null;
  readonly stack: readonly number[];
  readonly memo: readonly (number | null)[];
  readonly calls: number;
  readonly memoHits: number;
  readonly current: number | null;
}

const addChild = (nodes: Record<number, CallNode>, parent: number | null, id: number) => {
  if (parent !== null)
    nodes[parent] = { ...nodes[parent], children: [...nodes[parent].children, id] };
};

export function reduceFib(s: FibState, step: FibStep): FibState {
  switch (step.type) {
    case 'call': {
      const nodes = { ...s.nodes };
      nodes[step.id!] = {
        id: step.id!,
        n: step.n!,
        parent: step.parent ?? null,
        children: [],
        status: 'active',
        value: null,
      };
      addChild(nodes, step.parent ?? null, step.id!);
      return {
        ...s,
        nodes,
        root: s.root ?? step.id!,
        stack: [...s.stack, step.id!],
        calls: s.calls + 1,
        current: step.id!,
      };
    }
    case 'memo': {
      const nodes = { ...s.nodes };
      nodes[step.id!] = {
        id: step.id!,
        n: step.n!,
        parent: step.parent ?? null,
        children: [],
        status: 'memo',
        value: step.value!,
      };
      addChild(nodes, step.parent ?? null, step.id!);
      return { ...s, nodes, calls: s.calls + 1, memoHits: s.memoHits + 1, current: step.id! };
    }
    case 'return': {
      const nodes = {
        ...s.nodes,
        [step.id!]: { ...s.nodes[step.id!], status: 'done' as const, value: step.value! },
      };
      const stack = s.stack.slice(0, -1);
      return { ...s, nodes, stack, current: stack[stack.length - 1] ?? step.id! };
    }
    case 'store': {
      const memo = s.memo.slice();
      memo[step.n!] = step.value!;
      return { ...s, memo };
    }
    case 'note':
      return s;
  }
}

export interface FibResult {
  readonly value: number;
  readonly calls: number;
}

export const fibonacci: Problem<FibState, FibStep, FibResult> = {
  meta: {
    id: 'fibonacci',
    name: 'Fibonacci: árbol de llamadas',
    category: 'recursion',
    summary:
      'fib(n) = fib(n − 1) + fib(n − 2). Sin memoización, el árbol de llamadas recalcula los mismos valores una y otra vez (crece exponencialmente); con memo, cada valor se calcula una sola vez.',
    pseudocode: [
      'fib(n):',
      '  si n ≤ 1: retornar n                       ▹ caso base',
      '  (con memo) si memo[n] existe: retornar memo[n]',
      '  resultado ← fib(n − 1) + fib(n − 2)',
      '  (con memo) memo[n] ← resultado',
      '  retornar resultado',
    ],
    complexity: {
      best: 'O(n) con memo',
      average: 'O(φⁿ) ≈ O(1,618ⁿ) sin memo',
      worst: 'O(φⁿ) sin memo',
      space: 'O(n) (profundidad de la pila)',
    },
    whenToUse: [
      'Para entender la recursión y por qué la memoización (PD de arriba hacia abajo) cambia el orden de complejidad.',
      'El patrón "subproblemas que se repiten" aparece en mochila, LCS, distancia de edición…',
    ],
    avoidWhen: [
      'En producción, fib se calcula iterativamente en O(n) con O(1) memoria (o con matrices en O(log n)).',
    ],
  },
  fields: [
    {
      key: 'n',
      label: 'n',
      type: 'number',
      default: '6',
      min: 0,
      max: 30,
      help: 'Sin memo, hasta n = 10 (¡177 llamadas!).',
    },
    { key: 'memo', label: 'Con memoización', type: 'checkbox', default: 'false' },
  ],
  initial: (input) => ({
    nodes: {},
    root: null,
    stack: [],
    memo: new Array<number | null>(intField(input, 'n', 6, 0, 30) + 1).fill(null),
    calls: 0,
    memoHits: 0,
    current: null,
  }),
  reduce: reduceFib,
  *run(input) {
    const useMemo = boolField(input, 'memo');
    const n = intField(input, 'n', 6, 0, useMemo ? 30 : 10);
    const memo = new Map<number, number>();
    let nextId = 0;
    let calls = 0;
    function* fib(k: number, parent: number | null): Generator<FibStep, number, void> {
      const id = nextId++;
      calls++;
      if (useMemo && memo.has(k)) {
        yield {
          type: 'memo',
          id,
          parent,
          n: k,
          value: memo.get(k)!,
          line: 3,
          text: `fib(${k}) ya está en el memo: ${memo.get(k)}. ¡No se recalcula!`,
          vars: { n: k, 'memo[n]': memo.get(k)! },
        };
        return memo.get(k)!;
      }
      yield {
        type: 'call',
        id,
        parent,
        n: k,
        line: 1,
        text: `Llamamos a fib(${k}).`,
        vars: { n: k },
      };
      let result: number;
      if (k <= 1) {
        result = k;
        yield { type: 'note', line: 2, text: `Caso base: fib(${k}) = ${k}.`, vars: { n: k } };
      } else {
        const a = yield* fib(k - 1, id);
        yield {
          type: 'note',
          line: 4,
          text: `Volvimos a fib(${k}): fib(${k - 1}) = ${a}. Falta fib(${k - 2}).`,
          vars: { n: k, 'fib(n − 1)': a },
        };
        const b = yield* fib(k - 2, id);
        result = a + b;
        yield {
          type: 'note',
          line: 4,
          text: `fib(${k}) = ${a} + ${b} = ${result}.`,
          vars: { n: k, 'fib(n − 1)': a, 'fib(n − 2)': b },
        };
        if (useMemo) {
          memo.set(k, result);
          yield {
            type: 'store',
            n: k,
            value: result,
            line: 5,
            text: `Guardamos memo[${k}] = ${result}.`,
            vars: { n: k },
          };
        }
      }
      yield {
        type: 'return',
        id,
        value: result,
        line: 6,
        text: `fib(${k}) retorna ${result}.`,
        vars: { n: k, retorna: result },
      };
      return result;
    }
    const value = yield* fib(n, null);
    yield {
      type: 'note',
      line: 0,
      text: useMemo
        ? `fib(${n}) = ${value} con ${calls} llamadas (2n − 1). Sin memo serían ${2 * fibNumber(n + 1) - 1}.`
        : `fib(${n}) = ${value} con ${calls} llamadas. Fijate cuántas veces se repite el mismo subárbol: activá la memoización y compará.`,
      vars: { resultado: value, llamadas: calls },
    };
    return { value, calls };
  },
};

/** fib iterativo (referencia para textos y tests). */
export function fibNumber(n: number): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}
