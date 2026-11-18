import { useEffect, useMemo, useState } from 'react';
import { DP_PROBLEMS } from '../../algorithms/dp/problems';
import { initialDPState, reduceDP, type DPState, type DPStep } from '../../algorithms/dp/table';
import type { FibState } from '../../algorithms/recursion/fibonacci';
import type { HanoiState } from '../../algorithms/recursion/hanoi';
import { RECURSION_PROBLEMS } from '../../algorithms/recursion';
import type { QueensState } from '../../algorithms/recursion/queens';
import { defaultInput } from '../../algorithms/recursion/types';
import { record } from '../../algorithms/record';
import type { BaseStep } from '../../algorithms/types';
import type { Counter } from '../../explain/panels';
import { Timeline } from '../../player/timeline';
import { usePlayer } from '../../player/usePlayer';
import { DPTableRenderer } from '../../renderers/DPTableRenderer';
import { FibView, HanoiView, QueensView } from '../../renderers/RecursionRenderers';
import { AlgoPicker } from '../AlgoPicker';
import { ProblemFields } from '../ProblemFields';
import { replaceQuery, type Route } from '../router';
import { Legend, Visualizer } from '../Visualizer';

// ---------------------------------------------------------------------------
// Recursión
// ---------------------------------------------------------------------------

function recursionView(id: string, state: unknown) {
  switch (id) {
    case 'fibonacci':
      return <FibView state={state as FibState} />;
    case 'hanoi':
      return <HanoiView state={state as HanoiState} />;
    default:
      return <QueensView state={state as QueensState} />;
  }
}

function recursionCounters(id: string, state: unknown): Counter[] {
  switch (id) {
    case 'fibonacci': {
      const s = state as FibState;
      return [
        { label: 'llamadas', value: s.calls },
        { label: 'resueltas con memo', value: s.memoHits },
        { label: 'profundidad de la pila', value: s.stack.length },
      ];
    }
    case 'hanoi': {
      const s = state as HanoiState;
      const n = s.pegs.reduce((a, p) => a + p.length, 0);
      return [
        { label: 'movimientos', value: s.moves },
        { label: 'mínimo (2ⁿ − 1)', value: 2 ** n - 1 },
        { label: 'profundidad de la pila', value: s.stack.length },
      ];
    }
    default: {
      const s = state as QueensState;
      return [
        { label: 'casillas probadas', value: s.attempts },
        { label: 'retrocesos', value: s.backtracks },
        { label: 'soluciones', value: s.solutions },
      ];
    }
  }
}

const RECURSION_LEGEND: Record<string, { cls: string; label: string; mark?: string }[]> = {
  fibonacci: [
    { cls: 'sw--compare', label: 'llamada actual' },
    { cls: 'sw--visited', label: 'en la pila' },
    { cls: 'sw--sorted', label: 'retornó' },
    { cls: 'sw--pivot', label: 'resuelta con memo' },
  ],
  hanoi: [{ cls: 'sw--compare', label: 'disco que se mueve' }],
  'n-reinas': [
    { cls: 'sw--compare', label: 'casilla probada', mark: '?' },
    { cls: 'sw--swap', label: 'conflicto' },
    { cls: 'sw--out', label: 'atacada' },
  ],
};

export function RecursionPage({ route }: { route: Route }) {
  const problem =
    RECURSION_PROBLEMS.find((p) => p.meta.id === route.path[1]) ?? RECURSION_PROBLEMS[0];
  return <RecursionLab key={problem.meta.id} problem={problem} query={route.query} />;
}

function RecursionLab({
  problem,
  query,
}: {
  problem: (typeof RECURSION_PROBLEMS)[number];
  query: URLSearchParams;
}) {
  const [input, setInput] = useState(() => defaultInput(problem.fields, query));
  const timeline = useMemo(() => {
    const { steps } = record(problem.run(input));
    return new Timeline<unknown, BaseStep>(problem.initial(input), steps, problem.reduce, 24);
  }, [problem, input]);
  const player = usePlayer(timeline.length, timeline);
  const state = timeline.stateAt(player.position);
  const step = timeline.stepAt(player.position);
  useEffect(() => replaceQuery(input), [input]);

  return (
    <Visualizer
      meta={problem.meta}
      player={player}
      step={step}
      prevStep={timeline.stepAt(player.position - 1)}
      initialText="Reproducí para ver cada llamada recursiva paso a paso."
      counters={recursionCounters(problem.meta.id, state)}
      toolbar={
        <>
          <AlgoPicker
            category="recursion"
            current={problem.meta.id}
            items={RECURSION_PROBLEMS.map((p) => p.meta)}
          />
          <ProblemFields fields={problem.fields} value={input} onChange={setInput} />
        </>
      }
      stage={recursionView(problem.meta.id, state)}
      legend={<Legend items={RECURSION_LEGEND[problem.meta.id] ?? []} />}
    />
  );
}

// ---------------------------------------------------------------------------
// Programación dinámica
// ---------------------------------------------------------------------------

const DP_LEGEND = [
  { cls: 'sw--compare', label: 'celda actual' },
  { cls: 'sw--write', label: 'depende de…' },
  { cls: 'sw--sorted', label: 'opción elegida' },
  { cls: 'sw--path', label: 'reconstrucción' },
];

export function DPPage({ route }: { route: Route }) {
  const problem = DP_PROBLEMS.find((p) => p.meta.id === route.path[1]) ?? DP_PROBLEMS[0];
  return <DPLab key={problem.meta.id} problem={problem} query={route.query} />;
}

function DPLab({
  problem,
  query,
}: {
  problem: (typeof DP_PROBLEMS)[number];
  query: URLSearchParams;
}) {
  const [input, setInput] = useState(() => defaultInput(problem.fields, query));
  const shape = useMemo(() => problem.shape(input), [problem, input]);
  const timeline = useMemo(() => {
    const { steps } = record(problem.run(input));
    return new Timeline<DPState, DPStep>(
      initialDPState(shape.rowHeaders.length, shape.colHeaders.length),
      steps,
      reduceDP,
    );
  }, [problem, input, shape]);
  const player = usePlayer(timeline.length, timeline);
  const state = timeline.stateAt(player.position);
  const step = timeline.stepAt(player.position);
  useEffect(() => replaceQuery(input), [input]);
  const total = shape.rowHeaders.length * shape.colHeaders.length;

  return (
    <Visualizer
      meta={problem.meta}
      player={player}
      step={step}
      prevStep={timeline.stepAt(player.position - 1)}
      initialText="La tabla se llena celda por celda: cada una usa sólo valores que ya están calculados."
      counters={[
        { label: 'celdas llenas', value: `${state.filled}/${total}` },
        {
          label: 'tamaño de la tabla',
          value: `${shape.rowHeaders.length} × ${shape.colHeaders.length}`,
        },
        { label: 'celdas del camino', value: state.path.length },
      ]}
      toolbar={
        <>
          <AlgoPicker
            category="pd"
            current={problem.meta.id}
            items={DP_PROBLEMS.map((p) => p.meta)}
          />
          <ProblemFields fields={problem.fields} value={input} onChange={setInput} />
        </>
      }
      stage={<DPTableRenderer state={state} shape={shape} />}
      legend={<Legend items={DP_LEGEND} />}
    />
  );
}
