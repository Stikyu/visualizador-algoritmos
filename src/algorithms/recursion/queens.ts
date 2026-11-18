import type { BaseStep } from '../types';
import { boolField, intField, type Problem } from './types';

export interface QueensStep extends BaseStep {
  readonly type: 'try' | 'conflict' | 'place' | 'remove' | 'solution' | 'note';
  readonly row?: number;
  readonly col?: number;
  /** Reina que ataca la casilla probada. */
  readonly attacker?: readonly [number, number];
}

export interface QueensState {
  readonly n: number;
  /** queens[fila] = columna, o −1. */
  readonly queens: readonly number[];
  readonly trying: readonly [number, number] | null;
  readonly attacker: readonly [number, number] | null;
  readonly attempts: number;
  readonly backtracks: number;
  readonly solutions: number;
  readonly lastSolution: readonly number[] | null;
}

export function reduceQueens(s: QueensState, step: QueensStep): QueensState {
  switch (step.type) {
    case 'try':
      return { ...s, trying: [step.row!, step.col!], attacker: null, attempts: s.attempts + 1 };
    case 'conflict':
      return { ...s, trying: [step.row!, step.col!], attacker: step.attacker ?? null };
    case 'place': {
      const queens = s.queens.slice();
      queens[step.row!] = step.col!;
      return { ...s, queens, trying: null, attacker: null };
    }
    case 'remove': {
      const queens = s.queens.slice();
      queens[step.row!] = -1;
      return {
        ...s,
        queens,
        trying: [step.row!, step.col!],
        attacker: null,
        backtracks: s.backtracks + 1,
      };
    }
    case 'solution':
      return {
        ...s,
        trying: null,
        attacker: null,
        solutions: s.solutions + 1,
        lastSolution: s.queens,
      };
    case 'note':
      return s;
  }
}

/** ¿Qué reina ataca (r, c)? Revisa columna y diagonales de las filas anteriores. */
export function attackerOf(
  queens: readonly number[],
  r: number,
  c: number,
): [number, number] | null {
  for (let i = 0; i < r; i++) {
    const q = queens[i];
    if (q < 0) continue; // fila sin reina
    if (q === c || Math.abs(q - c) === r - i) return [i, q];
  }
  return null;
}

export interface QueensResult {
  readonly solutions: number[][];
}

export const nQueens: Problem<QueensState, QueensStep, QueensResult> = {
  meta: {
    id: 'n-reinas',
    name: 'N reinas (backtracking)',
    category: 'recursion',
    summary:
      'Ubicar N reinas en un tablero de N × N sin que se ataquen. Se coloca una reina por fila; si en una fila ninguna columna sirve, se retrocede (backtracking) y se prueba otra opción en la fila anterior.',
    pseudocode: [
      'colocar(fila):',
      '  si fila = N: ¡solución!;  retornar verdadero',
      '  para cada columna c de 0 a N − 1',
      '    si (fila, c) no está atacada por ninguna reina',
      '      poner una reina en (fila, c)',
      '      si colocar(fila + 1): retornar verdadero',
      '      quitar la reina de (fila, c)          ▹ backtracking',
      '  retornar falso',
    ],
    complexity: {
      best: 'O(N!) (cota)',
      average: 'mucho menos por la poda',
      worst: 'O(N!)',
      space: 'O(N)',
    },
    whenToUse: [
      'Problemas de restricciones: sudoku, horarios, coloreo de grafos, permutaciones con condiciones.',
      'Ver cómo la poda (descartar ramas que no pueden funcionar) evita explorar todo.',
    ],
    avoidWhen: [
      'N muy grande con búsqueda exhaustiva: hay heurísticas (mínimos conflictos) mucho más rápidas.',
    ],
  },
  fields: [
    { key: 'n', label: 'N', type: 'number', default: '6', min: 4, max: 8 },
    {
      key: 'todas',
      label: 'Buscar todas las soluciones',
      type: 'checkbox',
      default: 'false',
      help: 'Hasta N = 6.',
    },
  ],
  initial: (input) => {
    const n = intField(input, 'n', 6, 4, 8);
    return {
      n,
      queens: new Array<number>(n).fill(-1),
      trying: null,
      attacker: null,
      attempts: 0,
      backtracks: 0,
      solutions: 0,
      lastSolution: null,
    };
  },
  reduce: reduceQueens,
  *run(input) {
    const n = intField(input, 'n', 6, 4, 8);
    const all = boolField(input, 'todas') && n <= 6;
    const queens = new Array<number>(n).fill(-1);
    const solutions: number[][] = [];
    function* place(row: number): Generator<QueensStep, boolean, void> {
      if (row === n) {
        solutions.push(queens.slice());
        yield {
          type: 'solution',
          line: 2,
          text: `¡Solución ${solutions.length}! Columnas por fila: ${queens.join(', ')}.`,
          vars: { fila: row, soluciones: solutions.length },
        };
        return !all;
      }
      for (let c = 0; c < n; c++) {
        yield {
          type: 'try',
          row,
          col: c,
          line: 3,
          text: `Fila ${row}: probamos la columna ${c}.`,
          vars: { fila: row, c },
        };
        const att = attackerOf(queens, row, c);
        if (att) {
          yield {
            type: 'conflict',
            row,
            col: c,
            attacker: att,
            line: 4,
            text: `La reina de (${att[0]}, ${att[1]}) ataca (${row}, ${c}) por ${att[1] === c ? 'la columna' : 'una diagonal'}. Siguiente columna.`,
            vars: { fila: row, c },
          };
          continue;
        }
        queens[row] = c;
        yield {
          type: 'place',
          row,
          col: c,
          line: 5,
          text: `(${row}, ${c}) está libre: ponemos una reina y seguimos con la fila ${row + 1}.`,
          vars: { fila: row, c },
        };
        if (yield* place(row + 1)) return true;
        queens[row] = -1;
        yield {
          type: 'remove',
          row,
          col: c,
          line: 7,
          text: `Por (${row}, ${c}) no se llegó a ${all ? 'más soluciones' : 'una solución'}: la quitamos (backtracking).`,
          vars: { fila: row, c },
        };
      }
      yield {
        type: 'note',
        line: 8,
        text: `Ninguna columna de la fila ${row} funciona: volvemos a la fila ${row - 1}.`,
        vars: { fila: row },
      };
      return false;
    }
    yield* place(0);
    yield {
      type: 'note',
      line: 0,
      text: all
        ? `Hay ${solutions.length} soluciones para N = ${n}.`
        : solutions.length
          ? 'Encontramos una solución.'
          : 'No hay solución.',
      vars: { soluciones: solutions.length },
    };
    return { solutions };
  },
};
