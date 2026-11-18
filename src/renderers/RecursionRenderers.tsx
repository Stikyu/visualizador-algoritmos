import { motion } from 'motion/react';
import type { FibState } from '../algorithms/recursion/fibonacci';
import { PEG_NAMES, type HanoiState } from '../algorithms/recursion/hanoi';
import { attackerOf, type QueensState } from '../algorithms/recursion/queens';
import { TreeRenderer, type DrawNode } from './TreeRenderer';

export function FibView({ state }: { state: FibState }) {
  const nodes = new Map<number, DrawNode>();
  const marks: Record<string, string> = {};
  for (const n of Object.values(state.nodes)) {
    nodes.set(n.id, {
      id: n.id,
      label: String(n.n),
      children: n.children,
      sub: n.value !== null ? `= ${n.value}` : undefined,
    });
    marks[n.id] =
      n.id === state.current && n.status !== 'done'
        ? 'm-current'
        : n.status === 'memo'
          ? 'm-rotate'
          : n.status === 'done'
            ? 'm-found'
            : state.stack.includes(n.id)
              ? 'm-visited'
              : '';
  }
  const count = nodes.size;
  return (
    <>
      <TreeRenderer
        nodes={nodes}
        root={state.root}
        marks={marks}
        layout="tidy"
        radius={count > 60 ? 12 : 16}
        levelHeight={count > 60 ? 46 : 58}
        empty="Todavía no hubo llamadas"
        ariaLabel={`Árbol de llamadas con ${count} llamadas`}
      />
      <div className="aux">
        <div className="aux__row">
          <span className="aux__name mono">memo</span>
          <div className="aux__cells">
            {state.memo.map((v, i) => (
              <span
                key={i}
                className={`aux__cell mono ${v !== null ? 'm-found' : ''}`}
                title={`memo[${i}]`}
              >
                {v ?? ''}
              </span>
            ))}
          </div>
        </div>
        <div className="aux__row">
          <span className="aux__name mono">pila</span>
          <div className="aux__cells">
            {state.stack.length === 0 && <span className="muted small">(vacía)</span>}
            {state.stack.map((id) => (
              <span key={id} className="aux__cell aux__cell--wide mono">
                fib({state.nodes[id]?.n})
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function HanoiView({ state }: { state: HanoiState }) {
  const n = state.pegs.reduce((a, p) => a + p.length, 0);
  const maxW = 100;
  return (
    <div className="hanoi" aria-label="Torres de Hanoi">
      {state.pegs.map((peg, p) => (
        <div key={p} className={`hanoi__peg ${state.last?.to === p ? 'is-target' : ''}`}>
          <div className="hanoi__rod" aria-hidden="true" />
          <div className="hanoi__stack">
            {[...peg].reverse().map((disk) => (
              <motion.div
                key={disk}
                layoutId={`disk-${disk}`}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`hanoi__disk ${state.last?.disk === disk ? 'is-moving' : ''}`}
                style={{
                  width: `${30 + (disk / Math.max(1, n)) * (maxW - 30)}%`,
                  ['--hue' as string]: String((disk * 47) % 360),
                }}
              >
                {disk}
              </motion.div>
            ))}
          </div>
          <span className="hanoi__name">{PEG_NAMES[p]}</span>
        </div>
      ))}
    </div>
  );
}

export function QueensView({ state }: { state: QueensState }) {
  const { n, queens, trying, attacker } = state;
  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const hasQueen = queens[r] === c;
      const isTry = trying?.[0] === r && trying?.[1] === c;
      const isAttacker = attacker?.[0] === r && attacker?.[1] === c;
      // Casillas atacadas por las reinas ya puestas (sólo filas siguientes).
      const attacked =
        !hasQueen &&
        queens[r] === -1 &&
        attackerOf(
          queens.map((q, i) => (i < r ? q : -1)),
          r,
          c,
        ) !== null;
      cells.push(
        <div
          key={`${r}-${c}`}
          className={[
            'board__cell',
            (r + c) % 2 ? 'is-dark' : '',
            attacked ? 'is-attacked' : '',
            isTry ? (attacker ? 'is-conflict' : 'is-try') : '',
            isAttacker ? 'is-attacker' : '',
          ].join(' ')}
          aria-label={`fila ${r}, columna ${c}${hasQueen ? ', reina' : ''}`}
        >
          {hasQueen ? '♛' : isTry ? '?' : ''}
        </div>,
      );
    }
  }
  return (
    <div
      className="board"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
      role="grid"
      aria-label={`Tablero de ${n} por ${n}`}
    >
      {cells}
    </div>
  );
}
