import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useElementSize } from './useElementSize';

/** Nodo genérico para dibujar: sirve para ABB, AVL, heap y árboles de recursión. */
export interface DrawNode {
  readonly id: number | string;
  readonly label: string;
  /** Hijos en orden. En árboles binarios, `null` marca un hijo vacío (importa la posición). */
  readonly children: readonly (number | string | null)[];
  readonly badge?: string;
  readonly badgeAlert?: boolean;
  readonly sub?: string;
}

export interface TreeRendererProps {
  readonly nodes: ReadonlyMap<number | string, DrawNode>;
  readonly root: number | string | null;
  /** id → clase de rol (m-current, m-found…). */
  readonly marks?: Readonly<Record<string, string>>;
  readonly layout?: 'inorder' | 'tidy';
  readonly radius?: number;
  readonly levelHeight?: number;
  readonly minHeight?: number;
  readonly empty?: ReactNode;
  readonly ariaLabel: string;
}

interface Pos {
  x: number; // en "columnas"
  depth: number;
}

/**
 * Layout inorden: la columna de cada nodo es su posición en el recorrido inorden.
 * En un ABB eso deja a cada nodo entre su subárbol izquierdo y el derecho, y al rotar
 * (que no cambia el inorden) los nodos sólo se mueven verticalmente… y un poco en x.
 */
function layoutInorder(nodes: TreeRendererProps['nodes'], root: TreeRendererProps['root']) {
  const pos = new Map<number | string, Pos>();
  let col = 0;
  const go = (id: number | string | null, depth: number) => {
    if (id === null) return;
    const n = nodes.get(id);
    if (!n) return;
    go(n.children[0] ?? null, depth + 1);
    pos.set(id, { x: col++, depth });
    go(n.children[1] ?? null, depth + 1);
  };
  go(root, 0);
  return { pos, cols: col };
}

/** Layout "tidy" simple: hojas en columnas consecutivas, cada padre centrado sobre sus hijos. */
function layoutTidy(nodes: TreeRendererProps['nodes'], root: TreeRendererProps['root']) {
  const pos = new Map<number | string, Pos>();
  let next = 0;
  const go = (id: number | string, depth: number): number => {
    const n = nodes.get(id);
    const kids = (n?.children ?? []).filter(
      (c): c is number | string => c !== null && nodes.has(c),
    );
    if (kids.length === 0) {
      pos.set(id, { x: next++, depth });
    } else {
      const xs = kids.map((k) => go(k, depth + 1));
      pos.set(id, { x: (xs[0] + xs[xs.length - 1]) / 2, depth });
    }
    return pos.get(id)!.x;
  };
  if (root !== null && nodes.has(root)) go(root, 0);
  return { pos, cols: next };
}

export function TreeRenderer({
  nodes,
  root,
  marks = {},
  layout = 'inorder',
  radius = 18,
  levelHeight = 64,
  minHeight = 220,
  empty,
  ariaLabel,
}: TreeRendererProps) {
  const [box, size] = useElementSize<HTMLDivElement>();
  const { pos, cols } = layout === 'inorder' ? layoutInorder(nodes, root) : layoutTidy(nodes, root);
  let maxDepth = 0;
  for (const p of pos.values()) maxDepth = Math.max(maxDepth, p.depth);
  const colW = Math.max(radius * 2 + 6, 46);
  const width = Math.max(size.width, cols * colW + 20);
  const height = Math.max(minHeight, (maxDepth + 1) * levelHeight + 40);
  // Separación entre columnas: la que entra, pero sin pasar de ~2.5 diámetros (árboles chicos
  // quedan compactos y centrados en lugar de estirarse a todo el ancho).
  const step = Math.min(radius * 5, (width - 2 * radius - 20) / Math.max(1, cols - 1));
  const x0 = (width - step * Math.max(0, cols - 1)) / 2;
  const px = (p: Pos) => x0 + p.x * step;
  const py = (p: Pos) => radius + 22 + p.depth * levelHeight;

  const edges: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const [id, p] of pos) {
    for (const c of nodes.get(id)?.children ?? []) {
      const cp = c === null ? undefined : pos.get(c);
      if (cp) edges.push({ key: `${String(c)}`, x1: px(p), y1: py(p), x2: px(cp), y2: py(cp) });
    }
  }
  const t = { duration: 0.35, ease: 'easeInOut' as const };

  return (
    <div ref={box} className="tree-wrap">
      {pos.size === 0 ? (
        <div className="struct-empty">{empty ?? 'Árbol vacío'}</div>
      ) : (
        <svg width={width} height={height} className="tree" role="img" aria-label={ariaLabel}>
          <g className="tree__edges">
            <AnimatePresence initial={false}>
              {edges.map((e) => (
                <motion.line
                  key={e.key}
                  initial={{ opacity: 0, x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 }}
                  animate={{ opacity: 1, x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 }}
                  exit={{ opacity: 0 }}
                  transition={t}
                />
              ))}
            </AnimatePresence>
          </g>
          <AnimatePresence initial={false}>
            {[...pos].map(([id, p]) => {
              const n = nodes.get(id)!;
              const cls = marks[String(id)] ?? '';
              return (
                <motion.g
                  key={String(id)}
                  className={`tnode ${cls}`}
                  initial={{ opacity: 0, x: px(p), y: py(p) - 16 }}
                  animate={{ opacity: 1, x: px(p), y: py(p) }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={t}
                >
                  <circle r={radius} />
                  <text className="tnode__label" dy="0.35em" textAnchor="middle">
                    {n.label}
                  </text>
                  {n.badge !== undefined && (
                    <text
                      className={`tnode__badge ${n.badgeAlert ? 'is-alert' : ''}`}
                      x={radius + 2}
                      y={-radius + 2}
                    >
                      {n.badge}
                    </text>
                  )}
                  {n.sub !== undefined && (
                    <text className="tnode__sub" y={radius + 13} textAnchor="middle">
                      {n.sub}
                    </text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>
      )}
    </div>
  );
}
