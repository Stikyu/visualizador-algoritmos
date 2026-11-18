import type { DPState, DPTableShape } from '../algorithms/dp/table';

const same = (a: readonly [number, number] | null, r: number, c: number) =>
  !!a && a[0] === r && a[1] === c;

/** Tabla de PD: celda actual, celdas de las que depende, la elegida y el camino reconstruido. */
export function DPTableRenderer({ state, shape }: { state: DPState; shape: DPTableShape }) {
  const inPath = new Set(state.path.map(([r, c]) => `${r},${c}`));
  return (
    <div className="dp-wrap">
      <table className="dp">
        <thead>
          <tr>
            <th className="dp__corner mono">{shape.corner ?? ''}</th>
            {shape.colHeaders.map((h, c) => (
              <th
                key={c}
                scope="col"
                className={`mono ${state.current?.[1] === c ? 'is-active' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shape.rowHeaders.map((h, r) => (
            <tr key={r}>
              <th scope="row" className={`mono ${state.current?.[0] === r ? 'is-active' : ''}`}>
                {h}
              </th>
              {shape.colHeaders.map((_, c) => {
                const v = state.values[r]?.[c] ?? null;
                const cls = [
                  'dp__cell mono',
                  v === null ? 'is-empty' : '',
                  inPath.has(`${r},${c}`) ? 'is-path' : '',
                  state.deps.some(([dr, dc]) => dr === r && dc === c) ? 'is-dep' : '',
                  same(state.chosen, r, c) ? 'is-chosen' : '',
                  same(state.current, r, c) ? 'is-current' : '',
                ].join(' ');
                return (
                  <td key={c} className={cls}>
                    {v ?? ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {state.solution && (
        <p className="dp__solution">
          <span className="muted small">Solución: </span>
          <b className="mono">{state.solution}</b>
        </p>
      )}
    </div>
  );
}
