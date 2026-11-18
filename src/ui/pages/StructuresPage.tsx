import { useId, useMemo, useState } from 'react';
import { record } from '../../algorithms/record';
import type { Counter } from '../../explain/panels';
import { Timeline } from '../../player/timeline';
import { usePlayer } from '../../player/usePlayer';
import { StructLists, StructureRenderer } from '../../renderers/StructureRenderers';
import { STRUCTURES } from '../../structures';
import type { ChainSnap, OpenSnap } from '../../structures/hash';
import type { HeapSnap } from '../../structures/heap';
import type { CircularSnap, QueueSnap, StackSnap } from '../../structures/linear';
import type { ListSnap } from '../../structures/linkedList';
import { treeHeight, type TreeSnap } from '../../structures/tree';
import {
  initialStructState,
  reduceStruct,
  type OpDef,
  type StructState,
  type StructStep,
  type StructureView,
} from '../../structures/types';
import { AlgoPicker } from '../AlgoPicker';
import type { Route } from '../router';
import { Legend, Visualizer } from '../Visualizer';

const LEGEND = [
  { cls: 'sw--compare', label: 'comparando / actual' },
  { cls: 'sw--write', label: 'nuevo' },
  { cls: 'sw--swap', label: 'se quita / colisión' },
  { cls: 'sw--pivot', label: 'rotación' },
  { cls: 'sw--found', label: 'encontrado' },
  { cls: 'sw--visited', label: 'visitado' },
];

function structureCounters(view: StructureView, snap: unknown): Counter[] {
  switch (view) {
    case 'stack': {
      const s = snap as StackSnap;
      return [
        { label: 'elementos', value: s.items.length },
        { label: 'capacidad', value: s.capacity },
      ];
    }
    case 'queue':
      return [{ label: 'elementos', value: (snap as QueueSnap).items.length }];
    case 'circular': {
      const s = snap as CircularSnap;
      return [
        { label: 'ocupados', value: `${s.size}/${s.slots.length}` },
        { label: 'frente', value: s.front },
      ];
    }
    case 'list':
      return [{ label: 'nodos', value: (snap as ListSnap).nodes.length }];
    case 'bst':
    case 'avl': {
      const s = snap as TreeSnap;
      const n = Object.keys(s.nodes).length;
      return [
        { label: 'nodos', value: n },
        { label: 'altura', value: treeHeight(s) },
        {
          label: 'altura mínima posible',
          value: n === 0 ? 0 : Math.floor(Math.log2(n)) + 1,
          hint: '⌊log₂ n⌋ + 1',
        },
      ];
    }
    case 'heap': {
      const n = (snap as HeapSnap).items.length;
      return [
        { label: 'elementos', value: n },
        { label: 'altura', value: n === 0 ? 0 : Math.floor(Math.log2(n)) + 1 },
      ];
    }
    case 'hash-chain': {
      const s = snap as ChainSnap;
      const n = s.buckets.reduce((a, b) => a + b.length, 0);
      return [
        { label: 'claves', value: n },
        { label: 'cubetas (m)', value: s.buckets.length },
        { label: 'factor de carga α', value: (n / s.buckets.length).toFixed(2) },
        { label: 'lista más larga', value: Math.max(0, ...s.buckets.map((b) => b.length)) },
      ];
    }
    case 'hash-open': {
      const s = snap as OpenSnap;
      const n = s.slots.filter((x) => x.kind === 'full').length;
      return [
        { label: 'claves', value: n },
        { label: 'posiciones (m)', value: s.slots.length },
        { label: 'factor de carga α', value: (n / s.slots.length).toFixed(2) },
        { label: 'lápidas', value: s.slots.filter((x) => x.kind === 'tomb').length },
      ];
    }
  }
}

interface Run {
  readonly op: OpDef<unknown> | null;
  readonly timeline: Timeline<StructState<unknown>, StructStep<unknown>>;
}

const idle = (snap: unknown): Run => ({
  op: null,
  timeline: new Timeline<StructState<unknown>, StructStep<unknown>>(
    initialStructState(snap),
    [],
    reduceStruct,
  ),
});

export function StructuresPage({ route }: { route: Route }) {
  const def = STRUCTURES.find((s) => s.meta.id === route.path[1]) ?? STRUCTURES[0];
  return <StructureLab key={def.meta.id} def={def} />;
}

function StructureLab({ def }: { def: (typeof STRUCTURES)[number] }) {
  const [base, setBase] = useState<unknown>(() => def.initial());
  const [run, setRun] = useState<Run>(() => idle(base));
  const [value, setValue] = useState(() => 10 + Math.floor(Math.random() * 80));
  const [index, setIndex] = useState(1);
  const valueId = useId();
  const indexId = useId();
  const needsIndex = def.ops.some((o) => o.input === 'value+index');

  const player = usePlayer(run.timeline.length, run.timeline, true);
  const state = run.timeline.stateAt(player.position);
  const step = run.timeline.stepAt(player.position);

  const apply = (op: OpDef<unknown>) => {
    const { steps, result } = record(op.run(base, value, index));
    setRun({ op, timeline: new Timeline(initialStructState(base), steps, reduceStruct) });
    setBase(result);
    if (op.input !== 'none') setValue(10 + Math.floor(Math.random() * 80));
  };
  const resetTo = (snap: unknown) => {
    setBase(snap);
    setRun(idle(snap));
  };

  const counters = useMemo(() => structureCounters(def.view, state.snap), [def.view, state.snap]);

  return (
    <Visualizer
      meta={def.meta}
      pseudocode={run.op?.pseudocode ?? def.meta.pseudocode}
      player={player}
      step={step}
      prevStep={run.timeline.stepAt(player.position - 1)}
      initialText={
        run.op
          ? `Operación: ${run.op.label}.`
          : 'Elegí un valor y una operación. Cada operación genera su propia traza paso a paso.'
      }
      counters={[...counters, { label: 'pasos de la operación', value: run.timeline.length }]}
      toolbar={
        <>
          <AlgoPicker
            category="estructuras"
            current={def.meta.id}
            items={STRUCTURES.map((s) => s.meta)}
          />
          <form
            className="toolbar-row ops"
            onSubmit={(e) => {
              e.preventDefault();
              const first = def.ops.find((o) => o.input !== 'none');
              if (first) apply(first);
            }}
          >
            <label className="field field--inline" htmlFor={valueId}>
              <span>Valor</span>
              <input
                id={valueId}
                className="mono narrow"
                type="number"
                value={value}
                onChange={(e) => setValue(Math.trunc(Number(e.target.value)) || 0)}
              />
            </label>
            {needsIndex && (
              <label className="field field--inline" htmlFor={indexId}>
                <span>Posición</span>
                <input
                  id={indexId}
                  className="mono narrow"
                  type="number"
                  value={index}
                  onChange={(e) => setIndex(Math.trunc(Number(e.target.value)) || 0)}
                />
              </label>
            )}
            <div className="ops__buttons" role="group" aria-label="Operaciones">
              {def.ops.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  className={op.input === 'none' ? 'btn' : 'btn btn--primary'}
                  onClick={() => apply(op)}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <div className="ops__buttons">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => resetTo(def.initial())}
              >
                Ejemplo
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => resetTo(def.empty())}>
                Vaciar
              </button>
            </div>
          </form>
        </>
      }
      stage={
        <>
          <StructureRenderer view={def.view} state={state} />
          <StructLists lists={state.lists} />
        </>
      }
      legend={<Legend items={LEGEND} />}
    />
  );
}
