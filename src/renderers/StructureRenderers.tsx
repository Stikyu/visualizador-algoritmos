import { AnimatePresence, motion } from 'motion/react';
import type { ChainSnap, OpenSnap } from '../structures/hash';
import type { HeapSnap } from '../structures/heap';
import type { CircularSnap, QueueSnap, StackSnap } from '../structures/linear';
import type { ListSnap } from '../structures/linkedList';
import { balanceOf, type TreeSnap } from '../structures/tree';
import type { Mark, StructList, StructState, StructureView } from '../structures/types';
import { TreeRenderer, type DrawNode } from './TreeRenderer';
import { useElementSize } from './useElementSize';

type Marks = Readonly<Record<string, Mark>>;
const cls = (marks: Marks, key: string | number) =>
  marks[String(key)] ? `m-${marks[String(key)]}` : '';
const toClassMap = (marks: Marks) =>
  Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, `m-${v}`]));

/** Etiquetas de punteros que apuntan a un elemento (tope, frente, actual…). */
function pointerLabels(pointers: StructState<unknown>['pointers'], key: number) {
  return Object.entries(pointers)
    .filter(([, v]) => v === key)
    .map(([k]) => k);
}

const spring = { type: 'spring' as const, stiffness: 380, damping: 32 };

// ---------------------------------------------------------------------------

