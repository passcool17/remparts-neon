// Captures de scènes fixes (avant/après) : node tools/shots.js <préfixe> [nbQuartiers]
const { chromium } = require('/workspace/pw/node_modules/playwright');
const serve = require('./serve');
const PRE = process.argv[2] || 'scene', NL = +(process.argv[3] || 3), PORT = +(process.env.PORT || 8790);
(async () => {
  const srv = await serve(PORT);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:${PORT}/?bot=1&q=high`); await p.waitForTimeout(3000);
  await p.screenshot({ path: `shots/${PRE}-titre.png` });
  for (let li = 0; li < NL; li++) {
    await p.evaluate(li => __game.startRun(['pelle', 'baton', 'onde', 'pelle'][li % 4], li), li); await p.waitForTimeout(4200);
    await p.evaluate(() => { const G = __game.G, P = G.P; P.yaw = 0; P.pitch = -0.05; const ty = ['cone', 'bur', 'cons', 'plow', 'drone', 'cone', 'bur'];
      ty.forEach((t, i) => { try { __game.spawn(t, { x: P.x - 4.5 + i * 1.5, z: P.z - 7 - (i % 2) * 2 }); } catch (e) {} }); });
    await p.waitForTimeout(1300); await p.evaluate(() => __game.input.fire = true); await p.waitForTimeout(900);
    await p.screenshot({ path: `shots/${PRE}-combat-q${li + 1}.png` }); await p.evaluate(() => __game.input.fire = false);
  }
  console.log(JSON.stringify({ errs }));
  await b.close(); srv.close();
})();
