import { CATEGORIES, byCategory, findMeta, opCostsOf } from '../../algorithms/registry';
import { href } from '../router';
import { ComplexityChips } from '../Visualizer';
import { NotFound } from './NotFound';

/** Ficha de un algoritmo: complejidad, cuándo conviene usarlo y comparación con su familia. */
export function InfoPage({ id }: { id: string }) {
  const meta = findMeta(id);
  if (!meta) return <NotFound />;
  const cat = CATEGORIES.find((c) => c.id === meta.category);
  const siblings = byCategory(meta.category);
  const hasStable = siblings.some((m) => m.stable !== undefined);
  const hasInPlace = siblings.some((m) => m.inPlace !== undefined);
  const opCosts = opCostsOf(meta.id);

  return (
    <article className="info">
      <p className="crumbs">
        <a href="#/">Inicio</a> / <a href={href([meta.category])}>{cat?.label ?? meta.category}</a>{' '}
        / <span aria-current="page">{meta.name}</span>
      </p>
      <header className="info__head">
        <h1>{meta.name}</h1>
        <p className="algo-header__summary">{meta.summary}</p>
        <ComplexityChips meta={meta} />
        <a className="btn btn--primary" href={href([meta.category, meta.id])}>
          Ver la animación
        </a>
      </header>

      <div className="info__cols">
        <section className="panel">
          <h2 className="panel__title">Conviene cuando…</h2>
          <ul className="ticks">
            {meta.whenToUse.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2 className="panel__title">Mejor evitarlo cuando…</h2>
          <ul className="ticks ticks--no">
            {meta.avoidWhen.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      </div>

      {opCosts && (
        <section className="panel">
          <h2 className="panel__title">Costo de cada operación</h2>
          <table className="cmp">
            <tbody>
              {opCosts.map((o) => (
                <tr key={o.op}>
                  <th scope="row">{o.op}</th>
                  <td className="mono">{o.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="panel">
        <h2 className="panel__title">Pseudocódigo</h2>
        <ol className="pseudo pseudo--static">
          {meta.pseudocode.map((l, i) => (
            <li key={i} className="pseudo__line">
              <span className="pseudo__num" aria-hidden="true">
                {i + 1}
              </span>
              <code>{l}</code>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h2 className="panel__title">Comparación con otros de {cat?.label.toLowerCase()}</h2>
        <div className="table-wrap">
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col">Algoritmo</th>
                <th scope="col">Mejor</th>
                <th scope="col">Promedio</th>
                <th scope="col">Peor</th>
                <th scope="col">Espacio</th>
                {hasStable && <th scope="col">Estable</th>}
                {hasInPlace && <th scope="col">In-place</th>}
              </tr>
            </thead>
            <tbody>
              {siblings.map((m) => (
                <tr key={m.id} className={m.id === meta.id ? 'is-current' : ''}>
                  <th scope="row">
                    <a href={href(['info', m.id])}>{m.name}</a>
                  </th>
                  <td className="mono">{m.complexity.best}</td>
                  <td className="mono">{m.complexity.average}</td>
                  <td className="mono">{m.complexity.worst}</td>
                  <td className="mono">{m.complexity.space}</td>
                  {hasStable && <td>{m.stable === undefined ? '—' : m.stable ? 'sí' : 'no'}</td>}
                  {hasInPlace && <td>{m.inPlace === undefined ? '—' : m.inPlace ? 'sí' : 'no'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
