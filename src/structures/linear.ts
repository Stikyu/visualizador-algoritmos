import { clone, emitter, type Cell, type StructStep, type StructureDef } from './types';

// ===========================================================================
// Pila (arreglo con capacidad fija)
// ===========================================================================

export interface StackSnap {
  readonly items: readonly Cell[]; // items[0] = fondo, items[last] = tope
  readonly capacity: number;
  readonly nextId: number;
}

type W<T> = { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] };

export const emptyStack = (capacity = 8): StackSnap => ({ items: [], capacity, nextId: 1 });

const topPtr = (s: { items: readonly Cell[] }) => ({
  tope: s.items.length ? s.items[s.items.length - 1].id : null,
});

export function* stackPush(
  snap: StackSnap,
  value: number,
): Generator<StructStep<StackSnap>, StackSnap, void> {
  const s = clone(snap) as W<StackSnap>;
  const emit = emitter(() => clone(s) as StackSnap);
  const vars = () => ({ tope: s.items.length - 1, capacidad: s.capacity, valor: value });
  if (s.items.length === s.capacity) {
    yield emit(
      'error',
      1,
      `La pila está llena (${s.capacity} elementos): desbordamiento (stack overflow).`,
      {
        vars: vars(),
        pointers: topPtr(s),
      },
    );
    return s;
  }
  yield emit('note', 2, `Hay lugar: el tope pasa de ${s.items.length - 1} a ${s.items.length}.`, {
    vars: vars(),
    pointers: topPtr(s),
  });
  const cell = { id: s.nextId++, value };
  s.items.push(cell);
  yield emit('push', 3, `Apilamos ${value} en el tope. Push es O(1): no se mueve nada más.`, {
    vars: vars(),
    marks: { [cell.id]: 'new' },
    pointers: topPtr(s),
  });
  return s;
}

export function* stackPop(snap: StackSnap): Generator<StructStep<StackSnap>, StackSnap, void> {
  const s = clone(snap) as W<StackSnap>;
  const emit = emitter(() => clone(s) as StackSnap);
  if (s.items.length === 0) {
    yield emit('error', 1, 'La pila está vacía: no hay nada que desapilar (subdesbordamiento).', {
      vars: { tope: -1 },
    });
    return s;
  }
  const top = s.items[s.items.length - 1];
  yield emit('pop', 2, `El elemento del tope es ${top.value}.`, {
    vars: { tope: s.items.length - 1, valor: top.value },
    marks: { [top.id]: 'remove' },
    pointers: topPtr(s),
  });
  s.items.pop();
  yield emit(
    'pop',
    3,
    `Bajamos el tope: ${top.value} sale de la pila (LIFO: el último en entrar es el primero en salir).`,
    {
      vars: { tope: s.items.length - 1, retorna: top.value },
      pointers: topPtr(s),
    },
  );
  return s;
}

export function* stackPeek(snap: StackSnap): Generator<StructStep<StackSnap>, StackSnap, void> {
  const emit = emitter(() => snap);
  if (snap.items.length === 0) {
    yield emit('error', 1, 'La pila está vacía.', { vars: { tope: -1 } });
    return snap;
  }
  const top = snap.items[snap.items.length - 1];
  yield emit('found', 2, `El tope es ${top.value} (se mira sin sacarlo).`, {
    vars: { tope: snap.items.length - 1, retorna: top.value },
    marks: { [top.id]: 'found' },
    pointers: topPtr(snap),
  });
  return snap;
}

