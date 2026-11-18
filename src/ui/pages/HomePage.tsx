import { CATEGORIES, byCategory } from '../../algorithms/registry';
import type { CategoryInfo } from '../../algorithms/registry';
import { href } from '../router';

/** Pequeña animación decorativa (CSS puro) para el encabezado. */
function HeroBars() {
  const heights = [38, 72, 24, 88, 56, 16, 64, 44, 80, 30];
  return (
    <div className="hero__bars" aria-hidden="true">
      {heights.map((h, i) => (
        <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  );
}

function CategorySection({ cat }: { cat: CategoryInfo }) {
  const items = byCategory(cat.id);
  return (
    <section className="cat" aria-labelledby={`cat-${cat.id}`}>
      <div className="cat__head">
        <h2 id={`cat-${cat.id}`}>{cat.label}</h2>
        <p className="muted">{cat.blurb}</p>
      </div>
      <ul className="cards">
        {items.map((m, i) => (
          <li key={m.id}>
            <a className="card card--link" href={href([cat.id, m.id])}>
              <span className="card__num mono" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="card__title">{m.name}</span>
              <span className="card__summary">{m.summary}</span>
              <span className="card__meta mono">{m.complexity.average}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomePage() {
  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="hero__kicker mono">algoritmos · estructuras de datos · paso a paso</p>
          <h1 className="hero__title">
            Mirá cómo piensa
            <br />
            un algoritmo<span className="brand__dot">.</span>
          </h1>
          <p className="hero__lead">
            Cada algoritmo deja una <em>traza</em>: la lista de todo lo que hizo. Reproducila,
            pausala, volvé atrás y seguí el pseudocódigo línea por línea, con una explicación en
            castellano de cada paso.
          </p>
          <div className="hero__cta">
            <a className="btn btn--primary" href={href(['ordenamiento', 'quick'])}>
              Empezar con quick sort
            </a>
            <a className="btn btn--ghost" href={href(['ordenamiento', 'burbuja'])}>
              o con burbuja
            </a>
          </div>
        </div>
        <HeroBars />
      </section>
      {CATEGORIES.map((c) => (
        <CategorySection key={c.id} cat={c} />
      ))}
    </div>
  );
}
