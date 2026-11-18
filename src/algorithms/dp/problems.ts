import type { AlgorithmMeta } from '../types';
import type { Field, Input } from '../recursion/types';
import { fill, type Cell, type DPStep, type DPTableShape } from './table';

export interface DPResult {
  readonly value: number;
  readonly solution: string;
}

/** Problema de PD: metadatos, campos de entrada, forma de la tabla y generador. */
export interface DPProblem {
  readonly meta: AlgorithmMeta;
  readonly fields: readonly Field[];
  readonly shape: (input: Input) => DPTableShape;
  readonly run: (input: Input) => Generator<DPStep, DPResult, void>;
}

const MAX_TEXT = 9;
const word = (input: Input, key: string, def: string) =>
  (input[key] ?? def).trim().toUpperCase().slice(0, MAX_TEXT) || def;

/** Lista de enteros positivos: "2, 3, 4". */
export function intList(text: string | undefined, def: number[], max = 8, maxValue = 50): number[] {
  const nums = (text ?? '')
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((x) => Math.trunc(Number(x)))
    .filter((x) => Number.isFinite(x) && x > 0 && x <= maxValue);
  return nums.length ? nums.slice(0, max) : def;
}

const clampInt = (text: string | undefined, def: number, min: number, max: number) => {
  const v = Math.trunc(Number(text));
  return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : def;
};

// ===========================================================================
// Mochila 0/1
// ===========================================================================

export function knapsackInput(input: Input) {
  const weights = intList(input.pesos, [1, 3, 4, 5], 6, 15);
  const values = intList(input.valores, [1, 4, 5, 7], 6, 99);
  const n = Math.min(weights.length, values.length);
  return {
    weights: weights.slice(0, n),
    values: values.slice(0, n),
    W: clampInt(input.capacidad, 7, 1, 15),
  };
}

