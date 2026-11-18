import { useEffect, useMemo, useRef, useState } from 'react';
import { GRAPH_ALGORITHMS } from '../../algorithms/graph';
import {
  addEdge,
  addNode,
  decodeGraph,
  encodeGraph,
  moveNode,
  randomGraph,
  removeEdge,
  removeNode,
  sampleDag,
  sampleGraph,
  setWeight,
  type Graph,
} from '../../algorithms/graph/model';
import {
  initialGraphState,
  reduceGraph,
  type GraphState,
  type GraphStep,
} from '../../algorithms/graph/steps';
import { record } from '../../algorithms/record';
import { randomSeed } from '../../algorithms/rng';
import { Timeline } from '../../player/timeline';
import { usePlayer } from '../../player/usePlayer';
import { GraphRenderer, UnionFindPanel } from '../../renderers/GraphRenderer';
import { StructLists } from '../../renderers/StructureRenderers';
import { AlgoPicker } from '../AlgoPicker';
import { replaceQuery, type Route } from '../router';
import { Legend, Visualizer } from '../Visualizer';

type Mode = 'mover' | 'nodo' | 'arista' | 'peso' | 'borrar' | 'origen';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'mover', label: 'Mover', hint: 'Arrastrá los nodos.' },
  { id: 'nodo', label: '+ Nodo', hint: 'Hacé clic en un lugar vacío para agregar un nodo.' },
  { id: 'arista', label: '+ Arista', hint: 'Hacé clic en un nodo y después en otro para unirlos.' },
  { id: 'peso', label: 'Peso', hint: 'Hacé clic en una arista para cambiar su peso.' },
  { id: 'borrar', label: 'Borrar', hint: 'Hacé clic en un nodo o una arista para borrarlo.' },
  { id: 'origen', label: 'Origen', hint: 'Hacé clic en el nodo desde donde arranca el algoritmo.' },
];

const LEGEND = [
  { cls: 'sw--compare', label: 'en la frontera / cola', mark: '◌' },
  { cls: 'sw--swap', label: 'actual', mark: '●' },
  { cls: 'sw--visited', label: 'visitado (en la pila)' },
  { cls: 'sw--sorted', label: 'terminado / en el árbol' },
  { cls: 'sw--pivot', label: 'ciclo', mark: '!' },
];

/** Clave de la topología (sin coordenadas): mover nodos no recalcula la traza. */
const topologyKey = (g: Graph) =>
  `${g.directed}|${g.nodes.map((n) => n.id).join(',')}|${g.edges.map((e) => `${e.from}-${e.to}-${e.weight}`).join(',')}`;

function dedupe(g: Graph): Graph {
  // Al pasar a no dirigido, u→v y v→u serían la misma arista: se deja la primera.
  const seen = new Set<string>();
  return {
    ...g,
    edges: g.edges.filter((e) => {
      const k = [Math.min(e.from, e.to), Math.max(e.from, e.to)].join('-');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }),
  };
}

