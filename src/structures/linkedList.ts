import { clone, emitter, type Mark, type StructStep, type StructureDef } from './types';

/**
 * Lista enlazada simple o doble. `nodes` está en orden de DIBUJO (no necesariamente el orden
 * de los enlaces): así, durante una inversión, las flechas pueden apuntar "hacia atrás".
 * Los nodos a los que no se llega desde la cabeza se dibujan desenganchados.
 */
export interface LNode {
  id: number;
  value: number;
  next: number | null;
  prev: number | null;
}

export interface ListSnap {
  readonly nodes: readonly LNode[];
  readonly head: number | null;
  readonly tail: number | null;
  readonly doubly: boolean;
  readonly nextId: number;
}

interface Work {
  nodes: LNode[];
  head: number | null;
  tail: number | null;
  doubly: boolean;
  nextId: number;
}

type Gen = Generator<StructStep<ListSnap>, ListSnap, void>;

const byId = (w: Work, id: number | null) =>
  id === null ? null : (w.nodes.find((n) => n.id === id) ?? null);

/** Reordena `nodes` siguiendo los enlaces desde la cabeza (orden de dibujo final). */
function normalize(w: Work): Work {
  const ordered: LNode[] = [];
  const seen = new Set<number>();
  for (let n = byId(w, w.head); n && !seen.has(n.id); n = byId(w, n.next)) {
    ordered.push(n);
    seen.add(n.id);
  }
  w.nodes = ordered; // se modifica en el lugar: el último paso ya muestra el orden final
  return w;
}

export function listToArray(s: ListSnap): number[] {
  const out: number[] = [];
  const map = new Map(s.nodes.map((n) => [n.id, n]));
  const seen = new Set<number>();
  for (let id = s.head; id !== null && !seen.has(id); id = map.get(id)?.next ?? null) {
    seen.add(id);
    out.push(map.get(id)!.value);
  }
  return out;
}

export function makeList(values: readonly number[], doubly: boolean): ListSnap {
  const nodes: LNode[] = values.map((value, i) => ({
    id: i + 1,
    value,
    next: i + 1 < values.length ? i + 2 : null,
    prev: doubly && i > 0 ? i : null,
  }));
  return {
    nodes,
    head: nodes.length ? 1 : null,
    tail: nodes.length ? nodes.length : null,
    doubly,
    nextId: nodes.length + 1,
  };
}

function setup(snap: ListSnap) {
  const w: Work = clone(snap) as Work;
  const emit = emitter<ListSnap>(() => clone(w));
  const ptr = (extra: Record<string, number | null> = {}) => ({
    cabeza: w.head,
    cola: w.tail,
    ...extra,
  });
  return { w, emit, ptr };
}

export function* insertHead(snap: ListSnap, value: number): Gen {
  const { w, emit, ptr } = setup(snap);
  const node: LNode = { id: w.nextId++, value, next: null, prev: null };
  w.nodes.unshift(node);
  yield emit('insert', 1, `Creamos un nodo con ${value}.`, {
    marks: { [node.id]: 'new' },
    pointers: ptr(),
  });
  node.next = w.head;
  yield emit(
    'insert',
    2,
    'nodo.siguiente ← cabeza: el nuevo nodo apunta al que hoy es el primero.',
    {
      marks: { [node.id]: 'new' },
      pointers: ptr({ nodo: node.id }),
    },
  );
  if (w.doubly && w.head !== null) {
    byId(w, w.head)!.prev = node.id;
    yield emit('insert', 3, 'cabeza.anterior ← nodo (enlace hacia atrás).', {
      marks: { [node.id]: 'new' },
      pointers: ptr({ nodo: node.id }),
    });
  }
  w.head = node.id;
  if (w.tail === null) w.tail = node.id;
  normalize(w);
  yield emit('insert', w.doubly ? 4 : 3, `cabeza ← nodo. Insertar al inicio es O(1).`, {
    marks: { [node.id]: 'new' },
    pointers: ptr(),
  });
  return normalize(w);
}

