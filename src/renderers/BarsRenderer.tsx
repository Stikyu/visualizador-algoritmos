import { motion } from 'motion/react';
import type { ArrayState } from '../algorithms/array/state';
import type { Item } from '../algorithms/array/steps';
import { useElementSize } from './useElementSize';

export interface BarsRendererProps {
  state: ArrayState;
  /** Duración de las transiciones (s). Se acorta a velocidades altas. */
  duration?: number;
  /** Etiqueta extra por id (por ejemplo, letras para visualizar estabilidad). */
  idLabels?: ReadonlyMap<number, string>;
  /** Línea horizontal de referencia (objetivo de búsqueda). */
  targetValue?: number | null;
  /** Click sobre una barra (modo práctica). */
  onBarClick?: (index: number) => void;
  selected?: readonly number[];
  height?: number;
}

type BarRole = 'default' | 'compare' | 'swap' | 'write' | 'pivot' | 'sorted' | 'found' | 'out';

function roleOf(state: ArrayState, i: number): BarRole {
  if (state.found !== null && state.found === i) return 'found';
  if (state.swapping.includes(i)) return 'swap';
  if (state.written.includes(i)) return 'write';
  if (state.comparing.includes(i)) return 'compare';
  if (state.pivot === i) return 'pivot';
  if (state.sorted[i]) return 'sorted';
  if (state.range && (i < state.range.lo || i > state.range.hi)) return 'out';
  return 'default';
}

const MARKER: Partial<Record<BarRole, string>> = {
  compare: '●',
  swap: '⇄',
  write: '✎',
  pivot: '▲',
  found: '★',
};

export function BarsRenderer({
  state,
  duration = 0.18,
  idLabels,
  targetValue = null,
  onBarClick,
  selected = [],
  height = 300,
}: BarsRendererProps) {
  const [box, size] = useElementSize<HTMLDivElement>();
  const items: readonly Item[] = state.items;
  const n = items.length;
  const width = Math.max(120, size.width);
  // Ancho de columna en píxeles reales: así el texto no se deforma.
  const W = Math.min(64, width / Math.max(n, 1));
  const offsetX = (width - W * n) / 2; // centrado cuando hay pocas barras
  const GAP = Math.min(6, Math.max(1, W * 0.18));
  const values = items.map((it) => it.value);
  const maxV = Math.max(1, ...values, targetValue ?? 0);
  const minV = Math.min(0, ...values, targetValue ?? 0);
  const top = 28; // espacio para valores y marcadores
  const bottom = 34; // índices y rango
  const plotH = height - top - bottom;
  const scale = plotH / (maxV - minV || 1);
  const zeroY = top + maxV * scale;
  const showValues = W >= 18;
  const showIndex = W >= 14;
  const fontSize = W >= 30 ? 12 : 10;

  const y = (v: number) => (v >= 0 ? zeroY - v * scale : zeroY);
  const h = (v: number) => Math.max(2, Math.abs(v) * scale);
  const empty = state.range && state.range.lo > state.range.hi;

  return (
    <div ref={box} className="bars-wrap">
      <svg
        className="bars"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Arreglo de ${n} elementos: ${values.join(', ')}`}
      >
        {minV < 0 && <line x1={0} x2={width} y1={zeroY} y2={zeroY} className="bars__zero" />}
        {targetValue !== null && (
          <g className="bars__target">
            <line x1={0} x2={width} y1={y(targetValue)} y2={y(targetValue)} />
            <text x={4} y={y(targetValue) - 4} fontSize={10}>
              objetivo = {targetValue}
            </text>
          </g>
        )}
        {items.map((it, i) => {
          const role = empty ? 'out' : roleOf(state, i);
          const x = offsetX + i * W + GAP / 2;
          const isSel = selected.includes(i);
          const marker = MARKER[role];
          return (
            <g
              key={i}
              className={`bar bar--${role} ${isSel ? 'is-selected' : ''} ${onBarClick ? 'is-clickable' : ''}`}
              onClick={onBarClick ? () => onBarClick(i) : undefined}
            >
              <motion.rect
                x={x}
                width={W - GAP}
                rx={3}
                initial={false}
                animate={{ y: y(it.value), height: h(it.value) }}
                transition={{ duration, ease: 'easeOut' }}
              />
              {showValues && (
                <text
                  x={x + (W - GAP) / 2}
                  y={
                    (it.value >= 0 ? y(it.value) : zeroY + h(it.value)) + (it.value >= 0 ? -5 : 12)
                  }
                  textAnchor="middle"
                  fontSize={fontSize}
                  className="bar__value"
                >
                  {it.value}
                  {idLabels?.get(it.id) && <tspan className="bar__id">{idLabels.get(it.id)}</tspan>}
                </text>
              )}
              {marker && W >= 10 && (
                <text
                  x={x + (W - GAP) / 2}
                  y={12}
                  textAnchor="middle"
                  fontSize={11}
                  className="bar__marker"
                >
                  {marker}
                </text>
              )}
              {showIndex && (
                <text
                  x={x + (W - GAP) / 2}
                  y={height - bottom + 14}
                  textAnchor="middle"
                  fontSize={9}
                  className="bar__index"
                >
                  {i}
                </text>
              )}
            </g>
          );
        })}
        {state.range && !empty && (
          <g className="bars__range">
            <path
              d={`M${offsetX + state.range.lo * W + 2} ${height - 12} v6 H${offsetX + (state.range.hi + 1) * W - 2} v-6`}
            />
            {state.mid !== null && state.mid >= 0 && (
              <text
                x={offsetX + state.mid * W + W / 2}
                y={height - 1}
                textAnchor="middle"
                fontSize={9}
              >
                medio
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

/** Arreglos auxiliares (temp del merge, conteos, salida…) como filas de celdas. */
export function AuxArrays({ state }: { state: ArrayState }) {
  const entries = Object.entries(state.aux);
  if (entries.length === 0) return null;
  return (
    <div className="aux" aria-label="Arreglos auxiliares">
      {entries.map(([name, values]) => (
        <div key={name} className="aux__row">
          <span className="aux__name mono">{name}</span>
          <div className="aux__cells">
            {values.map((v, i) => (
              <span
                key={i}
                className={
                  state.auxWritten?.name === name && state.auxWritten.index === i
                    ? 'aux__cell is-written mono'
                    : 'aux__cell mono'
                }
                title={`${name}[${i}]`}
              >
                {v === null ? '' : v}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