export const stackDef: StructureDef<StackSnap> = {
  view: 'stack',
  meta: {
    id: 'pila',
    name: 'Pila',
    category: 'estructuras',
    summary: 'LIFO: el último elemento en entrar es el primero en salir. Como una pila de platos.',
    pseudocode: [
      'push(valor):',
      'si tope = capacidad − 1: error',
      'tope ← tope + 1;  A[tope] ← valor',
    ],
    complexity: { best: 'O(1)', average: 'O(1)', worst: 'O(1)', space: 'O(n)' },
    whenToUse: [
      'Deshacer/rehacer, historial del navegador.',
      'Evaluar expresiones y verificar paréntesis balanceados.',
      'Simular recursión (DFS iterativo): la pila de llamadas ES una pila.',
    ],
    avoidWhen: ['Necesitás acceder a elementos del medio o del fondo.'],
  },
  opCosts: [
    { op: 'push', cost: 'O(1)' },
    { op: 'pop', cost: 'O(1)' },
    { op: 'peek', cost: 'O(1)' },
  ],
  empty: () => emptyStack(),
  initial: () => ({
    items: [12, 7, 31].map((value, i) => ({ id: i + 1, value })),
    capacity: 8,
    nextId: 4,
  }),
  ops: [
    {
      id: 'push',
      label: 'Apilar (push)',
      input: 'value',
      pseudocode: [
        'si tope = capacidad − 1: error "desbordamiento"',
        'tope ← tope + 1',
        'A[tope] ← valor',
      ],
      run: (s, v) => stackPush(s, v),
    },
    {
      id: 'pop',
      label: 'Desapilar (pop)',
      input: 'none',
      pseudocode: [
        'si la pila está vacía: error',
        'valor ← A[tope]',
        'tope ← tope − 1;  retornar valor',
      ],
      run: (s) => stackPop(s),
    },
    {
      id: 'peek',
      label: 'Ver tope (peek)',
      input: 'none',
      pseudocode: ['si la pila está vacía: error', 'retornar A[tope]'],
      run: (s) => stackPeek(s),
    },
  ],
};

// ===========================================================================
// Cola (enlazada, sin límite)
// ===========================================================================

export interface QueueSnap {
  readonly items: readonly Cell[]; // items[0] = frente
  readonly nextId: number;
}

const queuePtr = (s: QueueSnap | W<QueueSnap>) => ({
  frente: s.items.length ? s.items[0].id : null,
  fin: s.items.length ? s.items[s.items.length - 1].id : null,
});

export function* enqueue(
  snap: QueueSnap,
  value: number,
): Generator<StructStep<QueueSnap>, QueueSnap, void> {
  const s = clone(snap) as W<QueueSnap>;
  const emit = emitter(() => clone(s) as QueueSnap);
  const cell = { id: s.nextId++, value };
  s.items.push(cell);
  yield emit('enqueue', 1, `Creamos un nodo con ${value}.`, {
    marks: { [cell.id]: 'new' },
    pointers: {
      frente: s.items.length > 1 ? s.items[0].id : null,
      fin: s.items.length > 1 ? s.items[s.items.length - 2].id : null,
    },
    vars: { valor: value, tamaño: s.items.length - 1 },
  });
  yield emit(
    'enqueue',
    s.items.length === 1 ? 2 : 3,
    s.items.length === 1
      ? 'La cola estaba vacía: el nuevo nodo es a la vez frente y fin.'
      : `Lo enganchamos detrás del fin actual.`,
    {
      marks: { [cell.id]: 'new' },
      pointers: queuePtr(s),
      vars: { valor: value, tamaño: s.items.length },
    },
  );
  yield emit('enqueue', 4, `fin ← nodo. Encolar es O(1) gracias al puntero al fin.`, {
    pointers: queuePtr(s),
    vars: { tamaño: s.items.length },
  });
  return s;
}

export function* dequeue(snap: QueueSnap): Generator<StructStep<QueueSnap>, QueueSnap, void> {
  const s = clone(snap) as W<QueueSnap>;
  const emit = emitter(() => clone(s) as QueueSnap);
  if (s.items.length === 0) {
    yield emit('error', 1, 'La cola está vacía.', { vars: { tamaño: 0 } });
    return s;
  }
  const first = s.items[0];
  yield emit('dequeue', 2, `El frente es ${first.value}.`, {
    marks: { [first.id]: 'remove' },
    pointers: queuePtr(s),
    vars: { valor: first.value },
  });
  s.items.shift();
  yield emit(
    'dequeue',
    3,
    `frente ← frente.siguiente: ${first.value} sale (FIFO: el primero en entrar es el primero en salir).`,
    {
      pointers: queuePtr(s),
      vars: { retorna: first.value, tamaño: s.items.length },
    },
  );
  if (s.items.length === 0) {
    yield emit('note', 4, 'La cola quedó vacía: fin también pasa a nulo.', { vars: { tamaño: 0 } });
  }
  return s;
}

