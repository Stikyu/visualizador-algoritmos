import type { AlgorithmMeta, Category } from '../algorithms/types';
import { href } from './router';

/** Selector horizontal de algoritmos de una categoría (links: cada uno tiene su URL). */
export function AlgoPicker({
  category,
  current,
  items,
}: {
  category: Category;
  current: string;
  items: readonly AlgorithmMeta[];
}) {
  return (
    <nav className="picker" aria-label="Elegir algoritmo">
      {items.map((m) => (
        <a
          key={m.id}
          href={href([category, m.id])}
          className={m.id === current ? 'picker__item is-active' : 'picker__item'}
          aria-current={m.id === current ? 'page' : undefined}
        >
          {m.name}
        </a>
      ))}
    </nav>
  );
}