export function GraphPage({ route }: { route: Route }) {
  const algo = GRAPH_ALGORITHMS.find((a) => a.meta.id === route.path[1]) ?? GRAPH_ALGORITHMS[0];
  const [graph, setGraph] = useState<Graph>(
    () =>
      decodeGraph(route.query.get('g') ?? '') ??
      (algo.prefers === 'dag' ? sampleDag() : sampleGraph(false)),
  );
  const [start, setStart] = useState<number | null>(() => {
    const label = route.query.get('origen');
    return graph.nodes.find((n) => n.label === label)?.id ?? graph.nodes[0]?.id ?? null;
  });
  const [mode, setMode] = useState<Mode>('mover');
  const [pending, setPending] = useState<number | null>(null);
  const [newWeight, setNewWeight] = useState(1);
  const dragging = useRef<number | null>(null);

  const startId =
    start !== null && graph.nodes.some((n) => n.id === start)
      ? start
      : (graph.nodes[0]?.id ?? null);
  const topo = topologyKey(graph);

  const timeline = useMemo(() => {
    if (graph.nodes.length === 0 || startId === null) {
      return new Timeline<GraphState, GraphStep>(initialGraphState(), [], reduceGraph);
    }
    const { steps } = record(algo.run(graph, startId));
    return new Timeline<GraphState, GraphStep>(initialGraphState(), steps, reduceGraph);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depende de la topología, no de las coordenadas
  }, [algo, topo, startId]);

  const player = usePlayer(timeline.length, timeline);
  const state = timeline.stateAt(player.position);
  const step = timeline.stepAt(player.position);

  useEffect(() => {
    const label = graph.nodes.find((n) => n.id === startId)?.label;
    replaceQuery({ g: encodeGraph(graph), origen: algo.needsStart ? label : undefined });
  }, [graph, startId, algo.needsStart]);

  const onNodeDown = (id: number) => {
    switch (mode) {
      case 'mover':
        dragging.current = id;
        break;
      case 'arista':
        if (pending === null) setPending(id);
        else {
          setGraph((g) => addEdge(g, pending, id, newWeight));
          setPending(null);
        }
        break;
      case 'borrar':
        setGraph((g) => removeNode(g, id));
        break;
      case 'origen':
        setStart(id);
        break;
      default:
        break;
    }
  };

  const onEdge = (id: number) => {
    if (mode === 'borrar') setGraph((g) => removeEdge(g, id));
    if (mode === 'peso') {
      const current = graph.edges.find((e) => e.id === id)?.weight ?? 1;
      const answer = window.prompt('Nuevo peso de la arista (entero):', String(current));
      const w = answer === null ? NaN : Math.trunc(Number(answer));
      if (Number.isFinite(w) && Math.abs(w) <= 999) setGraph((g) => setWeight(g, id, w));
    }
  };

  const hint = MODES.find((m) => m.id === mode)!.hint;
  const loadSample = (g: Graph) => {
    setGraph(g);
    setStart(g.nodes[0]?.id ?? null);
    setPending(null);
  };

  return (
    <Visualizer
      meta={algo.meta}
      player={player}
      step={step}
      prevStep={timeline.stepAt(player.position - 1)}
      initialText={
        graph.nodes.length === 0
          ? 'El grafo está vacío: agregá nodos con "+ Nodo" o generá uno al azar.'
          : `Grafo ${graph.directed ? 'dirigido' : 'no dirigido'} con ${graph.nodes.length} nodos y ${graph.edges.length} aristas. ${algo.needsStart ? 'El origen es el nodo con el anillo.' : ''}`
      }
      counters={[
        { label: 'nodos visitados', value: state.counters.visited },
        { label: 'aristas examinadas', value: state.counters.edges },
        {
          label: 'relajaciones',
          value: state.counters.relaxations,
          hint: 'Veces que mejoró una distancia',
        },
        { label: 'V / E', value: `${graph.nodes.length} / ${graph.edges.length}` },
      ]}
      toolbar={
        <>
          <AlgoPicker
            category="grafos"
            current={algo.meta.id}
            items={GRAPH_ALGORITHMS.map((a) => a.meta)}
          />
          <div className="toolbar-row">
            <div className="segmented" role="group" aria-label="Modo de edición">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={mode === m.id ? 'is-active' : ''}
                  aria-pressed={mode === m.id}
                  onClick={() => {
                    setMode(m.id);
                    setPending(null);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {mode === 'arista' && (
              <label className="field field--inline">
                <span>Peso</span>
                <input
                  className="mono narrow"
                  type="number"
                  value={newWeight}
                  onChange={(e) => setNewWeight(Math.trunc(Number(e.target.value)) || 0)}
                />
              </label>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={graph.directed}
                onChange={(e) =>
                  setGraph((g) =>
                    e.target.checked ? { ...g, directed: true } : dedupe({ ...g, directed: false }),
                  )
                }
              />
              Dirigido
            </label>
          </div>
          <div className="toolbar-row">
            <button
              type="button"
              className="btn"
              onClick={() =>
                loadSample(
                  randomGraph(7 + Math.floor(Math.random() * 5), randomSeed(), {
                    directed: graph.directed,
                    dag: algo.prefers === 'dag',
                  }),
                )
              }
            >
              Grafo aleatorio
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => loadSample(sampleGraph(graph.directed))}
            >
              Ejemplo con pesos
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => loadSample(sampleDag())}
            >
              DAG de ejemplo
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => loadSample({ directed: graph.directed, nodes: [], edges: [] })}
            >
              Vaciar
            </button>
            <span className="muted small" role="status">
              {hint}
            </span>
          </div>
        </>
      }
      stage={
        <>
          <GraphRenderer
            graph={graph}
            state={player.position > 0 ? state : null}
            start={algo.needsStart ? startId : null}
            pending={pending}
            cursor={mode === 'nodo' ? 'crosshair' : mode === 'mover' ? 'grab' : 'pointer'}
            onBackground={(x, y) => {
              if (mode === 'nodo' && graph.nodes.length < 40)
                setGraph((g) => addNode(g, Math.round(x), Math.round(y)));
              setPending(null);
            }}
            onNodeDown={onNodeDown}
            onPointerMove={(x, y) => {
              if (dragging.current !== null) {
                const id = dragging.current;
                setGraph((g) => moveNode(g, id, Math.round(x), Math.round(y)));
              }
            }}
            onPointerUp={() => (dragging.current = null)}
            onEdge={onEdge}
          />
          <StructLists lists={player.position > 0 ? state.lists : []} />
        </>
      }
      legend={<Legend items={LEGEND} />}
      aside={
        state.uf && player.position > 0 ? <UnionFindPanel graph={graph} uf={state.uf} /> : undefined
      }
    />
  );
}
