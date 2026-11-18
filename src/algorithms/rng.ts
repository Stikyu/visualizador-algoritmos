/**
 * Generador pseudoaleatorio con semilla (mulberry32).
 * Usar una semilla hace que los datos "aleatorios" sean reproducibles: el mismo link
 * compartido o el mismo test producen siempre la misma entrada.
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entero uniforme en [min, max]. */
export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
