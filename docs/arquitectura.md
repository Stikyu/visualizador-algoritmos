# Arquitectura de traza.

Este documento explica cómo está construido el visualizador y **por qué** se tomó cada decisión.
Está escrito para que se pueda estudiar y contar en una entrevista técnica: cada sección termina
con la idea que conviene saber decir en una frase.

---

## 1. El problema

Un visualizador de algoritmos tiene que resolver tres cosas que tiran en direcciones distintas:

1. **El algoritmo** tiene que estar escrito como se escribe normalmente (un `for`, un `if`, una
   recursión), sin mezclarlo con código de dibujo ni con `await sleep(100)` por todos lados.
2. **La animación** tiene que poder pausarse, ir hacia atrás, saltar a cualquier punto y cambiar de
   velocidad.
3. **La explicación** (pseudocódigo, texto, variables, contadores) tiene que estar perfectamente
   sincronizada con lo que se ve.

La forma ingenua (el algoritmo llama a `dibujar()` y espera un rato) resuelve 3 a medias y no
resuelve 2: no se puede volver atrás en un algoritmo que ya ejecutó.

## 2. La idea central: el algoritmo produce una traza

```
entrada ──▶ generador ──▶ traza: [paso₁, paso₂, …, pasoₙ] ──▶ Timeline ──▶ reproductor ──▶ renderer
```

1. El algoritmo es una **función generadora** que emite (`yield`) un **paso** por cada acción
   elemental: comparar, intercambiar, escribir, visitar, relajar una arista…
2. Antes de mostrar nada, se ejecuta el generador hasta el final y se guarda **la traza completa**
   (`record()` en `src/algorithms/record.ts`).
3. Un **reductor puro** sabe aplicar un paso a un estado: `(estado, paso) → estado nuevo`.
4. La **Timeline** puede dar el estado en cualquier posición `p` de la traza.
5. El **reproductor** sólo maneja un número: la posición actual. Avanzar, retroceder o saltar es
   cambiar ese número.
6. El **renderer** recibe un estado y lo dibuja. No sabe qué algoritmo lo produjo.

> **En una frase:** "Separé *qué hace* el algoritmo de *cómo se muestra*: el algoritmo genera una
> lista de eventos y la interfaz es un reproductor de esa lista, como un video."

## 3. Por qué generadores

Un generador (`function*`) es una función que puede **pausarse** en cada `yield` y devolver un
valor, conservando su estado local (variables, posición en el `for`, pila de recursión).

```ts
*run(input) {
  const a = input.slice();
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      yield step.compare([j, j + 1], { line: 4, text: `¿${a[j].value} > ${a[j + 1].value}?`, vars: { i, j } });
      if (a[j].value > a[j + 1].value) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        yield step.swap(j, j + 1, { line: 5, text: 'Se intercambian.', vars: { i, j } });
      }
    }
  }
  return a;
}
```

Ventajas frente a las alternativas:

| Alternativa | Problema |
|---|---|
| `async` + `await sleep()` dentro del algoritmo | Mezcla tiempo con lógica, no se puede volver atrás, difícil de testear. |
| Callbacks `onCompare`, `onSwap` | El algoritmo queda acoplado a una interfaz de eventos y la recursión se complica. |
| Reescribir el algoritmo como máquina de estados | Ilegible: deja de parecerse al pseudocódigo. |
| **Generadores** | El código se lee como el algoritmo original; cada `yield` es un punto de observación. |

Detalles que conviene conocer:

- **Recursión con `yield*`:** en merge sort, quick sort, DFS o Hanoi, la llamada recursiva es
  `yield* sort(lo, mid)`. `yield*` delega: los pasos de la llamada interna "suben" por la cadena de
  generadores. Y además **devuelve el valor de retorno** de la llamada interna
  (`const r = yield* buscar(lo, mid)`), así la recursión se escribe igual que siempre.
- **Valor de retorno:** el generador termina con `return resultado` (el arreglo ordenado, el
  índice encontrado, las distancias). `record()` lo captura. Los tests lo usan para comparar
  contra referencias, y para verificar que la traza es consistente con el resultado.
- **Laziness:** el generador no hace nada hasta que alguien pide el próximo valor. `drain()` lo
  ejecuta descartando los pasos (útil en tests y para usar las estructuras sin animar).

