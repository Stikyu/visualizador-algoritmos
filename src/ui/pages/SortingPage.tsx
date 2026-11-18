import { useEffect, useMemo, useState } from 'react';
import { generateArray, parseNumbers } from '../../algorithms/array/generate';
import { initialArrayState, reduceArray, type ArrayState } from '../../algorithms/array/state';
import { toItems, type ArrayStep } from '../../algorithms/array/steps';
import { record } from '../../algorithms/record';
import { randomSeed } from '../../algorithms/rng';
import { SORTING_ALGORITHMS } from '../../algorithms/sorting';
import type { Options } from '../../algorithms/types';
import { Timeline } from '../../player/timeline';
import { usePlayer } from '../../player/usePlayer';
import { AuxArrays, BarsRenderer } from '../../renderers/BarsRenderer';
import { ArrayInput } from '../ArrayInput';
import { AlgoPicker } from '../AlgoPicker';
import { OptionsBar } from '../OptionsBar';
import { replaceQuery, type Route } from '../router';
import { Legend, Visualizer } from '../Visualizer';
import { ARRAY_LEGEND, arrayCounters, defaultOptions, stabilityLabels } from '../arrayHelpers';

export function SortingPage({ route }: { route: Route }) {
  const algo = SORTING_ALGORITHMS.find((a) => a.meta.id === route.path[1]) ?? SORTING_ALGORITHMS[0];

  const [values, setValues] = useState<number[]>(
    () =>
      parseNumbers(route.query.get('datos') ?? '', 120) ??
      generateArray('aleatorio', 16, randomSeed()),
  );
  const [optionState, setOptionState] = useState<Record<string, Record<string, string>>>(() => ({
    [algo.meta.id]: {
      ...defaultOptions(algo),
      ...Object.fromEntries(
        (algo.meta.options ?? []).flatMap((o) => {
          const v = route.query.get(o.key);
          return v && o.choices.some((c) => c.value === v) ? [[o.key, v]] : [];
        }),
      ),
    },
  }));
  // Memoizado: si se recreara en cada render, la traza (y el reproductor) se reiniciarían sin fin.
  const options: Options = useMemo(
    () => optionState[algo.meta.id] ?? defaultOptions(algo),
    [optionState, algo],
  );
  const [showIds, setShowIds] = useState(false);

  const timeline = useMemo(() => {
    const items = toItems(values);
    const { steps } = record(algo.run(items, options));
    return new Timeline<ArrayState, ArrayStep>(initialArrayState(items), steps, reduceArray);
  }, [algo, values, options]);

  const player = usePlayer(timeline.length, timeline);
  const state = timeline.stateAt(player.position);
  const step = timeline.stepAt(player.position);

  // La URL siempre refleja algoritmo + datos + opciones → se puede compartir.
  useEffect(() => {
    replaceQuery({ datos: values.join(','), ...options });
  }, [values, options]);

  const labels = useMemo(() => (showIds ? stabilityLabels(values) : undefined), [showIds, values]);

  return (
    <Visualizer
      meta={algo.meta}
      player={player}
      step={step}
      prevStep={timeline.stepAt(player.position - 1)}
      initialText={`Estado inicial: ${values.length} elementos. Apretá reproducir (o espacio) para empezar.`}
      counters={arrayCounters(state)}
      toolbar={
        <>
          <AlgoPicker
            category="ordenamiento"
            current={algo.meta.id}
            items={SORTING_ALGORITHMS.map((a) => a.meta)}
          />
          <ArrayInput values={values} onChange={setValues} />
          <div className="toolbar-row">
            <OptionsBar
              options={algo.meta.options ?? []}
              values={options}
              onChange={(next) => setOptionState((s) => ({ ...s, [algo.meta.id]: next }))}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={showIds}
                onChange={(e) => setShowIds(e.target.checked)}
              />
              Distinguir repetidos (ver estabilidad)
            </label>
          </div>
        </>
      }
      stage={
        <>
          <BarsRenderer
            state={state}
            duration={Math.min(0.2, 0.8 / player.speed)}
            idLabels={labels}
          />
          <AuxArrays state={state} />
        </>
      }
      legend={<Legend items={ARRAY_LEGEND} />}
    />
  );
}
