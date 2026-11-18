import { describe, expect, it } from 'vitest';
import { drain, record } from '../src/algorithms/record';
import { createRng, randInt } from '../src/algorithms/rng';
import { STRUCTURES } from '../src/structures';
import {
  chainDelete,
  chainFromKeys,
  chainInsert,
  chainSearch,
  hashOf,
  openDelete,
  openFromKeys,
  openInsert,
  openSearch,
} from '../src/structures/hash';
import { heapDef, heapExtract, heapInsert, isMinHeap, type HeapSnap } from '../src/structures/heap';
import {
  circularDef,
  circularDequeue,
  circularEnqueue,
  dequeue,
  enqueue,
  stackPop,
  stackPush,
  emptyStack,
  type CircularSnap,
} from '../src/structures/linear';
import {
  insertAt,
  insertHead,
  insertTail,
  listToArray,
  makeList,
  removeValue,
  reverse,
  type ListSnap,
} from '../src/structures/linkedList';
import {
  avlDelete,
  avlInsert,
  balanceOf,
  bstDelete,
  bstInsert,
  emptyTree,
  heightOf,
  inorderValues,
  type TreeSnap,
} from '../src/structures/tree';

const rng = createRng(7);

/** Verifica la propiedad de ABB con rangos (no alcanza con mirar padre-hijo). */
function isBST(t: TreeSnap): boolean {
  const ok = (id: number | null, lo: number, hi: number): boolean => {
    if (id === null) return true;
    const n = t.nodes[id];
    return n.value > lo && n.value < hi && ok(n.left, lo, n.value) && ok(n.right, n.value, hi);
  };
  return ok(t.root, -Infinity, Infinity);
}

function reachableCount(t: TreeSnap): number {
  const count = (id: number | null): number =>
    id === null ? 0 : 1 + count(t.nodes[id].left) + count(t.nodes[id].right);
  return count(t.root);
}

/** AVL: alturas correctas y |factor de balance| ≤ 1 en todos los nodos. */
function isAVL(t: TreeSnap): boolean {
  const check = (id: number | null): number => {
    if (id === null) return 0;
    const n = t.nodes[id];
    const hl = check(n.left);
    const hr = check(n.right);
    if (hl < 0 || hr < 0 || Math.abs(hl - hr) > 1) return -1;
    const h = 1 + Math.max(hl, hr);
    return n.height === h ? h : -1;
  };
  return check(t.root) >= 0;
}

describe('árbol binario de búsqueda', () => {
  it('mantiene la propiedad de ABB con inserciones y borrados aleatorios (los tres casos)', () => {
    for (let round = 0; round < 60; round++) {
      let t = emptyTree();
      const model = new Set<number>();
      for (let k = 0; k < 40; k++) {
        const v = randInt(rng, 0, 50);
        if (rng() < 0.6) {
          t = drain(bstInsert(t, v));
          model.add(v);
        } else {
          t = drain(bstDelete(t, v));
          model.delete(v);
        }
        expect(isBST(t)).toBe(true);
        expect(inorderValues(t)).toEqual([...model].sort((a, b) => a - b));
        // No quedan nodos huérfanos en el diccionario.
        expect(Object.keys(t.nodes).length).toBe(reachableCount(t));
      }
    }
  });

  it('el inorden es el arreglo ordenado', () => {
    const values = [50, 30, 70, 20, 40, 60, 80];
    let t = emptyTree();
    for (const v of values) t = drain(bstInsert(t, v));
    expect(inorderValues(t)).toEqual(values.slice().sort((a, b) => a - b));
  });

  it('recorridos conocidos', () => {
    const def = STRUCTURES.find((s) => s.meta.id === 'abb')!;
    let t = emptyTree() as unknown;
    for (const v of [4, 2, 6, 1, 3, 5, 7]) t = drain(def.ops[0].run(t, v, 0));
    const run = (opId: string) => {
      const op = def.ops.find((o) => o.id === opId)!;
      const { steps } = record(op.run(t, 0, 0));
      return steps[steps.length - 1].lists[0].items;
    };
    expect(run('inorden')).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(run('preorden')).toEqual([4, 2, 1, 3, 6, 5, 7]);
    expect(run('postorden')).toEqual([1, 3, 2, 5, 7, 6, 4]);
    expect(run('niveles')).toEqual([4, 2, 6, 1, 3, 5, 7]);
  });
});