export function* insertTail(snap: ListSnap, value: number): Gen {
  const { w, emit, ptr } = setup(snap);
  const node: LNode = { id: w.nextId++, value, next: null, prev: null };
  w.nodes.push(node);
  yield emit('insert', 1, `Creamos un nodo con ${value}.`, {
    marks: { [node.id]: 'new' },
    pointers: ptr(),
  });
  if (w.tail === null) {
    w.head = w.tail = node.id;
    normalize(w);
    yield emit('insert', 2, 'La lista estaba vacía: el nodo es cabeza y cola.', {
      marks: { [node.id]: 'new' },
      pointers: ptr(),
    });
    return normalize(w);
  }
  const tail = byId(w, w.tail)!;
  tail.next = node.id;
  yield emit('insert', 3, `cola.siguiente ← nodo: ${tail.value} ahora apunta a ${value}.`, {
    marks: { [node.id]: 'new', [tail.id]: 'current' },
    pointers: ptr(),
  });
  if (w.doubly) {
    node.prev = tail.id;
    yield emit('insert', 4, `nodo.anterior ← cola.`, {
      marks: { [node.id]: 'new' },
      pointers: ptr(),
    });
  }
  w.tail = node.id;
  normalize(w);
  yield emit(
    'insert',
    w.doubly ? 5 : 4,
    'cola ← nodo. Con puntero a la cola, insertar al final es O(1).',
    {
      marks: { [node.id]: 'new' },
      pointers: ptr(),
    },
  );
  return normalize(w);
}

export function* insertAt(snap: ListSnap, value: number, index: number): Gen {
  const size = listToArray(snap).length;
  const { w, emit, ptr } = setup(snap);
  if (index <= 0) {
    yield emit('note', 1, `Posición ${index} ≤ 0: es insertar al inicio.`, {
      pointers: ptr(),
      vars: { pos: index },
    });
    return yield* insertHead(snap, value);
  }
  if (index >= size) {
    yield emit('note', 1, `Posición ${index} ≥ largo (${size}): es insertar al final.`, {
      pointers: ptr(),
      vars: { pos: index, largo: size },
    });
    return yield* insertTail(snap, value);
  }
  let cur = byId(w, w.head)!;
  yield emit('visit', 2, 'actual ← cabeza. Hay que llegar al nodo anterior a la posición.', {
    marks: { [cur.id]: 'current' },
    pointers: ptr({ actual: cur.id }),
    vars: { pos: index, k: 0 },
  });
  for (let k = 0; k < index - 1; k++) {
    cur = byId(w, cur.next)!;
    yield emit('visit', 3, `Avanzamos: actual ← actual.siguiente (k = ${k + 1}).`, {
      marks: { [cur.id]: 'current' },
      pointers: ptr({ actual: cur.id }),
      vars: { pos: index, k: k + 1 },
    });
  }
  const node: LNode = { id: w.nextId++, value, next: null, prev: null };
  const at = w.nodes.findIndex((n) => n.id === cur.id);
  w.nodes.splice(at + 1, 0, node);
  yield emit('insert', 4, `Creamos el nodo ${value}.`, {
    marks: { [node.id]: 'new', [cur.id]: 'current' },
    pointers: ptr({ actual: cur.id }),
  });
  node.next = cur.next;
  yield emit(
    'insert',
    5,
    'nodo.siguiente ← actual.siguiente (primero enganchamos el resto, para no perderlo).',
    {
      marks: { [node.id]: 'new', [cur.id]: 'current' },
      pointers: ptr({ actual: cur.id }),
    },
  );
  if (w.doubly) {
    node.prev = cur.id;
    byId(w, node.next)!.prev = node.id;
    yield emit('insert', 6, 'Ajustamos los enlaces hacia atrás de ambos vecinos.', {
      marks: { [node.id]: 'new', [cur.id]: 'current' },
      pointers: ptr({ actual: cur.id }),
    });
  }
  cur.next = node.id;
  normalize(w);
  yield emit(
    'insert',
    w.doubly ? 7 : 6,
    `actual.siguiente ← nodo. Quedó en la posición ${index}.`,
    {
      marks: { [node.id]: 'new' },
      pointers: ptr(),
    },
  );
  return normalize(w);
}

