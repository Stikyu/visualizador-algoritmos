import { createRng, randInt } from '../rng';

export type InputKind = 'aleatorio' | 'ordenado' | 'invertido' | 'casi' | 'repetidos';

export const INPUT_KINDS: readonly { value: InputKind; label: string }[] = [
  { value: 'aleatorio', label: 'Aleatorio' },
  { value: 'ordenado', label: 'Ordenado' },
  { value: 'invertido', label: 'Invertido' },
  { value: 'casi', label: 'Casi ordenado' },
  { value: 'repetidos', label: 'Con repetidos' },
];

/** Genera una entrada reproducible (misma semilla → mismos datos). */
export function generateArray(kind: InputKind, n: number, seed: number, max = 99): number[] {
  const rng = createRng(seed);
  const random = () => randInt(rng, 5, max);
  switch (kind) {
    case 'aleatorio':
      return Array.from({ length: n }, random);
    case 'ordenado':
      return Array.from({ length: n }, random).sort((a, b) => a - b);
    case 'invertido':
      return Array.from({ length: n }, random).sort((a, b) => b - a);
    case 'casi': {
      const a = Array.from({ length: n }, random).sort((x, y) => x - y);
      // Unos pocos intercambios entre vecinos cercanos.
      const swaps = Math.max(1, Math.floor(n / 10));
      for (let s = 0; s < swaps; s++) {
        const i = randInt(rng, 0, Math.max(0, n - 2));
        const j = Math.min(n - 1, i + randInt(rng, 1, 3));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    case 'repetidos': {
      const pool = Array.from({ length: Math.max(2, Math.ceil(n / 6)) }, random);
      return Array.from({ length: n }, () => pool[randInt(rng, 0, pool.length - 1)]);
    }
  }
}

/** Interpreta texto ingresado a mano ("5, 3 8;-2") → números. Devuelve null si es inválido. */
export function parseNumbers(text: string, maxLength = 120): number[] | null {
  const parts = text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > maxLength) return null;
  const nums = parts.map(Number);
  if (nums.some((x) => !Number.isInteger(x) || Math.abs(x) > 9999)) return null;
  return nums;
}
