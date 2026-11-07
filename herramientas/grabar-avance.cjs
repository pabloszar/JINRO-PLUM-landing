// Graba el recorrido fijo del prototipo de cámara para la bitácora de avances.
// Uso: npx vite build && npx vite preview  ->  node herramientas/grabar-avance.cjs <carpeta-salida> [url]
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out + '/video', size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage();
  await p.goto(process.argv[3] || 'http://localhost:4173/prototipos/01-camara/'); await p.waitForTimeout(1200); await p.keyboard.press('KeyH');
  const hold = async (k, ms) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); };
  await p.mouse.move(640, 360);
  await hold('KeyW', 2200);
  await p.mouse.move(560, 350, { steps: 30 });
  await hold('KeyD', 1800);
  await hold('KeyS', 1800);
  await p.mouse.move(700, 380, { steps: 30 });
  await hold('KeyA', 1600);
  await p.evaluate(() => { window.__clan.P.x = 0; window.__clan.P.z = 2.6; });
  await p.keyboard.press('KeyC'); await p.waitForTimeout(2500);
  await p.keyboard.press('KeyN'); await p.waitForTimeout(3500);
  await p.keyboard.press('KeyN'); await p.waitForTimeout(4000);
  await p.keyboard.down('KeyD'); await p.keyboard.down('ShiftLeft'); await p.waitForTimeout(3000); await p.keyboard.up('ShiftLeft'); await p.keyboard.up('KeyD');
  await p.waitForTimeout(3500);
  await p.evaluate(() => { const c = window.__clan; c.W.x = c.P.x + 22; c.W.z = c.P.z - 10; });
  await p.waitForTimeout(6000);
  await ctx.close(); await b.close();
})();
