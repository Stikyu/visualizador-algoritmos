import { useState, type ReactNode } from 'react';
import type { AlgorithmMeta, BaseStep } from '../algorithms/types';
import {
  CountersPanel,
  ExplanationPanel,
  PseudocodePanel,
  VariablesPanel,
  type Counter,
} from '../explain/panels';
import { PlayerControls } from '../player/PlayerControls';
import { usePlayerShortcuts, type PlayerControls as Player } from '../player/usePlayer';
import { InfoIcon, LinkIcon } from './icons';
import { href } from './router';

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copiá este link:', window.location.href);
    }
  };
  return (
    <button type="button" className="btn btn--ghost" onClick={copy} aria-live="polite">
      <LinkIcon /> {copied ? '¡Link copiado!' : 'Compartir'}
    </button>
  );
}

export function ComplexityChips({ meta }: { meta: AlgorithmMeta }) {
  const c = meta.complexity;
  return (
    <ul className="chips" aria-label="Complejidad">
      <li className="chip" title="Mejor caso">
        <span className="chip__k">mejor</span> {c.best}
      </li>
      <li className="chip" title="Caso promedio">
        <span className="chip__k">prom.</span> {c.average}
      </li>
      <li className="chip" title="Peor caso">
        <span className="chip__k">peor</span> {c.worst}
      </li>
      <li className="chip" title="Espacio adicional">
        <span className="chip__k">espacio</span> {c.space}
      </li>
      {meta.stable !== undefined && (
        <li className={`chip ${meta.stable ? 'chip--yes' : 'chip--no'}`}>
          {meta.stable ? 'estable' : 'no estable'}
        </li>
      )}
      {meta.inPlace !== undefined && (
        <li className={`chip ${meta.inPlace ? 'chip--yes' : 'chip--no'}`}>
          {meta.inPlace ? 'in-place' : 'usa memoria extra'}
        </li>
      )}
    </ul>
  );
}

export function AlgorithmHeader({ meta, extra }: { meta: AlgorithmMeta; extra?: ReactNode }) {
  return (
    <header className="algo-header">
      <div className="algo-header__text">
        <h1 className="algo-header__title">{meta.name}</h1>
        <p className="algo-header__summary">{meta.summary}</p>
        <ComplexityChips meta={meta} />
      </div>
      <div className="algo-header__actions">
        {extra}
        <a className="btn btn--ghost" href={href(['info', meta.id])}>
          <InfoIcon /> Ficha
        </a>
        <ShareButton />
      </div>
    </header>
  );
}

export interface VisualizerProps {
  meta: AlgorithmMeta;
  /** Pseudocódigo a mostrar (por defecto, el de los metadatos). */
  pseudocode?: readonly string[];
  player: Player;
  step: BaseStep | undefined;
  prevStep?: BaseStep;
  initialText: string;
  counters: readonly Counter[];
  stage: ReactNode;
  toolbar?: ReactNode;
  legend?: ReactNode;
  below?: ReactNode;
  aside?: ReactNode;
  headerExtra?: ReactNode;
  shortcuts?: boolean;
}

/**
 * Esqueleto común a todos los visualizadores: encabezado, escenario (lo que dibuja el
 * renderer), controles del reproductor y los paneles de pseudocódigo, explicación,
 * variables y contadores. Cada categoría sólo aporta el `stage` y sus controles de entrada.
 */
export function Visualizer(props: VisualizerProps) {
  const { meta, player, step } = props;
  usePlayerShortcuts(player, props.shortcuts ?? true);
  return (
    <div className="viz">
      <AlgorithmHeader meta={meta} extra={props.headerExtra} />
      {props.toolbar && <div className="viz__toolbar">{props.toolbar}</div>}
      <div className="viz__grid">
        <div className="viz__main">
          <div className="stage card">
            {props.stage}
            {props.legend && <div className="stage__legend">{props.legend}</div>}
          </div>
          <PlayerControls player={player} />
          <CountersPanel counters={props.counters} />
          {props.below}
        </div>
        <aside className="viz__side">
          <ExplanationPanel
            step={step}
            initialText={props.initialText}
            playing={player.playing}
            position={player.position}
            length={player.length}
          />
          <PseudocodePanel lines={props.pseudocode ?? meta.pseudocode} active={step?.line ?? 0} />
          <VariablesPanel vars={step?.vars ?? {}} prev={props.prevStep?.vars} />
          {props.aside}
        </aside>
      </div>
    </div>
  );
}

export function Legend({
  items,
}: {
  items: readonly { cls: string; label: string; mark?: string }[];
}) {
  return (
    <ul className="legend" aria-label="Referencias de color">
      {items.map((it) => (
        <li key={it.label}>
          <span className={`legend__swatch ${it.cls}`} aria-hidden="true">
            {it.mark}
          </span>
          {it.label}
        </li>
      ))}
    </ul>
  );
}