describe('árbol AVL', () => {
  it('queda balanceado aun insertando datos ordenados', () => {
    let t = emptyTree();
    for (let v = 1; v <= 100; v++) {
      t = drain(avlInsert(t, v));
      expect(isAVL(t)).toBe(true);
    }
    // Altura de un AVL ≤ 1.44·log2(n + 2).
    expect(heightOf(t, t.root)).toBeLessThanOrEqual(Math.ceil(1.44 * Math.log2(102)));
  });

  it('mantiene balance y propiedad de ABB con operaciones aleatorias', () => {
    for (let round = 0; round < 60; round++) {
      let t = emptyTree();
      const model = new Set<number>();
      for (let k = 0; k < 60; k++) {
        const v = randInt(rng, 0, 80);
        if (rng() < 0.65) {
          t = drain(avlInsert(t, v));
          model.add(v);
        } else {
          t = drain(avlDelete(t, v));
          model.delete(v);
        }
        expect(isAVL(t)).toBe(true);
        expect(isBST(t)).toBe(true);
        expect(inorderValues(t)).toEqual([...model].sort((a, b) => a - b));
        expect(Object.keys(t.nodes).length).toBe(model.size);
      }
    }
  });

  it('resuelve los cuatro casos de rotación', () => {
    const cases: number[][] = [
      [30, 20, 10], // LL
      [10, 20, 30], // RR
      [30, 10, 20], // LR
      [10, 30, 20], // RL
    ];
    for (const values of cases) {
      let t = emptyTree();
      for (const v of values) t = drain(avlInsert(t, v));
      expect(t.nodes[t.root!].value).toBe(20);
      expect(balanceOf(t, t.root!)).toBe(0);
    }
  });
});

describe('heap binario', () => {
  it('mantiene la propiedad de heap y extrae en orden', () => {
    for (let round = 0; round < 50; round++) {
      let h: HeapSnap = heapDef.empty();
      const values: number[] = [];
      for (let k = 0; k < 40; k++) {
        const v = randInt(rng, -50, 50);
        values.push(v);
        h = drain(heapInsert(h, v));
        expect(isMinHeap(h)).toBe(true);
      }
      const out: number[] = [];
      while (h.items.length) {
        out.push(h.items[0].value);
        h = drain(heapExtract(h));
        expect(isMinHeap(h)).toBe(true);
      }
      expect(out).toEqual(values.sort((a, b) => a - b));
    }
  });
});

describe('tablas hash', () => {
  it('h(k) siempre está en [0, m), incluso con negativos', () => {
    for (let k = -50; k <= 50; k++) {
      expect(hashOf(k, 7)).toBeGreaterThanOrEqual(0);
      expect(hashOf(k, 7)).toBeLessThan(7);
    }
  });

  const found = (steps: { type: string }[]) => steps[steps.length - 1].type === 'found';

  it('encadenamiento se comporta como un conjunto', () => {
    let t = chainFromKeys([]);
    const model = new Set<number>();
    for (let k = 0; k < 400; k++) {
      const v = randInt(rng, -20, 40);
      const r = rng();
      if (r < 0.5) {
        t = drain(chainInsert(t, v));
        model.add(v);
      } else if (r < 0.75) {
        t = drain(chainDelete(t, v));
        model.delete(v);
      } else {
        expect(found(record(chainSearch(t, v)).steps)).toBe(model.has(v));
      }
      const all = t.buckets.flat().map((c) => c.value);
      expect(all.sort((a, b) => a - b)).toEqual([...model].sort((a, b) => a - b));
      t.buckets.forEach((b, i) => b.forEach((c) => expect(hashOf(c.value, 7)).toBe(i)));
    }
  });

  it('direccionamiento abierto con lápidas se comporta como un conjunto', () => {
    let t = openFromKeys([]);
    const model = new Set<number>();
    for (let k = 0; k < 600; k++) {
      const v = randInt(rng, 0, 30);
      const r = rng();
      if (r < 0.45 && model.size < 11) {
        t = drain(openInsert(t, v));
        model.add(v);
      } else if (r < 0.75) {
        t = drain(openDelete(t, v));
        model.delete(v);
      } else {
        expect(found(record(openSearch(t, v)).steps)).toBe(model.has(v));
      }
      const keys = t.slots.flatMap((s) => (s.kind === 'full' ? [s.value] : []));
      expect(keys.sort((a, b) => a - b)).toEqual([...model].sort((a, b) => a - b));
    }
  });
});

