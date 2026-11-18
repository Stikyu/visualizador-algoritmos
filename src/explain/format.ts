import type { VarValue } from '../algorithms/types';

/** Formatea un valor de variable para mostrarlo de forma compacta. */
export function formatVar(v: VarValue): string {
  if (v === null) return '—';
  if (typeof v === 'boolean') return v ? 'verdadero' : 'falso';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : v > 0 ? '∞' : '−∞';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return `[${v.map(formatVar).join(', ')}]`;
  return `{ ${Object.entries(v)
    .map(([k, x]) => `${k}: ${formatVar(x)}`)
    .join(', ')} }`;
}

/** Etiqueta corta en español para cada tipo de paso. */
export const STEP_LABELS: Record<string, string> = {
  compare: 'comparar',
  swap: 'intercambiar',
  set: 'escribir',
  read: 'leer',
  mark: 'ordenado',
  pivot: 'pivote',
  range: 'rango',
  auxInit: 'auxiliar',
  auxSet: 'auxiliar',
  auxClear: 'auxiliar',
  found: 'resultado',
  note: 'nota',
  visit: 'visitar',
  enqueue: 'encolar',
  dequeue: 'desencolar',
  push: 'apilar',
  pop: 'desapilar',
  relax: 'relajar',
  edge: 'arista',
  return: 'retorno',
  memo: 'memo',
  fill: 'llenar',
  move: 'mover',
  place: 'colocar',
  remove: 'quitar',
  conflict: 'conflicto',
  solution: 'solución',
  rotate: 'rotación',
  path: 'camino',
  hash: 'hash',
  union: 'unión',
  discard: 'descartar',
  call: 'llamada',
  find: 'buscar',
  snapshot: 'estado',
  done: 'fin',
};
