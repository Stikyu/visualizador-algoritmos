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
      <section className="features" aria-label="Modos especiales">
        <a className="feature" href={href(['carrera'])}>
          <span className="feature__k mono">modo</span>
          <b>Carrera</b>
          <span>
            Hasta cuatro ordenamientos con los mismos datos, lado a lado. ¿Quién gana con datos casi
            ordenados?
          </span>
        </a>
        <a className="feature" href={href(['ordenamiento', 'seleccion'])}>
          <span className="feature__k mono">modo</span>
          <b>Práctica</b>
          <span>
            Activalo en cualquier ordenamiento: antes de cada intercambio, adiviná qué barras se
            mueven.
          </span>
        </a>
        <a className="feature" href={href(['grilla', 'grilla-astar'])}>
          <span className="feature__k mono">compará</span>
          <b>BFS vs Dijkstra vs A*</b>
          <span>Dibujá un laberinto con barro y mirá cuántas celdas explora cada uno.</span>
        </a>
        <a className="feature" href={href(['recursion', 'fibonacci'])}>
          <span className="feature__k mono">entendé</span>
          <b>Memoización</b>
          <span>El árbol de llamadas de Fibonacci con y sin memo: de exponencial a lineal.</span>
        </a>
      </section>
      {CATEGORIES.map((c) => (
        <CategorySection key={c.id} cat={c} />
      ))}
    </div>
  );
}