describe('pila, cola y cola circular', () => {
  it('pila = LIFO, cola = FIFO', () => {
    let s = emptyStack(100);
    let q = { items: [], nextId: 1 } as Parameters<typeof enqueue>[0];
    const stackModel: number[] = [];
    const queueModel: number[] = [];
    for (let k = 0; k < 300; k++) {
      const v = randInt(rng, 0, 99);
      if (rng() < 0.6) {
        s = drain(stackPush(s, v));
        stackModel.push(v);
        q = drain(enqueue(q, v));
        queueModel.push(v);
      } else {
        s = drain(stackPop(s));
        stackModel.pop();
        q = drain(dequeue(q));
        queueModel.shift();
      }
      expect(s.items.map((c) => c.value)).toEqual(stackModel);
      expect(q.items.map((c) => c.value)).toEqual(queueModel);
    }
  });

  it('la cola circular da la vuelta y respeta la capacidad', () => {
    let c: CircularSnap = circularDef.empty();
    const model: number[] = [];
    for (let k = 0; k < 300; k++) {
      const v = randInt(rng, 0, 99);
      if (rng() < 0.55) {
        c = drain(circularEnqueue(c, v));
        if (model.length < 8) model.push(v);
      } else {
        c = drain(circularDequeue(c));
        model.shift();
      }
      const contents = Array.from({ length: c.size }, (_, i) => c.slots[(c.front + i) % 8]!.value);
      expect(contents).toEqual(model);
    }
  });
});

describe('listas enlazadas', () => {
  for (const doubly of [false, true]) {
    it(`${doubly ? 'doble' : 'simple'}: operaciones equivalentes a un arreglo`, () => {
      let l: ListSnap = makeList([], doubly);
      const model: number[] = [];
      for (let k = 0; k < 300; k++) {
        const v = randInt(rng, 0, 20);
        const r = rng();
        if (r < 0.25) {
          l = drain(insertHead(l, v));
          model.unshift(v);
        } else if (r < 0.5) {
          l = drain(insertTail(l, v));
          model.push(v);
        } else if (r < 0.7) {
          const pos = randInt(rng, -1, model.length + 1);
          l = drain(insertAt(l, v, pos));
          model.splice(Math.max(0, Math.min(model.length, pos)), 0, v);
        } else {
          l = drain(removeValue(l, v));
          const i = model.indexOf(v);
          if (i >= 0) model.splice(i, 1);
        }
        expect(listToArray(l)).toEqual(model);
        expect(l.nodes.length).toBe(model.length);
        const tail = l.nodes.find((n) => n.id === l.tail);
        expect(tail?.value).toBe(model[model.length - 1]);
        if (doubly) {
          // Los enlaces "anterior" son el espejo de los "siguiente".
          for (const n of l.nodes) {
            if (n.next !== null) expect(l.nodes.find((x) => x.id === n.next)!.prev).toBe(n.id);
          }
        }
      }
    });
  }

  it('invertir', () => {
    for (let n = 0; n < 8; n++) {
      const values = Array.from({ length: n }, (_, i) => i * 3);
      const r = drain(reverse(makeList(values, false)));
      expect(listToArray(r)).toEqual(values.slice().reverse());
    }
  });
});

describe('todas las estructuras', () => {
  it.each(STRUCTURES.map((s) => [s.meta.name, s] as const))(
    '%s: el último paso de cada operación coincide con el valor devuelto',
    (_n, def) => {
      for (const op of def.ops) {
        const { steps, result } = record(op.run(def.initial(), 42, 1));
        expect(steps.length).toBeGreaterThan(0);
        expect(steps[steps.length - 1].snap).toEqual(result);
        for (const s of steps) expect(s.line).toBeLessThanOrEqual(op.pseudocode.length);
      }
    },
  );
});