function StackView({ state }: { state: StructState<StackSnap> }) {
  const { snap, marks, pointers } = state;
  const slots = Array.from({ length: snap.capacity }, (_, i) => snap.items[i] ?? null);
  return (
    <div className="stack" aria-label={`Pila con ${snap.items.length} elementos`}>
      {slots
        .map((cell, i) => (
          <div key={cell ? cell.id : `e${i}`} className="stack__row">
            <span className="stack__idx mono">{i}</span>
            {cell ? (
              <motion.div
                layout
                transition={spring}
                className={`cell ${cls(marks, cell.id)}`}
                initial={{ opacity: 0, y: -24 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {cell.value}
              </motion.div>
            ) : (
              <div className="cell cell--empty" />
            )}
            <span className="ptr-label">
              {cell &&
                pointerLabels(pointers, cell.id)
                  .map((p) => `← ${p}`)
                  .join(' ')}
            </span>
          </div>
        ))
        .reverse()}
    </div>
  );
}

function QueueView({ state }: { state: StructState<QueueSnap> }) {
  const { snap, marks, pointers } = state;
  if (snap.items.length === 0) return <div className="struct-empty">Cola vacía</div>;
  return (
    <div className="hrow" aria-label={`Cola con ${snap.items.length} elementos`}>
      <AnimatePresence initial={false} mode="popLayout">
        {snap.items.map((c, i) => (
          <motion.div
            key={c.id}
            layout
            transition={spring}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="hrow__item"
          >
            <div className={`cell ${cls(marks, c.id)}`}>{c.value}</div>
            {i < snap.items.length - 1 && (
              <span className="arrow" aria-hidden="true">
                →
              </span>
            )}
            <span className="ptr-label ptr-label--below">
              {pointerLabels(pointers, c.id).join(' / ')}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function CircularView({ state }: { state: StructState<CircularSnap> }) {
  const { snap, marks, pointers } = state;
  const n = snap.slots.length;
  const R = 110;
  const size = 320;
  const c = size / 2;
  const front = pointers.frente;
  const rear = pointers.fin;
  return (
    <svg
      className="ring"
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height={size}
      role="img"
      aria-label="Cola circular"
    >
      <circle cx={c} cy={c} r={R} className="ring__track" />
      {snap.slots.map((cell, i) => {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = c + R * Math.cos(a);
        const y = c + R * Math.sin(a);
        const lx = c + (R + 44) * Math.cos(a);
        const ly = c + (R + 44) * Math.sin(a);
        const labels = [i === front ? 'frente' : '', i === rear ? 'fin' : '']
          .filter(Boolean)
          .join(' / ');
        return (
          <g key={i} className={`ring__slot ${cls(marks, `slot-${i}`)} ${cell ? 'is-full' : ''}`}>
            <rect x={x - 22} y={y - 18} width={44} height={36} rx={7} />
            <text x={x} y={y} dy="0.35em" textAnchor="middle" className="ring__val">
              {cell?.value ?? ''}
            </text>
            <text
              x={c + (R - 36) * Math.cos(a)}
              y={c + (R - 36) * Math.sin(a)}
              dy="0.35em"
              textAnchor="middle"
              className="ring__idx"
            >
              {i}
            </text>
            {labels && (
              <text x={lx} y={ly} dy="0.35em" textAnchor="middle" className="ring__ptr">
                {labels}
              </text>
            )}
          </g>
        );
      })}
      <text x={c} y={c - 6} textAnchor="middle" className="ring__center">
        {snap.size}/{n}
      </text>
      <text x={c} y={c + 14} textAnchor="middle" className="ring__center-sub">
        ocupados
      </text>
    </svg>
  );
}

function ListView({ state }: { state: StructState<ListSnap> }) {
  const { snap, marks, pointers } = state;
  const [box, size] = useElementSize<HTMLDivElement>();
  if (snap.nodes.length === 0)
    return <div className="struct-empty">Lista vacía (cabeza = nulo)</div>;
  const BW = 64;
  const BH = 38;
  const GAP = 46;
  const n = snap.nodes.length;
  const width = Math.max(size.width, n * (BW + GAP) + 40);
  const height = snap.doubly ? 200 : 180;
  const baseY = 90;
  const index = new Map(snap.nodes.map((nd, i) => [nd.id, i]));
  // Nodos alcanzables desde la cabeza o desde algún puntero: los demás se dibujan "sueltos".
  const reach = new Set<number>();
  const starts = [snap.head, ...Object.values(pointers)].filter((v): v is number => v !== null);
  for (const st of starts) {
    for (let id: number | null = st; id !== null && !reach.has(id);) {
      reach.add(id);
      id = snap.nodes.find((x) => x.id === id)?.next ?? null;
    }
  }
  const totalW = n * BW + (n - 1) * GAP;
  const x0 = Math.max(20, (width - totalW) / 2);
  const xOf = (i: number) => x0 + i * (BW + GAP);
  const yOf = (id: number) => (reach.has(id) ? baseY : baseY - 58);
  const t = { duration: 0.35 };

  return (
    <div ref={box} className="list-wrap">
      <svg width={width} height={height} className="llist" role="img" aria-label="Lista enlazada">
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" className="llist__head" />
          </marker>
        </defs>
        {snap.nodes.map((nd) => {
          const i = index.get(nd.id)!;
          const arrows = [];
          if (nd.next !== null && index.has(nd.next)) {
            const j = index.get(nd.next)!;
            const x1 = xOf(i) + BW - 10;
            const y1 = yOf(nd.id) + (snap.doubly ? BH / 2 - 7 : BH / 2);
            const x2 = j > i ? xOf(j) : xOf(j) + BW / 2;
            const y2 = j > i ? yOf(nd.next) + (snap.doubly ? BH / 2 - 7 : BH / 2) : yOf(nd.next);
            const d =
              j > i
                ? `M${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2 - 2} ${y2}`
                : `M${x1} ${y1} C ${x1 + 30} ${y1 - 60}, ${x2} ${y2 - 60}, ${x2} ${y2 - 2}`;
            arrows.push(
              <motion.path
                key={`n${nd.id}`}
                className="llist__arrow"
                markerEnd="url(#arrow)"
                initial={false}
                animate={{ d }}
                transition={t}
              />,
            );
          }
          if (snap.doubly && nd.prev !== null && index.has(nd.prev)) {
            const j = index.get(nd.prev)!;
            const x1 = xOf(i) + 4;
            const y1 = yOf(nd.id) + BH / 2 + 8;
            const x2 = xOf(j) + BW;
            const y2 = yOf(nd.prev) + BH / 2 + 8;
            const d = `M${x1} ${y1} C ${x1 - 20} ${y1 + 4}, ${x2 + 20} ${y2 + 4}, ${x2 + 2} ${y2}`;
            arrows.push(
              <motion.path
                key={`p${nd.id}`}
                className="llist__arrow llist__arrow--prev"
                markerEnd="url(#arrow)"
                initial={false}
                animate={{ d }}
                transition={t}
              />,
            );
          }
          return arrows;
        })}
        {snap.nodes.map((nd) => {
          const i = index.get(nd.id)!;
          const labels = [
            ...(snap.head === nd.id ? ['cabeza'] : []),
            ...(snap.tail === nd.id ? ['cola'] : []),
            ...pointerLabels(pointers, nd.id).filter((p) => p !== 'cabeza' && p !== 'cola'),
          ];
          return (
            <motion.g
              key={nd.id}
              className={`lnode ${cls(marks, nd.id)}`}
              initial={{ opacity: 0, x: xOf(i), y: yOf(nd.id) - 20 }}
              animate={{ opacity: 1, x: xOf(i), y: yOf(nd.id) }}
              transition={t}
            >
              <rect width={BW} height={BH} rx={6} />
              <line x1={BW - 18} x2={BW - 18} y1={0} y2={BH} className="lnode__sep" />
              <text
                x={(BW - 18) / 2}
                y={BH / 2}
                dy="0.35em"
                textAnchor="middle"
                className="lnode__val"
              >
                {nd.value}
              </text>
              <circle cx={BW - 9} cy={BH / 2} r={3} className="lnode__dot" />
              {nd.next === null && (
                <text x={BW + 6} y={BH / 2} dy="0.35em" className="lnode__null">
                  ∅
                </text>
              )}
              {labels.length > 0 && (
                <text x={BW / 2} y={-10} textAnchor="middle" className="lnode__ptr">
                  {labels.join(' · ')}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

function treeNodes(snap: TreeSnap, avl: boolean): Map<number, DrawNode> {
  const m = new Map<number, DrawNode>();
  for (const n of Object.values(snap.nodes)) {
    const bf = avl ? balanceOf(snap, n.id) : 0;
    m.set(n.id, {
      id: n.id,
      label: String(n.value),
      children: [n.left, n.right],
      badge: avl ? (bf > 0 ? `+${bf}` : String(bf)) : undefined,
      badgeAlert: Math.abs(bf) > 1,
    });
  }
  return m;
}

function HeapView({ state }: { state: StructState<HeapSnap> }) {
  const { snap, marks } = state;
  const nodes = new Map<number, DrawNode>();
  snap.items.forEach((c, i) =>
    nodes.set(c.id, {
      id: c.id,
      label: String(c.value),
      children: [snap.items[2 * i + 1]?.id ?? null, snap.items[2 * i + 2]?.id ?? null],
      sub: `[${i}]`,
    }),
  );
  return (
    <>
      <TreeRenderer
        nodes={nodes}
        root={snap.items[0]?.id ?? null}
        marks={toClassMap(marks)}
        empty="Heap vacío"
        ariaLabel="Heap como árbol"
      />
      <div className="heap-array" aria-label="Heap como arreglo">
        <span className="aux__name mono">arreglo</span>
        <div className="aux__cells">
          {snap.items.map((c, i) => (
            <motion.span
              key={c.id}
              layout
              transition={spring}
              className={`aux__cell mono ${cls(marks, c.id)}`}
              title={`A[${i}]`}
            >
              {c.value}
            </motion.span>
          ))}
        </div>
      </div>
    </>
  );
}

function ChainView({ state }: { state: StructState<ChainSnap> }) {
  const { snap, marks } = state;
  return (
    <div className="buckets">
      {snap.buckets.map((b, i) => (
        <div key={i} className="bucket">
          <span className={`bucket__idx mono ${cls(marks, `slot-${i}`)}`}>{i}</span>
          <div className="bucket__chain">
            <AnimatePresence initial={false} mode="popLayout">
              {b.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  transition={spring}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="hrow__item"
                >
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                  <div className={`cell cell--sm ${cls(marks, c.id)}`}>{c.value}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            {b.length === 0 && <span className="muted small">∅</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function OpenView({ state }: { state: StructState<OpenSnap> }) {
  const { snap, marks } = state;
  return (
    <div className="slots">
      {snap.slots.map((s, i) => (
        <div key={i} className="slot">
          <div
            className={`cell ${s.kind === 'tomb' ? 'cell--tomb' : s.kind === 'empty' ? 'cell--empty' : ''} ${cls(marks, `slot-${i}`)}`}
            title={s.kind === 'tomb' ? 'lápida' : undefined}
          >
            {s.kind === 'full' ? s.value : s.kind === 'tomb' ? '†' : ''}
          </div>
          <span className="slot__idx mono">{i}</span>
        </div>
      ))}
    </div>
  );
}

export function StructLists({ lists }: { lists: readonly StructList[] }) {
  if (lists.length === 0) return null;
  return (
    <div className="aux">
      {lists.map((l) => (
        <div key={l.label} className="aux__row">
          <span className="aux__name mono">{l.label}</span>
          <div className="aux__cells">
            {l.items.length === 0 && <span className="muted small">(vacía)</span>}
            {l.items.map((v, i) => (
              <span key={i} className="aux__cell mono aux__cell--wide">
                {v}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Despacha al renderer de cada estructura según su vista. */
export function StructureRenderer({
  view,
  state,
}: {
  view: StructureView;
  state: StructState<unknown>;
}) {
  switch (view) {
    case 'stack':
      return <StackView state={state as StructState<StackSnap>} />;
    case 'queue':
      return <QueueView state={state as StructState<QueueSnap>} />;
    case 'circular':
      return <CircularView state={state as StructState<CircularSnap>} />;
    case 'list':
      return <ListView state={state as StructState<ListSnap>} />;
    case 'bst':
    case 'avl': {
      const s = state as StructState<TreeSnap>;
      return (
        <TreeRenderer
          nodes={treeNodes(s.snap, view === 'avl')}
          root={s.snap.root}
          marks={toClassMap(s.marks)}
          ariaLabel="Árbol binario"
        />
      );
    }
    case 'heap':
      return <HeapView state={state as StructState<HeapSnap>} />;
    case 'hash-chain':
      return <ChainView state={state as StructState<ChainSnap>} />;
    case 'hash-open':
      return <OpenView state={state as StructState<OpenSnap>} />;
  }
}
