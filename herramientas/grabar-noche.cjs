// Graba un recorrido del prototipo 3: buscar leña, alimentar el fuego, la noche, la antorcha, el lobo y el amanecer.
// Uso: npx vite build && npx vite preview  ->  node herramientas/grabar-noche.cjs <carpeta-salida> [url]
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2], url = process.argv[3] || 'http://localhost:4173/prototipos/03-noche/';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir: out + '/video', size: { width: 960, height: 540 } } });
  const p = await ctx.newPage();
  await p.goto(url); await p.waitForTimeout(1500); await p.keyboard.press('KeyH');
  const hold = async (k, ms) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); };
  // camina a la rama más cercana y la recoge
  const goBranch = async () => {
    const b2 = await p.evaluate(() => { const c = window.__clan; const b = c.branches.filter(b => !b.taken).sort((a, b) => Math.hypot(a.x - c.P.x, a.z - c.P.z) - Math.hypot(b.x - c.P.x, b.z - c.P.z))[0]; c.P.facing = Math.atan2(b.x - c.P.x, b.z - c.P.z); return { x: b.x, z: b.z }; });
    await p.evaluate((b) => { const c = window.__clan; c.P.x = b.x - Math.sin(c.P.facing) * 3; c.P.z = b.z - Math.cos(c.P.facing) * 3; }, b2);
    await hold('KeyW', 900); await p.keyboard.press('KeyE'); await p.waitForTimeout(400);
  };
  await hold('KeyW', 1500);
  await goBranch(); await goBranch();
  await p.evaluate(() => { const c = window.__clan; c.P.x = 0; c.P.z = 5; c.P.facing = Math.PI; });
  await hold('KeyW', 1000); await p.keyboard.press('KeyE'); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__clan.clockN.t = 45; });
  await p.waitForTimeout(3500);
  await p.keyboard.press('KeyT'); await p.waitForTimeout(800);
  await p.evaluate(() => { const c = window.__clan; c.P.facing = 0; });
  await hold('KeyW', 3500);
  await p.waitForTimeout(3000);
  await p.keyboard.press('KeyT');
  await p.evaluate(() => { const c = window.__clan; c.W.x = c.P.x + 18; c.W.z = c.P.z + 6; c.W.state = 'acecha'; c.W.t = 0; c.W.cooldown = 1.5; });
  await p.waitForTimeout(9000);
  await p.evaluate(() => { const c = window.__clan; c.P.x = 0; c.P.z = 3; c.P.facing = Math.PI; });
  await p.waitForTimeout(4000);
  await p.evaluate(() => { window.__clan.clockN.t = 292; });
  await p.waitForTimeout(9000);
  await p.evaluate(() => { window.__clan.clockN.t = 331; });
  await p.waitForTimeout(3500);
  await ctx.close(); await b.close();
})();
