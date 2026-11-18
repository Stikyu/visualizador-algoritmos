/**
 * Union-find (conjuntos disjuntos) con compresión de caminos y unión por rango.
 * Cada conjunto es un árbol; su raíz es el representante. Con ambas optimizaciones,
 * cada operación cuesta O(α(n)) amortizado (α = inversa de Ackermann, ≤ 4 en la práctica).
 *
 * Implementación mutable y sin dependencias: Kruskal la usa y muestra `parent` en cada paso.
 */
export class UnionFind {
  readonly parent = new Map<number, number>();
  private readonly rank = new Map<number, number>();

  constructor(ids: Iterable<number>) {
    for (const id of ids) {
      this.parent.set(id, id);
      this.rank.set(id, 0);
    }
  }

  find(x: number): number {
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // Compresión de caminos: todos los nodos del camino apuntan directo a la raíz.
    for (let cur = x; cur !== root;) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  /** Une los conjuntos de a y b. Devuelve false si ya estaban juntos. */
  union(a: number, b: number): boolean {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    // Unión por rango: el árbol más bajo cuelga del más alto.
    if (this.rank.get(ra)! < this.rank.get(rb)!) [ra, rb] = [rb, ra];
    this.parent.set(rb, ra);
    if (this.rank.get(ra) === this.rank.get(rb)) this.rank.set(ra, this.rank.get(ra)! + 1);
    return true;
  }

  snapshot(): Record<number, number> {
    return Object.fromEntries(this.parent);
  }

  /** Conjuntos actuales, cada uno como lista de ids (sin comprimir caminos). */
  sets(): number[][] {
    const groups = new Map<number, number[]>();
    for (const id of this.parent.keys()) {
      let r = id;
      while (this.parent.get(r) !== r) r = this.parent.get(r)!;
      groups.set(r, [...(groups.get(r) ?? []), id]);
    }
    return [...groups.values()];
  }
}
