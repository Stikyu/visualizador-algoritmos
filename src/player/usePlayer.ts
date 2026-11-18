import { useCallback, useEffect, useMemo, useState } from 'react';

/** Velocidades disponibles, en pasos por segundo. */
export const SPEEDS = [0.5, 1, 2, 4, 8, 15, 30, 60, 120, 300] as const;

export interface PlayerControls {
  readonly position: number;
  readonly length: number;
  readonly playing: boolean;
  readonly speedIndex: number;
  readonly speed: number;
  play(): void;
  pause(): void;
  toggle(): void;
  next(n?: number): void;
  prev(n?: number): void;
  seek(p: number): void;
  reset(): void;
  toEnd(): void;
  setSpeedIndex(i: number): void;
}

/**
 * Reproductor de pasos. Sólo maneja la POSICIÓN dentro de una traza de `length` pasos:
 * no sabe qué es un paso ni cómo se dibuja. Quien lo usa le pide a la Timeline el estado
 * en `position`. Por eso el mismo hook sirve para ordenamiento, grafos, PD o el modo carrera.
 *
 * `resetKey` cambia cuando se genera una traza nueva → vuelve al principio y se detiene.
 */
export function usePlayer(length: number, resetKey: unknown): PlayerControls {
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(4);
  const [prevKey, setPrevKey] = useState(resetKey);

  // Patrón "ajustar estado cuando cambia una prop" (sin efecto extra ni render intermedio).
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setPosition(0);
    setPlaying(false);
  }

  const speed = SPEEDS[speedIndex];

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      acc += ((now - last) * speed) / 1000;
      last = now;
      if (acc >= 1) {
        const k = Math.floor(acc);
        acc -= k;
        setPosition((p) => Math.min(length, p + k));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, length]);

  // Al llegar al final, se detiene.
  if (playing && position >= length) setPlaying(false);

  const clamp = useCallback((p: number) => Math.max(0, Math.min(length, p)), [length]);

  const play = useCallback(() => {
    setPosition((p) => (p >= length ? 0 : p));
    setPlaying(length > 0);
  }, [length]);
  const pause = useCallback(() => setPlaying(false), []);
  const next = useCallback(
    (n = 1) => {
      setPlaying(false);
      setPosition((p) => clamp(p + n));
    },
    [clamp],
  );
  const prev = useCallback(
    (n = 1) => {
      setPlaying(false);
      setPosition((p) => clamp(p - n));
    },
    [clamp],
  );
  const seek = useCallback((p: number) => setPosition(clamp(p)), [clamp]);
  const reset = useCallback(() => {
    setPlaying(false);
    setPosition(0);
  }, []);
  const toEnd = useCallback(() => {
    setPlaying(false);
    setPosition(length);
  }, [length]);

  return useMemo(
    () => ({
      position: Math.min(position, length),
      length,
      playing,
      speedIndex,
      speed,
      play,
      pause,
      toggle: playing ? pause : play,
      next,
      prev,
      seek,
      reset,
      toEnd,
      setSpeedIndex,
    }),
    [position, length, playing, speedIndex, speed, play, pause, next, prev, seek, reset, toEnd],
  );
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) &&
  !(el instanceof HTMLInputElement && el.type === 'range');

/** Atajos de teclado: espacio = play/pausa, ←/→ = paso (Shift: ×10), Inicio/Fin. */
export function usePlayerShortcuts(player: PlayerControls, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const big = e.shiftKey ? 10 : 1;
      // Un slider enfocado ya maneja sus propias flechas.
      const onRange = e.target instanceof HTMLInputElement && e.target.type === 'range';
      if (onRange && e.key.startsWith('Arrow')) return;
      switch (e.key) {
        case ' ':
          // No robar el espacio a botones/enlaces enfocados.
          if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement)
            return;
          e.preventDefault();
          player.toggle();
          break;
        case 'ArrowRight':
          e.preventDefault();
          player.next(big);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.prev(big);
          break;
        case 'Home':
          e.preventDefault();
          player.reset();
          break;
        case 'End':
          e.preventDefault();
          player.toEnd();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player, enabled]);
}
