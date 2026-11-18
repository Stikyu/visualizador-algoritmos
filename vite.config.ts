import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages sirve el sitio en https://<usuario>.github.io/visualizador-algoritmos/
// así que en el build los assets tienen que resolverse desde ese subpath.
// `vite preview` también sirve el build, así que necesita el mismo base.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/visualizador-algoritmos/' : '/',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
