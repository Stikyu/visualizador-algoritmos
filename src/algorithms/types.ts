/**
 * Tipos centrales del sistema de pasos.
 *
 * Un algoritmo es una función generadora que emite "pasos". Cada paso describe UNA acción
 * elemental (comparar, intercambiar, visitar...) junto con la información didáctica:
 * qué línea del pseudocódigo se está ejecutando, qué está pasando en lenguaje natural y
 * el valor de las variables relevantes en ese momento.
 *
 * Nada de este archivo depende de React: los algoritmos no saben cómo se van a dibujar.
 */

/** Valor que puede mostrarse en el panel de variables. */
export type VarValue =
  number | string | boolean | null | readonly VarValue[] | { readonly [key: string]: VarValue };

export type Vars = Readonly<Record<string, VarValue>>;

/** Campos comunes a cualquier paso, de cualquier dominio. */
export interface BaseStep {
  /** Discriminante del paso: 'compare', 'swap', 'visit', 'relax', ... */
  readonly type: string;
  /** Línea del pseudocódigo activa (empezando en 1). 0 = ninguna. */
  readonly line: number;
  /** Explicación en español de lo que ocurre en este paso. */
  readonly text: string;
  /** Variables relevantes en este instante. */
  readonly vars: Vars;
}

export type Category =
  'ordenamiento' | 'busqueda' | 'estructuras' | 'grafos' | 'grilla' | 'recursion' | 'pd';

export interface Complexity {
  readonly best: string;
  readonly average: string;
  readonly worst: string;
  readonly space: string;
}

/** Opción configurable de un algoritmo (por ejemplo, la estrategia de pivote del quick sort). */
export interface AlgorithmOption {
  readonly key: string;
  readonly label: string;
  readonly choices: readonly { readonly value: string; readonly label: string }[];
  readonly default: string;
}

export interface AlgorithmMeta {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  /** Una oración que resume la idea del algoritmo. */
  readonly summary: string;
  /** Pseudocódigo, una línea por elemento. Los pasos referencian estas líneas (1-indexadas). */
  readonly pseudocode: readonly string[];
  readonly complexity: Complexity;
  readonly stable?: boolean;
  readonly inPlace?: boolean;
  readonly whenToUse: readonly string[];
  readonly avoidWhen: readonly string[];
  readonly options?: readonly AlgorithmOption[];
}

export type Options = Readonly<Record<string, string>>;

/** Resultado de ejecutar un generador hasta el final: la traza completa y el valor de retorno. */
export interface Recorded<St extends BaseStep, R> {
  readonly steps: St[];
  readonly result: R;
}
