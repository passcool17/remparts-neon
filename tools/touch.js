// Vérifie la disposition tactile (téléphone à l'horizontale) et le joystick virtuel.
const { chromium, devices } = require('/workspace/pw/node_modules/playwright');
const serve = require('./serve');
(async () => {
  const PORT = +(process.env.PORT || 8780), PRE = process.argv[2] || 'mobile'; const srv = await serve(PORT);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:${PORT}/`); await p.waitForTimeout(2500);
  await p.screenshot({ path: `shots/${PRE}_1_titre.png` });
  await p.tap('#bPlay'); await p.waitForTimeout(500); await p.screenshot({ path: `shots/${PRE}_2_armes.png` });
  await p.tap('.pcard[data-path="onde"]'); await p.waitForTimeout(5000);
  const before = await p.evaluate(() => ({ z: __game.G.P.z, qual: __game.G.st && document.body.className }));
  // joystick : pousser vers le haut pendant 1 s
  const cdp = await ctx.newCDPSession(p);
  const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await tp('touchStart', [{ x: 120, y: 300, id: 1 }]); for (let i = 1; i <= 10; i++) { await tp('touchMove', [{ x: 120, y: 300 - i * 5, id: 1 }]); await p.waitForTimeout(80); }
  await p.waitForTimeout(400); await p.evaluate(() => { const G = __game.G; G.P.x = 6; G.P.z = 12; G.P.yaw = 0; G.P.pitch = 0; for (let i = 0; i < 5; i++) __game.spawn(['cone', 'bur', 'cons', 'cone', 'drone'][i], { x: 4 + i, z: 4 }); });
  await p.waitForTimeout(2500); await p.screenshot({ path: `shots/${PRE}_3_combat.png` });
  await tp('touchEnd', []);
  // visée : glisser à droite de l'écran
  const y0 = await p.evaluate(() => __game.G.P.yaw);
  await tp('touchStart', [{ x: 560, y: 150, id: 2 }]); for (let i = 1; i <= 8; i++) { await tp('touchMove', [{ x: 560 - i * 12, y: 150, id: 2 }]); await p.waitForTimeout(30); } await tp('touchEnd', []);
  const y1 = await p.evaluate(() => __game.G.P.yaw);
  // glisser depuis le bouton FEU (tirer + viser en même temps)
  const fb = await p.locator('#tFire').boundingBox(); const fx0 = fb.x + fb.width / 2, fy0 = fb.y + fb.height / 2; const sh0 = await p.evaluate(() => __game.G.shots);
  await tp('touchStart', [{ x: fx0, y: fy0, id: 3 }]); for (let i = 1; i <= 8; i++) { await tp('touchMove', [{ x: fx0 - i * 10, y: fy0, id: 3 }]); await p.waitForTimeout(60); } await tp('touchEnd', []);
  const y2 = await p.evaluate(() => __game.G.P.yaw); const sh1 = await p.evaluate(() => __game.G.shots);
  const db = await p.locator('#tDash').boundingBox(); const dn0 = await p.evaluate(() => __game.G.P.dashN);
  await tp('touchStart', [{ x: db.x + db.width / 2, y: db.y + db.height / 2, id: 4 }]); await p.waitForTimeout(50); await tp('touchEnd', []); await p.waitForTimeout(50);
  const dn1 = await p.evaluate(() => __game.G.P.dashN);
  const sizes = { fire: fb.width, dash: db.width, alt: (await p.locator('#tAlt').boundingBox()).width };
  console.log('VISEE', JSON.stringify({ lookDrag: y1 - y0, fireDragLook: y2 - y1, fireShots: sh1 - sh0, dash: dn0 - dn1, sizes }));
  const after = await p.evaluate(() => ({ z: __game.G.P.z, kills: __game.G.kills, shots: __game.G.shots }));
  console.log(JSON.stringify({ before, after, moved: before.z - after.z, errs }));
  await b.close(); srv.close();
})();