export function* queuePeek(snap: QueueSnap): Generator<StructStep<QueueSnap>, QueueSnap, void> {
  const emit = emitter(() => snap);
  if (snap.items.length === 0) {
    yield emit('error', 1, 'La cola está vacía.', {});
    return snap;
  }
  yield emit('found', 2, `El frente es ${snap.items[0].value}.`, {
    marks: { [snap.items[0].id]: 'found' },
    pointers: queuePtr(snap),
    vars: { retorna: snap.items[0].value },
  });
  return snap;
}

export const queueDef: StructureDef<QueueSnap> = {
  view: 'queue',
  meta: {
    id: 'cola',
    name: 'Cola',
    category: 'estructuras',
    summary: 'FIFO: el primero en llegar es el primero en ser atendido. Como la fila del banco.',
    pseudocode: ['encolar(valor):', 'fin.siguiente ← nodo', 'fin ← nodo'],
    complexity: { best: 'O(1)', average: 'O(1)', worst: 'O(1)', space: 'O(n)' },
    whenToUse: [
      'BFS (recorrido por niveles en árboles y grafos).',
      'Colas de tareas, impresión, mensajes: procesar en orden de llegada.',
      'Buffers entre un productor y un consumidor.',
    ],
    avoidWhen: ['Necesitás prioridades: usá una cola de prioridad (heap).'],
  },
  opCosts: [
    { op: 'encolar', cost: 'O(1)' },
    { op: 'desencolar', cost: 'O(1)' },
    { op: 'frente', cost: 'O(1)' },
  ],
  empty: () => ({ items: [], nextId: 1 }),
  initial: () => ({ items: [8, 21, 5].map((value, i) => ({ id: i + 1, value })), nextId: 4 }),
  ops: [
    {
      id: 'encolar',
      label: 'Encolar',
      input: 'value',
      pseudocode: [
        'nodo ← nuevo Nodo(valor)',
        'si la cola está vacía: frente ← nodo',
        'si no: fin.siguiente ← nodo',
        'fin ← nodo',
      ],
      run: (s, v) => enqueue(s, v),
    },
    {
      id: 'desencolar',
      label: 'Desencolar',
      input: 'none',
      pseudocode: [
        'si la cola está vacía: error',
        'valor ← frente.valor',
        'frente ← frente.siguiente',
        'si frente = nulo: fin ← nulo',
        'retornar valor',
      ],
      run: (s) => dequeue(s),
    },
    {
      id: 'frente',
      label: 'Ver frente',
      input: 'none',
      pseudocode: ['si la cola está vacía: error', 'retornar frente.valor'],
      run: (s) => queuePeek(s),
    },
  ],
};

// ===========================================================================
// Cola circular (arreglo de capacidad fija, índices módulo capacidad)
// ===========================================================================

export interface CircularSnap {
  readonly slots: readonly (Cell | null)[];
  readonly front: number;
  readonly size: number;
  readonly nextId: number;
}

const circPtr = (s: CircularSnap | W<CircularSnap>) => ({
  frente: s.size > 0 ? s.front : null,
  fin: s.size > 0 ? (s.front + s.size - 1) % s.slots.length : null,
});

export function* circularEnqueue(
  snap: CircularSnap,
  value: number,
): Generator<StructStep<CircularSnap>, CircularSnap, void> {
  const s = clone(snap) as W<CircularSnap>;
  const emit = emitter(() => clone(s) as CircularSnap);
  const cap = s.slots.length;
  if (s.size === cap) {
    yield emit('error', 1, `La cola está llena (${cap}/${cap}).`, {
      vars: { frente: s.front, tamaño: s.size, capacidad: cap },
      pointers: circPtr(s),
    });
    return s;
  }
  const rear = (s.front + s.size) % cap;
  yield emit(
    'note',
    2,
    `fin = (frente + tamaño) mod capacidad = (${s.front} + ${s.size}) mod ${cap} = ${rear}${s.front + s.size >= cap ? ' → ¡dimos la vuelta!' : ''}.`,
    {
      vars: { frente: s.front, tamaño: s.size, fin: rear },
      marks: { [`slot-${rear}`]: 'current' },
      pointers: circPtr(s),
    },
  );
  const cell = { id: s.nextId++, value };
  s.slots[rear] = cell;
  yield emit('enqueue', 3, `A[${rear}] ← ${value}.`, {
    vars: { frente: s.front, tamaño: s.size, fin: rear },
    marks: { [`slot-${rear}`]: 'new' },
    pointers: circPtr(s),
  });
  s.size++;
  yield emit(
    'enqueue',
    4,
    `tamaño = ${s.size}. Nunca se mueven elementos: sólo avanzan los índices.`,
    {
      vars: { frente: s.front, tamaño: s.size, fin: rear },
      pointers: circPtr(s),
    },
  );
  return s;
}

