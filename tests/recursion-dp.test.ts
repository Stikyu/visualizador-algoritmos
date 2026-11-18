import { describe, expect, it } from 'vitest';
import {
  DP_PROBLEMS,
  coinChange,
  coinInput,
  editDistance,
  knapsack,
  knapsackInput,
  lcs,
} from '../src/algorithms/dp/problems';
import { initialDPState, reduceDP } from '../src/algorithms/dp/table';
import { fibNumber, fibonacci } from '../src/algorithms/recursion/fibonacci';
import { hanoi } from '../src/algorithms/recursion/hanoi';
import { attackerOf, nQueens } from '../src/algorithms/recursion/queens';
import { drain, record } from '../src/algorithms/record';
import { createRng, randInt } from '../src/algorithms/rng';

const rng = createRng(2026);

describe('Fibonacci', () => {
  it('sin memo: valor correcto y 2·fib(n+1) − 1 llamadas', () => {
    for (let n = 0; n <= 10; n++) {
      const r = drain(fibonacci.run({ n: String(n), memo: 'false' }));
      expect(r.value).toBe(fibNumber(n));
      expect(r.calls).toBe(2 * fibNumber(n + 1) - 1);
    }
  });

  it('con memo: valor correcto y 2n − 1 llamadas', () => {
    for (let n = 2; n <= 30; n++) {
      const r = drain(fibonacci.run({ n: String(n), memo: 'true' }));
      expect(r.value).toBe(fibNumber(n));
      expect(r.calls).toBe(2 * n - 1);
    }
  });

  it('la traza arma el árbol completo y vacía la pila', () => {
    const input = { n: '6', memo: 'false' };
    const { steps, result } = record(fibonacci.run(input));
    const final = steps.reduce(fibonacci.reduce, fibonacci.initial(input));
    expect(Object.keys(final.nodes).length).toBe(result.calls);
    expect(final.stack).toEqual([]);
    expect(final.nodes[final.root!].value).toBe(8);
  });
});

describe('Torres de Hanoi', () => {
  it('2ⁿ − 1 movimientos, todos legales, y todo termina en C', () => {
    for (let n = 1; n <= 8; n++) {
      const input = { n: String(n) };
      const { steps, result } = record(hanoi.run(input));
      expect(result).toBe(2 ** n - 1);
      let s = hanoi.initial(input);
      for (const st of steps) {
        if (st.type === 'move') {
          const dest = s.pegs[st.to!];
          const disk = s.pegs[st.from!][s.pegs[st.from!].length - 1];
          // Nunca un disco grande sobre uno chico.
          if (dest.length) expect(dest[dest.length - 1]).toBeGreaterThan(disk);
        }
        s = hanoi.reduce(s, st);
      }
      expect(s.pegs[0]).toEqual([]);
      expect(s.pegs[1]).toEqual([]);
      expect(s.pegs[2]).toEqual(Array.from({ length: n }, (_, i) => n - i));
      expect(s.stack).toEqual([]);
    }
  });
});

describe('N reinas', () => {
  const valid = (sol: number[]) => sol.every((c, r) => c >= 0 && attackerOf(sol, r, c) === null);

  it('la primera solución es válida para N = 4..8', () => {
    for (let n = 4; n <= 8; n++) {
      const { solutions } = drain(nQueens.run({ n: String(n), todas: 'false' }));
      expect(solutions).toHaveLength(1);
      expect(valid(solutions[0])).toBe(true);
    }
  });

  it('cantidad conocida de soluciones: N=4 → 2, N=5 → 10, N=6 → 4', () => {
    const expected: Record<number, number> = { 4: 2, 5: 10, 6: 4 };
    for (const [n, count] of Object.entries(expected)) {
      const { solutions } = drain(nQueens.run({ n, todas: 'true' }));
      expect(solutions).toHaveLength(count);
      solutions.forEach((s) => expect(valid(s)).toBe(true));
    }
  });

  it('la traza deja el tablero con la solución encontrada', () => {
    const input = { n: '6', todas: 'false' };
    const { steps, result } = record(nQueens.run(input));
    const final = steps.reduce(nQueens.reduce, nQueens.initial(input));
    expect(final.queens).toEqual(result.solutions[0]);
    expect(final.backtracks).toBeGreaterThan(0);
  });
});

/** Fuerza bruta para la mochila: todos los subconjuntos. */
function knapsackBrute(w: number[], v: number[], W: number) {
  let best = 0;
  for (let mask = 0; mask < 1 << w.length; mask++) {
    let tw = 0;
    let tv = 0;
    for (let i = 0; i < w.length; i++) {
      if (mask & (1 << i)) {
        tw += w[i];
        tv += v[i];
      }
    }
    if (tw <= W) best = Math.max(best, tv);
  }
  return best;
}

