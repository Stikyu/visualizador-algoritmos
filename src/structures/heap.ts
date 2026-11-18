import { clone, emitter, type Cell, type StructStep, type StructureDef } from './types';

/** Min-heap binario guardado en un arreglo: los hijos de i están en 2i+1 y 2i+2. */
export interface HeapSnap {
  readonly items: readonly Cell[];
  readonly nextId: number;
}

type Gen = Generator<StructStep<HeapSnap>, HeapSnap, void>;
const parent = (i: number) => Math.floor((i - 1) / 2);

export function* heapInsert(snap: HeapSnap, value: number): Gen {
  const s = clone(snap) as { items: Cell[]; nextId: number };
  const emit = emitter<HeapSnap>(() => clone(s));
  const cell = { id: s.nextId++, value };
  s.items.push(cell);
  let i = s.items.length - 1;
  yield emit(
    'insert',
    1,
    `Agregamos ${value} al final del arreglo: es la próxima hoja libre (el árbol sigue completo).`,
    {
      marks: { [cell.id]: 'new' },
      vars: { i, valor: value },
    },
  );
  while (i > 0) {
    const p = parent(i);
    yield emit(
      'compare',
      3,
      `¿Su padre A[${p}] = ${s.items[p].value} es mayor que ${s.items[i].value}?`,
      {
        marks: { [s.items[i].id]: 'current', [s.items[p].id]: 'compare' },
        vars: { i, padre: p },
      },
    );
    if (s.items[p].value <= s.items[i].value) break;
    [s.items[i], s.items[p]] = [s.items[p], s.items[i]];
    yield emit('swap', 4, `Sí: lo subimos intercambiándolo con su padre (sift-up).`, {
      marks: { [s.items[p].id]: 'swap', [s.items[i].id]: 'swap' },
      vars: { i, padre: p },
    });
    i = p;
  }
  yield emit(
    'done',
    5,
    i === 0
      ? `${value} llegó a la raíz: es el nuevo mínimo.`
      : 'El padre es menor o igual: se cumple la propiedad de heap.',
    {
      marks: { [cell.id]: 'found' },
      vars: { i },
    },
  );
  return s;
}

export function* heapExtract(snap: HeapSnap): Gen {
  const s = clone(snap) as { items: Cell[]; nextId: number };
  const emit = emitter<HeapSnap>(() => clone(s));
  if (s.items.length === 0) {
    yield emit('error', 1, 'El heap está vacío.', {});
    return s;
  }
  const min = s.items[0];
  yield emit('found', 2, `El mínimo siempre está en la raíz: ${min.value}.`, {
    marks: { [min.id]: 'remove' },
    vars: { mín: min.value },
  });
  const last = s.items.pop()!;
  if (s.items.length === 0) {
    yield emit('remove', 3, 'Era el único elemento: el heap queda vacío.', {
      vars: { retorna: min.value },
    });
    return s;
  }
  s.items[0] = last;
  yield emit('remove', 3, `Movemos la última hoja (${last.value}) a la raíz y la hundimos.`, {
    marks: { [last.id]: 'current' },
    vars: { retorna: min.value },
  });
  let i = 0;
  const n = s.items.length;
  for (;;) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    let m = i;
    if (l < n && s.items[l].value < s.items[m].value) m = l;
    if (r < n && s.items[r].value < s.items[m].value) m = r;
    const marks: Record<string, 'current' | 'compare'> = { [s.items[i].id]: 'current' };
    if (l < n) marks[s.items[l].id] = 'compare';
    if (r < n) marks[s.items[r].id] = 'compare';
    yield emit(
      'compare',
      6,
      `Comparamos ${s.items[i].value} con sus hijos${l < n ? ` ${s.items[l].value}` : ''}${r < n ? ` y ${s.items[r].value}` : ''}.`,
      {
        marks,
        vars: { i, izq: l < n ? l : null, der: r < n ? r : null, menor: m },
      },
    );
    if (m === i) break;
    [s.items[i], s.items[m]] = [s.items[m], s.items[i]];
    yield emit(
      'swap',
      8,
      `Intercambiamos con el hijo menor (${s.items[i].value}) y seguimos bajando (sift-down).`,
      {
        marks: { [s.items[i].id]: 'swap', [s.items[m].id]: 'swap' },
        vars: { i, menor: m },
      },
    );
    i = m;
  }
  yield emit('done', 7, `Ya es menor o igual que sus hijos. Se extrajo ${min.value} en O(log n).`, {
    marks: { [s.items[i].id]: 'found' },
    vars: { retorna: min.value },
  });
  return s;
}

