// Genera las capturas y el GIF del README.
// Uso:  npm run build && npm run screenshots
// Levanta `vite preview` sobre dist/, navega con Playwright (Chromium) y guarda en docs/img/.
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const OUT = 'docs/img';
const PORT = 4179;
const BASE = `http://localhost:${PORT}/visualizador-algoritmos/`;

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'warn' });
const browser = await chromium.launch();

async function newPage(theme, width = 1360, height = 860) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.addInitScript((t) => localStorage.setItem('traza-tema', t), theme);
  const page = await ctx.newPage();
  return { ctx, page };
}

async function shot({
  name,
  hash,
  theme = 'light',
  steps = 0,
  clicks = [],
  full = false,
  width,
  height,
}) {
  const { ctx, page } = await newPage(theme, width, height);
  await page.goto(BASE + hash);
  await page.waitForTimeout(600);
  for (const sel of clicks) {
    await page.click(sel);
    await page.waitForTimeout(250);
  }
  for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowRight');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log(`✓ ${name}.png`);
  await ctx.close();
}

/** GIF: avanza de a un paso y captura sólo el escenario + controles. */
async function gif({ name, hash, frames, every = 1, delay = 120, theme = 'light' }) {
  const { ctx, page } = await newPage(theme, 1040, 860);
  await page.goto(BASE + hash);
  await page.waitForTimeout(600);
  const stage = page.locator('.viz__grid');
  const box = await stage.boundingBox();
  const clip = {
    x: box.x,
    y: box.y,
    width: Math.round(box.width),
    height: Math.min(560, Math.round(box.height)),
  };
  const encoder = GIFEncoder();
  for (let f = 0; f < frames; f++) {
    const buf = await page.screenshot({ clip });
    const png = PNG.sync.read(buf);
    const palette = quantize(png.data, 64);
    const index = applyPalette(png.data, palette);
    encoder.writeFrame(index, png.width, png.height, {
      palette,
      delay: f === frames - 1 ? 1500 : delay,
    });
    for (let k = 0; k < every; k++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(60);
  }
  encoder.finish();
  await writeFile(`${OUT}/${name}.gif`, encoder.bytes());
  console.log(`✓ ${name}.gif`);
  await ctx.close();
}

await mkdir(OUT, { recursive: true });
try {
  const data = '#/ordenamiento/quick?datos=42,17,88,5,63,29,71,12,95,36,54,8,77,23,60,48';
  await gif({ name: 'quicksort', hash: data, frames: 60, every: 2, delay: 150 });
  await shot({ name: 'inicio', hash: '' });
  await shot({ name: 'ordenamiento', hash: data, steps: 23 });
  await shot({
    name: 'avl',
    hash: '#/estructuras/avl',
    clicks: ['.ops__buttons button >> nth=0'],
    steps: 5,
  });
  await shot({ name: 'dijkstra', hash: '#/grafos/dijkstra', steps: 20 });
  await shot({ name: 'kruskal-oscuro', hash: '#/grafos/kruskal', steps: 14, theme: 'dark' });
  await shot({
    name: 'laberinto',
    hash: '#/grilla/grilla-astar',
    clicks: ['text=Obstáculos al azar', 'text=Comparar BFS, Dijkstra y A*'],
    steps: 150,
    full: true,
  });
  await shot({ name: 'fibonacci', hash: '#/recursion/fibonacci?n=5&memo=false', steps: 40 });
  await shot({ name: 'pd-edicion', hash: '#/pd/edicion', steps: 40, theme: 'dark' });
  await shot({
    name: 'carrera',
    hash: '#/carrera',
    clicks: ['.player__buttons button >> nth=4'],
    full: true,
  });
  await shot({
    name: 'movil',
    hash: '#/busqueda/binaria',
    steps: 6,
    width: 390,
    height: 844,
    full: true,
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