export const knapsack: DPProblem = {
  meta: {
    id: 'mochila',
    name: 'Mochila 0/1',
    category: 'pd',
    summary:
      'Elegir objetos (cada uno se lleva entero o no se lleva) para maximizar el valor sin superar la capacidad. dp[i][w] = mejor valor usando los primeros i objetos con capacidad w.',
    pseudocode: [
      'dp[0][w] ← 0 para todo w                 ▹ sin objetos, valor 0',
      'para i ← 1 hasta n',
      '  para w ← 0 hasta W',
      '    dp[i][w] ← dp[i − 1][w]              ▹ no llevar el objeto i',
      '    si peso[i] ≤ w: dp[i][w] ← máx(dp[i][w], dp[i − 1][w − peso[i]] + valor[i])   ▹ llevarlo',
      'reconstruir: si dp[i][w] ≠ dp[i − 1][w], el objeto i va en la mochila',
    ],
    complexity: {
      best: 'O(n · W)',
      average: 'O(n · W)',
      worst: 'O(n · W)',
      space: 'O(n · W) (o O(W) con una fila)',
    },
    whenToUse: [
      'Presupuestos, selección de proyectos, carga de camiones: elegir un subconjunto con un límite.',
      'Es pseudo-polinomial: anda bien mientras la capacidad W sea chica.',
    ],
    avoidWhen: [
      'W enorme (por ejemplo, pesos en gramos con millones): la tabla no entra; usar otras técnicas.',
    ],
  },
  fields: [
    { key: 'pesos', label: 'Pesos', type: 'text', default: '1, 3, 4, 5' },
    { key: 'valores', label: 'Valores', type: 'text', default: '1, 4, 5, 7' },
    { key: 'capacidad', label: 'Capacidad', type: 'number', default: '7', min: 1, max: 15 },
  ],
  shape: (input) => {
    const { weights, values, W } = knapsackInput(input);
    return {
      corner: 'i \\ w',
      rowHeaders: ['∅', ...weights.map((w, i) => `#${i + 1} (p${w}, v${values[i]})`)],
      colHeaders: Array.from({ length: W + 1 }, (_, w) => String(w)),
    };
  },
  *run(input) {
    const { weights, values, W } = knapsackInput(input);
    const n = weights.length;
    const dp = Array.from({ length: n + 1 }, () => new Array<number>(W + 1).fill(0));
    for (let w = 0; w <= W; w++)
      yield fill([0, w], 0, 1, `Sin objetos, el valor es 0 (capacidad ${w}).`, {
        vars: { i: 0, w },
      });
    for (let i = 1; i <= n; i++) {
      const wi = weights[i - 1];
      const vi = values[i - 1];
      for (let w = 0; w <= W; w++) {
        const skip = dp[i - 1][w];
        if (wi > w) {
          dp[i][w] = skip;
          yield fill(
            [i, w],
            skip,
            4,
            `El objeto ${i} pesa ${wi} > ${w}: no entra. Copiamos el de arriba: ${skip}.`,
            {
              deps: [[i - 1, w]],
              chosen: [i - 1, w],
              vars: { i, w, 'peso[i]': wi, 'valor[i]': vi },
            },
          );
        } else {
          const take = dp[i - 1][w - wi] + vi;
          dp[i][w] = Math.max(skip, take);
          const tookIt = take > skip;
          yield fill(
            [i, w],
            dp[i][w],
            5,
            `No llevarlo: ${skip}. Llevarlo: dp[${i - 1}][${w - wi}] + ${vi} = ${take}. Gana ${tookIt ? 'llevarlo' : 'no llevarlo'}: ${dp[i][w]}.`,
            {
              deps: [
                [i - 1, w],
                [i - 1, w - wi],
              ],
              chosen: tookIt ? [i - 1, w - wi] : [i - 1, w],
              vars: { i, w, 'no llevar': skip, llevar: take },
            },
          );
        }
      }
    }
    const picked: number[] = [];
    let w = W;
    for (let i = n; i >= 1; i--) {
      const took = dp[i][w] !== dp[i - 1][w];
      if (took) picked.unshift(i);
      yield {
        type: 'path',
        cell: [i, w],
        line: 6,
        text: took
          ? `dp[${i}][${w}] ≠ dp[${i - 1}][${w}]: el objeto ${i} va en la mochila.`
          : `dp[${i}][${w}] = dp[${i - 1}][${w}]: el objeto ${i} no se lleva.`,
        vars: { i, w },
        solution: `Objetos: ${picked.map((p) => `#${p}`).join(', ') || 'ninguno'}`,
      };
      if (took) w -= weights[i - 1];
    }
    const solution = `Objetos ${picked.map((p) => `#${p}`).join(', ') || '(ninguno)'} → valor ${dp[n][W]}, peso ${picked.reduce((s, p) => s + weights[p - 1], 0)}`;
    yield {
      type: 'done',
      line: 0,
      text: `Valor máximo: ${dp[n][W]}. ${solution}.`,
      vars: { óptimo: dp[n][W] },
      solution,
    };
    return { value: dp[n][W], solution };
  },
};

// ===========================================================================
// Subsecuencia común más larga
// ===========================================================================

