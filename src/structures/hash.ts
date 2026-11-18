import { drain } from '../algorithms/record';
import { clone, emitter, type Cell, type StructStep, type StructureDef } from './types';

/** Función de hash: k mod m, siempre en [0, m). */
export const hashOf = (k: number, m: number) => ((k % m) + m) % m;

const hashText = (k: number, m: number) => `h(${k}) = ${k} mod ${m} = ${hashOf(k, m)}`;
const load = (count: number, m: number) => Math.round((count / m) * 100) / 100;

// ===========================================================================
// Encadenamiento: cada cubeta es una lista
// ===========================================================================

export interface ChainSnap {
  readonly buckets: readonly (readonly Cell[])[];
  readonly nextId: number;
}

type ChainGen = Generator<StructStep<ChainSnap>, ChainSnap, void>;
type ChainWork = { buckets: Cell[][]; nextId: number };

const countChain = (s: ChainWork | ChainSnap) => s.buckets.reduce((a, b) => a + b.length, 0);

function chainSetup(snap: ChainSnap) {
  const s = clone(snap) as ChainWork;
  return { s, emit: emitter<ChainSnap>(() => clone(s)) };
}

export function* chainInsert(snap: ChainSnap, key: number): ChainGen {
  const { s, emit } = chainSetup(snap);
  const m = s.buckets.length;
  const i = hashOf(key, m);
  yield emit('hash', 1, `${hashText(key, m)}: va a la cubeta ${i}.`, {
    marks: { [`slot-${i}`]: 'current' },
    vars: { clave: key, m, i },
  });
  for (const c of s.buckets[i]) {
    yield emit('compare', 3, `¿${c.value} = ${key}?`, {
      marks: { [`slot-${i}`]: 'current', [c.id]: 'compare' },
      vars: { clave: key, i },
    });
    if (c.value === key) {
      yield emit('found', 3, `${key} ya estaba: no se duplica.`, {
        marks: { [c.id]: 'found' },
        vars: { clave: key, i },
      });
      return s;
    }
  }
  const collision = s.buckets[i].length > 0;
  const cell = { id: s.nextId++, value: key };
  s.buckets[i].push(cell);
  yield emit(
    'insert',
    4,
    collision
      ? `Colisión: la cubeta ${i} ya tenía elementos, así que ${key} se agrega a su lista.`
      : `La cubeta ${i} estaba vacía: ${key} entra directo.`,
    {
      marks: { [cell.id]: 'new', [`slot-${i}`]: collision ? 'error' : 'current' },
      vars: { clave: key, i, 'factor de carga': load(countChain(s), m) },
    },
  );
  return s;
}

export function* chainSearch(snap: ChainSnap, key: number): ChainGen {
  const { s, emit } = chainSetup(snap);
  const m = s.buckets.length;
  const i = hashOf(key, m);
  yield emit('hash', 1, `${hashText(key, m)}: sólo hay que mirar la cubeta ${i}.`, {
    marks: { [`slot-${i}`]: 'current' },
    vars: { clave: key, i },
  });
  for (const c of s.buckets[i]) {
    yield emit('compare', 3, `¿${c.value} = ${key}?`, {
      marks: { [`slot-${i}`]: 'current', [c.id]: 'compare' },
      vars: { clave: key, i },
    });
    if (c.value === key) {
      yield emit(
        'found',
        3,
        '¡Encontrado! En promedio cada lista tiene α = n/m elementos: buscar cuesta O(1 + α).',
        { marks: { [c.id]: 'found' }, vars: { clave: key, i } },
      );
      return s;
    }
  }
  yield emit('error', 4, `${key} no está.`, {
    marks: { [`slot-${i}`]: 'current' },
    vars: { clave: key, i },
  });
  return s;
}

