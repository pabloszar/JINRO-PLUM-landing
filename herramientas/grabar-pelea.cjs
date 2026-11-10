// Graba una pelea del prototipo 2 jugada por un bot que lee las señales del lobo.
// Uso: npx vite build && npx vite preview  ->  node herramientas/grabar-pelea.cjs <carpeta-salida> [url]
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2], url = process.argv[3] || 'http://localhost:4173/prototipos/02-pelea/';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir: out + '/video', size: { width: 960, height: 540 } } });
  const p = await ctx.newPage();
  await p.goto(url); await p.waitForTimeout(1200); await p.keyboard.press('KeyH');
  await p.evaluate(() => { const c = window.__clan; c.P.x = 25; c.P.z = 25; c.callWolf(); });
  const t0 = Date.now(); let fase = 'brace';
  while (Date.now() - t0 < 150000) {
    const s = await p.evaluate(() => { const c = window.__clan; return { st: c.W.state, wt: c.W.t, wd: Math.hypot(c.P.x - c.W.x, c.P.z - c.W.z), whp: c.W.hp, end: !document.getElementById('end').classList.contains('hidden') }; });
    if (s.end) { await p.waitForTimeout(3000); break; }
    if (fase === 'brace') {
      // primero levanta la lanza en el último momento, cuando el lobo ya se agachó, y lo remata
      if ((s.st === 'agacha' && s.wt > 0.5) || s.st === 'salta') await p.keyboard.down('KeyK'); else await p.keyboard.up('KeyK');
      if (s.st === 'aturdido' && s.wd < 3.4) { await p.keyboard.up('KeyK'); await p.keyboard.press('KeyJ'); fase = 'esquiva'; }
    } else {
      // después esquiva en el último momento y contraataca cuando queda expuesto
      if (((s.st === 'agacha' && s.wt > 0.6) || (s.st === 'salta' && s.wt < 0.15)) && s.wd < 6.5) { await p.keyboard.down('KeyA'); await p.keyboard.press('KeyC'); await p.waitForTimeout(120); await p.keyboard.up('KeyA'); }
      if ((s.st === 'recupera' || s.st === 'aturdido') && s.wd < 3.2) await p.keyboard.press('KeyJ');
    }
    await p.waitForTimeout(10);
  }
  await ctx.close(); await b.close();
})();
