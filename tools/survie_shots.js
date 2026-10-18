// Captures du mode Survie et du tableau des records (avec une mort forcée).
const { chromium } = require('/workspace/pw/node_modules/playwright');
const serve = require('./serve');
(async () => {
  const PORT = +(process.env.PORT || 8790), PRE = process.argv[2] || 'survie'; const srv = await serve(PORT);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:${PORT}/?q=high`); await p.waitForTimeout(2500);
  await p.click('#bPlay'); await p.waitForTimeout(400);
  await p.evaluate(() => { const f = t => [...document.querySelectorAll('#modepick .chip')].find(b => b.textContent === t).click(); f('Survie'); f('Normal'); });
  await p.waitForTimeout(300); await p.screenshot({ path: `shots/${PRE}-choix.png` });
  await p.evaluate(() => __game.startRun('onde', 0, { mode: 'survie', diff: 1 })); await p.waitForTimeout(9000);
  await p.evaluate(() => { const G = __game.G, P = G.P; P.yaw = 0; for (let i = 0; i < 6; i++) __game.spawn(['cone', 'pigeon', 'parco', 'bur', 'pigeon', 'cons'][i], { x: P.x - 5 + i * 2, z: P.z - 8 }); __game.input.fire = true; });
  await p.waitForTimeout(1800); await p.screenshot({ path: `shots/${PRE}-combat.png` });
  await p.evaluate(() => { __game.input.fire = false; const G = __game.G; G.P.hp = 1; G.P.inv = 0; for (let i = 0; i < 6; i++) __game.spawn('cone', { x: G.P.x + (i - 3) * 0.6, z: G.P.z - 1.5 }); });
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => __game.G.state === 'dead')) break; }
  await p.waitForTimeout(1500); await p.screenshot({ path: `shots/${PRE}-fin.png` });
  const st = await p.evaluate(() => ({ state: __game.G.state, scores: JSON.parse(localStorage.getItem('remparts-neon-v1') || '{}').scores }));
  await p.evaluate(() => __game.toTitle()); await p.waitForTimeout(800); await p.click('#bRecs'); await p.waitForTimeout(600);
  await p.screenshot({ path: `shots/${PRE}-records.png` });
  console.log(JSON.stringify({ state: st.state, scores: st.scores, errs }));
  await b.close(); srv.close();
})();
