import {
  clone,
  emitter,
  type Mark,
  type StructList,
  type StructStep,
  type StructureDef,
} from './types';

/** Nodo de árbol binario. `height` sólo se mantiene en el AVL (hoja = 1, nulo = 0). */
export interface TNode {
  id: number;
  value: number;
  left: number | null;
  right: number | null;
  height: number;
}

export interface TreeSnap {
  readonly nodes: Readonly<Record<number, TNode>>;
  readonly root: number | null;
  readonly nextId: number;
}

interface Work {
  nodes: Record<number, TNode>;
  root: number | null;
  nextId: number;
}

type Gen = Generator<StructStep<TreeSnap>, TreeSnap, void>;

export const emptyTree = (): TreeSnap => ({ nodes: {}, root: null, nextId: 1 });

function setup(snap: TreeSnap) {
  const w = clone(snap) as Work;
  const emit = emitter<TreeSnap>(() => clone(w));
  return { w, emit };
}

const node = (w: Work | TreeSnap, id: number | null): TNode | null =>
  id === null ? null : w.nodes[id];
export const heightOf = (w: Work | TreeSnap, id: number | null): number => node(w, id)?.height ?? 0;
export const balanceOf = (w: Work | TreeSnap, id: number): number =>
  heightOf(w, w.nodes[id].left) - heightOf(w, w.nodes[id].right);

function updateHeight(w: Work, id: number) {
  const n = w.nodes[id];
  n.height = 1 + Math.max(heightOf(w, n.left), heightOf(w, n.right));
}

function newNode(w: Work, value: number): TNode {
  const n: TNode = { id: w.nextId++, value, left: null, right: null, height: 1 };
  w.nodes[n.id] = n;
  return n;
}

/** Recorrido inorden (sirve para verificar la propiedad de ABB en los tests). */
export function inorderValues(t: TreeSnap): number[] {
  const out: number[] = [];
  const go = (id: number | null) => {
    const n = node(t, id);
    if (!n) return;
    go(n.left);
    out.push(n.value);
    go(n.right);
  };
  go(t.root);
  return out;
}

const pathMarks = (path: readonly number[], current?: number, kind: Mark = 'compare') => {
  const m: Record<string, Mark> = {};
  for (const id of path) m[id] = 'path';
  if (current !== undefined) m[current] = kind;
  return m;
};

// ===========================================================================
// Árbol binario de búsqueda
// ===========================================================================

export function* bstInsert(snap: TreeSnap, value: number): Gen {
  const { w, emit } = setup(snap);
  if (w.root === null) {
    const n = newNode(w, value);
    w.root = n.id;
    yield emit('insert', 1, `El árbol estaba vacío: ${value} es la nueva raíz.`, {
      marks: { [n.id]: 'new' },
      vars: { valor: value },
    });
    return w;
  }
  let cur = w.nodes[w.root];
  const path: number[] = [];
  yield emit('visit', 2, `Empezamos en la raíz (${cur.value}).`, {
    marks: { [cur.id]: 'current' },
    vars: { valor: value, actual: cur.value },
  });
  for (;;) {
    if (value === cur.value) {
      yield emit('found', 4, `${value} ya está en el árbol: no se insertan duplicados.`, {
        marks: pathMarks(path, cur.id, 'found'),
        vars: { valor: value, actual: cur.value },
      });
      return w;
    }
    const goLeft = value < cur.value;
    yield emit(
      'compare',
      goLeft ? 5 : 8,
      `${value} ${goLeft ? '<' : '>'} ${cur.value}: vamos a la ${goLeft ? 'izquierda' : 'derecha'}.`,
      {
        marks: pathMarks(path, cur.id),
        vars: { valor: value, actual: cur.value },
      },
    );
    path.push(cur.id);
    const childId = goLeft ? cur.left : cur.right;
    if (childId === null) {
      const n = newNode(w, value);
      if (goLeft) cur.left = n.id;
      else cur.right = n.id;
      yield emit(
        'insert',
        goLeft ? 6 : 9,
        `El hijo ${goLeft ? 'izquierdo' : 'derecho'} está libre: insertamos ${value} ahí. Costo: O(altura).`,
        {
          marks: { ...pathMarks(path), [n.id]: 'new' },
          vars: { valor: value, altura: treeHeight(w) },
        },
      );
      return w;
    }
    cur = w.nodes[childId];
    yield emit('visit', goLeft ? 7 : 10, `Bajamos a ${cur.value}.`, {
      marks: pathMarks(path, cur.id, 'current'),
      vars: { valor: value, actual: cur.value },
    });
  }
}

