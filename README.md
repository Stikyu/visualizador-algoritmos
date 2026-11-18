# traza. — visualizador de algoritmos

Visualizador web interactivo de algoritmos y estructuras de datos, en español, pensado para
estudiantes de programación y para quienes preparan entrevistas técnicas.

**Demo:** https://stikyu.github.io/visualizador-algoritmos/

> 🚧 En construcción: se publica por etapas. Este README se completa al final de cada una.

## Etapas

- [x] **Etapa 1 – Motor y ordenamiento:** reproductor completo, vista de barras y 9 ordenamientos.
- [x] **Etapa 2 – Búsqueda:** lineal, binaria (iterativa y recursiva) e interpolación.
- [x] **Etapa 3 – Estructuras de datos:** pila, cola, cola circular, listas simple y doble, ABB, AVL, heap y tablas hash.
- [x] **Etapa 4 – Grafos:** editor de grafos, BFS, DFS, Dijkstra, Bellman-Ford, Prim, Kruskal, orden topológico, ciclos y laberintos con BFS/Dijkstra/A*.
- [ ] Etapa 5 – Recursión y programación dinámica
- [ ] Etapa 6 – Extras y pulido

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests con Vitest
npm run lint     # ESLint + Prettier
npm run build    # build de producción en dist/
```

## Licencia

MIT