export function* removeValue(snap: ListSnap, value: number): Gen {
  const { w, emit, ptr } = setup(snap);
  let prev: LNode | null = null;
  let cur = byId(w, w.head);
  yield emit('visit', 1, `Buscamos ${value} desde la cabeza, recordando el nodo anterior.`, {
    marks: cur ? { [cur.id]: 'current' } : {},
    pointers: ptr({ actual: cur?.id ?? null, anterior: null }),
    vars: { valor: value },
  });
  while (cur && cur.value !== value) {
    yield emit('compare', 2, `${cur.value} ≠ ${value}: seguimos.`, {
      marks: { [cur.id]: 'compare' },
      pointers: ptr({ actual: cur.id, anterior: prev?.id ?? null }),
      vars: { valor: value },
    });
    prev = cur;
    cur = byId(w, cur.next);
    if (cur) {
      yield emit('visit', 3, 'anterior ← actual;  actual ← actual.siguiente.', {
        marks: { [cur.id]: 'current' },
        pointers: ptr({ actual: cur.id, anterior: prev.id }),
        vars: { valor: value },
      });
    }
  }
  if (!cur) {
    yield emit('error', 4, `Llegamos al final: ${value} no está en la lista.`, {
      pointers: ptr(),
      vars: { valor: value },
    });
    return normalize(w);
  }
  const target = cur;
  yield emit('found', 4, `Encontramos ${value}.`, {
    marks: { [target.id]: 'remove' },
    pointers: ptr({ actual: target.id, anterior: prev?.id ?? null }),
  });
  if (prev === null) {
    w.head = target.next;
    yield emit('remove', 5, 'Es la cabeza: cabeza ← actual.siguiente.', {
      marks: { [target.id]: 'remove' },
      pointers: ptr({ actual: target.id }),
    });
  } else {
    prev.next = target.next;
    yield emit(
      'remove',
      6,
      `anterior.siguiente ← actual.siguiente: ${prev.value} "saltea" a ${value}.`,
      {
        marks: { [target.id]: 'remove', [prev.id]: 'current' },
        pointers: ptr({ actual: target.id, anterior: prev.id }),
      },
    );
  }
  if (w.doubly && target.next !== null) byId(w, target.next)!.prev = prev?.id ?? null;
  if (w.tail === target.id) w.tail = prev?.id ?? null;
  w.nodes = w.nodes.filter((n) => n.id !== target.id);
  normalize(w);
  yield emit('remove', 7, `El nodo ${value} queda desenganchado y se libera.`, { pointers: ptr() });
  return normalize(w);
}

export function* searchValue(snap: ListSnap, value: number): Gen {
  const { w, emit, ptr } = setup(snap);
  let cur = byId(w, w.head);
  let k = 0;
  const visited: Record<string, Mark> = {};
  while (cur) {
    yield emit('compare', 2, `¿actual.valor = ${cur.value} es ${value}?`, {
      marks: { ...visited, [cur.id]: 'compare' },
      pointers: ptr({ actual: cur.id }),
      vars: { valor: value, k },
    });
    if (cur.value === value) {
      yield emit(
        'found',
        2,
        `¡Sí! Está en la posición ${k}. Buscar en una lista es O(n): no se puede saltar al medio.`,
        {
          marks: { ...visited, [cur.id]: 'found' },
          pointers: ptr({ actual: cur.id }),
          vars: { valor: value, k },
        },
      );
      return normalize(w);
    }
    visited[cur.id] = 'visited';
    cur = byId(w, cur.next);
    k++;
  }
  yield emit('error', 4, `${value} no está en la lista.`, {
    marks: visited,
    pointers: ptr(),
    vars: { valor: value },
  });
  return normalize(w);
}

/** Invierte una lista simple con tres punteros: anterior, actual y siguiente. */
export function* reverse(snap: ListSnap): Gen {
  const { w, emit, ptr } = setup(snap);
  let prev: LNode | null = null;
  let cur = byId(w, w.head);
  const oldHead = w.head;
  yield emit('note', 1, 'anterior ← nulo;  actual ← cabeza.', {
    pointers: ptr({ anterior: null, actual: cur?.id ?? null }),
    marks: cur ? { [cur.id]: 'current' } : {},
  });
  while (cur) {
    const next = byId(w, cur.next);
    yield emit(
      'visit',
      3,
      `siguiente ← actual.siguiente (guardamos ${next ? next.value : 'nulo'} para no perder el resto).`,
      {
        pointers: ptr({ anterior: prev?.id ?? null, actual: cur.id, siguiente: next?.id ?? null }),
        marks: { [cur.id]: 'current' },
      },
    );
    cur.next = prev?.id ?? null;
    yield emit(
      'rotate',
      4,
      `actual.siguiente ← anterior: ${cur.value} ahora apunta ${prev ? `a ${prev.value}` : 'a nulo'}.`,
      {
        pointers: ptr({ anterior: prev?.id ?? null, actual: cur.id, siguiente: next?.id ?? null }),
        marks: { [cur.id]: 'rotate' },
      },
    );
    prev = cur;
    cur = next;
    w.head = prev.id;
    yield emit('visit', 5, 'anterior ← actual;  actual ← siguiente.', {
      pointers: ptr({ anterior: prev.id, actual: cur?.id ?? null }),
      marks: cur ? { [cur.id]: 'current' } : {},
    });
  }
  w.tail = oldHead;
  w.head = prev?.id ?? null;
  normalize(w);
  yield emit('done', 6, 'cabeza ← anterior. Lista invertida en O(n) tiempo y O(1) memoria.', {
    pointers: ptr(),
  });
  return normalize(w);
}