export const lcs: DPProblem = {
  meta: {
    id: 'lcs',
    name: 'Subsecuencia común más larga',
    category: 'pd',
    summary:
      'La subsecuencia (no necesariamente contigua) más larga que aparece en ambas palabras. dp[i][j] = LCS de los primeros i caracteres de A y los primeros j de B.',
    pseudocode: [
      'dp[i][0] ← 0;  dp[0][j] ← 0',
      'para i ← 1 hasta m',
      '  para j ← 1 hasta n',
      '    si A[i] = B[j]: dp[i][j] ← dp[i − 1][j − 1] + 1       ▹ diagonal',
      '    si no: dp[i][j] ← máx(dp[i − 1][j], dp[i][j − 1])     ▹ arriba o izquierda',
      'reconstruir desde dp[m][n] siguiendo de dónde vino cada valor',
    ],
    complexity: { best: 'O(m · n)', average: 'O(m · n)', worst: 'O(m · n)', space: 'O(m · n)' },
    whenToUse: [
      'diff de archivos y control de versiones, comparación de ADN, detección de plagio.',
    ],
    avoidWhen: [
      'Textos enormes: hay variantes con memoria lineal (Hirschberg) o heurísticas (Myers).',
    ],
  },
  fields: [
    { key: 'a', label: 'Palabra A', type: 'text', default: 'ABCBDAB' },
    { key: 'b', label: 'Palabra B', type: 'text', default: 'BDCABA' },
  ],
  shape: (input) => {
    const a = word(input, 'a', 'ABCBDAB');
    const b = word(input, 'b', 'BDCABA');
    return { corner: 'A \\ B', rowHeaders: ['ε', ...a], colHeaders: ['ε', ...b] };
  },
  *run(input) {
    const a = word(input, 'a', 'ABCBDAB');
    const b = word(input, 'b', 'BDCABA');
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
    for (let j = 0; j <= n; j++)
      yield fill([0, j], 0, 1, 'Con A vacía, la LCS es 0.', { vars: { j } });
    for (let i = 1; i <= m; i++)
      yield fill([i, 0], 0, 1, 'Con B vacía, la LCS es 0.', { vars: { i } });
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          yield fill(
            [i, j],
            dp[i][j],
            4,
            `A[${i}] = B[${j}] = '${a[i - 1]}': coinciden, diagonal + 1 = ${dp[i][j]}.`,
            {
              deps: [[i - 1, j - 1]],
              chosen: [i - 1, j - 1],
              vars: { i, j, 'A[i]': a[i - 1], 'B[j]': b[j - 1] },
            },
          );
        } else {
          const up = dp[i - 1][j];
          const left = dp[i][j - 1];
          dp[i][j] = Math.max(up, left);
          yield fill(
            [i, j],
            dp[i][j],
            5,
            `'${a[i - 1]}' ≠ '${b[j - 1]}': el máximo entre arriba (${up}) e izquierda (${left}) = ${dp[i][j]}.`,
            {
              deps: [
                [i - 1, j],
                [i, j - 1],
              ],
              chosen: up >= left ? [i - 1, j] : [i, j - 1],
              vars: { i, j, 'A[i]': a[i - 1], 'B[j]': b[j - 1] },
            },
          );
        }
      }
    }
    let i = m;
    let j = n;
    let out = '';
    while (i > 0 && j > 0) {
      const cell: Cell = [i, j];
      if (a[i - 1] === b[j - 1]) {
        out = a[i - 1] + out;
        yield {
          type: 'path',
          cell,
          line: 6,
          text: `'${a[i - 1]}' es parte de la LCS: vamos en diagonal.`,
          vars: { i, j },
          solution: out,
        };
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        yield {
          type: 'path',
          cell,
          line: 6,
          text: 'El valor vino de arriba.',
          vars: { i, j },
          solution: out,
        };
        i--;
      } else {
        yield {
          type: 'path',
          cell,
          line: 6,
          text: 'El valor vino de la izquierda.',
          vars: { i, j },
          solution: out,
        };
        j--;
      }
    }
    yield {
      type: 'done',
      line: 0,
      text: `LCS = "${out}" (largo ${dp[m][n]}).`,
      vars: { largo: dp[m][n] },
      solution: `"${out}"`,
    };
    return { value: dp[m][n], solution: out };
  },
};

// ===========================================================================
// Distancia de edición (Levenshtein)
// ===========================================================================

