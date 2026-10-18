// Bot de test Playwright : lance une partie, vise/tire sur l'ennemi le plus proche (via le point d'entrée de test),
// survit aux vagues, achète des améliorations, et vérifie qu'il n'y a aucune erreur JS.
// usage : node tools/bot.js [baton|pelle|onde] [quartier de départ 0-2] [préfixe captures]   (env Q=low|high, PORT, MAXMIN)
const { chromium } = require('/workspace/pw/node_modules/playwright');
const serve = require('./serve'); const fs = require('fs');
const PATH = process.argv[2] || 'pelle', START = +(process.argv[3] || 0), PRE = process.argv[4] || ('bot_' + PATH), PORT = +(process.env.PORT || 8770);
const SH = '/workspace/neon-quebec/shots/'; const MAXMS = (+(process.env.MAXMIN || 40)) * 60000;

function botBrain() {
  const B = { side: 1, flip: 0 };
  window.__bot = (api, dt) => {
    const G = api.G, P = G.P, I = api.input;
    if (G.state !== 'play' || !P || P.dead) { I.botFire = I.botAlt = false; I.botMx = I.botMz = 0; return; }
    const st = G.st; B.flip -= dt; if (B.flip < 0) { B.side *= -1; B.flip = 2 + Math.random() * 3; }
    let best = null, bs = 1e9;
    for (const e of G.enemies) { if (e.dead || e.born < 0.6) continue; const d = Math.hypot(e.x - P.x, e.z - P.z);
      const s = d - (e.T.boss ? 3 : 0) - (e.state === 'charge' || e.state === 'dive' || e.state === 'aim' ? 6 : 0) - (e.type === 'cons' ? 2 : 0); if (s < bs) { bs = s; best = e; } }
    let wx = 0, wz = 0; const melee = G.path === 'baton';
    for (const e of G.enemies) { const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || 1; const r = (melee ? 1.6 : 5) + e.T.r * (e.T.boss ? 2.2 : 1);
      if (d < r) { wx += dx / d * (r - d) / r * 2.2; wz += dz / d * (r - d) / r * 2.2; }
      if ((e.state === 'charge' || e.state === 'aim') && e.dir !== undefined && d < 16) { const dir = e.dir || { x: -dx / d, z: -dz / d }; const px = -dir.z, pz = dir.x; const side = (P.x - e.x) * px + (P.z - e.z) * pz >= 0 ? 1 : -1; wx += px * side * 2.5; wz += pz * side * 2.5;
        if (e.state === 'charge' && d < 4.5) I.dashReq = true; } }
    for (const p of G.projs) if (p.owner === 'e') { const dx = P.x - p.pos.x, dz = P.z - p.pos.z, d = Math.hypot(dx, dz); if (d < 7) { const vl = Math.hypot(p.vel.x, p.vel.z) || 1; const px = -p.vel.z / vl, pz = p.vel.x / vl; const side = dx * px + dz * pz >= 0 ? 1 : -1; wx += px * side * 1.6; wz += pz * side * 1.6; } }
    for (const s of G.shocks) { const d = Math.hypot(P.x - s.x, P.z - s.z); if (s.r < d && d - s.r < 2.0) I.dashReq = true; }
    if (best) {
      const dx = best.x - P.x, dz = best.z - P.z, d = Math.hypot(dx, dz) || 1;
      const want = melee ? st.range * 0.75 + best.T.r : (best.T.boss ? 13 : 9);
      const k = d > want + 1 ? 1 : d < want - 1 ? -0.8 : 0; wx += dx / d * k; wz += dz / d * k;
      wx += -dz / d * 0.55 * B.side; wz += dx / d * 0.55 * B.side;
      const ty = best.y + best.T.h * 0.55 - 1.62; const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(ty, d);
      const dy = Math.atan2(Math.sin(yaw - P.yaw), Math.cos(yaw - P.yaw)); P.yaw += dy * Math.min(1, dt * 12); P.pitch += (pitch - P.pitch) * Math.min(1, dt * 12);
      const aligned = Math.abs(dy) < 0.15;
      I.botFire = aligned && (!melee || d < st.range + best.T.r + 0.3);
      const near = G.enemies.filter(e => Math.hypot(e.x - P.x, e.z - P.z) < (st.pulseR || 8)).length;
      I.botAlt = aligned && (G.path === 'onde' ? near >= 2 || (best.T.boss && d < st.pulseR) : G.path === 'pelle' ? d < 12 : d < 30);
    } else { I.botFire = false; I.botAlt = false; }
    const b = G.level.bounds;
    if (b.type === 'circle') { const r = Math.hypot(P.x, P.z) || 1; if (r > b.r - 5) { wx -= P.x / r * 1.6; wz -= P.z / r * 1.6; } }
    else { if (Math.abs(P.x) > b.w / 2 - 3) wx -= Math.sign(P.x) * 1.6; if (Math.abs(P.z) > b.h / 2 - 7) wz -= Math.sign(P.z) * 1.6; }
    if (!best || bs > 9) { let c0 = null, cd = 1e9; for (const c of api.fx.coins) { const d = Math.hypot(c.x - P.x, c.z - P.z); if (d < cd) { cd = d; c0 = c; } } if (c0 && cd > 0.5) { wx += (c0.x - P.x) / cd; wz += (c0.z - P.z) / cd; } }
    if (P.hp < P.hpMax * 0.4 && G.enemies.some(e => Math.hypot(e.x - P.x, e.z - P.z) < 2.2 + e.T.r)) I.dashReq = true;
    const l = Math.hypot(wx, wz); if (l > 1) { wx /= l; wz /= l; }
    I.botMz = wx * -Math.sin(P.yaw) + wz * -Math.cos(P.yaw); I.botMx = wx * Math.cos(P.yaw) + wz * -Math.sin(P.yaw);
  };
  window.__botShop = () => {
    const api = __game, G = api.G; const pr = { baton: ['b_dmg', 'hp', 'b_arc', 'b_leech', 'b_dmg', 'b_puck', 'dash', 'hp', 'b_dmg', 'beat', 'spd', 'b_arc', 'b_leech', 'b_puck', 'mag'],
      pelle: ['p_dmg', 'p_rate', 'hp', 'p_dmg', 'p_burst', 'p_rate', 'dash', 'p_pierce', 'hp', 'beat', 'p_dmg', 'spd', 'p_rate', 'mag'],
      onde: ['o_dmg', 'o_rad', 'hp', 'o_dmg', 'o_pulse', 'o_chain', 'dash', 'hp', 'o_rad', 'beat', 'o_dmg', 'spd', 'o_chain', 'mag'] }[G.path];
    const bought = [];
    if (G.P.hp < G.P.hpMax * 0.6 && G.cash >= 15 && api.buy('heal')) bought.push('heal');
    for (let it = 0; it < 30; it++) { let done = false; for (const id of pr) { const u = api.UPG.find(x => x.id === id); if ((G.up[id] || 0) >= u.max) continue; if (G.cash >= api.costOf(u)) { api.buy(id); bought.push(id); done = true; break; } else break; } if (!done) break; }
    return { bought, cash: G.cash, up: G.up };
  };
}

