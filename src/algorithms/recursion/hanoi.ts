import type { BaseStep } from '../types';
import { intField, type Problem } from './types';

export interface HanoiStep extends BaseStep {
  readonly type: 'call' | 'move' | 'return' | 'note';
  readonly frame?: string;
  readonly disk?: number;
  readonly from?: number;
  readonly to?: number;
}

export interface HanoiState {
  /** pegs[p] = discos de abajo hacia arriba (número = tamaño). */
  readonly pegs: readonly (readonly number[])[];
  readonly stack: readonly string[];
  readonly moves: number;
  readonly last: { readonly disk: number; readonly from: number; readonly to: number } | null;
}

export const PEG_NAMES = ['A', 'B', 'C'];

export function reduceHanoi(s: HanoiState, step: HanoiStep): HanoiState {
  switch (step.type) {
    case 'call':
      return { ...s, stack: [...s.stack, step.frame!], last: null };
    case 'return':
      return { ...s, stack: s.stack.slice(0, -1), last: null };
    case 'move': {
      const pegs = s.pegs.map((p) => p.slice());
      const disk = pegs[step.from!].pop()!;
      pegs[step.to!].push(disk);
      return { ...s, pegs, moves: s.moves + 1, last: { disk, from: step.from!, to: step.to! } };
    }
    case 'note':
      return s;
  }
}

export const hanoi: Problem<HanoiState, HanoiStep, number> = {
  meta: {
    id: 'hanoi',
    name: 'Torres de Hanoi',
    category: 'recursion',
    summary:
      'Mover n discos de A a C sin poner nunca uno grande sobre uno chico. La idea recursiva: mover n − 1 discos a la torre auxiliar, mover el más grande, y volver a poner los n − 1 encima.',
    pseudocode: [
      'hanoi(n, origen, destino, auxiliar):',
      '  si n = 0: retornar',
      '  hanoi(n − 1, origen, auxiliar, destino)    ▹ despejar los de arriba',
      '  mover el disco n de origen a destino',
      '  hanoi(n − 1, auxiliar, destino, origen)    ▹ volver a apilarlos encima',
    ],
    complexity: { best: 'O(2ⁿ)', average: 'O(2ⁿ)', worst: 'O(2ⁿ)', space: 'O(n) (pila)' },
    whenToUse: [
      'El ejemplo clásico para pensar recursivamente: confiar en que la llamada resuelve el subproblema.',
      'Ver cómo T(n) = 2·T(n − 1) + 1 da 2ⁿ − 1 movimientos.',
    ],
    avoidWhen: [
      'n grande: 2ⁿ − 1 movimientos crece muy rápido (con 64 discos, 585 mil millones de años a un disco por segundo).',
    ],
  },
  fields: [{ key: 'n', label: 'Discos', type: 'number', default: '4', min: 1, max: 8 }],
  initial: (input) => {
    const n = intField(input, 'n', 4, 1, 8);
    return {
      pegs: [Array.from({ length: n }, (_, i) => n - i), [], []],
      stack: [],
      moves: 0,
      last: null,
    };
  },
  reduce: reduceHanoi,
  *run(input) {
    const n = intField(input, 'n', 4, 1, 8);
    let moves = 0;
    function* solve(
      k: number,
      from: number,
      to: number,
      via: number,
    ): Generator<HanoiStep, void, void> {
      if (k === 0) return;
      const frame = `hanoi(${k}, ${PEG_NAMES[from]}, ${PEG_NAMES[to]}, ${PEG_NAMES[via]})`;
      yield {
        type: 'call',
        frame,
        line: 1,
        text: `${frame}: mover ${k} disco(s) de ${PEG_NAMES[from]} a ${PEG_NAMES[to]}.`,
        vars: { n: k, origen: PEG_NAMES[from], destino: PEG_NAMES[to], auxiliar: PEG_NAMES[via] },
      };
      if (k > 1) {
        yield {
          type: 'note',
          line: 3,
          text: `Primero despejamos: los ${k - 1} de arriba van a ${PEG_NAMES[via]}.`,
          vars: { n: k },
        };
      }
      yield* solve(k - 1, from, via, to);
      moves++;
      yield {
        type: 'move',
        disk: k,
        from,
        to,
        line: 4,
        text: `Movimiento ${moves}: el disco ${k} va de ${PEG_NAMES[from]} a ${PEG_NAMES[to]}.`,
        vars: { n: k, movimientos: moves },
      };
      if (k > 1) {
        yield {
          type: 'note',
          line: 5,
          text: `Ahora los ${k - 1} discos de ${PEG_NAMES[via]} vuelven encima del disco ${k}.`,
          vars: { n: k },
        };
      }
      yield* solve(k - 1, via, to, from);
      yield { type: 'return', line: 0, text: `${frame} terminó.`, vars: { n: k } };
    }
    yield* solve(n, 0, 2, 1);
    yield {
      type: 'note',
      line: 0,
      text: `¡Listo! ${moves} movimientos = 2^${n} − 1. Es el mínimo posible.`,
      vars: { movimientos: moves },
    };
    return moves;
  },
};
