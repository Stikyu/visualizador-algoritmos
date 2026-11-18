import { useEffect, useState } from 'react';
import { CATEGORIES } from '../algorithms/registry';
import { GithubIcon, MenuIcon, MoonIcon, SunIcon } from './icons';
import { HomePage } from './pages/HomePage';
import { InfoPage } from './pages/InfoPage';
import { NotFound } from './pages/NotFound';
import { SearchPage } from './pages/SearchPage';
import { SortingPage } from './pages/SortingPage';
import { StructuresPage } from './pages/StructuresPage';
import { href, useRoute, type Route } from './router';
import { useTheme } from './theme';

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
        {renderPage(route)}
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