/** Recorre una lista doble desde la cola usando los enlaces "anterior". */
export function* traverseBackward(snap: ListSnap): Gen {
  const { w, emit, ptr } = setup(snap);
  const out: number[] = [];
  const visited: Record<string, Mark> = {};
  for (let cur = byId(w, w.tail); cur; cur = byId(w, cur.prev)) {
    out.push(cur.value);
    yield emit('visit', 2, `Visitamos ${cur.value} y vamos a actual.anterior.`, {
      marks: { ...visited, [cur.id]: 'current' },
      pointers: ptr({ actual: cur.id }),
      lists: [{ label: 'salida', items: out.slice() }],
    });
    visited[cur.id] = 'visited';
  }
  yield emit('done', 3, 'Llegamos a nulo: recorrido al revés en O(n), sin pila auxiliar.', {
    marks: visited,
    pointers: ptr(),
    lists: [{ label: 'salida', items: out }],
  });
  return normalize(w);
}

const common = {
  whenToUse: [
    'Muchas inserciones/borrados en el medio cuando ya tenés el puntero al nodo (O(1)).',
    'Implementar pilas, colas, listas LRU (doble + hash map).',
  ],
  avoidWhen: ['Necesitás acceso por índice o buena localidad de caché: un arreglo es mejor.'],
};

export const singlyDef: StructureDef<ListSnap> = {
  view: 'list',
  meta: {
    id: 'lista-simple',
    name: 'Lista enlazada simple',
    category: 'estructuras',
    summary:
      'Cada nodo guarda un valor y un puntero al siguiente. Insertar al inicio es O(1); buscar es O(n).',
    pseudocode: ['insertarInicio(valor):', 'nodo.siguiente ← cabeza', 'cabeza ← nodo'],
    complexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(n)' },
    ...common,
  },
  opCosts: [
    { op: 'insertar al inicio / al final (con cola)', cost: 'O(1)' },
    { op: 'insertar en posición k', cost: 'O(k)' },
    { op: 'buscar / eliminar por valor', cost: 'O(n)' },
    { op: 'invertir', cost: 'O(n) tiempo, O(1) memoria' },
  ],
  empty: () => makeList([], false),
  initial: () => makeList([4, 15, 8, 23], false),
  ops: [
    {
      id: 'inicio',
      label: 'Insertar al inicio',
      input: 'value',
      pseudocode: [
        'nodo ← nuevo Nodo(valor)',
        'nodo.siguiente ← cabeza',
        'cabeza ← nodo;  si cola = nulo: cola ← nodo',
      ],
      run: (s, v) => insertHead(s, v),
    },
    {
      id: 'final',
      label: 'Insertar al final',
      input: 'value',
      pseudocode: [
        'nodo ← nuevo Nodo(valor)',
        'si la lista está vacía: cabeza ← cola ← nodo; terminar',
        'cola.siguiente ← nodo',
        'cola ← nodo',
      ],
      run: (s, v) => insertTail(s, v),
    },
    {
      id: 'posicion',
      label: 'Insertar en posición',
      input: 'value+index',
      pseudocode: [
        'si pos ≤ 0 o pos ≥ largo: insertar al inicio / al final',
        'actual ← cabeza',
        'repetir pos − 1 veces: actual ← actual.siguiente',
        'nodo ← nuevo Nodo(valor)',
        'nodo.siguiente ← actual.siguiente',
        'actual.siguiente ← nodo',
      ],
      run: (s, v, i) => insertAt(s, v, i),
    },
    {
      id: 'eliminar',
      label: 'Eliminar valor',
      input: 'value',
      pseudocode: [
        'anterior ← nulo;  actual ← cabeza',
        'mientras actual ≠ nulo y actual.valor ≠ valor',
        '  anterior ← actual;  actual ← actual.siguiente',
        'si actual = nulo: no está, terminar',
        'si anterior = nulo: cabeza ← actual.siguiente',
        'si no: anterior.siguiente ← actual.siguiente',
        'liberar actual (y actualizar cola si hacía falta)',
      ],
      run: (s, v) => removeValue(s, v),
    },
    {
      id: 'buscar',
      label: 'Buscar',
      input: 'value',
      pseudocode: [
        'actual ← cabeza',
        'mientras actual ≠ nulo: si actual.valor = valor: retornar actual',
        '  actual ← actual.siguiente',
        'retornar nulo',
      ],
      run: (s, v) => searchValue(s, v),
    },
    {
      id: 'invertir',
      label: 'Invertir',
      input: 'none',
      pseudocode: [
        'anterior ← nulo;  actual ← cabeza',
        'mientras actual ≠ nulo',
        '  siguiente ← actual.siguiente',
        '  actual.siguiente ← anterior',
        '  anterior ← actual;  actual ← siguiente',
        'cabeza ← anterior',
      ],
      run: (s) => reverse(s),
    },
  ],
};