/** LCS por fuerza bruta: la subsecuencia más larga de A que también es subsecuencia de B. */
function lcsBrute(a: string, b: string) {
  const isSub = (s: string, t: string) => {
    let k = 0;
    for (const ch of t) if (k < s.length && s[k] === ch) k++;
    return k === s.length;
  };
  let best = 0;
  for (let mask = 0; mask < 1 << a.length; mask++) {
    let s = '';
    for (let i = 0; i < a.length; i++) if (mask & (1 << i)) s += a[i];
    if (s.length > best && isSub(s, b)) best = s.length;
  }
  return best;
}

/** Levenshtein recursivo con memo (referencia independiente). */
function levenshtein(a: string, b: string): number {
  const memo = new Map<string, number>();
  const go = (i: number, j: number): number => {
    if (i === 0) return j;
    if (j === 0) return i;
    const k = `${i},${j}`;
    if (!memo.has(k)) {
      memo.set(
        k,
        a[i - 1] === b[j - 1]
          ? go(i - 1, j - 1)
          : 1 + Math.min(go(i - 1, j), go(i, j - 1), go(i - 1, j - 1)),
      );
    }
    return memo.get(k)!;
  };
  return go(a.length, b.length);
}

/** Cambio de monedas por BFS sobre montos (referencia). */
function coinsBfs(coins: number[], amount: number) {
  const dist = new Map([[0, 0]]);
  const q = [0];
  while (q.length) {
    const x = q.shift()!;
    for (const c of coins) {
      const y = x + c;
      if (y <= amount && !dist.has(y)) {
        dist.set(y, dist.get(x)! + 1);
        q.push(y);
      }
    }
  }
  return dist.get(amount) ?? Infinity;
}

const randWord = (len: number) =>
  Array.from({ length: len }, () => 'ABCD'[randInt(rng, 0, 3)]).join('');

describe('programación dinámica', () => {
  it('casos conocidos', () => {
    expect(
      drain(knapsack.run({ pesos: '1, 3, 4, 5', valores: '1, 4, 5, 7', capacidad: '7' })).value,
    ).toBe(9);
    expect(drain(lcs.run({ a: 'ABCBDAB', b: 'BDCABA' })).value).toBe(4);
    expect(drain(editDistance.run({ a: 'KITTEN', b: 'SITTING' })).value).toBe(3);
    expect(drain(editDistance.run({ a: 'GATITO', b: 'PATITOS' })).value).toBe(2);
    expect(drain(coinChange.run({ monedas: '1, 3, 4', monto: '6' })).value).toBe(2);
    expect(drain(coinChange.run({ monedas: '5, 7', monto: '3' })).value).toBe(Infinity);
  });

  it('mochila contra fuerza bruta', () => {
    for (let t = 0; t < 120; t++) {
      const n = randInt(rng, 1, 6);
      const input = {
        pesos: Array.from({ length: n }, () => randInt(rng, 1, 9)).join(','),
        valores: Array.from({ length: n }, () => randInt(rng, 1, 30)).join(','),
        capacidad: String(randInt(rng, 1, 15)),
      };
      const { weights, values, W } = knapsackInput(input);
      expect(drain(knapsack.run(input)).value).toBe(knapsackBrute(weights, values, W));
    }
  });

  it('LCS, distancia de edición y monedas contra referencias independientes', () => {
    for (let t = 0; t < 150; t++) {
      const a = randWord(randInt(rng, 1, 8));
      const b = randWord(randInt(rng, 1, 8));
      const l = drain(lcs.run({ a, b }));
      expect(l.value).toBe(lcsBrute(a, b));
      expect(l.solution.length).toBe(l.value);
      expect(drain(editDistance.run({ a, b })).value).toBe(levenshtein(a, b));
      const coins = Array.from({ length: randInt(rng, 1, 4) }, () => randInt(rng, 1, 12)).join(',');
      const monto = String(randInt(rng, 1, 30));
      const parsed = coinInput({ monedas: coins, monto });
      expect(drain(coinChange.run({ monedas: coins, monto })).value).toBe(
        coinsBfs(parsed.coins, parsed.amount),
      );
    }
  });

  it('la tabla queda completa y la solución reconstruida aparece en el estado', () => {
    for (const p of DP_PROBLEMS) {
      const input = Object.fromEntries(p.fields.map((f) => [f.key, f.default]));
      const shape = p.shape(input);
      const { steps, result } = record(p.run(input));
      const final = steps.reduce(
        reduceDP,
        initialDPState(shape.rowHeaders.length, shape.colHeaders.length),
      );
      expect(final.filled).toBe(shape.rowHeaders.length * shape.colHeaders.length);
      // El estado final muestra la solución reconstruida (la de LCS va entre comillas).
      expect(final.solution?.replaceAll('"', '')).toBe(result.solution.replaceAll('"', ''));
      expect(final.path.length).toBeGreaterThan(0);
      for (const s of steps) expect(s.line).toBeLessThanOrEqual(p.meta.pseudocode.length);
    }
  });
});