export function treeHeight(t: Work | TreeSnap): number {
  const h = (id: number | null): number => {
    const n = node(t, id);
    return n ? 1 + Math.max(h(n.left), h(n.right)) : 0;
  };
  return h(t.root);
}

export function* bstSearch(snap: TreeSnap, value: number): Gen {
  const { w, emit } = setup(snap);
  let cur = node(w, w.root);
  const path: number[] = [];
  let steps = 0;
  while (cur) {
    steps++;
    if (cur.value === value) {
      yield emit(
        'found',
        3,
        `¡Encontrado en ${steps} comparaciones! (a lo sumo la altura del árbol: ${treeHeight(w)}).`,
        {
          marks: pathMarks(path, cur.id, 'found'),
          vars: { valor: value, actual: cur.value, comparaciones: steps },
        },
      );
      return w;
    }
    const goLeft = value < cur.value;
    yield emit(
      'compare',
      goLeft ? 4 : 5,
      `${value} ${goLeft ? '<' : '>'} ${cur.value}: buscamos a la ${goLeft ? 'izquierda' : 'derecha'}.`,
      {
        marks: pathMarks(path, cur.id),
        vars: { valor: value, actual: cur.value, comparaciones: steps },
      },
    );
    path.push(cur.id);
    cur = node(w, goLeft ? cur.left : cur.right);
  }
  yield emit('error', 6, `Llegamos a un hijo nulo: ${value} no está.`, {
    marks: pathMarks(path),
    vars: { valor: value, comparaciones: steps },
  });
  return w;
}

export function* bstDelete(snap: TreeSnap, value: number): Gen {
  const { w, emit } = setup(snap);
  let parent: TNode | null = null;
  let z = node(w, w.root);
  const path: number[] = [];
  while (z && z.value !== value) {
    yield emit(
      'compare',
      1,
      `Buscamos ${value}: ${value} ${value < z.value ? '<' : '>'} ${z.value}.`,
      {
        marks: pathMarks(path, z.id),
        vars: { valor: value },
      },
    );
    path.push(z.id);
    parent = z;
    z = node(w, value < z.value ? z.left : z.right);
  }
  if (!z) {
    yield emit('error', 2, `${value} no está en el árbol.`, {
      marks: pathMarks(path),
      vars: { valor: value },
    });
    return w;
  }
  const target = z;
  const replaceChild = (p: TNode | null, oldId: number, newId: number | null) => {
    if (!p) w.root = newId;
    else if (p.left === oldId) p.left = newId;
    else p.right = newId;
  };

  if (target.left === null && target.right === null) {
    yield emit('found', 3, `Encontrado. Caso 1: ${value} es una hoja, se quita directamente.`, {
      marks: { [target.id]: 'remove' },
      vars: { valor: value, caso: 1 },
    });
    replaceChild(parent, target.id, null);
    delete w.nodes[target.id];
    yield emit('remove', 3, `Listo: la hoja ${value} desapareció.`, { vars: { caso: 1 } });
    return w;
  }
  if (target.left === null || target.right === null) {
    const child = (target.left ?? target.right) as number;
    yield emit(
      'found',
      4,
      `Encontrado. Caso 2: ${value} tiene un solo hijo (${w.nodes[child].value}); ese hijo ocupa su lugar.`,
      {
        marks: { [target.id]: 'remove', [child]: 'current' },
        vars: { valor: value, caso: 2 },
      },
    );
    replaceChild(parent, target.id, child);
    delete w.nodes[target.id];
    yield emit('remove', 4, `El subárbol de ${w.nodes[child].value} "sube" un nivel.`, {
      marks: { [child]: 'new' },
      vars: { caso: 2 },
    });
    return w;
  }
  yield emit(
    'found',
    5,
    `Encontrado. Caso 3: ${value} tiene dos hijos. Lo reemplazamos por su sucesor inorden.`,
    {
      marks: { [target.id]: 'remove' },
      vars: { valor: value, caso: 3 },
    },
  );
  let sParent = target;
  let s = w.nodes[target.right as number];
  const sPath: number[] = [];
  yield emit(
    'visit',
    6,
    `El sucesor es el mínimo del subárbol derecho: arrancamos en ${s.value}…`,
    {
      marks: { [target.id]: 'remove', [s.id]: 'current' },
      vars: { caso: 3 },
    },
  );
  while (s.left !== null) {
    sPath.push(s.id);
    sParent = s;
    s = w.nodes[s.left];
    yield emit('visit', 6, `…y bajamos siempre a la izquierda: ${s.value}.`, {
      marks: { ...pathMarks(sPath), [target.id]: 'remove', [s.id]: 'current' },
      vars: { caso: 3 },
    });
  }
  const old = target.value;
  target.value = s.value;
  yield emit(
    'swap',
    7,
    `Copiamos el sucesor (${s.value}) en el nodo que tenía ${old}. El orden se mantiene: es el siguiente valor más grande.`,
    {
      marks: { [target.id]: 'new', [s.id]: 'remove' },
      vars: { caso: 3, sucesor: s.value },
    },
  );
  replaceChild(sParent, s.id, s.right);
  delete w.nodes[s.id];
  yield emit(
    'remove',
    8,
    `Quitamos el nodo original del sucesor (a lo sumo tenía un hijo derecho).`,
    {
      marks: { [target.id]: 'found' },
      vars: { caso: 3 },
    },
  );
  return w;
}