(async () => {
  const srv = await serve(PORT);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(botBrain);
  await p.goto(`http://localhost:${PORT}/?bot=1${process.env.Q ? '&q=' + process.env.Q : ''}`); await p.waitForTimeout(3000);
  const shots = []; const snap = async name => { const f = SH + PRE + '_' + name + '.png'; await p.screenshot({ path: f }); shots.push(f); console.log('capture', f); };
  if (START === 0) await snap('1_titre');
  if (START > 0) await p.evaluate(s => { const sv = JSON.parse(localStorage.getItem('remparts-neon-v1') || '{}'); sv.unlocked = s; localStorage.setItem('remparts-neon-v1', JSON.stringify(sv)); }, START);
  await p.click('#bPlay'); await p.waitForTimeout(600);
  if (START > 0) { await p.click(`#lvlpick .btn:nth-of-type(${START + 1})`); await p.waitForTimeout(300); }
  if (START === 0) await snap('2_choix_arme');
  await p.click(`.pcard[data-path="${PATH}"]`);
  const t0 = Date.now(); let deaths = 0, shops = 0, last = '', taken = {}; const log = [];
  const want = async (k, cond) => { if (!taken[k] && cond) { taken[k] = 1; await snap(k); } };
  while (Date.now() - t0 < MAXMS) {
    await p.waitForTimeout(350);
    const s = await p.evaluate(() => { const G = __game.G; return { state: G.state, li: G.li, wi: G.wi, en: G.enemies.length, fx: __game.fx.n, cash: G.cash, hp: G.P ? Math.round(G.P.hp) : 0, boss: !!G.boss, kills: G.kills, score: G.score, fps: Math.round(1000 / __game.frameAvg), left: G.wave ? G.wave.left : -1, beat: G.beatHits, streak: G.streak }; });
    const key = s.state + s.li + s.wi; if (key !== last) { last = key; const line = `${((Date.now() - t0) / 1000).toFixed(0)}s ${s.state} Q${s.li + 1} V${s.wi + 1} kills=${s.kills} cash=${s.cash} hp=${s.hp} fps=${s.fps}`; console.log(line); log.push(line); }
    if (s.state === 'play') {
      await want(`3_combat_q${s.li + 1}`, s.en >= 6 && s.fx > 220);
      await want(`5_boss_q${s.li + 1}`, s.boss && s.fx > 150);
    }
    if (s.state === 'shop') { shops++; await p.waitForTimeout(1600); await want('4_boutique', true); const r = await p.evaluate(() => __botShop()); console.log('  achats', JSON.stringify(r.bought), 'reste', r.cash);
      await want('4_boutique_apres', true); await p.click('#bNext'); await p.waitForTimeout(300); }
    if (s.state === 'dead') { deaths++; console.log('  K.-O. Q' + (s.li + 1) + ' V' + (s.wi + 1)); await want('6_ko', true); await p.waitForTimeout(800); await p.click('#bRetry'); }
    if (s.state === 'win') { await p.waitForTimeout(2500); await snap('7_victoire'); break; }
  }
  const fin = await p.evaluate(() => { const G = __game.G; return { state: G.state, li: G.li, wi: G.wi, kills: G.kills, score: G.score, beatHits: G.beatHits, shots: G.shots, bestStreak: G.bestStreak, up: G.up }; });
  const res = { path: PATH, start: START, won: fin.state === 'win', minutes: +((Date.now() - t0) / 60000).toFixed(1), deaths, shops, ...fin, errors: errs, shots, log };
  fs.writeFileSync(SH + PRE + '_result.json', JSON.stringify(res, null, 1));
  console.log('RESULTAT', JSON.stringify({ path: PATH, won: res.won, minutes: res.minutes, deaths, kills: fin.kills, score: fin.score, beatHits: fin.beatHits, shots: fin.shots, errors: errs.length }));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  await b.close(); srv.close(); process.exit(errs.length || !res.won ? 1 : 0);
})();
