// Rend les thèmes en WAV (hors ligne) : node tools/render_audio.js <before|after> [scènes séparées par virgule]
const { chromium } = require('/workspace/pw/node_modules/playwright');
const PORT = +(process.env.PORT || 8797);
const serve = require('./serve'); const fs = require('fs');
const WHO = process.argv[2] || 'after'; const SRC = WHO === 'before' ? '/audio-demo/before-src/audio.js' : '/js/audio.js';
const OUT = '/workspace/neon-quebec/audio-demo/wav/'; fs.mkdirSync(OUT, { recursive: true });
const D = 34;
const wave = (k, boss) => ({ events: [{ t: 0, fn: 'key', v: k }, { t: 0, fn: 'setLevel', v: k }, { t: 0, fn: 'toChill' }, { t: 0, fn: 'int', v: 0.2 }, { t: 3, fn: 'startWave', v: boss },
  { t: 12, fn: 'int', v: 0.6 }, { t: 20, fn: 'int', v: 1 }] });
const SCENES = {
  titre: { events: [{ t: 0, fn: 'toTitle' }] },
  vq: wave(0, false), sr: wave(3, false), lm: wave(5, false), pt: wave(-2, false),
  boss: wave(0, true),
  boutique: { events: [{ t: 0, fn: 'key', v: 3 }, { t: 0, fn: 'toChill' }, { t: 0, fn: 'toShop' }] },
};
// clé de quartier -> index (nouvelle version : thème par quartier)
const LV = { 0: 0, 3: 1, 5: 2, '-2': 3 };
for (const s of Object.values(SCENES)) for (const e of s.events) if (e.fn === 'setLevel') e.v = LV[e.v];
(async () => {
  const srv = await serve(PORT); const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:${PORT}/tools/render_audio.html`); await p.waitForFunction('window.ready');
  const names = (process.argv[3] || Object.keys(SCENES).join(',')).split(',');
  for (const n of names) {
    const sc = JSON.parse(JSON.stringify(SCENES[n]));
    // l'ancienne version n'a ni setLevel ni toShop : on les ignore
    const r = await p.evaluate(async ([src, sc, d]) => { const mod = await import(src); const M = mod.Music.prototype;
      sc.events = sc.events.filter(e => e.fn === 'key' || e.fn === 'int' || typeof M[e.fn] === 'function'); return window.renderScene(src, sc, d); }, [SRC, sc, D]);
    fs.writeFileSync(OUT + WHO + '-' + n + '.wav', Buffer.from(r.b64, 'base64'));
    console.log(WHO, n, 'peak', r.peak.toFixed(3));
  }
  console.log('errors', errs.length, errs.slice(0, 5)); await b.close(); srv.close(); process.exit(0);
})();