type Order = 'inorden' | 'preorden' | 'postorden';

export function* traverse(snap: TreeSnap, order: Order): Gen {
  const { w, emit } = setup(snap);
  const out: number[] = [];
  const stack: string[] = [];
  const done: Record<string, Mark> = {};
  const lists = (): StructList[] => [
    { label: 'salida', items: out.slice() },
    { label: 'pila de llamadas', items: stack.slice() },
  ];
  const lineVisit = order === 'preorden' ? 2 : order === 'inorden' ? 3 : 4;
  function* go(id: number | null): Generator<StructStep<TreeSnap>, void, void> {
    const n = node(w, id);
    if (!n) return;
    stack.push(`${order}(${n.value})`);
    yield emit('call', 1, `Llamada sobre ${n.value}.`, {
      marks: { ...done, [n.id]: 'current' },
      lists: lists(),
    });
    const visit = function* () {
      out.push(n.value);
      done[n.id] = 'visited';
      yield emit('visit', lineVisit, `Visitamos ${n.value} → salida.`, {
        marks: { ...done, [n.id]: 'found' },
        lists: lists(),
      });
    };
    if (order === 'preorden') yield* visit();
    yield* go(n.left);
    if (order === 'inorden') yield* visit();
    yield* go(n.right);
    if (order === 'postorden') yield* visit();
    stack.pop();
  }
  yield* go(w.root);
  yield emit(
    'done',
    0,
    `Recorrido ${order}: ${out.join(', ') || '(vacío)'}.${order === 'inorden' ? ' En un ABB, el inorden siempre sale ordenado.' : ''}`,
    {
      marks: done,
      lists: lists(),
    },
  );
  return w;
}

export function* levelOrder(snap: TreeSnap): Gen {
  const { w, emit } = setup(snap);
  const out: number[] = [];
  const queue: number[] = w.root === null ? [] : [w.root];
  const done: Record<string, Mark> = {};
  const lists = (): StructList[] => [
    { label: 'salida', items: out.slice() },
    { label: 'cola', items: queue.map((id) => w.nodes[id].value) },
  ];
  yield emit('enqueue', 1, 'Encolamos la raíz.', {
    lists: lists(),
    marks: w.root ? { [w.root]: 'current' } : {},
  });
  while (queue.length) {
    const id = queue.shift()!;
    const n = w.nodes[id];
    out.push(n.value);
    done[id] = 'visited';
    yield emit('visit', 3, `Desencolamos ${n.value} y lo visitamos.`, {
      marks: { ...done, [id]: 'found' },
      lists: lists(),
    });
    for (const c of [n.left, n.right]) {
      if (c !== null) {
        queue.push(c);
        yield emit('enqueue', 4, `Encolamos su hijo ${w.nodes[c].value}.`, {
          marks: { ...done, [c]: 'current' },
          lists: lists(),
        });
      }
    }
  }
  yield emit('done', 0, `Por niveles: ${out.join(', ') || '(vacío)'}. Es un BFS sobre el árbol.`, {
    marks: done,
    lists: lists(),
  });
  return w;
}