export function* circularDequeue(
  snap: CircularSnap,
): Generator<StructStep<CircularSnap>, CircularSnap, void> {
  const s = clone(snap) as W<CircularSnap>;
  const emit = emitter(() => clone(s) as CircularSnap);
  const cap = s.slots.length;
  if (s.size === 0) {
    yield emit('error', 1, 'La cola está vacía.', { vars: { frente: s.front, tamaño: 0 } });
    return s;
  }
  const cell = s.slots[s.front] as Cell;
  yield emit('dequeue', 2, `El frente está en A[${s.front}] = ${cell.value}.`, {
    vars: { frente: s.front, tamaño: s.size },
    marks: { [`slot-${s.front}`]: 'remove' },
    pointers: circPtr(s),
  });
  s.slots[s.front] = null;
  yield emit('dequeue', 3, `Liberamos A[${s.front}].`, {
    vars: { frente: s.front, tamaño: s.size },
    marks: { [`slot-${s.front}`]: 'remove' },
    pointers: circPtr(s),
  });
  const old = s.front;
  s.front = (s.front + 1) % cap;
  s.size--;
  yield emit('dequeue', 4, `frente = (${old} + 1) mod ${cap} = ${s.front}.`, {
    vars: { frente: s.front, tamaño: s.size, retorna: cell.value },
    pointers: circPtr(s),
  });
  return s;
}

export const circularDef: StructureDef<CircularSnap> = {
  view: 'circular',
  meta: {
    id: 'cola-circular',
    name: 'Cola circular',
    category: 'estructuras',
    summary:
      'Una cola sobre un arreglo fijo cuyos índices "dan la vuelta" con módulo: reutiliza el espacio liberado sin mover elementos.',
    pseudocode: ['encolar(valor):', 'fin ← (frente + tamaño) mod capacidad', 'A[fin] ← valor'],
    complexity: { best: 'O(1)', average: 'O(1)', worst: 'O(1)', space: 'O(capacidad)' },
    whenToUse: [
      'Buffers de tamaño fijo: audio, teclado, logs recientes, redes.',
      'Cuando no querés pedir memoria dinámica (sistemas embebidos).',
    ],
    avoidWhen: ['No sabés de antemano cuántos elementos vas a tener.'],
  },
  opCosts: [
    { op: 'encolar', cost: 'O(1)' },
    { op: 'desencolar', cost: 'O(1)' },
  ],
  empty: () => ({ slots: new Array<Cell | null>(8).fill(null), front: 0, size: 0, nextId: 1 }),
  initial: () => {
    const slots = new Array<Cell | null>(8).fill(null);
    [14, 3, 27, 9].forEach((value, k) => (slots[(5 + k) % 8] = { id: k + 1, value }));
    return { slots, front: 5, size: 4, nextId: 5 };
  },
  ops: [
    {
      id: 'encolar',
      label: 'Encolar',
      input: 'value',
      pseudocode: [
        'si tamaño = capacidad: error "cola llena"',
        'fin ← (frente + tamaño) mod capacidad',
        'A[fin] ← valor',
        'tamaño ← tamaño + 1',
      ],
      run: (s, v) => circularEnqueue(s, v),
    },
    {
      id: 'desencolar',
      label: 'Desencolar',
      input: 'none',
      pseudocode: [
        'si tamaño = 0: error "cola vacía"',
        'valor ← A[frente]',
        'A[frente] ← vacío',
        'frente ← (frente + 1) mod capacidad;  tamaño ← tamaño − 1',
      ],
      run: (s) => circularDequeue(s),
    },
  ],
};
