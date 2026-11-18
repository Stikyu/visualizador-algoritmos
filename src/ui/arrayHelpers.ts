import type { ArrayState } from '../algorithms/array/state';
import type { Counter } from '../explain/panels';

export const ARRAY_LEGEND = [
  { cls: 'sw--compare', label: 'comparando', mark: '●' },
  { cls: 'sw--swap', label: 'intercambiando', mark: '⇄' },
  { cls: 'sw--write', label: 'escribiendo', mark: '✎' },
  { cls: 'sw--pivot', label: 'pivote / mínimo', mark: '▲' },
  { cls: 'sw--sorted', label: 'ya ordenado' },
];

export function arrayCounters(s: ArrayState): Counter[] {
  return [
    { label: 'comparaciones', value: s.counters.comparisons },
    { label: 'intercambios', value: s.counters.swaps },
    {
      label: 'escrituras',
      value: s.counters.writes,
      hint: 'Incluye escrituras en arreglos auxiliares',
    },
    {
      label: 'accesos',
      value: s.counters.accesses,
      hint: 'Lecturas y escrituras al arreglo principal',
    },
  ];
}

/** Letras que distinguen valores repetidos (5ₐ, 5ᵦ…) para ver la estabilidad. */
export function stabilityLabels(values: readonly number[]): Map<number, string> {
  const count = new Map<number, number>();
  for (const v of values) count.set(v, (count.get(v) ?? 0) + 1);
  const seen = new Map<number, number>();
  const labels = new Map<number, string>();
  values.forEach((v, id) => {
    if ((count.get(v) ?? 0) < 2) return;
    const k = seen.get(v) ?? 0;
    seen.set(v, k + 1);
    labels.set(id, String.fromCharCode(97 + (k % 26)));
  });
  return labels;
}

export function defaultOptions(algo: {
  meta: { options?: readonly { key: string; default: string }[] };
}) {
  return Object.fromEntries((algo.meta.options ?? []).map((o) => [o.key, o.default]));
}