export function buildTree(
  values: readonly number[],
  insert: (s: TreeSnap, v: number) => Gen,
): TreeSnap {
  let t = emptyTree();
  for (const v of values) {
    const g = insert(t, v);
    for (;;) {
      const r = g.next();
      if (r.done) {
        t = r.value;
        break;
      }
    }
  }
  return t;
}

const TRAVERSAL_OPS = [
  {
    id: 'inorden',
    label: 'Inorden',
    input: 'none' as const,
    pseudocode: [
      'inorden(nodo): si nodo = nulo: retornar',
      '  inorden(nodo.izq)',
      '  visitar(nodo)',
      '  inorden(nodo.der)',
    ],
    run: (s: TreeSnap) => traverse(s, 'inorden'),
  },
  {
    id: 'preorden',
    label: 'Preorden',
    input: 'none' as const,
    pseudocode: [
      'preorden(nodo): si nodo = nulo: retornar',
      '  visitar(nodo)',
      '  preorden(nodo.izq)',
      '  preorden(nodo.der)',
    ],
    run: (s: TreeSnap) => traverse(s, 'preorden'),
  },
  {
    id: 'postorden',
    label: 'Postorden',
    input: 'none' as const,
    pseudocode: [
      'postorden(nodo): si nodo = nulo: retornar',
      '  postorden(nodo.izq)',
      '  postorden(nodo.der)',
      '  visitar(nodo)',
    ],
    run: (s: TreeSnap) => traverse(s, 'postorden'),
  },
  {
    id: 'niveles',
    label: 'Por niveles',
    input: 'none' as const,
    pseudocode: [
      'cola ← [raíz]',
      'mientras la cola no esté vacía',
      '  nodo ← desencolar();  visitar(nodo)',
      '  encolar sus hijos (izquierdo, derecho)',
    ],
    run: (s: TreeSnap) => levelOrder(s),
  },
];

const SEARCH_OP = {
  id: 'buscar',
  label: 'Buscar',
  input: 'value' as const,
  pseudocode: [
    'actual ← raíz',
    'mientras actual ≠ nulo',
    '  si valor = actual.valor: retornar actual',
    '  si valor < actual.valor: actual ← actual.izq',
    '  si no: actual ← actual.der',
    'retornar nulo',
  ],
  run: (s: TreeSnap, v: number) => bstSearch(s, v),
};

export const bstDef: StructureDef<TreeSnap> = {
  view: 'bst',
  meta: {
    id: 'abb',
    name: 'Árbol binario de búsqueda',
    category: 'estructuras',
    summary:
      'Cada nodo es mayor que todo su subárbol izquierdo y menor que todo su subárbol derecho: buscar es bajar por un camino.',
    pseudocode: SEARCH_OP.pseudocode,
    complexity: {
      best: 'O(log n)',
      average: 'O(log n)',
      worst: 'O(n) (degenerado)',
      space: 'O(n)',
    },
    whenToUse: [
      'Conjuntos/mapas ordenados: búsqueda, mínimo, máximo, sucesor, rangos.',
      'Cuando los datos llegan en orden aleatorio (altura esperada O(log n)).',
    ],
    avoidWhen: [
      'Los datos llegan ordenados: el árbol se vuelve una lista. Usá un árbol balanceado (AVL, rojinegro).',
    ],
  },
  opCosts: [
    { op: 'buscar / insertar / eliminar', cost: 'O(h): O(log n) promedio, O(n) peor' },
    { op: 'recorridos', cost: 'O(n)' },
  ],
  empty: emptyTree,
  initial: () => buildTree([50, 30, 70, 20, 40, 60, 80, 35, 65], bstInsert),
  ops: [
    {
      id: 'insertar',
      label: 'Insertar',
      input: 'value',
      pseudocode: [
        'si raíz = nulo: raíz ← nuevo Nodo(valor); terminar',
        'actual ← raíz',
        'repetir',
        '  si valor = actual.valor: ya existe, terminar',
        '  si valor < actual.valor',
        '    si actual.izq = nulo: actual.izq ← nuevo Nodo(valor); terminar',
        '    actual ← actual.izq',
        '  si no',
        '    si actual.der = nulo: actual.der ← nuevo Nodo(valor); terminar',
        '    actual ← actual.der',
      ],
      run: (s, v) => bstInsert(s, v),
    },
    SEARCH_OP,
    {
      id: 'eliminar',
      label: 'Eliminar',
      input: 'value',
      pseudocode: [
        'buscar el nodo z con el valor (recordando su padre)',
        'si z no existe: terminar',
        'caso 1 — z es una hoja: quitarlo',
        'caso 2 — z tiene un solo hijo: el hijo ocupa el lugar de z',
        'caso 3 — z tiene dos hijos:',
        '  s ← sucesor de z (el mínimo de su subárbol derecho)',
        '  copiar s.valor en z',
        '  quitar s (tiene a lo sumo un hijo derecho)',
      ],
      run: (s, v) => bstDelete(s, v),
    },
    ...TRAVERSAL_OPS,
  ],
};

