import type { BaseStep } from '../algorithms/types';

/** Función pura que aplica un paso a un estado y devuelve el estado siguiente (sin mutar). */
export type Reducer<S, St extends BaseStep> = (state: S, step: St) => S;

/**
 * Línea de tiempo de una traza: permite obtener el estado en cualquier posición.
 *
 * Posición p ∈ [0, n]: p = 0 es el estado inicial; p = k significa "ya se aplicaron los
 * pasos 0..k-1". El paso que se está mostrando en la posición p es steps[p - 1].
 *
 * Guardar los n+1 estados sería O(n · tamaño del estado) en memoria. En su lugar se guarda
 * un checkpoint cada `every` pasos y, para llegar a p, se parte del checkpoint anterior y se
 * aplican a lo sumo `every - 1` pasos. Además se recuerda la última posición calculada, de
 * modo que avanzar de a un paso (el caso típico al reproducir) cuesta O(1) reducciones.
 */
export class Timeline<S, St extends BaseStep> {
  readonly steps: readonly St[];
  private readonly reduce: Reducer<S, St>;
  private readonly every: number;
  private readonly checkpoints: S[] = [];
  private cachePos = 0;
  private cacheState: S;

  constructor(initial: S, steps: readonly St[], reduce: Reducer<S, St>, every = 32) {
    this.steps = steps;
    this.reduce = reduce;
    this.every = Math.max(1, every);
    let state = initial;
    this.checkpoints.push(state);
    for (let i = 0; i < steps.length; i++) {
      state = reduce(state, steps[i]);
      if ((i + 1) % this.every === 0) this.checkpoints.push(state);
    }
    this.final = state;
    this.cacheState = initial;
  }

  /** Estado después de aplicar todos los pasos. */
  readonly final: S;

  get length(): number {
    return this.steps.length;
  }

  /** Paso mostrado en la posición p (undefined en la posición 0). */
  stepAt(p: number): St | undefined {
    return p > 0 ? this.steps[p - 1] : undefined;
  }

  stateAt(position: number): S {
    const p = Math.max(0, Math.min(this.steps.length, Math.round(position)));
    if (p === this.cachePos) return this.cacheState;
    if (p === this.steps.length) return this.remember(p, this.final);
    const cpIndex = Math.floor(p / this.every);
    let from = cpIndex * this.every;
    let state = this.checkpoints[cpIndex];
    // Si la caché está entre el checkpoint y p, conviene partir de la caché.
    if (this.cachePos > from && this.cachePos < p) {
      from = this.cachePos;
      state = this.cacheState;
    }
    for (let i = from; i < p; i++) state = this.reduce(state, this.steps[i]);
    return this.remember(p, state);
  }

  private remember(p: number, state: S): S {
    this.cachePos = p;
    this.cacheState = state;
    return state;
  }
}