export function* heapPeek(snap: HeapSnap): Gen {
  const emit = emitter<HeapSnap>(() => snap);
  if (snap.items.length === 0) {
    yield emit('error', 1, 'El heap está vacío.', {});
  } else {
    yield emit('found', 2, `El mínimo es ${snap.items[0].value}, en O(1).`, {
      marks: { [snap.items[0].id]: 'found' },
    });
  }
  return snap;
}

export function isMinHeap(s: HeapSnap): boolean {
  return s.items.every((it, i) => i === 0 || s.items[parent(i)].value <= it.value);
}

const HEAP_INSERT = [
  'A.agregar(valor)   ▹ en la próxima hoja libre',
  'i ← n − 1',
  'mientras i > 0 y A[padre(i)] > A[i]     ▹ padre(i) = ⌊(i − 1) / 2⌋',
  '  intercambiar A[i] y A[padre(i)]',
  '  i ← padre(i)',
];

export const heapDef: StructureDef<HeapSnap> = {
  view: 'heap',
  meta: {
    id: 'heap-binario',
    name: 'Heap binario (mínimo)',
    category: 'estructuras',
    summary:
      'Árbol binario completo guardado en un arreglo donde cada padre es ≤ que sus hijos: el mínimo está siempre en la raíz.',
    pseudocode: HEAP_INSERT,
    complexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(n)' },
    whenToUse: [
      'Colas de prioridad: Dijkstra, Prim, planificación de tareas, eventos.',
      'Los k elementos más grandes/chicos de un flujo (heap de tamaño k).',
      'Heap sort.',
    ],
    avoidWhen: ['Necesitás buscar un elemento arbitrario (O(n)) o recorrer en orden.'],
  },
  opCosts: [
    { op: 'ver mínimo', cost: 'O(1)' },
    { op: 'insertar', cost: 'O(log n)' },
    { op: 'extraer mínimo', cost: 'O(log n)' },
    { op: 'construir desde un arreglo', cost: 'O(n)' },
  ],
  empty: () => ({ items: [], nextId: 1 }),
  initial: () => ({
    items: [3, 8, 5, 12, 10, 9, 15].map((value, i) => ({ id: i + 1, value })),
    nextId: 8,
  }),
  ops: [
    {
      id: 'insertar',
      label: 'Insertar',
      input: 'value',
      pseudocode: HEAP_INSERT,
      run: (s, v) => heapInsert(s, v),
    },
    {
      id: 'extraer',
      label: 'Extraer mínimo',
      input: 'none',
      pseudocode: [
        'si el heap está vacío: error',
        'mín ← A[0]',
        'A[0] ← A[n − 1];  quitar la última posición',
        'i ← 0',
        'repetir',
        '  menor ← el menor entre A[i], A[2i + 1] y A[2i + 2]',
        '  si menor = i: terminar',
        '  intercambiar A[i] y A[menor];  i ← menor',
        'retornar mín',
      ],
      run: (s) => heapExtract(s),
    },
    {
      id: 'ver',
      label: 'Ver mínimo',
      input: 'none',
      pseudocode: ['si el heap está vacío: error', 'retornar A[0]'],
      run: (s) => heapPeek(s),
    },
  ],
};
// La ficha muestra el pseudocódigo de insertar.