// ===========================================================================
// Árbol AVL
// ===========================================================================

/** Rotación simple a la derecha sobre z. Devuelve la nueva raíz del subárbol (y). */
function rotateRight(w: Work, zId: number): number {
  const z = w.nodes[zId];
  const y = w.nodes[z.left as number];
  z.left = y.right;
  y.right = z.id;
  updateHeight(w, z.id);
  updateHeight(w, y.id);
  return y.id;
}

function rotateLeft(w: Work, zId: number): number {
  const z = w.nodes[zId];
  const y = w.nodes[z.right as number];
  z.right = y.left;
  y.left = z.id;
  updateHeight(w, z.id);
  updateHeight(w, y.id);
  return y.id;
}

type Attach = (id: number | null) => void;
type RecGen = Generator<StructStep<TreeSnap>, number | null, void>;

/**
 * Rebalancea el nodo `id` si hace falta. `attach` engancha la nueva raíz del subárbol en su
 * padre EN EL MOMENTO, para que cada snapshot intermedio sea un árbol válido y la rotación
 * se pueda animar.
 */
function* rebalance(
  w: Work,
  id: number,
  attach: Attach,
  emit: ReturnType<typeof emitter<TreeSnap>>,
  lines: { ll: number; rr: number; lr: number; rl: number; upd: number },
): RecGen {
  updateHeight(w, id);
  const n = w.nodes[id];
  const bf = balanceOf(w, id);
  yield emit(
    'visit',
    lines.upd,
    `Volviendo hacia la raíz: ${n.value} tiene altura ${n.height} y factor de balance ${bf > 0 ? '+' : ''}${bf}.`,
    {
      marks: { [id]: Math.abs(bf) > 1 ? 'error' : 'current' },
      vars: { nodo: n.value, altura: n.height, fb: bf },
    },
  );
  if (bf > 1) {
    const l = n.left as number;
    if (balanceOf(w, l) >= 0) {
      yield emit(
        'rotate',
        lines.ll,
        `Desbalance a la izquierda-izquierda (LL) en ${n.value}: rotación simple a la derecha.`,
        {
          marks: { [id]: 'rotate', [l]: 'rotate' },
          vars: { nodo: n.value, fb: bf, caso: 'LL' },
        },
      );
    } else {
      const lr = w.nodes[l].right as number;
      yield emit(
        'rotate',
        lines.lr,
        `Caso izquierda-derecha (LR) en ${n.value}: primero rotamos ${w.nodes[l].value} a la izquierda…`,
        {
          marks: { [id]: 'rotate', [l]: 'rotate', [lr]: 'rotate' },
          vars: { nodo: n.value, fb: bf, caso: 'LR' },
        },
      );
      n.left = rotateLeft(w, l);
      yield emit('rotate', lines.lr, '…y ahora es un caso LL.', {
        marks: { [id]: 'rotate', [n.left]: 'rotate' },
        vars: { caso: 'LR' },
      });
    }
    const r = rotateRight(w, id);
    attach(r);
    yield emit(
      'rotate',
      lines.ll,
      `Rotación a la derecha: ${w.nodes[r].value} sube y ${n.value} baja a su derecha. El inorden no cambia.`,
      {
        marks: { [r]: 'new', [id]: 'rotate' },
        vars: { nueva_raíz: w.nodes[r].value },
      },
    );
    return r;
  }
  if (bf < -1) {
    const rr = n.right as number;
    if (balanceOf(w, rr) <= 0) {
      yield emit(
        'rotate',
        lines.rr,
        `Desbalance derecha-derecha (RR) en ${n.value}: rotación simple a la izquierda.`,
        {
          marks: { [id]: 'rotate', [rr]: 'rotate' },
          vars: { nodo: n.value, fb: bf, caso: 'RR' },
        },
      );
    } else {
      const rl = w.nodes[rr].left as number;
      yield emit(
        'rotate',
        lines.rl,
        `Caso derecha-izquierda (RL) en ${n.value}: primero rotamos ${w.nodes[rr].value} a la derecha…`,
        {
          marks: { [id]: 'rotate', [rr]: 'rotate', [rl]: 'rotate' },
          vars: { nodo: n.value, fb: bf, caso: 'RL' },
        },
      );
      n.right = rotateRight(w, rr);
      yield emit('rotate', lines.rl, '…y ahora es un caso RR.', {
        marks: { [id]: 'rotate', [n.right]: 'rotate' },
        vars: { caso: 'RL' },
      });
    }
    const r = rotateLeft(w, id);
    attach(r);
    yield emit(
      'rotate',
      lines.rr,
      `Rotación a la izquierda: ${w.nodes[r].value} sube y ${n.value} baja a su izquierda.`,
      {
        marks: { [r]: 'new', [id]: 'rotate' },
        vars: { nueva_raíz: w.nodes[r].value },
      },
    );
    return r;
  }
  return id;
}

