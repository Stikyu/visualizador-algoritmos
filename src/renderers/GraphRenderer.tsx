import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { CANVAS_H, CANVAS_W, type GEdge, type Graph } from '../algorithms/graph/model';
import type { GraphState } from '../algorithms/graph/steps';

const R = 22;

export interface GraphRendererProps {
  graph: Graph;
  state: GraphState | null;
  start: number | null;
  /** Nodo elegido como origen de una arista en construcción. */
  pending?: number | null;
  cursor?: string;
  onBackground?: (x: number, y: number) => void;
  onNodeDown?: (id: number, x: number, y: number) => void;
  onPointerMove?: (x: number, y: number) => void;
  onPointerUp?: () => void;
  onEdge?: (id: number) => void;
}

/** Geometría de una arista: recta, o curva si existe la arista opuesta (u→v y v→u). */
function edgeGeometry(g: Graph, e: GEdge) {
  const a = g.nodes.find((n) => n.id === e.from)!;
  const b = g.nodes.find((n) => n.id === e.to)!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const curved = g.directed && g.edges.some((o) => o.from === e.to && o.to === e.from);
  const bend = curved ? 28 : 0;
  // Punto de control perpendicular a la arista.
  const mx = (a.x + b.x) / 2 - uy * bend;
  const my = (a.y + b.y) / 2 + ux * bend;
  const start = { x: a.x + ux * R, y: a.y + uy * R };
  const endGap = g.directed ? R + 6 : R;
  const end = { x: b.x - ux * endGap, y: b.y - uy * endGap };
  const d = curved
    ? `M${start.x} ${start.y} Q ${mx} ${my} ${end.x} ${end.y}`
    : `M${start.x} ${start.y} L ${end.x} ${end.y}`;
  const label = curved
    ? { x: (a.x + b.x) / 2 - uy * bend * 0.6, y: (a.y + b.y) / 2 + ux * bend * 0.6 }
    : { x: mx - uy * 12, y: my + ux * 12 };
  return { d, label };
}

const NODE_MARK: Record<string, string> = {
  current: '●',
  frontier: '◌',
  cycle: '!',
};

export function GraphRenderer(props: GraphRendererProps) {
  const { graph: g, state, start, pending } = props;
  const svgRef = useRef<SVGSVGElement>(null);

  /** Convierte coordenadas de pantalla a coordenadas lógicas del lienzo. */
  const toLocal = (e: ReactPointerEvent) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return {
      x: Math.max(R, Math.min(CANVAS_W - R, p.x)),
      y: Math.max(R, Math.min(CANVAS_H - R, p.y)),
    };
  };

  return (
    <svg
      ref={svgRef}
      className="graph"
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      role="img"
      aria-label={`Grafo ${g.directed ? 'dirigido' : 'no dirigido'} con ${g.nodes.length} nodos y ${g.edges.length} aristas`}
      style={{ cursor: props.cursor }}
      onPointerDown={(e) => {
        if (e.target === svgRef.current || (e.target as Element).classList.contains('graph__bg')) {
          const p = toLocal(e);
          props.onBackground?.(p.x, p.y);
        }
      }}
      onPointerMove={(e) => {
        if (props.onPointerMove) {
          const p = toLocal(e);
          props.onPointerMove(p.x, p.y);
        }
      }}
      onPointerUp={() => props.onPointerUp?.()}
      onPointerLeave={() => props.onPointerUp?.()}
    >
      <defs>
        {['default', 'considered', 'tree', 'rejected', 'cycle'].map((k) => (
          <marker
            key={k}
            id={`gh-${k}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" className={`gh gh--${k}`} />
          </marker>
        ))}
      </defs>
      <rect className="graph__bg" x={0} y={0} width={CANVAS_W} height={CANVAS_H} />
      {g.edges.map((e) => {
        const st = state?.edges[e.id] ?? 'default';
        const { d, label } = edgeGeometry(g, e);
        return (
          <g key={e.id} className={`gedge e-${st}`} onPointerDown={() => props.onEdge?.(e.id)}>
            <path d={d} className="gedge__hit" />
            <path
              d={d}
              className="gedge__line"
              markerEnd={g.directed ? `url(#gh-${st})` : undefined}
            />
            <text x={label.x} y={label.y} dy="0.35em" textAnchor="middle" className="gedge__w">
              {e.weight}
            </text>
          </g>
        );
      })}
      {g.nodes.map((n) => {
        const st = state?.nodes[n.id] ?? 'default';
        const lab = state?.labels[n.id];
        return (
          <g
            key={n.id}
            className={`gnode n-${st} ${n.id === start ? 'is-start' : ''} ${n.id === pending ? 'is-pending' : ''}`}
            transform={`translate(${n.x} ${n.y})`}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget.ownerSVGElement as SVGSVGElement | null)?.setPointerCapture?.(
                e.pointerId,
              );
              const p = toLocal(e);
              props.onNodeDown?.(n.id, p.x, p.y);
            }}
          >
            {n.id === start && <circle r={R + 6} className="gnode__start" />}
            <circle r={R} className="gnode__circle" />
            <text dy="0.35em" textAnchor="middle" className="gnode__label">
              {n.label}
            </text>
            {NODE_MARK[st] && (
              <text x={R - 2} y={-R + 4} className="gnode__mark" textAnchor="middle">
                {NODE_MARK[st]}
              </text>
            )}
            {lab !== undefined && (
              <g transform={`translate(0 ${-R - 16})`} className="gnode__dist">
                <rect
                  x={-Math.max(16, lab.length * 4.5 + 6)}
                  y={-10}
                  width={Math.max(32, lab.length * 9 + 12)}
                  height={20}
                  rx={10}
                />
                <text dy="0.35em" textAnchor="middle">
                  {lab}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Panel del union-find de Kruskal: parent[v] de cada nodo y los conjuntos. */
export function UnionFindPanel({
  graph,
  uf,
}: {
  graph: Graph;
  uf: Readonly<Record<number, number>>;
}) {
  const label = (id: number) => graph.nodes.find((n) => n.id === id)?.label ?? '?';
  return (
    <section className="panel" aria-labelledby="uf-title">
      <h2 id="uf-title" className="panel__title">
        Union-find (parent)
      </h2>
      <div className="uf">
        {graph.nodes.map((n) => {
          const p = uf[n.id];
          const root = p === n.id;
          return (
            <div
              key={n.id}
              className={`uf__cell ${root ? 'is-root' : ''}`}
              title={root ? 'representante' : undefined}
            >
              <span className="uf__node mono">{n.label}</span>
              <span className="uf__parent mono">{p === undefined ? '—' : label(p)}</span>
            </div>
          );
        })}
      </div>
      <p className="muted small">
        Una celda resaltada es la raíz (representante) de su conjunto: parent[v] = v.
      </p>
    </section>
  );
}
