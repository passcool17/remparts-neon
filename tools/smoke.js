const { chromium } = require('/workspace/pw/node_modules/playwright');
const serve = require('./serve');
(async () => {
  const srv = await serve(8766);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  await p.goto('http://localhost:8766/?bot=1' + (process.env.Q ? '&q=' + process.env.Q : '')); await p.waitForTimeout(2500);
  await p.screenshot({ path: '/workspace/neon-quebec/shots/smoke_title.png' });
  console.log('fps', await p.evaluate(() => 1000 / __game.frameAvg));
  await p.click('#bPlay'); await p.waitForTimeout(500); await p.screenshot({ path: '/workspace/neon-quebec/shots/smoke_paths.png' });
  await p.click('.pcard[data-path="' + (process.env.PATH_ || 'pelle') + '"]'); await p.waitForTimeout(6000);
  await p.evaluate(() => { const G = __game.G; for (let i = 0; i < 6; i++) __game.spawn(['cone', 'bur', 'cons', 'plow', 'drone', 'cone'][i], { x: -6 + i * 2.4, z: G.P.z - 7 }); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: '/workspace/neon-quebec/shots/smoke_play.png' });
  console.log(await p.evaluate(() => ({ st: __game.G.state, en: __game.G.enemies.length, fps: 1000 / __game.frameAvg, sec: __game.music.sectionAt(__game.music.clock()).name, ctx: __game.music.ctx && __game.music.ctx.state })));
  console.log(errs.slice(0, 20).join('\n'));
  await b.close(); srv.close();
})();