const AVL_INSERT_PSEUDO = [
  'insertar(nodo, valor):',
  '  si nodo = nulo: retornar nuevo Nodo(valor)',
  '  si valor < nodo.valor: nodo.izq ← insertar(nodo.izq, valor)',
  '  si no si valor > nodo.valor: nodo.der ← insertar(nodo.der, valor)',
  '  actualizar la altura;  fb ← altura(izq) − altura(der)',
  '  ▹ si |fb| > 1 hay desbalance:',
  '  si fb > 1 y fb(izq) ≥ 0: retornar rotarDerecha(nodo)               ▹ LL',
  '  si fb < −1 y fb(der) ≤ 0: retornar rotarIzquierda(nodo)            ▹ RR',
  '  si fb > 1: nodo.izq ← rotarIzquierda(nodo.izq); retornar rotarDerecha(nodo)   ▹ LR',
  '  si fb < −1: nodo.der ← rotarDerecha(nodo.der); retornar rotarIzquierda(nodo)  ▹ RL',
  '  retornar nodo',
];

const INSERT_LINES = { upd: 5, ll: 7, rr: 8, lr: 9, rl: 10 };
const DELETE_LINES = { upd: 7, ll: 8, rr: 8, lr: 8, rl: 8 };

export function* avlInsert(snap: TreeSnap, value: number): Gen {
  const { w, emit } = setup(snap);
  function* rec(id: number | null, attach: Attach, path: number[]): RecGen {
    if (id === null) {
      const n = newNode(w, value);
      attach(n.id);
      yield emit('insert', 2, `Insertamos ${value} como hoja (como en un ABB común).`, {
        marks: { ...pathMarks(path), [n.id]: 'new' },
        vars: { valor: value },
      });
      return n.id;
    }
    const n = w.nodes[id];
    if (value === n.value) {
      yield emit('found', 4, `${value} ya está: no se insertan duplicados.`, {
        marks: { [id]: 'found' },
        vars: { valor: value },
      });
      return id;
    }
    const left = value < n.value;
    yield emit(
      'compare',
      left ? 3 : 4,
      `${value} ${left ? '<' : '>'} ${n.value}: bajamos a la ${left ? 'izquierda' : 'derecha'}.`,
      {
        marks: pathMarks(path, id),
        vars: { valor: value, nodo: n.value },
      },
    );
    const before = left ? n.left : n.right;
    yield* rec(before, (c) => (left ? (n.left = c) : (n.right = c)), [...path, id]);
    return yield* rebalance(w, id, attach, emit, INSERT_LINES);
  }
  yield* rec(w.root, (c) => (w.root = c), []);
  yield emit(
    'done',
    11,
    `Listo. Altura ${treeHeight(w)} con ${Object.keys(w.nodes).length} nodos: el AVL garantiza altura O(log n).`,
    {
      vars: { altura: treeHeight(w), nodos: Object.keys(w.nodes).length },
    },
  );
  return w;
}