> **En una frase:** "Usé generadores porque permiten pausar una función en cada paso sin romper su
> estructura: el `for` y la recursión siguen ahí, y `yield*` resuelve la recursión naturalmente."

## 4. Pasos tipados

Todos los pasos comparten una base (`src/algorithms/types.ts`):

```ts
interface BaseStep {
  type: string;   // 'compare' | 'swap' | 'visit' | 'relax' | …
  line: number;   // línea de pseudocódigo activa
  text: string;   // explicación en español
  vars: Vars;     // variables relevantes en este instante
}
```

Cada dominio define su unión discriminada. Por ejemplo, en arreglos (`src/algorithms/array/steps.ts`):

```ts
type ArrayStep = CompareStep | SwapStep | SetStep | MarkStep | PivotStep | RangeStep | AuxSetStep | …
```

TypeScript verifica en el reductor (`switch (step.type)`) que todos los casos estén cubiertos y que
cada caso use los campos correctos (`step.i` sólo existe en `swap`).

Hay dos estilos de paso, elegidos según el dominio:

| Estilo | Dónde | Ventaja | Costo |
|---|---|---|---|
| **Delta** (el paso dice qué cambió) | arreglos, grafos, grilla, PD, recursión | pasos chicos; los contadores salen solos | hay que escribir un reductor |
| **Snapshot** (el paso trae el estado entero) | estructuras de datos | reductor trivial; se puede cambiar la forma de la estructura sin pensar en deltas (rotaciones del AVL, inversión de listas) | más memoria, por eso sólo con estructuras chicas |

> **En una frase:** "Cada paso es un objeto tipado con la acción, la línea de pseudocódigo, el texto
> y las variables; uso deltas donde el estado es grande y snapshots donde la estructura cambia de
> forma y es chica."

## 5. Reductor puro y Timeline con checkpoints

El reductor nunca muta su entrada (`src/algorithms/array/state.ts`):

```ts
case 'swap': {
  const items = state.items.slice();
  [items[s.i], items[s.j]] = [items[s.j], items[s.i]];
  return { ...cleared, items, swapping: [s.i, s.j], counters: { …, swaps: c.swaps + 1 } };
}
```

Que sea puro permite guardar estados intermedios sin miedo a que se modifiquen después.

¿Cómo obtener el estado en la posición `p`? Hay tres opciones:

1. **Guardar los n + 1 estados.** Acceso O(1), pero memoria O(n · S) (S = tamaño del estado).
2. **Recalcular desde el principio cada vez.** Memoria O(1), pero acceso O(n): ir hacia atrás de a
   un paso sería cuadrático.
3. **Checkpoints** (lo que hace `src/player/timeline.ts`): guardar el estado cada k = 32 pasos.
   Para llegar a `p`, se parte del checkpoint anterior y se aplican a lo sumo k − 1 pasos.
   - Memoria: O(n/k · S).
   - Acceso aleatorio: O(k) reducciones.
   - Además se **cachea la última posición**: avanzar de a un paso (el caso típico al reproducir)
     cuesta O(1).

Es la misma idea que usan los videos (fotogramas clave + diferencias) y los sistemas de
*event sourcing* (snapshots periódicos + eventos).

Los **contadores** (comparaciones, intercambios, escrituras, accesos) se calculan en el reductor a
partir del tipo de paso, no los lleva el algoritmo. Así es imposible que el número que se ve y la
animación se desincronicen, también al ir hacia atrás.

> **En una frase:** "El estado en cualquier punto se reconstruye con un reductor puro desde el
> checkpoint más cercano: memoria O(n/k), acceso O(k) y avance O(1) con caché."

## 6. El reproductor

`usePlayer(length, resetKey)` (`src/player/usePlayer.ts`) sólo maneja:

- `position` ∈ [0, n] (0 = estado inicial; p = ya se aplicaron los pasos 0..p−1),
- `playing` y `speed` (pasos por segundo, de 0,5 a 300).

La reproducción usa `requestAnimationFrame` con un **acumulador**: en cada cuadro suma
`tiempo · velocidad` y avanza tantos pasos enteros como correspondan. Así 300 pasos/s funciona
aunque la pantalla vaya a 60 cuadros/s, y una pestaña lenta no "pierde" pasos.

Como no sabe nada de pasos, el mismo hook sirve para todo: ordenamiento, grafos, PD, el modo
carrera (una única posición global que cada carril traduce a `min(p, largo)`) y el modo práctica
(que mira el próximo paso y pausa si es un intercambio).