export function* chainDelete(snap: ChainSnap, key: number): ChainGen {
  const { s, emit } = chainSetup(snap);
  const m = s.buckets.length;
  const i = hashOf(key, m);
  yield emit('hash', 1, `${hashText(key, m)}.`, {
    marks: { [`slot-${i}`]: 'current' },
    vars: { clave: key, i },
  });
  const idx = s.buckets[i].findIndex((c) => c.value === key);
  for (const c of s.buckets[i].slice(0, idx < 0 ? undefined : idx + 1)) {
    yield emit('compare', 2, `¿${c.value} = ${key}?`, {
      marks: { [c.id]: 'compare' },
      vars: { clave: key, i },
    });
  }
  if (idx < 0) {
    yield emit('error', 2, `${key} no está.`, { vars: { clave: key, i } });
    return s;
  }
  const cell = s.buckets[i][idx];
  yield emit('found', 3, 'Lo encontramos: se quita de la lista.', {
    marks: { [cell.id]: 'remove' },
    vars: { clave: key, i },
  });
  s.buckets[i].splice(idx, 1);
  yield emit('remove', 3, `${key} eliminado.`, {
    vars: { clave: key, 'factor de carga': load(countChain(s), m) },
  });
  return s;
}

export function chainFromKeys(keys: readonly number[], m = 7): ChainSnap {
  let s: ChainSnap = { buckets: Array.from({ length: m }, () => []), nextId: 1 };
  for (const k of keys) s = drain(chainInsert(s, k));
  return s;
}

const CHAIN_INSERT = [
  'i ← h(clave) = clave mod m',
  'recorrer la lista de la cubeta i',
  '  si la clave ya está: terminar',
  'agregar la clave a la lista de la cubeta i',
];

export const chainDef: StructureDef<ChainSnap> = {
  view: 'hash-chain',
  meta: {
    id: 'hash-encadenamiento',
    name: 'Tabla hash (encadenamiento)',
    category: 'estructuras',
    summary:
      'La función de hash elige una cubeta; las claves que colisionan comparten la cubeta en una lista.',
    pseudocode: CHAIN_INSERT,
    complexity: {
      best: 'O(1)',
      average: 'O(1 + α)',
      worst: 'O(n) (todo colisiona)',
      space: 'O(n + m)',
    },
    whenToUse: [
      'Diccionarios y conjuntos: búsqueda, inserción y borrado en O(1) promedio.',
      'Contar frecuencias, detectar duplicados, memoización.',
    ],
    avoidWhen: ['Necesitás las claves en orden o consultas por rango: usá un árbol balanceado.'],
  },
  opCosts: [
    { op: 'insertar / buscar / eliminar', cost: 'O(1 + α) promedio, α = n/m' },
    { op: 'peor caso', cost: 'O(n)' },
  ],
  empty: () => chainFromKeys([]),
  initial: () => chainFromKeys([10, 22, 15, 8, 29]),
  ops: [
    {
      id: 'insertar',
      label: 'Insertar',
      input: 'value',
      pseudocode: CHAIN_INSERT,
      run: (s, v) => chainInsert(s, v),
    },
    {
      id: 'buscar',
      label: 'Buscar',
      input: 'value',
      pseudocode: [
        'i ← h(clave)',
        'para cada elemento de la lista de la cubeta i',
        '  si elemento = clave: retornar encontrado',
        'retornar no encontrado',
      ],
      run: (s, v) => chainSearch(s, v),
    },
    {
      id: 'eliminar',
      label: 'Eliminar',
      input: 'value',
      pseudocode: [
        'i ← h(clave)',
        'buscar la clave en la lista de la cubeta i',
        'si está: quitarla de la lista',
      ],
      run: (s, v) => chainDelete(s, v),
    },
  ],
};

// ===========================================================================
// Direccionamiento abierto con sondeo lineal (y lápidas para borrar)
// ===========================================================================

export type Slot =
  { readonly kind: 'empty' } | { readonly kind: 'tomb' } | ({ readonly kind: 'full' } & Cell);

export interface OpenSnap {
  readonly slots: readonly Slot[];
  readonly nextId: number;
}

type OpenGen = Generator<StructStep<OpenSnap>, OpenSnap, void>;
type OpenWork = { slots: Slot[]; nextId: number };

function openSetup(snap: OpenSnap) {
  const s = clone(snap) as OpenWork;
  return { s, emit: emitter<OpenSnap>(() => clone(s)) };
}
const countOpen = (s: OpenWork | OpenSnap) => s.slots.filter((x) => x.kind === 'full').length;

