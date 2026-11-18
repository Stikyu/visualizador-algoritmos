import { useEffect, useMemo, useState } from 'react';
import { generateArray, parseNumbers } from '../../algorithms/array/generate';
import { initialArrayState, reduceArray, type ArrayState } from '../../algorithms/array/state';
import { toItems, type ArrayStep } from '../../algorithms/array/steps';
import { record } from '../../algorithms/record';
import { randomSeed } from '../../algorithms/rng';
import { SORTING_ALGORITHMS } from '../../algorithms/sorting';
import { PlayerControls } from '../../player/PlayerControls';
import { Timeline } from '../../player/timeline';
import { usePlayer, usePlayerShortcuts } from '../../player/usePlayer';
import { BarsRenderer } from '../../renderers/BarsRenderer';
import { ArrayInput } from '../ArrayInput';
import { replaceQuery, type Route } from '../router';
import { Legend, ShareButton } from '../Visualizer';
import { ARRAY_LEGEND } from '../arrayHelpers';

const DEFAULT = ['burbuja', 'insercion', 'merge', 'quick'];

interface Lane {
  readonly id: string;
  readonly name: string;
  readonly timeline: Timeline<ArrayState, ArrayStep>;
}

/**
 * Modo carrera: un único reproductor maneja varias trazas a la vez. La posición global p se
 * traduce en min(p, largo) para cada carril, así que un algoritmo que terminó se queda quieto
 * mientras los demás siguen. El "tiempo" es la cantidad de pasos (operaciones elementales).
 */
export function RacePage({ route }: { route: Route }) {
  const [values, setValues] = useState<number[]>(
    () =>
      parseNumbers(route.query.get('datos') ?? '', 120) ??
      generateArray('aleatorio', 24, randomSeed()),
  );
  const [selected, setSelected] = useState<string[]>(() => {
    const fromUrl = (route.query.get('algos') ?? '')
      .split(',')
      .filter((id) => SORTING_ALGORITHMS.some((a) => a.meta.id === id));
    return fromUrl.length >= 2 ? fromUrl.slice(0, 4) : DEFAULT;
  });

  const lanes: Lane[] = useMemo(() => {
    const items = toItems(values);
    return selected.map((id) => {
      const algo = SORTING_ALGORITHMS.find((a) => a.meta.id === id)!;
      const { steps } = record(algo.run(items));
      return {
        id,
        name: algo.meta.name,
        timeline: new Timeline(initialArrayState(items), steps, reduceArray),
      };
    });
  }, [values, selected]);

  const maxLen = Math.max(0, ...lanes.map((l) => l.timeline.length));
  const player = usePlayer(maxLen, lanes);
  usePlayerShortcuts(player);

  useEffect(() => {
    replaceQuery({ datos: values.join(','), algos: selected.join(',') });
  }, [values, selected]);

  const ranking = [...lanes].sort((a, b) => a.timeline.length - b.timeline.length);
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id)
        ? s.length > 2
          ? s.filter((x) => x !== id)
          : s
        : s.length < 4
          ? [...s, id]
          : s,
    );

  return (
    <div className="viz race">
      <header className="algo-header">
        <div className="algo-header__text">
          <h1 className="algo-header__title">Modo carrera</h1>
          <p className="algo-header__summary">
            Elegí de 2 a 4 ordenamientos: todos reciben exactamente los mismos datos y avanzan al
            mismo ritmo, un paso (una operación) por tic. Probá con datos casi ordenados o
            invertidos y mirá cómo cambia el podio.
          </p>
        </div>
        <div className="algo-header__actions">
          <ShareButton />
        </div>
      </header>

      <div className="viz__toolbar">
        <div className="picker" role="group" aria-label="Algoritmos en la carrera">
          {SORTING_ALGORITHMS.map((a) => (
            <button
              key={a.meta.id}
              type="button"
              className={selected.includes(a.meta.id) ? 'picker__item is-active' : 'picker__item'}
              aria-pressed={selected.includes(a.meta.id)}
              onClick={() => toggle(a.meta.id)}
            >
              {a.meta.name}
            </button>
          ))}
        </div>
        <ArrayInput values={values} onChange={setValues} max={60} />
      </div>

      <PlayerControls player={player} />

      <div className="race__lanes">
        {lanes.map((lane) => {
          const len = lane.timeline.length;
          const pos = Math.min(player.position, len);
          const state = lane.timeline.stateAt(pos);
          const done = player.position >= len;
          const place = ranking.findIndex((r) => r.id === lane.id) + 1;
          return (
            <section
              key={lane.id}
              className={`card race__lane ${done ? 'is-done' : ''}`}
              aria-label={lane.name}
            >
              <header className="race__head">
                <h2>{lane.name}</h2>
                {done ? (
                  <span className={`race__badge race__badge--${place}`}>
                    {place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : `#${place}`}{' '}
                    {len} pasos
                  </span>
                ) : (
                  <span className="mono small muted">
                    {pos}/{len}
                  </span>
                )}
              </header>
              <div className="race__progress" aria-hidden="true">
                <span style={{ width: `${len ? (pos / len) * 100 : 100}%` }} />
              </div>
              <BarsRenderer
                state={state}
                height={170}
                duration={Math.min(0.15, 0.6 / player.speed)}
              />
              <dl className="race__stats mono">
                <div>
                  <dt>comparaciones</dt>
                  <dd>{state.counters.comparisons}</dd>
                </div>
                <div>
                  <dt>intercambios</dt>
                  <dd>{state.counters.swaps}</dd>
                </div>
                <div>
                  <dt>escrituras</dt>
                  <dd>{state.counters.writes}</dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>
      <div className="stage__legend">
        <Legend items={ARRAY_LEGEND} />
      </div>

      <section className="panel">
        <h2 className="panel__title">Resultado final (aunque no hayas terminado de reproducir)</h2>
        <div className="table-wrap">
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col">Puesto</th>
                <th scope="col">Algoritmo</th>
                <th scope="col">Pasos</th>
                <th scope="col">Comparaciones</th>
                <th scope="col">Intercambios</th>
                <th scope="col">Escrituras</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((l, i) => (
                <tr key={l.id}>
                  <td>{i + 1}</td>
                  <th scope="row">{l.name}</th>
                  <td className="mono">{l.timeline.length}</td>
                  <td className="mono">{l.timeline.final.counters.comparisons}</td>
                  <td className="mono">{l.timeline.final.counters.swaps}</td>
                  <td className="mono">{l.timeline.final.counters.writes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Los pasos incluyen comparaciones, intercambios, escrituras y pasos explicativos: sirven
          para comparar algoritmos entre sí, no son milisegundos reales.
        </p>
      </section>
    </div>
  );
}
