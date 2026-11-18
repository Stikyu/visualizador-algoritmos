import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArrayStep } from '../algorithms/array/steps';
import type { PlayerControls } from '../player/usePlayer';

export interface Practice {
  readonly enabled: boolean;
  /** Hay una pregunta pendiente: el reproductor espera la respuesta. */
  readonly waiting: boolean;
  /** 'swap' → elegir 2 barras; 'set' → elegir la posición donde se escribe. */
  readonly kind: 'swap' | 'set' | null;
  readonly value: number | null;
  readonly picked: readonly number[];
  readonly feedback: { readonly ok: boolean; readonly text: string } | null;
  readonly score: { readonly ok: number; readonly total: number };
  pick(index: number): void;
  skip(): void;
}

const sameSet = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * Modo práctica: antes de aplicar un intercambio (o una escritura), se pausa y se le pide al
 * usuario que prediga qué posiciones cambian. Funciona sobre la MISMA traza que el modo
 * normal: sólo mira cuál es el próximo paso (`steps[position]`).
 */
export function usePractice(
  steps: readonly ArrayStep[],
  player: PlayerControls,
  enabled: boolean,
): Practice {
  const [answered, setAnswered] = useState<ReadonlySet<number>>(new Set());
  const [picked, setPicked] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Practice['feedback']>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const [prevSteps, setPrevSteps] = useState(steps);

  // Traza nueva → se reinicia el puntaje y las respuestas.
  if (prevSteps !== steps) {
    setPrevSteps(steps);
    setAnswered(new Set());
    setPicked([]);
    setFeedback(null);
    setScore({ ok: 0, total: 0 });
  }

  const next = steps[player.position];
  const question = next && (next.type === 'swap' || next.type === 'set') ? next : null;
  const waiting = enabled && question !== null && !answered.has(player.position);
  const { playing, pause } = player;

  // Si venía reproduciendo, se pausa para preguntar y se reanuda al responder.
  const resume = useRef(false);
  useEffect(() => {
    if (waiting && playing) {
      resume.current = true;
      pause();
    }
  }, [waiting, playing, pause]);

  const resolve = useCallback(
    (choice: number[] | null) => {
      if (!question) return;
      const expected = question.type === 'swap' ? [question.i, question.j] : [question.index];
      const ok = choice !== null && sameSet(choice, expected);
      const where = expected.join(' y ');
      setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
      setFeedback({
        ok,
        text:
          choice === null
            ? `Salteada: ${question.type === 'swap' ? `se intercambian ${where}` : `se escribe en ${where}`}.`
            : ok
              ? '¡Correcto!'
              : `No: ${question.type === 'swap' ? `se intercambian las posiciones ${where}` : `se escribe en la posición ${where}`}.`,
      });
      setAnswered((a) => new Set(a).add(player.position));
      setPicked([]);
      player.next();
      if (resume.current) {
        resume.current = false;
        player.play();
      }
    },
    [question, player],
  );

  const pick = useCallback(
    (i: number) => {
      if (!waiting || !question) return;
      const need = question.type === 'swap' ? 2 : 1;
      const np = picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i];
      if (np.length < need) setPicked(np);
      else resolve(np);
    },
    [waiting, question, picked, resolve],
  );

  return {
    enabled,
    waiting,
    kind: question ? (question.type as 'swap' | 'set') : null,
    value: question?.type === 'set' ? question.item.value : null,
    picked,
    feedback,
    score,
    pick,
    skip: () => resolve(null),
  };
}