Cuando cambia la traza (`resetKey`), vuelve a 0 usando el patrón de React "ajustar el estado cuando
cambia una prop" durante el render, en vez de un `useEffect` que provocaría un render intermedio.

> **En una frase:** "El reproductor es sólo una posición y un reloj; por eso pude reutilizarlo tal
> cual para la carrera y la práctica."

## 7. Desacople entre algoritmo y vista

- `src/algorithms/` y `src/structures/` **no importan React**. Se pueden ejecutar en Node (los tests
  lo hacen) o reutilizar en otra interfaz.
- Los renderers (`src/renderers/`) reciben un **estado** y lo dibujan; no saben qué algoritmo lo
  generó. El mismo `BarsRenderer` dibuja los 9 ordenamientos, las 4 búsquedas y los carriles de la
  carrera; el mismo `TreeRenderer` dibuja el ABB, el AVL, el heap y el árbol de llamadas de Fibonacci.
- Los metadatos del algoritmo (nombre, complejidades, pseudocódigo, si es estable/in-place, cuándo
  usarlo, opciones configurables) viven junto al generador. La interfaz se construye a partir de
  ellos: el selector, la ficha, la tabla comparativa y los controles de opciones (por ejemplo la
  estrategia de pivote del quick sort) aparecen solos.

Agregar un algoritmo = un archivo + una línea en el índice de su categoría (ver el README).

> **En una frase:** "Los algoritmos no conocen la interfaz y la interfaz no conoce los algoritmos;
> se hablan a través de pasos tipados y metadatos."

## 8. Estructuras de datos como valores

Las estructuras (`src/structures/`) se modelan como **valores inmutables** y cada operación es un
generador puro: `(snapshot, valor) → pasos… → snapshot nuevo`.

```ts
let arbol = emptyTree();
arbol = drain(avlInsert(arbol, 30));          // uso "normal", sin animación
const { steps } = record(avlInsert(arbol, 10)); // mismo código, con traza para animar
```

- Es **el mismo código** el que se anima y el que se testea: no hay una versión "para mostrar" y otra
  "de verdad".
- Las rotaciones del AVL enganchan la nueva raíz del subárbol en su padre **en el momento** (con un
  callback `attach`), así cada snapshot intermedio es un árbol válido y la rotación se puede animar.
- Los nodos tienen `id` estable; el renderer anima por `id` (Motion interpola posiciones), por eso una
  rotación se ve como nodos que se desplazan y no como un árbol que "salta".

## 9. Estrategia de tests

Los tests (`tests/`) no verifican la interfaz sino el núcleo, con tres tipos de oráculo:

1. **Implementaciones de referencia:** `Array.prototype.sort`, Floyd-Warshall para caminos mínimos,
   fuerza bruta para mochila y LCS, Levenshtein recursivo, BFS sobre montos para monedas,
   `Set` para las tablas hash, arreglos para pilas, colas y listas.
2. **Invariantes:** propiedad de ABB verificada con rangos (no alcanza con mirar padre e hijos),
   alturas y |factor de balance| ≤ 1 en el AVL, propiedad de heap, orden topológico válido, caminos
   de la grilla contiguos y sin paredes.
3. **Consistencia de la traza:** aplicar todos los pasos con el reductor desde el estado inicial
   tiene que dar exactamente el resultado que devolvió el algoritmo; la Timeline con checkpoints
   tiene que coincidir con aplicar los pasos uno por uno en cualquier orden de acceso.

Las entradas son **aleatorias pero con semilla** (`createRng`): cientos de casos distintos, siempre los
mismos en cada corrida (si un test falla, falla siempre igual). Incluyen casos borde: vacíos, un
elemento, todos iguales, negativos, ya ordenados, invertidos.

Cuando un test falló durante el desarrollo, se corrigió el algoritmo, no el test (por ejemplo, la
lista enlazada reordenaba sus nodos *después* del último paso; la consistencia de la traza lo detectó).

> **En una frase:** "Testeo el núcleo con entradas aleatorias reproducibles contra referencias
> independientes, invariantes de cada estructura y la consistencia entre traza y resultado."

## 10. Interfaz

- **Router por hash** (`#/grafos/dijkstra?g=…`): GitHub Pages no puede redirigir rutas a
  `index.html`, y con hash cualquier link funciona sin configurar el servidor.