export function* openInsert(snap: OpenSnap, key: number): OpenGen {
  const { s, emit } = openSetup(snap);
  const m = s.slots.length;
  let i = hashOf(key, m);
  let tomb: number | null = null;
  yield emit('hash', 1, `${hashText(key, m)}: probamos desde la posición ${i}.`, {
    marks: { [`slot-${i}`]: 'current' },
    vars: { clave: key, i },
  });
  for (let k = 0; k < m; k++) {
    const slot = s.slots[i];
    if (slot.kind === 'empty') {
      const at = tomb ?? i;
      s.slots[at] = { kind: 'full', id: s.nextId++, value: key };
      yield emit(
        'insert',
        3,
        `T[${i}] está vacía${tomb !== null ? `; reutilizamos la lápida de T[${tomb}]` : ''}: guardamos ${key} en T[${at}]${k > 0 ? ` después de ${k} sondeos` : ''}.`,
        {
          marks: { [`slot-${at}`]: 'new' },
          vars: { clave: key, i: at, sondeos: k + 1, 'factor de carga': load(countOpen(s), m) },
        },
      );
      return s;
    }
    if (slot.kind === 'full' && slot.value === key) {
      yield emit('found', 4, `${key} ya estaba en T[${i}].`, {
        marks: { [`slot-${i}`]: 'found' },
        vars: { clave: key, i },
      });
      return s;
    }
    if (slot.kind === 'tomb') {
      if (tomb === null) tomb = i;
      yield emit(
        'note',
        5,
        `T[${i}] es una lápida: la recordamos, pero seguimos por si la clave ya está más adelante.`,
        { marks: { [`slot-${i}`]: 'compare' }, vars: { clave: key, i, lápida: tomb } },
      );
    } else {
      yield emit(
        'compare',
        6,
        `Colisión: T[${i}] está ocupada por ${slot.value}. Probamos la siguiente: (${i} + 1) mod ${m} = ${(i + 1) % m}.`,
        { marks: { [`slot-${i}`]: 'error' }, vars: { clave: key, i, sondeos: k + 1 } },
      );
    }
    i = (i + 1) % m;
  }
  if (tomb !== null) {
    s.slots[tomb] = { kind: 'full', id: s.nextId++, value: key };
    yield emit('insert', 7, `Dimos la vuelta entera: usamos la lápida T[${tomb}].`, {
      marks: { [`slot-${tomb}`]: 'new' },
      vars: { clave: key },
    });
    return s;
  }
  yield emit('error', 7, 'La tabla está llena: habría que agrandarla y redistribuir (rehash).', {
    vars: { clave: key },
  });
  return s;
}

export function* openSearch(snap: OpenSnap, key: number): OpenGen {
  const { s, emit } = openSetup(snap);
  const m = s.slots.length;
  let i = hashOf(key, m);
  yield emit('hash', 1, `${hashText(key, m)}.`, {
    marks: { [`slot-${i}`]: 'current' },
    vars: { clave: key, i },
  });
  for (let k = 0; k < m; k++) {
    const slot = s.slots[i];
    if (slot.kind === 'empty') {
      yield emit(
        'error',
        3,
        `T[${i}] está vacía: si ${key} estuviera, habría aparecido antes. No está.`,
        { marks: { [`slot-${i}`]: 'current' }, vars: { clave: key, i, sondeos: k + 1 } },
      );
      return s;
    }
    if (slot.kind === 'full' && slot.value === key) {
      yield emit('found', 4, `¡Encontrado en T[${i}] con ${k + 1} sondeos!`, {
        marks: { [`slot-${i}`]: 'found' },
        vars: { clave: key, i, sondeos: k + 1 },
      });
      return s;
    }
    yield emit(
      'compare',
      5,
      slot.kind === 'tomb'
        ? `T[${i}] es una lápida: no corta la búsqueda, seguimos.`
        : `T[${i}] = ${slot.value} ≠ ${key}: seguimos.`,
      { marks: { [`slot-${i}`]: 'compare' }, vars: { clave: key, i, sondeos: k + 1 } },
    );
    i = (i + 1) % m;
  }
  yield emit('error', 6, `Recorrimos toda la tabla: ${key} no está.`, { vars: { clave: key } });
  return s;
}