export const editDistance: DPProblem = {
  meta: {
    id: 'edicion',
    name: 'Distancia de edición',
    category: 'pd',
    summary:
      'La mínima cantidad de inserciones, borrados y reemplazos para transformar A en B. dp[i][j] = distancia entre los primeros i caracteres de A y los primeros j de B.',
    pseudocode: [
      'dp[i][0] ← i;  dp[0][j] ← j              ▹ borrar todo / insertar todo',
      'para i ← 1 hasta m',
      '  para j ← 1 hasta n',
      '    si A[i] = B[j]: dp[i][j] ← dp[i − 1][j − 1]          ▹ sin costo',
      '    si no: dp[i][j] ← 1 + mín(dp[i − 1][j], dp[i][j − 1], dp[i − 1][j − 1])   ▹ borrar, insertar, reemplazar',
      'reconstruir las operaciones desde dp[m][n]',
    ],
    complexity: { best: 'O(m · n)', average: 'O(m · n)', worst: 'O(m · n)', space: 'O(m · n)' },
    whenToUse: [
      'Correctores ortográficos, "¿quisiste decir…?", búsqueda aproximada, bioinformática.',
    ],
    avoidWhen: [
      'Comparar contra un diccionario enorme palabra por palabra: usar índices (BK-trees, autómatas).',
    ],
  },
  fields: [
    { key: 'a', label: 'Palabra A', type: 'text', default: 'GATITO' },
    { key: 'b', label: 'Palabra B', type: 'text', default: 'PATITOS' },
  ],
  shape: (input) => {
    const a = word(input, 'a', 'GATITO');
    const b = word(input, 'b', 'PATITOS');
    return { corner: 'A \\ B', rowHeaders: ['ε', ...a], colHeaders: ['ε', ...b] };
  },
  *run(input) {
    const a = word(input, 'a', 'GATITO');
    const b = word(input, 'b', 'PATITOS');
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    for (let j = 0; j <= n; j++)
      yield fill([0, j], j, 1, `De "" a "${b.slice(0, j)}": ${j} inserciones.`, { vars: { j } });
    for (let i = 1; i <= m; i++)
      yield fill([i, 0], i, 1, `De "${a.slice(0, i)}" a "": ${i} borrados.`, { vars: { i } });
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
          yield fill(
            [i, j],
            dp[i][j],
            4,
            `'${a[i - 1]}' = '${b[j - 1]}': no cuesta nada, copiamos la diagonal (${dp[i][j]}).`,
            {
              deps: [[i - 1, j - 1]],
              chosen: [i - 1, j - 1],
              vars: { i, j },
            },
          );
        } else {
          const del = dp[i - 1][j];
          const ins = dp[i][j - 1];
          const rep = dp[i - 1][j - 1];
          dp[i][j] = 1 + Math.min(del, ins, rep);
          const best: Cell =
            rep <= del && rep <= ins ? [i - 1, j - 1] : del <= ins ? [i - 1, j] : [i, j - 1];
          yield fill(
            [i, j],
            dp[i][j],
            5,
            `'${a[i - 1]}' ≠ '${b[j - 1]}': 1 + mín(borrar ${del}, insertar ${ins}, reemplazar ${rep}) = ${dp[i][j]}.`,
            {
              deps: [
                [i - 1, j],
                [i, j - 1],
                [i - 1, j - 1],
              ],
              chosen: best,
              vars: { i, j, borrar: del, insertar: ins, reemplazar: rep },
            },
          );
        }
      }
    }
    const ops: string[] = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
      const cell: Cell = [i, j];
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        yield {
          type: 'path',
          cell,
          line: 6,
          text: `'${a[i - 1]}' se mantiene.`,
          vars: { i, j },
          solution: ops.join(', '),
        };
        i--;
        j--;
      } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        ops.unshift(`reemplazar ${a[i - 1]}→${b[j - 1]}`);
        yield {
          type: 'path',
          cell,
          line: 6,
          text: `Reemplazar '${a[i - 1]}' por '${b[j - 1]}'.`,
          vars: { i, j },
          solution: ops.join(', '),
        };
        i--;
        j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        ops.unshift(`borrar ${a[i - 1]}`);
        yield {
          type: 'path',
          cell,
          line: 6,
          text: `Borrar '${a[i - 1]}'.`,
          vars: { i, j },
          solution: ops.join(', '),
        };
        i--;
      } else {
        ops.unshift(`insertar ${b[j - 1]}`);
        yield {
          type: 'path',
          cell,
          line: 6,
          text: `Insertar '${b[j - 1]}'.`,
          vars: { i, j },
          solution: ops.join(', '),
        };
        j--;
      }
    }
    yield {
      type: 'path',
      cell: [0, 0],
      line: 6,
      text: 'Llegamos al origen.',
      vars: {},
      solution: ops.join(', '),
    };
    const solution = ops.join(', ') || 'son iguales';
    yield {
      type: 'done',
      line: 0,
      text: `Distancia = ${dp[m][n]}: ${solution}.`,
      vars: { distancia: dp[m][n] },
      solution,
    };
    return { value: dp[m][n], solution };
  },
};

// ===========================================================================
// Cambio de monedas (mínima cantidad)
// ===========================================================================

export function coinInput(input: Input) {
  return {
    coins: [...new Set(intList(input.monedas, [1, 3, 4], 6, 25))].sort((x, y) => x - y),
    amount: clampInt(input.monto, 6, 1, 30),
  };
}

