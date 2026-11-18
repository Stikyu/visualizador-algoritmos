import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { MUD, WALL, type Grid } from '../algorithms/grid/model';
import { FRONTIER, PATH, VISITED, type GridState } from '../algorithms/grid/search';
import { useElementSize } from './useElementSize';

export interface GridCanvasProps {
  grid: Grid;
  state: GridState | null;
  /** Pintar/arrastrar: se llama con el índice de la celda bajo el puntero. */
  onPaint?: (index: number, phase: 'down' | 'move') => void;
  onPaintEnd?: () => void;
  maxCell?: number;
  label: string;
}

/**
 * Renderer de la grilla con Canvas 2D: con cientos de celdas cambiando en cada paso,
 * redibujar un canvas es mucho más barato que reconciliar cientos de nodos SVG.
 * Los colores salen de las variables CSS del tema activo.
 */
export function GridCanvas({
  grid,
  state,
  onPaint,
  onPaintEnd,
  maxCell = 28,
  label,
}: GridCanvasProps) {
  const [box, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cell = Math.max(4, Math.min(maxCell, Math.floor(size.width / grid.cols)));
  const width = cell * grid.cols;
  const height = cell * grid.rows;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim() || '#888';
    const colors = {
      empty: v('--surface'),
      line: v('--line'),
      wall: v('--ink'),
      mud: '#8a6a3a',
      frontier: v('--c-compare'),
      visited: v('--c-sky'),
      path: v('--c-yellow'),
      current: v('--c-swap'),
      start: v('--c-sorted'),
      end: v('--c-swap'),
    };
    ctx.fillStyle = colors.empty;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < grid.cells.length; i++) {
      const r = Math.floor(i / grid.cols);
      const c = i % grid.cols;
      const x = c * cell;
      const y = r * cell;
      const type = grid.cells[i];
      const mark = state?.marks[i] ?? 0;
      if (type === WALL) {
        ctx.fillStyle = colors.wall;
        ctx.fillRect(x, y, cell, cell);
        continue;
      }
      if (type === MUD) {
        ctx.fillStyle = colors.mud;
        ctx.globalAlpha = mark ? 0.55 : 0.85;
        ctx.fillRect(x, y, cell, cell);
        ctx.globalAlpha = 1;
      }
      if (mark === VISITED || mark === FRONTIER || mark === PATH) {
        ctx.fillStyle =
          mark === VISITED ? colors.visited : mark === FRONTIER ? colors.frontier : colors.path;
        ctx.globalAlpha = type === MUD ? 0.6 : mark === VISITED ? 0.75 : 1;
        const inset = mark === FRONTIER ? Math.max(1, cell * 0.18) : 0;
        ctx.fillRect(x + inset, y + inset, cell - 2 * inset, cell - 2 * inset);
        ctx.globalAlpha = 1;
      }
      if (cell >= 8) {
        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.25, y + 0.25, cell - 0.5, cell - 0.5);
      }
    }
    const drawDot = (i: number, color: string, text: string) => {
      const x = (i % grid.cols) * cell + cell / 2;
      const y = Math.floor(i / grid.cols) * cell + cell / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.42, 0, Math.PI * 2);
      ctx.fill();
      if (cell >= 14) {
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${Math.round(cell * 0.5)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + 1);
      }
    };
    if (state?.current !== null && state?.current !== undefined) {
      const i = state.current;
      ctx.strokeStyle = colors.current;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        (i % grid.cols) * cell + 1,
        Math.floor(i / grid.cols) * cell + 1,
        cell - 2,
        cell - 2,
      );
    }
    drawDot(grid.start, colors.start, 'I');
    drawDot(grid.end, colors.end, 'F');
  });

  const indexAt = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * grid.cols);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * grid.rows);
    if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) return null;
    return r * grid.cols + c;
  };

  return (
    <div ref={box} className="grid-wrap">
      <canvas
        ref={canvasRef}
        className="grid-canvas"
        style={{ width, height, touchAction: onPaint ? 'none' : undefined }}
        role="img"
        aria-label={label}
        onPointerDown={(e) => {
          if (!onPaint) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const i = indexAt(e);
          if (i !== null) onPaint(i, 'down');
        }}
        onPointerMove={(e) => {
          if (!onPaint || e.buttons !== 1) return;
          const i = indexAt(e);
          if (i !== null) onPaint(i, 'move');
        }}
        onPointerUp={() => onPaintEnd?.()}
      />
    </div>
  );
}
