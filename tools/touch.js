// Vérifie la disposition tactile (téléphone à l'horizontale) et le joystick virtuel.
const { chromium, devices } = require('/workspace/pw/node_modules/playwright');
const serve = require('./serve');
(async () => {
  const srv = await serve(8780);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8780/'); await p.waitForTimeout(2500);
  await p.screenshot({ path: 'shots/mobile_1_titre.png' });
  await p.tap('#bPlay'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/mobile_2_armes.png' });
  await p.tap('.pcard[data-path="onde"]'); await p.waitForTimeout(5000);
  const before = await p.evaluate(() => ({ z: __game.G.P.z, qual: __game.G.st && document.body.className }));
  // joystick : pousser vers le haut pendant 1 s
  const cdp = await ctx.newCDPSession(p);
  const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await tp('touchStart', [{ x: 120, y: 300, id: 1 }]); for (let i = 1; i <= 10; i++) { await tp('touchMove', [{ x: 120, y: 300 - i * 5, id: 1 }]); await p.waitForTimeout(80); }
  await p.waitForTimeout(400); await p.evaluate(() => { const G = __game.G; G.P.x = 6; G.P.z = 12; G.P.yaw = 0; G.P.pitch = 0; for (let i = 0; i < 5; i++) __game.spawn(['cone', 'bur', 'cons', 'cone', 'drone'][i], { x: 4 + i, z: 4 }); });
  await p.waitForTimeout(2500); await p.screenshot({ path: 'shots/mobile_3_combat.png' });
  await tp('touchEnd', []);
  const after = await p.evaluate(() => ({ z: __game.G.P.z, kills: __game.G.kills, shots: __game.G.shots }));
  console.log(JSON.stringify({ before, after, moved: before.z - after.z, errs }));
  await b.close(); srv.close();
})();