export function* openDelete(snap: OpenSnap, key: number): OpenGen {
  const { s, emit } = openSetup(snap);
  const m = s.slots.length;
  let i = hashOf(key, m);
  yield emit('hash', 1, `${hashText(key, m)}. Buscamos como en buscar().`, {
    marks: { [`slot-${i}`]: 'current' },
    vars: { clave: key, i },
  });
  for (let k = 0; k < m; k++) {
    const slot = s.slots[i];
    if (slot.kind === 'empty') break;
    if (slot.kind === 'full' && slot.value === key) {
      s.slots[i] = { kind: 'tomb' };
      yield emit(
        'remove',
        2,
        `Encontrado en T[${i}]: dejamos una lápida. Si vaciáramos la celda, cortaríamos la cadena de sondeo de otras claves.`,
        { marks: { [`slot-${i}`]: 'remove' }, vars: { clave: key, i } },
      );
      return s;
    }
    yield emit('compare', 1, `T[${i}] no es ${key}: seguimos.`, {
      marks: { [`slot-${i}`]: 'compare' },
      vars: { clave: key, i },
    });
    i = (i + 1) % m;
  }
  yield emit('error', 1, `${key} no está.`, { vars: { clave: key } });
  return s;
}

export function openFromKeys(keys: readonly number[], m = 11): OpenSnap {
  let s: OpenSnap = {
    slots: Array.from({ length: m }, () => ({ kind: 'empty' as const })),
    nextId: 1,
  };
  for (const k of keys) s = drain(openInsert(s, k));
  return s;
}

const OPEN_INSERT = [
  'i ← h(clave);  lápida ← nula',
  'repetir m veces',
  '  si T[i] está vacía: guardar en lápida (si hubo) o en i; terminar',
  '  si T[i] = clave: ya existe, terminar',
  '  si T[i] es lápida y lápida = nula: lápida ← i',
  '  i ← (i + 1) mod m          ▹ colisión: sondeo lineal',
  'si lápida ≠ nula: T[lápida] ← clave;  si no: tabla llena',
];

export const openDef: StructureDef<OpenSnap> = {
  view: 'hash-open',
  meta: {
    id: 'hash-abierto',
    name: 'Tabla hash (direccionamiento abierto)',
    category: 'estructuras',
    summary:
      'Todas las claves viven en el mismo arreglo. Si la posición está ocupada, se prueba la siguiente (sondeo lineal). Borrar deja una "lápida".',
    pseudocode: OPEN_INSERT,
    complexity: { best: 'O(1)', average: 'O(1/(1 − α))', worst: 'O(n)', space: 'O(m)' },
    whenToUse: [
      'Cuando importa la localidad de caché: no hay punteros, todo es un arreglo contiguo.',
      'Tablas con factor de carga controlado (α ≤ 0,7).',
    ],
    avoidWhen: [
      'Factor de carga alto o muchos borrados: se forman racimos y lápidas que alargan los sondeos.',
    ],
  },
  opCosts: [
    { op: 'insertar / buscar / eliminar', cost: 'O(1) promedio con α bajo' },
    { op: 'peor caso (racimos)', cost: 'O(n)' },
  ],
  empty: () => openFromKeys([]),
  initial: () => openFromKeys([10, 21, 32, 7, 18]),
  ops: [
    {
      id: 'insertar',
      label: 'Insertar',
      input: 'value',
      pseudocode: OPEN_INSERT,
      run: (s, v) => openInsert(s, v),
    },
    {
      id: 'buscar',
      label: 'Buscar',
      input: 'value',
      pseudocode: [
        'i ← h(clave)',
        'repetir m veces',
        '  si T[i] está vacía: retornar no encontrado',
        '  si T[i] = clave: retornar encontrado',
        '  i ← (i + 1) mod m          ▹ las lápidas no cortan la búsqueda',
        'retornar no encontrado',
      ],
      run: (s, v) => openSearch(s, v),
    },
    {
      id: 'eliminar',
      label: 'Eliminar',
      input: 'value',
      pseudocode: [
        'buscar la clave como en buscar(clave)',
        'si está en T[i]: T[i] ← lápida   ▹ vaciarla cortaría otras cadenas de sondeo',
      ],
      run: (s, v) => openDelete(s, v),
    },
  ],
};
