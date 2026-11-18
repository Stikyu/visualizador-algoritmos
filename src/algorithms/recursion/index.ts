import type { BaseStep } from '../types';
import { fibonacci } from './fibonacci';
import { hanoi } from './hanoi';
import { nQueens } from './queens';
import type { Problem } from './types';

/** Problemas de recursión. Cada uno trae su estado y su reductor propios. */
export const RECURSION_PROBLEMS = [fibonacci, hanoi, nQueens] as unknown as readonly Problem<
  unknown,
  BaseStep,
  unknown
>[];