export const coinChange: DPProblem = {
  meta: {
    id: 'monedas',
    name: 'Cambio de monedas',
    category: 'pd',
    summary:
      'La mínima cantidad de monedas que suman un monto. dp[a] = mínimo de monedas para pagar a. El algoritmo goloso (siempre la moneda más grande) no siempre funciona: con {1, 3, 4} y 6, el goloso da 3 monedas y lo óptimo son 2.',
    pseudocode: [
      'dp[0] ← 0;  dp[a] ← ∞ para a > 0',
      'para a ← 1 hasta monto',
      '  para cada moneda c',
      '    si c ≤ a y dp[a − c] + 1 < dp[a]: dp[a] ← dp[a − c] + 1;  elegida[a] ← c',
      'si dp[monto] = ∞: no se puede pagar',
      'reconstruir: monto, monto − elegida[monto], …',
    ],
    complexity: {
      best: 'O(monto · k)',
      average: 'O(monto · k)',
      worst: 'O(monto · k)',
      space: 'O(monto)',
    },
    whenToUse: [
      'Dar vuelto con cualquier sistema de monedas; el patrón sirve para "mínimo de piezas que suman X".',
    ],
    avoidWhen: [
      'Sistemas "canónicos" (como el de casi todos los países): ahí el goloso ya es óptimo y es O(k).',
    ],
  },
  fields: [
    { key: 'monedas', label: 'Monedas', type: 'text', default: '1, 3, 4' },
    { key: 'monto', label: 'Monto', type: 'number', default: '6', min: 1, max: 30 },
  ],
  shape: (input) => {
    const { amount } = coinInput(input);
    return {
      corner: 'a',
      rowHeaders: ['dp[a]', 'moneda'],
      colHeaders: Array.from({ length: amount + 1 }, (_, a) => String(a)),
    };
  },
  *run(input) {
    const { coins, amount } = coinInput(input);
    const dp = new Array<number>(amount + 1).fill(Infinity);
    const chosen = new Array<number>(amount + 1).fill(0);
    dp[0] = 0;
    yield fill([0, 0], 0, 1, 'Para pagar 0 no hace falta ninguna moneda.', { vars: { a: 0 } });
    yield fill([1, 0], '—', 1, 'Para 0 no se usa ninguna moneda.', { vars: { a: 0 } });
    for (let a = 1; a <= amount; a++) {
      const deps: Cell[] = [];
      for (const c of coins) {
        if (c > a) continue;
        deps.push([0, a - c]);
        if (dp[a - c] + 1 < dp[a]) {
          dp[a] = dp[a - c] + 1;
          chosen[a] = c;
        }
      }
      const ok = Number.isFinite(dp[a]);
      yield fill(
        [0, a],
        dp[a],
        4,
        ok
          ? `Para ${a}: probamos ${coins
              .filter((c) => c <= a)
              .map(
                (c) =>
                  `${c} (dp[${a - c}] + 1 = ${Number.isFinite(dp[a - c]) ? dp[a - c] + 1 : '∞'})`,
              )
              .join(', ')}. Mínimo: ${dp[a]} con la moneda ${chosen[a]}.`
          : `${a} no se puede formar con estas monedas.`,
        {
          deps,
          chosen: ok ? [0, a - chosen[a]] : undefined,
          vars: { a, 'dp[a]': ok ? dp[a] : '∞' },
        },
      );
      yield fill([1, a], ok ? chosen[a] : '—', 4, `elegida[${a}] = ${ok ? chosen[a] : '—'}.`, {
        vars: { a },
      });
    }
    if (!Number.isFinite(dp[amount])) {
      yield {
        type: 'done',
        line: 5,
        text: `No se puede pagar ${amount} con {${coins.join(', ')}}.`,
        vars: {},
        solution: 'imposible',
      };
      return { value: Infinity, solution: 'imposible' };
    }
    const used: number[] = [];
    for (let a = amount; a > 0; a -= chosen[a]) {
      used.push(chosen[a]);
      yield {
        type: 'path',
        cell: [0, a],
        line: 6,
        text: `Usamos una moneda de ${chosen[a]}; quedan ${a - chosen[a]}.`,
        vars: { a },
        solution: used.join(' + '),
      };
    }
    yield {
      type: 'path',
      cell: [0, 0],
      line: 6,
      text: 'Llegamos a 0.',
      vars: {},
      solution: used.join(' + '),
    };
    const solution = `${used.join(' + ')} = ${amount}`;
    yield {
      type: 'done',
      line: 0,
      text: `Mínimo: ${dp[amount]} moneda(s): ${solution}.`,
      vars: { mínimo: dp[amount] },
      solution,
    };
    return { value: dp[amount], solution };
  },
};

export const DP_PROBLEMS: readonly DPProblem[] = [knapsack, lcs, editDistance, coinChange];
