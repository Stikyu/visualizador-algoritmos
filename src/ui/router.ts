import { useSyncExternalStore } from 'react';

/**
 * Router mínimo basado en el hash (#/ordenamiento/quick?datos=3,1,2).
 * Se usa hash y no rutas "reales" porque GitHub Pages no puede reescribir URLs a index.html,
 * y así cualquier link compartido funciona sin configuración del servidor.
 */
export interface Route {
  readonly path: readonly string[];
  readonly query: URLSearchParams;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [p, q = ''] = raw.split('?');
  return {
    path: p.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(q),
  };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getSnapshot = () => window.location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => '');
  return parse(hash);
}

export function href(path: readonly string[], query?: Record<string, string>): string {
  const q = query ? new URLSearchParams(query).toString() : '';
  return `#/${path.map(encodeURIComponent).join('/')}${q ? `?${q}` : ''}`;
}

export function navigate(path: readonly string[], query?: Record<string, string>): void {
  window.location.hash = href(path, query);
}

/**
 * Actualiza la query del hash SIN agregar una entrada al historial ni disparar navegación.
 * Así la URL siempre refleja el estado actual (algoritmo + datos) y se puede compartir.
 */
export function replaceQuery(query: Record<string, string | undefined>): void {
  const { path } = parse(window.location.hash);
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') clean[k] = v;
  const next = href(path, clean);
  if (next !== window.location.hash) {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}${next}`,
    );
  }
}
