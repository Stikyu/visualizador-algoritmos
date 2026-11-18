import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EMPTY,
  MUD,
  WALL,
  decodeGrid,
  emptyGrid,
  encodeGrid,
  generateMaze,
  randomObstacles,
  type Grid,
} from '../../algorithms/grid/model';
import {
  GRID_ALGORITHMS,
  initialGridState,
  reduceGrid,
  type GridState,
  type GridStep,
} from '../../algorithms/grid/search';
import { record } from '../../algorithms/record';
import { randomSeed } from '../../algorithms/rng';
import { Timeline } from '../../player/timeline';
import { usePlayer } from '../../player/usePlayer';
import { GridCanvas } from '../../renderers/GridCanvas';
import { AlgoPicker } from '../AlgoPicker';
import { replaceQuery, type Route } from '../router';
import { Legend, Visualizer } from '../Visualizer';

type Tool = 'pared' | 'barro' | 'borrar' | 'inicio' | 'fin';
const TOOLS: { id: Tool; label: string }[] = [
  { id: 'pared', label: 'Pared' },
  { id: 'barro', label: 'Barro (costo 5)' },
  { id: 'borrar', label: 'Borrar' },
  { id: 'inicio', label: 'Mover inicio' },
  { id: 'fin', label: 'Mover fin' },
];

const LEGEND = [
  { cls: 'sw--frontier', label: 'frontera' },
  { cls: 'sw--visited', label: 'explorada' },
  { cls: 'sw--path', label: 'camino' },
  { cls: 'sw--wall', label: 'pared' },
  { cls: 'sw--mud', label: 'barro (costo 5)' },
];

export function GridPage({ route }: { route: Route }) {
  const algo = GRID_ALGORITHMS.find((a) => a.meta.id === route.path[1]) ?? GRID_ALGORITHMS[2];
  const [grid, setGrid] = useState<Grid>(
    () => decodeGrid(route.query.get('m') ?? '') ?? generateMaze(21, 41, randomSeed()),
  );
  const [tool, setTool] = useState<Tool>('pared');
  const [compare, setCompare] = useState(false);
  const paintValue = useRef<number | null>(null);

  const { timeline, result: final } = useMemo(() => {
    const { steps, result } = record(algo.run(grid));
    return {
      timeline: new Timeline<GridState, GridStep>(initialGridState(grid), steps, reduceGrid, 48),
      result,
    };
  }, [algo, grid]);
  const player = usePlayer(timeline.length, timeline);
  const state = timeline.stateAt(player.position);
  const step = timeline.stepAt(player.position);

  // Al editar se generan muchas grillas seguidas: la URL se actualiza con un pequeño retardo.
  useEffect(() => {
    const t = window.setTimeout(() => replaceQuery({ m: encodeGrid(grid) }), 300);
    return () => window.clearTimeout(t);
  }, [grid]);

  const comparison = useMemo(
    () =>
      compare
        ? GRID_ALGORITHMS.map((a) => {
            const { steps, result } = record(a.run(grid));
            const final = steps.reduce(reduceGrid, initialGridState(grid));
            return { algo: a, result, final };
          })
        : [],
    [compare, grid],
  );

  const paint = (i: number, phase: 'down' | 'move') => {
    if (tool === 'inicio' || tool === 'fin') {
      if (grid.cells[i] === WALL || i === (tool === 'inicio' ? grid.end : grid.start)) return;
      setGrid((g) => ({ ...g, [tool === 'inicio' ? 'start' : 'end']: i }));
      return;
    }
    if (i === grid.start || i === grid.end) return;
    const target = tool === 'pared' ? WALL : tool === 'barro' ? MUD : EMPTY;
    // Al arrastrar, se pinta con el valor elegido en el primer clic (clic sobre pared = borrar).
    if (phase === 'down')
      paintValue.current = grid.cells[i] === target && tool !== 'borrar' ? EMPTY : target;
    const value = paintValue.current ?? target;
    if (grid.cells[i] === value) return;
    setGrid((g) => {
      const cells = g.cells.slice();
      cells[i] = value;
      return { ...g, cells };
    });
  };

  return (
    <Visualizer
      meta={algo.meta}
      player={player}
      step={step}
      prevStep={timeline.stepAt(player.position - 1)}
      initialText="Dibujá paredes y barro arrastrando sobre la grilla, o generá un laberinto. Después reproducí la búsqueda."
      counters={[
        { label: 'celdas exploradas', value: state.explored },
        { label: 'en la frontera', value: state.frontier },
        { label: 'largo del camino', value: final.path.length ? final.path.length - 1 : '—' },
        { label: 'costo del camino', value: Number.isFinite(final.cost) ? final.cost : '—' },
      ]}
      toolbar={
        <>
          <AlgoPicker
            category="grilla"
            current={algo.meta.id}
            items={GRID_ALGORITHMS.map((a) => a.meta)}
          />
          <div className="toolbar-row">
            <div className="segmented" role="group" aria-label="Herramienta de dibujo">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={tool === t.id ? 'is-active' : ''}
                  aria-pressed={tool === t.id}
                  onClick={() => setTool(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setGrid(generateMaze(21, 41, randomSeed()))}
            >
              Generar laberinto
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setGrid(randomObstacles(emptyGrid(21, 41), randomSeed()))}
            >
              Obstáculos al azar
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setGrid(emptyGrid(21, 41))}
            >
              Vaciar
            </button>
            <label className="check">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
              />
              Comparar BFS, Dijkstra y A*
            </label>
          </div>
        </>
      }
      stage={
        <GridCanvas
          grid={grid}
          state={state}
          onPaint={paint}
          onPaintEnd={() => (paintValue.current = null)}
          label={`Grilla de ${grid.rows} por ${grid.cols}. Celdas exploradas: ${state.explored}.`}
        />
      }
      legend={<Legend items={LEGEND} />}
      below={
        compare ? (
          <section className="panel" aria-labelledby="cmp-title">
            <h2 id="cmp-title" className="panel__title">
              Comparación sobre la misma grilla
            </h2>
            <div className="grid-compare">
              {comparison.map(({ algo: a, result, final: f }) => (
                <figure key={a.meta.id} className="grid-compare__item">
                  <GridCanvas
                    grid={grid}
                    state={f}
                    maxCell={10}
                    label={`Resultado de ${a.meta.name}`}
                  />
                  <figcaption>
                    <b>{a.meta.name}</b>
                    <span className="mono small">
                      {result.explored} exploradas ·{' '}
                      {result.path.length
                        ? `${result.path.length - 1} pasos · costo ${result.cost}`
                        : 'sin camino'}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="muted small">
              BFS minimiza la cantidad de pasos (ignora el barro). Dijkstra y A* minimizan el costo;
              A* llega al mismo costo explorando menos gracias a la heurística.
            </p>
          </section>
        ) : undefined
      }
    />
  );
}
