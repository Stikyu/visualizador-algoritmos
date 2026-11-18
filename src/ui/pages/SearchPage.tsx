import { useEffect, useId, useMemo, useState } from 'react';
import { generateArray, parseNumbers } from '../../algorithms/array/generate';
import { initialArrayState, reduceArray, type ArrayState } from '../../algorithms/array/state';
import { toItems, type ArrayStep } from '../../algorithms/array/steps';
import { record } from '../../algorithms/record';
import { randomSeed } from '../../algorithms/rng';
import { SEARCH_ALGORITHMS } from '../../algorithms/search';
import { Timeline } from '../../player/timeline';
import { usePlayer } from '../../player/usePlayer';
import { BarsRenderer } from '../../renderers/BarsRenderer';
import { AlgoPicker } from '../AlgoPicker';
import { ArrayInput } from '../ArrayInput';
import { replaceQuery, type Route } from '../router';
import { Legend, Visualizer } from '../Visualizer';

const LEGEND = [
  { cls: 'sw--compare', label: 'mirando', mark: '●' },
  { cls: 'sw--found', label: 'encontrado', mark: '★' },
  { cls: 'sw--out', label: 'descartado' },
];

export function SearchPage({ route }: { route: Route }) {
  const algo = SEARCH_ALGORITHMS.find((a) => a.meta.id === route.path[1]) ?? SEARCH_ALGORITHMS[0];
  const [raw, setRaw] = useState<number[]>(
    () =>
      parseNumbers(route.query.get('datos') ?? '', 120) ??
      generateArray('ordenado', 24, randomSeed()),
  );
  // Binaria e interpolación necesitan la entrada ordenada: se ordena una copia.
  const values = useMemo(
    () => (algo.requiresSorted ? raw.slice().sort((a, b) => a - b) : raw),
    [raw, algo.requiresSorted],
  );
  const [target, setTarget] = useState<number>(() => {
    const t = Number(route.query.get('objetivo'));
    return Number.isInteger(t) && route.query.has('objetivo')
      ? t
      : (raw[Math.floor(raw.length * 0.7)] ?? 0);
  });
  const targetId = useId();

  const timeline = useMemo(() => {
    const items = toItems(values);
    const { steps } = record(algo.run(items, target));
    return new Timeline<ArrayState, ArrayStep>(initialArrayState(items), steps, reduceArray);
  }, [algo, values, target]);

  const player = usePlayer(timeline.length, timeline);
  const state = timeline.stateAt(player.position);
  const step = timeline.stepAt(player.position);

  useEffect(() => {
    replaceQuery({ datos: raw.join(','), objetivo: String(target) });
  }, [raw, target]);

  const pickPresent = () => setTarget(values[Math.floor(Math.random() * values.length)] ?? 0);
  const pickAbsent = () => {
    const set = new Set(values);
    let t: number;
    do t = Math.floor(Math.random() * 110) - 5;
    while (set.has(t));
    setTarget(t);
  };

  return (
    <Visualizer
      meta={algo.meta}
      player={player}
      step={step}
      prevStep={timeline.stepAt(player.position - 1)}
      initialText={`Buscamos ${target} en ${values.length} elementos${algo.requiresSorted ? ' ordenados' : ''}.`}
      counters={[
        { label: 'comparaciones', value: state.counters.comparisons },
        { label: 'accesos', value: state.counters.accesses },
        {
          label: 'rango restante',
          value: state.range ? Math.max(0, state.range.hi - state.range.lo + 1) : values.length,
        },
        { label: 'tamaño', value: values.length },
      ]}
      toolbar={
        <>
          <AlgoPicker
            category="busqueda"
            current={algo.meta.id}
            items={SEARCH_ALGORITHMS.map((a) => a.meta)}
          />
          <ArrayInput values={raw} onChange={setRaw} max={100} sortedOnly={algo.requiresSorted} />
          <div className="toolbar-row">
            <label className="field field--inline" htmlFor={targetId}>
              <span>Objetivo</span>
              <input
                id={targetId}
                className="mono narrow"
                type="number"
                value={target}
                onChange={(e) => setTarget(Math.trunc(Number(e.target.value)) || 0)}
              />
            </label>
            <button type="button" className="btn" onClick={pickPresent}>
              Uno que está
            </button>
            <button type="button" className="btn" onClick={pickAbsent}>
              Uno que no está
            </button>
          </div>
        </>
      }
      stage={
        <BarsRenderer
          state={state}
          targetValue={target}
          duration={Math.min(0.2, 0.8 / player.speed)}
        />
      }
      legend={<Legend items={LEGEND} />}
    />
  );
}
