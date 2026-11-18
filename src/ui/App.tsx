import { MotionConfig } from 'motion/react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { CATEGORIES } from '../algorithms/registry';
import { GithubIcon, MenuIcon, MoonIcon, SunIcon } from './icons';
import { HomePage } from './pages/HomePage';
import { NotFound } from './pages/NotFound';
import { href, useRoute, type Route } from './router';
import { useTheme } from './theme';

// Cada página se carga recién cuando se visita (code splitting): el inicio no paga el costo
// de los renderers de grafos, grillas, etc.
const SortingPage = lazy(() =>
  import('./pages/SortingPage').then((m) => ({ default: m.SortingPage })),
);
const SearchPage = lazy(() =>
  import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const StructuresPage = lazy(() =>
  import('./pages/StructuresPage').then((m) => ({ default: m.StructuresPage })),
);
const GraphPage = lazy(() => import('./pages/GraphPage').then((m) => ({ default: m.GraphPage })));
const GridPage = lazy(() => import('./pages/GridPage').then((m) => ({ default: m.GridPage })));
const RecursionPage = lazy(() =>
  import('./pages/ProblemPages').then((m) => ({ default: m.RecursionPage })),
);
const DPPage = lazy(() => import('./pages/ProblemPages').then((m) => ({ default: m.DPPage })));
const RacePage = lazy(() => import('./pages/RacePage').then((m) => ({ default: m.RacePage })));
const InfoPage = lazy(() => import('./pages/InfoPage').then((m) => ({ default: m.InfoPage })));

export const REPO_URL = 'https://github.com/Stikyu/visualizador-algoritmos';

/** Tabla de rutas: primer segmento del hash → página. */
function renderPage(route: Route) {
  switch (route.path[0]) {
    case undefined:
      return <HomePage />;
    case 'ordenamiento':
      return <SortingPage route={route} />;
    case 'busqueda':
      return <SearchPage route={route} />;
    case 'estructuras':
      return <StructuresPage route={route} />;
    case 'grafos':
      return <GraphPage route={route} />;
    case 'grilla':
      return <GridPage route={route} />;
    case 'recursion':
      return <RecursionPage route={route} />;
    case 'pd':
      return <DPPage route={route} />;
    case 'carrera':
      return <RacePage route={route} />;
    case 'info':
      return <InfoPage id={route.path[1] ?? ''} />;
    default:
      return <NotFound />;
  }
}

export function App() {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const section = route.path[0];

  // Al cambiar de página: cerrar el menú móvil y volver arriba.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [section, route.path[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="topbar">
        <a className="brand" href="#/" aria-label="traza — inicio">
          <span className="brand__mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="brand__name">
            traza<span className="brand__dot">.</span>
          </span>
        </a>
        <button
          type="button"
          className="icon-btn topbar__menu"
          aria-expanded={menuOpen}
          aria-controls="nav-principal"
          aria-label="Menú"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MenuIcon />
        </button>
        <nav
          id="nav-principal"
          className={`topnav ${menuOpen ? 'is-open' : ''}`}
          aria-label="Secciones"
        >
          {CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={href([c.id])}
              className={section === c.id ? 'is-active' : ''}
              aria-current={section === c.id ? 'page' : undefined}
            >
              {c.label}
            </a>
          ))}
          <a
            href={href(['carrera'])}
            className={section === 'carrera' ? 'is-active' : ''}
            aria-current={section === 'carrera' ? 'page' : undefined}
          >
            Carrera
          </a>
        </nav>
        <div className="topbar__actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <a
            className="icon-btn"
            href={REPO_URL}
            aria-label="Código en GitHub"
            title="Código en GitHub"
          >
            <GithubIcon />
          </a>
        </div>
      </header>
      <main id="contenido" className="content" tabIndex={-1}>
        {/* reducedMotion="user": si el sistema pide reducir movimiento, Motion no anima. */}
        <MotionConfig reducedMotion="user">
          <Suspense fallback={<p className="muted mono loading">Cargando…</p>}>
            {renderPage(route)}
          </Suspense>
        </MotionConfig>
      </main>
      <footer className="footer">
        <span>
          traza<span className="brand__dot">.</span> — visualizador de algoritmos y estructuras de
          datos.
        </span>
        <span className="muted">
          Atajos: <kbd>espacio</kbd> play/pausa · <kbd>←</kbd> <kbd>→</kbd> paso · <kbd>Shift</kbd>
          +flecha ×10
        </span>
        <a href={REPO_URL}>Código abierto (MIT)</a>
      </footer>
    </div>
  );
}
