import { step, type Item } from '../array/steps';
import { range, type SortAlgorithm } from './types';

export const radixSort: SortAlgorithm = {
  meta: {
    id: 'radix',
    name: 'Radix sort',
    category: 'ordenamiento',
    summary:
      'Ordena dígito por dígito, desde las unidades hacia arriba, usando en cada pasada un counting sort estable.',
    pseudocode: [
      'desplazar: trabajar con x − mín para que todos sean ≥ 0',
      'para exp ← 1, 10, 100, … mientras (máx − mín) / exp ≥ 1',
      '  conteo ← 10 ceros',
      '  para cada x en A: conteo[dígito(x, exp)] ← conteo[dígito(x, exp)] + 1',
      '  acumular conteo',
      '  para i ← n − 1 bajando hasta 0',
      '    d ← dígito(A[i], exp);  conteo[d] ← conteo[d] − 1',
      '    salida[conteo[d]] ← A[i]',
      '  copiar salida en A',
    ],
    complexity: {
      best: 'O(d · (n + b))',
      average: 'O(d · (n + b))',
      worst: 'O(d · (n + b))',
      space: 'O(n + b)',
    },
    stable: true,
    inPlace: false,
    whenToUse: [
      'Muchos enteros (o cadenas de largo fijo) con pocos dígitos: le gana a los O(n log n).',
      'Ordenar por varias claves (fecha, luego hora…): cada pasada estable respeta las anteriores.',
    ],
    avoidWhen: ['Valores con muchísimos dígitos o datos que no se descomponen en dígitos.'],
  },
  *run(input) {
    const a = input.slice();
    const n = a.length;
    if (n === 0) return a;
    let min = a[0].value;
    let max = a[0].value;
    for (const it of a) {
      min = Math.min(min, it.value);
      max = Math.max(max, it.value);
    }
    const span = max - min;
    yield step.note({
      line: 1,
      text:
        min < 0
          ? `Hay negativos: trabajamos con x − (${min}) para que todos los valores sean ≥ 0.`
          : `Trabajamos con x − ${min} (el mayor desplazado es ${span}).`,
      vars: { mín: min, máx: max },
    });
    const digit = (x: number, exp: number) => Math.floor((x - min) / exp) % 10;
    for (let exp = 1; Math.floor(span / exp) >= 1 || exp === 1; exp *= 10) {
      const place =
        exp === 1
          ? 'unidades'
          : exp === 10
            ? 'decenas'
            : exp === 100
              ? 'centenas'
              : `dígito ${exp}`;
      const count = new Array<number>(10).fill(0);
      yield step.auxInit('conteo', count.slice(), {
        line: 3,
        text: `Pasada por las ${place} (exp = ${exp}).`,
        vars: { exp },
      });
      for (let i = 0; i < n; i++) {
        const d = digit(a[i].value, exp);
        count[d]++;
        yield step.read(i, {
          line: 4,
          text: `A[${i}] = ${a[i].value} → dígito de ${place} = ${d}.`,
          vars: { exp, i, d },
        });
        yield step.auxSet('conteo', d, count[d], {
          line: 4,
          text: `conteo[${d}] = ${count[d]}.`,
          vars: { exp, i, d },
        });
      }
      for (let d = 1; d < 10; d++) {
        count[d] += count[d - 1];
        yield step.auxSet('conteo', d, count[d], {
          line: 5,
          text: `Acumulado: conteo[${d}] = ${count[d]}.`,
          vars: { exp, d },
        });
      }
      const out: (Item | null)[] = new Array<Item | null>(n).fill(null);
      yield step.auxInit('salida', new Array<number | null>(n).fill(null), {
        line: 6,
        text: 'Repartimos de derecha a izquierda para mantener la estabilidad.',
        vars: { exp },
      });
      for (let i = n - 1; i >= 0; i--) {
        const d = digit(a[i].value, exp);
        count[d]--;
        yield step.auxSet('conteo', d, count[d], {
          line: 7,
          text: `A[${i}] = ${a[i].value} tiene dígito ${d}: va a la posición ${count[d]}.`,
          vars: { exp, i, d, posición: count[d] },
        });
        out[count[d]] = a[i];
        yield step.auxSet('salida', count[d], a[i].value, {
          line: 8,
          text: `salida[${count[d]}] ← ${a[i].value}.`,
          vars: { exp, i, d },
        });
      }
      for (let i = 0; i < n; i++) {
        const item = out[i] as Item;
        a[i] = item;
        yield step.set(i, item, {
          line: 9,
          text: `A[${i}] ← ${item.value}.`,
          vars: { exp, i },
        });
      }
      if (span === 0) break;
    }
    yield step.auxClear('conteo', { line: 0, text: 'Listo.', vars: {} });
    yield step.auxClear('salida', { line: 0, text: 'Listo.', vars: {} });
    yield step.mark(range(n), { line: 0, text: 'Arreglo ordenado.', vars: { n } });
    return a;
  },
};
