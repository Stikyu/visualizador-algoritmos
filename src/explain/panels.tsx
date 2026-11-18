import { useEffect, useRef } from 'react';
import type { BaseStep, Vars } from '../algorithms/types';
import { STEP_LABELS, formatVar } from './format';

export function PseudocodePanel({ lines, active }: { lines: readonly string[]; active: number }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-current="step"]');
    // Mantener visible la línea activa sin mover toda la página.
    if (el && ref.current) {
      const box = ref.current;
      const top = el.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - el.clientHeight) {
        box.scrollTop = top - box.clientHeight / 3;
      }
    }
  }, [active]);
  return (
    <section className="panel" aria-labelledby="pseudo-title">
      <h2 id="pseudo-title" className="panel__title">
        Pseudocódigo
      </h2>
      <ol className="pseudo" ref={ref}>
        {lines.map((line, i) => (
          <li
            key={i}
            className={i + 1 === active ? 'pseudo__line is-active' : 'pseudo__line'}
            aria-current={i + 1 === active ? 'step' : undefined}
          >
            <span className="pseudo__num" aria-hidden="true">
              {i + 1}
            </span>
            <code>{line}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ExplanationPanel({
  step,
  initialText,
  playing,
  position,
  length,
}: {
  step: BaseStep | undefined;
  initialText: string;
  playing: boolean;
  position: number;
  length: number;
}) {
  const done = length > 0 && position >= length;
  return (
    <section className="panel panel--explain" aria-labelledby="explain-title">
      <h2 id="explain-title" className="panel__title">
        Qué está pasando
        {step && (
          <span className={`tag tag--${step.type}`}>{STEP_LABELS[step.type] ?? step.type}</span>
        )}
      </h2>
      {/* Durante la reproducción no se anuncia cada paso para no saturar al lector de pantalla. */}
      <p className="explain" aria-live={playing ? 'off' : 'polite'}>
        {step ? step.text : initialText}
      </p>
      {done && <p className="explain__done">✓ Fin de la traza.</p>}
    </section>
  );
}

export function VariablesPanel({ vars, prev }: { vars: Vars; prev?: Vars }) {
  const entries = Object.entries(vars);
  return (
    <section className="panel" aria-labelledby="vars-title">
      <h2 id="vars-title" className="panel__title">
        Variables
      </h2>
      {entries.length === 0 ? (
        <p className="muted small">Sin variables en este paso.</p>
      ) : (
        <dl className="vars">
          {entries.map(([k, v]) => {
            const text = formatVar(v);
            const changed = prev !== undefined && k in prev && formatVar(prev[k]) !== text;
            return (
              <div key={k} className={changed ? 'vars__row is-changed' : 'vars__row'}>
                <dt className="mono">{k}</dt>
                <dd className="mono">{text}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}

export interface Counter {
  readonly label: string;
  readonly value: number | string;
  readonly hint?: string;
}

export function CountersPanel({ counters }: { counters: readonly Counter[] }) {
  if (counters.length === 0) return null;
  return (
    <section className="panel" aria-labelledby="counters-title">
      <h2 id="counters-title" className="panel__title">
        Contadores
      </h2>
      <div className="counters">
        {counters.map((c) => (
          <div key={c.label} className="counter" title={c.hint}>
            <span className="counter__value mono">{c.value}</span>
            <span className="counter__label">{c.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
