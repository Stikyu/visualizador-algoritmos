# Cómo contribuir

¡Gracias por querer sumar! Este proyecto está pensado para crecer con nuevos algoritmos,
explicaciones y mejoras de accesibilidad.

## Primeros pasos

```bash
git clone https://github.com/Stikyu/visualizador-algoritmos.git
cd visualizador-algoritmos
npm install
npm run dev
```

Antes de abrir un pull request:

```bash
npm run build && npm test && npm run lint
```

`npm run format` arregla el formato automáticamente.

## Ideas de contribución

- **Algoritmos nuevos**: cocktail sort, Timsort simplificado, búsqueda exponencial, Floyd-Warshall,
  componentes fuertemente conexas (Tarjan/Kosaraju), trie, árbol rojinegro, segment tree, más
  problemas de PD (LIS, multiplicación de matrices, partición)…
- **Mejores explicaciones**: los textos de cada paso viven junto al algoritmo, en `src/algorithms/`.
- **Accesibilidad**: lectores de pantalla, navegación por teclado, contraste.
- **Traducciones**: hoy todo está en español; separar los textos facilitaría otros idiomas.

## Reglas del proyecto

- Los algoritmos (`src/algorithms/`, `src/structures/`) **no pueden importar React**: emiten pasos y
  devuelven su resultado. La guía "Cómo agregar un algoritmo nuevo" del README muestra el patrón.
- Todo algoritmo nuevo necesita tests: contra una referencia independiente (fuerza bruta, otra
  implementación conocida) y de consistencia de la traza. Si se suma a una lista existente
  (`SORTING_ALGORITHMS`, `GRAPH_ALGORITHMS`…), muchos tests genéricos lo cubren solos.
- Si un test falla, se corrige el algoritmo, no el test.
- TypeScript estricto, sin `any`.
- Commits en español con estilo [Conventional Commits](https://www.conventionalcommits.org/es/):
  `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.

La explicación de la arquitectura está en [docs/arquitectura.md](docs/arquitectura.md).

## Reportar errores

Abrí un issue con: qué algoritmo, qué entrada (¡el link de "Compartir" sirve!), qué esperabas ver y
qué viste.