export const doublyDef: StructureDef<ListSnap> = {
  view: 'list',
  meta: {
    id: 'lista-doble',
    name: 'Lista doblemente enlazada',
    category: 'estructuras',
    summary:
      'Cada nodo apunta al siguiente y al anterior: se puede recorrer en ambos sentidos y borrar un nodo conocido en O(1).',
    pseudocode: [
      'insertarInicio(valor):',
      'nodo.siguiente ← cabeza;  cabeza.anterior ← nodo',
      'cabeza ← nodo',
    ],
    complexity: {
      best: 'O(1)',
      average: 'O(n)',
      worst: 'O(n)',
      space: 'O(n) (dos punteros por nodo)',
    },
    ...common,
  },
  opCosts: [
    { op: 'insertar / borrar en los extremos', cost: 'O(1)' },
    { op: 'borrar un nodo conocido', cost: 'O(1)' },
    { op: 'buscar por valor', cost: 'O(n)' },
  ],
  empty: () => makeList([], true),
  initial: () => makeList([4, 15, 8, 23], true),
  ops: [
    {
      id: 'inicio',
      label: 'Insertar al inicio',
      input: 'value',
      pseudocode: [
        'nodo ← nuevo Nodo(valor)',
        'nodo.siguiente ← cabeza',
        'si cabeza ≠ nulo: cabeza.anterior ← nodo',
        'cabeza ← nodo;  si cola = nulo: cola ← nodo',
      ],
      run: (s, v) => insertHead(s, v),
    },
    {
      id: 'final',
      label: 'Insertar al final',
      input: 'value',
      pseudocode: [
        'nodo ← nuevo Nodo(valor)',
        'si la lista está vacía: cabeza ← cola ← nodo; terminar',
        'cola.siguiente ← nodo',
        'nodo.anterior ← cola',
        'cola ← nodo',
      ],
      run: (s, v) => insertTail(s, v),
    },
    {
      id: 'posicion',
      label: 'Insertar en posición',
      input: 'value+index',
      pseudocode: [
        'si pos ≤ 0 o pos ≥ largo: insertar al inicio / al final',
        'actual ← cabeza',
        'repetir pos − 1 veces: actual ← actual.siguiente',
        'nodo ← nuevo Nodo(valor)',
        'nodo.siguiente ← actual.siguiente',
        'nodo.anterior ← actual;  actual.siguiente.anterior ← nodo',
        'actual.siguiente ← nodo',
      ],
      run: (s, v, i) => insertAt(s, v, i),
    },
    {
      id: 'eliminar',
      label: 'Eliminar valor',
      input: 'value',
      pseudocode: [
        'actual ← cabeza',
        'mientras actual ≠ nulo y actual.valor ≠ valor',
        '  actual ← actual.siguiente',
        'si actual = nulo: no está, terminar',
        'si actual es la cabeza: cabeza ← actual.siguiente',
        'si no: actual.anterior.siguiente ← actual.siguiente',
        'actual.siguiente.anterior ← actual.anterior;  liberar actual',
      ],
      run: (s, v) => removeValue(s, v),
    },
    {
      id: 'buscar',
      label: 'Buscar',
      input: 'value',
      pseudocode: [
        'actual ← cabeza',
        'mientras actual ≠ nulo: si actual.valor = valor: retornar actual',
        '  actual ← actual.siguiente',
        'retornar nulo',
      ],
      run: (s, v) => searchValue(s, v),
    },
    {
      id: 'reves',
      label: 'Recorrer al revés',
      input: 'none',
      pseudocode: [
        'actual ← cola',
        'mientras actual ≠ nulo: visitar(actual);  actual ← actual.anterior',
        'fin',
      ],
      run: (s) => traverseBackward(s),
    },
  ],
};