- **Estado en la URL:** cada página escribe su entrada (arreglo, grafo, laberinto, palabras,
  opciones) en la query del hash con `history.replaceState` (sin llenar el historial). "Compartir"
  sólo copia la URL. El grafo y la grilla tienen una codificación compacta propia.
- **SVG vs Canvas:** SVG para casi todo (accesible, nítido, fácil de estilar con CSS); Canvas 2D
  para la grilla, donde cientos de celdas cambian por paso y redibujar un canvas es mucho más
  barato que reconciliar cientos de nodos del DOM.
- **Code splitting:** cada página se carga con `React.lazy`; el bundle inicial bajó de 580 kB a
  223 kB.
- **Accesibilidad:** paleta Okabe-Ito (distinguible con los tipos comunes de daltonismo) y, además,
  marcas de forma (● comparar, ⇄ intercambiar, ✎ escribir, ▲ pivote, ★ encontrado) para no depender
  sólo del color; todo operable con teclado; el panel de explicación usa `aria-live` sólo cuando
  está en pausa (para no saturar al lector de pantalla); se respeta `prefers-reduced-motion`;
  contraste AA verificado con axe-core en tema claro y oscuro.
- **Tema:** variables CSS en `:root` y `[data-theme='dark']`; un script en `index.html` aplica el
  tema antes del primer render para evitar el destello.

## 11. Decisiones y alternativas descartadas

| Decisión | Alternativa | Por qué |
|---|---|---|
| Traza precomputada | Ejecutar el algoritmo en vivo | Permite volver atrás, saltar, carrera y práctica. Costo: hay que acotar el tamaño de la entrada (`MAX_STEPS`). |
| Checkpoints cada 32 pasos | Guardar todos los estados | Memoria mucho menor con acceso casi igual de rápido. |
| Contadores derivados en el reductor | Contar dentro del algoritmo | No se pueden desincronizar y funcionan al retroceder. |
| Snapshots para estructuras | Deltas | Las estructuras cambian de forma (rotaciones, reenganches); con snapshots el reductor es trivial y son chicas. |
| Router por hash propio | react-router | Una dependencia menos y compatibilidad directa con GitHub Pages. |
| TypeScript 6.0 | TypeScript 7 (compilador nativo) | `typescript-eslint` todavía no soporta TS 7. |
| Hash con `k mod m` y m primo | Funciones de hash más complejas | Es la que se enseña y deja ver las colisiones. |
| Lomuto para quick sort | Hoare | Más fácil de seguir paso a paso; la elección de pivote se configura aparte. |

## 12. Preguntas típicas y cómo responderlas

**¿Cómo hacés para ir hacia atrás en un algoritmo?**
No lo "deshago": tengo la traza completa y un reductor puro. Para mostrar el paso p reconstruyo el
estado desde el checkpoint anterior. Ir hacia atrás es sólo pedir p − 1.

**¿Qué pasa con la memoria si el algoritmo genera muchos pasos?**
Los pasos son objetos chicos (deltas). Los estados se guardan cada 32 pasos. Hay un límite de
seguridad de 250 000 pasos y las entradas de la interfaz están acotadas para no llegar.

**¿Cómo garantizás que la animación muestra lo que el algoritmo hizo de verdad?**
Hay un test por algoritmo que aplica toda la traza con el reductor y compara con el resultado que
devolvió el generador. Si el algoritmo hiciera algo sin emitir el paso, el test falla.

**¿Cómo agregarías un algoritmo nuevo?**
Un archivo con metadatos, pseudocódigo y generador, más una línea en el índice. La interfaz y los
tests genéricos lo toman automáticamente.

**¿Por qué Dijkstra no funciona con pesos negativos? ¿Y A*?**
Dijkstra "fija" el nodo más cercano asumiendo que ningún camino posterior puede mejorarlo; con
aristas negativas eso es falso. A* es Dijkstra con prioridad g + h; si h nunca sobreestima
(admisible, como Manhattan en una grilla de 4 vecinos con costo ≥ 1) encuentra el óptimo explorando
menos. La página de laberintos lo muestra comparando celdas exploradas.

**¿Por qué la memoización cambia tanto Fibonacci?**
Sin memo, el árbol de llamadas tiene 2·fib(n+1) − 1 nodos (exponencial); con memo cada valor se
calcula una vez: 2n − 1 llamadas. En la página se ve el mismo árbol con y sin memo.
