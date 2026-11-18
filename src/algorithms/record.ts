import type { BaseStep, Recorded } from './types';

/** Límite de seguridad: si un generador emite más pasos que esto, algo anda mal. */
export const MAX_STEPS = 250_000;

/**
 * Ejecuta un generador hasta el final y guarda todos los pasos que emite.
 *
 * Esta es la clave del diseño: primero se genera la traza COMPLETA y recién después el
 * reproductor la recorre. Así se puede ir hacia atrás o saltar a cualquier paso sin
 * re-ejecutar el algoritmo.
 */
export function record<St extends BaseStep, R>(gen: Generator<St, R, void>): Recorded<St, R> {
  const steps: St[] = [];
  for (;;) {
    const next = gen.next();
    if (next.done) return { steps, result: next.value };
    steps.push(next.value);
    if (steps.length > MAX_STEPS) {
      throw new Error(`La traza superó ${MAX_STEPS} pasos: reducí el tamaño de la entrada.`);
    }
  }
}

/** Descarta los pasos y devuelve sólo el resultado (útil en tests y en usos no visuales). */
export function drain<R>(gen: Generator<unknown, R, void>): R {
  for (;;) {
    const next = gen.next();
    if (next.done) return next.value;
  }
}