export function* avlDelete(snap: TreeSnap, value: number): Gen {
  const { w, emit } = setup(snap);
  let found = false;
  function* rec(id: number | null, val: number, attach: Attach, path: number[]): RecGen {
    if (id === null) return null;
    const n = w.nodes[id];
    if (val !== n.value) {
      const left = val < n.value;
      yield emit(
        'compare',
        2,
        `${val} ${left ? '<' : '>'} ${n.value}: bajamos a la ${left ? 'izquierda' : 'derecha'}.`,
        {
          marks: pathMarks(path, id),
          vars: { valor: val, nodo: n.value },
        },
      );
      const child = left ? n.left : n.right;
      if (child === null) return id;
      yield* rec(child, val, (c) => (left ? (n.left = c) : (n.right = c)), [...path, id]);
      return yield* rebalance(w, id, attach, emit, DELETE_LINES);
    }
    found = true;
    if (n.left === null || n.right === null) {
      const child = n.left ?? n.right;
      yield emit(
        'found',
        child === null ? 3 : 4,
        child === null
          ? `${val} es una hoja: se quita.`
          : `${val} tiene un solo hijo: el hijo ocupa su lugar.`,
        {
          marks: { [id]: 'remove' },
          vars: { valor: val },
        },
      );
      attach(child);
      delete w.nodes[id];
      yield emit(
        'remove',
        child === null ? 3 : 4,
        'Quitado. Ahora revisamos el balance hacia arriba.',
        { vars: { valor: val } },
      );
      return child;
    }
    let s = w.nodes[n.right];
    while (s.left !== null) s = w.nodes[s.left];
    yield emit('found', 5, `${val} tiene dos hijos: lo reemplazamos por su sucesor ${s.value}.`, {
      marks: { [id]: 'remove', [s.id]: 'current' },
      vars: { valor: val, sucesor: s.value },
    });
    n.value = s.value;
    yield emit('swap', 6, `Copiamos ${s.value} y borramos el sucesor del subárbol derecho.`, {
      marks: { [id]: 'new' },
      vars: { sucesor: s.value },
    });
    yield* rec(n.right, s.value, (c) => (n.right = c), [...path, id]);
    return yield* rebalance(w, id, attach, emit, DELETE_LINES);
  }
  yield* rec(w.root, value, (c) => (w.root = c), []);
  if (!found) yield emit('error', 2, `${value} no está en el árbol.`, { vars: { valor: value } });
  else
    yield emit('done', 9, `Listo. Altura ${treeHeight(w)}.`, { vars: { altura: treeHeight(w) } });
  return w;
}

export const avlDef: StructureDef<TreeSnap> = {
  view: 'avl',
  meta: {
    id: 'avl',
    name: 'Árbol AVL',
    category: 'estructuras',
    summary:
      'Un ABB que se autobalancea: en cada nodo, las alturas de sus dos subárboles difieren a lo sumo en 1. Si se rompe, se corrige con rotaciones.',
    pseudocode: AVL_INSERT_PSEUDO,
    complexity: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)', space: 'O(n)' },
    whenToUse: [
      'Necesitás O(log n) garantizado aunque los datos lleguen ordenados.',
      'Muchas más búsquedas que modificaciones (es más rígido que un rojinegro, así que busca algo más rápido).',
    ],
    avoidWhen: ['Muchísimas inserciones/borrados: un árbol rojinegro rota menos.'],
  },
  opCosts: [
    { op: 'buscar / insertar / eliminar', cost: 'O(log n) garantizado' },
    { op: 'rotación', cost: 'O(1)' },
  ],
  empty: emptyTree,
  initial: () => buildTree([30, 20, 40, 10, 25], avlInsert),
  ops: [
    {
      id: 'insertar',
      label: 'Insertar',
      input: 'value',
      pseudocode: AVL_INSERT_PSEUDO,
      run: (s, v) => avlInsert(s, v),
    },
    { ...SEARCH_OP },
    {
      id: 'eliminar',
      label: 'Eliminar',
      input: 'value',
      pseudocode: [
        'eliminar(nodo, valor):',
        '  bajar como en un ABB hasta encontrar el valor',
        '  si es hoja: quitarlo',
        '  si tiene un hijo: el hijo ocupa su lugar',
        '  si tiene dos hijos: s ← sucesor (mínimo del subárbol derecho)',
        '    copiar s.valor en el nodo y eliminar s del subárbol derecho',
        '  al volver de la recursión, en cada nodo del camino:',
        '    actualizar la altura y, si |fb| > 1, rotar (LL, RR, LR o RL)',
        'retornar',
      ],
      run: (s, v) => avlDelete(s, v),
    },
    ...TRAVERSAL_OPS,
  ],
};
