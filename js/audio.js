// Moteur audio : synthwave/trance procédurale (WebAudio) + horloge de beat + effets sonores.
// La musique pilote les vagues : build-up -> drop (la horde) -> breakdown (répit). Contrat avec le jeu :
// BPM fixe (138), SPB exporté, noms/longueurs de sections (SECTIONS), sectionAt(), beatPos(), clock().
// Chaque quartier a son thème (progression, basse, batterie, mélodie), plus titre, boutique et boss.
const BPM = 138;
export const SPB = 60 / BPM;          // secondes par temps
const STEP = SPB / 4;                 // double-croche
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export const SECTIONS = { build: 8, drop: 16, break: 8, chill: 4, boss: 16, title: 4, outro: 4, shop: 8 };

// Accords en demi-tons relatifs à La (clé 0) : r = fondamentale, t = notes
const C_ = (r, ...t) => ({ r, t });
const Am = C_(0, 0, 3, 7), F = C_(-4, -4, 0, 3), C = C_(3, 3, 7, 10), G = C_(-2, -2, 2, 5), Dm = C_(5, 5, 8, 12), Em = C_(7, 7, 10, 14),
  E = C_(7, 7, 11, 14), Bb = C_(1, 1, 5, 8), Am7 = C_(0, 0, 3, 7, 10), Dm9 = C_(5, 5, 8, 12, 19), Gm7 = C_(-2, -2, 2, 5, 9), Cmaj7 = C_(3, 3, 7, 10, 14), Fmaj7 = C_(-4, -4, 0, 3, 7),
  Esus = C_(7, 7, 12, 14);
// Mélodies : rythme [pas, durée] sur 2 mesures (32 pas) + contour (indice de note d'accord, 0=fond., 3=octave…)
const THEMES = {
  // Vieux-Québec : hymne héroïque, basse roulante, caisse claire à réverbe « gated »
  vq: { prog: [Am, F, C, G], bass: [-1, 0, 12, 0, -1, 0, 12, 0, -1, 0, 12, 0, -1, 0, 12, 7], drums: 'classic', arp: 'up', bell: 0, glide: 0, oct: 0,
    rhy: [[0, 3], [3, 3], [6, 2], [8, 4], [12, 2], [14, 2], [16, 6], [24, 2], [26, 2], [28, 4]], A: [4, 5, 4, 3, 1, 2, 3, 0, 1, 2], B: [6, 5, 7, 6, 4, 5, 6, 3, 4, 5], leadCut: 4600 },
  // Saint-Roch : pluie néon, plus sombre, basse en octaves pompée, shaker
  sr: { prog: [Am, G, F, Em], bass: [-1, -1, 0, 12, -1, -1, 0, 12, -1, -1, 0, 12, -1, -1, 0, 12], drums: 'rain', arp: 'updown', bell: 0.4, glide: 0, oct: 0,
    rhy: [[0, 2], [2, 2], [4, 4], [10, 2], [12, 4], [16, 2], [18, 2], [20, 4], [26, 2], [28, 4]], A: [3, 2, 1, 2, 0, 3, 4, 5, 4, 3], B: [5, 4, 3, 4, 2, 5, 6, 7, 6, 5], leadCut: 3800 },
  // Limoilou : groove syncopé, cloche, lead qui glisse
  lm: { prog: [Am, Dm, G, C], bass: [0, -1, -1, 0, -1, -1, 12, -1, -1, -1, 0, 12, -1, -1, 7, -1], drums: 'funk', arp: 'skip', bell: 0, glide: 0.035, oct: 0,
    rhy: [[0, 2], [3, 1], [4, 2], [6, 3], [10, 2], [12, 4], [16, 2], [19, 1], [20, 2], [22, 2], [24, 3], [28, 4]], A: [3, 4, 3, 2, 3, 1, 3, 4, 5, 4, 2, 3], B: [5, 6, 5, 4, 5, 3, 5, 6, 7, 6, 4, 5], leadCut: 4200 },
  // Pont de glace : cristallin (cloches FM), mineur harmonique, demi-temps
  pt: { prog: [Am, F, G, E], bass: [0, -1, 0, -1, 12, -1, 0, -1, 0, -1, 0, -1, 12, -1, 7, -1], drums: 'ice', arp: 'bell', bell: 1, glide: 0, oct: 0,
    rhy: [[0, 6], [6, 2], [8, 6], [14, 2], [16, 4], [20, 4], [24, 8]], A: [5, 4, 3, 2, 3, 1, 2], B: [8, 7, 6, 5, 6, 4, 5], leadCut: 3600 },
  // Boss : phrygien agressif, basse saturée en double-croches, sirène
  boss: { prog: [Am, Bb, Am, Esus], bass: [0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 1, 12, 0], drums: 'boss', arp: 'up', bell: 0, glide: 0.02, oct: 0, drive: 4,
    rhy: [[0, 4], [4, 4], [8, 2], [10, 2], [12, 4], [16, 4], [20, 4], [24, 2], [26, 2], [28, 2], [30, 2]], A: [3, 4, 5, 4, 3, 2, 3, 6, 5, 4, 5], B: [6, 7, 8, 7, 6, 5, 6, 9, 8, 7, 8], leadCut: 5400 },
  // Titre : ballade synthwave en demi-temps
  title: { prog: [Am, F, C, G], bass: [0, -1, -1, -1, -1, -1, -1, -1, 0, -1, -1, 12, -1, -1, -1, -1], drums: 'half', arp: 'up', bell: 0.6, glide: 0.04, oct: 0,
    rhy: [[0, 6], [6, 2], [8, 8], [16, 6], [22, 2], [24, 8]], A: [4, 3, 2, 3, 4, 2], B: [5, 4, 3, 5, 6, 4], leadCut: 2600 },
  // Boutique : détente, accords enrichis, piano FM, swing
  shop: { prog: [Am7, Dm9, Gm7, Cmaj7], bass: [0, -1, -1, -1, -1, -1, 7, -1, 12, -1, -1, -1, 10, -1, -1, -1], drums: 'lofi', arp: 'keys', bell: 1, glide: 0, oct: 0,
    rhy: [[0, 4], [6, 2], [8, 6], [16, 4], [22, 2], [24, 8]], A: [3, 2, 1, 2, 4, 3], B: [4, 3, 2, 3, 5, 4], leadCut: 2000 },
};
const LEVEL_THEMES = ['vq', 'sr', 'lm', 'pt'];

export class Music {
  constructor() {
    this.ctx = null; this.mode = 0; this.off = 0; this.lastC = 0;
    this.gridT0 = null; this.nextStep = 0; this.timeline = [{ t: -1, name: 'title', bar: 0, len: 4 }];
    this.plan = { name: 'title', bar: 0 }; this.req = null; this.waveMode = false; this.bossMode = false;
    this.key = 0; this.reqKey = 0; this.vol = 0.8; this.musicVol = 1; this.sfxVol = 1; this.muted = false;
    this.intensity = 0; this.intS = 0; this.level = 0; this.reqLevel = 0; this.inShop = false; this.muffled = false;
  }
  // Horloge continue : temps AudioContext si actif, sinon horloge du navigateur (repli)
  clock() {
    const run = this.ctx && this.ctx.state === 'running' ? 1 : 0;
    const raw = run ? this.ctx.currentTime : performance.now() / 1000;
    if (run !== this.mode) { this.off = this.lastC - raw; this.mode = run; }
    const c = raw + this.off; this.lastC = c; return c;
  }
  latency() { return this.ctx && this.mode ? (this.ctx.outputLatency || this.ctx.baseLatency || 0) : 0; }
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); this.unlock(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { this.ctx = new AC(); } catch (e2) { this.ctx = null; return; } }
    const c = this.ctx; c.resume && c.resume().catch(() => {}); this.unlock();
    // ---- Bus de mixage : musique + effets -> colle (compresseur) -> limiteur -> écrêteur doux
    this.master = c.createGain(); this.master.gain.value = this.vol;
    const glue = c.createDynamicsCompressor(); glue.threshold.value = -16; glue.ratio.value = 3; glue.knee.value = 8; glue.attack.value = 0.012; glue.release.value = 0.2;
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -4; lim.ratio.value = 20; lim.knee.value = 0; lim.attack.value = 0.002; lim.release.value = 0.12;
    const clip = c.createWaveShaper(); const cv = new Float32Array(2048); for (let i = 0; i < cv.length; i++) { const x = i / 1023.5 - 1; cv[i] = 0.92 * Math.tanh(1.25 * x) / Math.tanh(1.25); }
    clip.curve = cv; clip.oversample = '2x';
    this.master.connect(glue); glue.connect(lim); lim.connect(clip); clip.connect(c.destination);
    this.musicOut = c.createGain(); this.musicOut.gain.value = this.musicVol; this.musicOut.connect(this.master);
    this.muff = c.createBiquadFilter(); this.muff.type = 'lowpass'; this.muff.frequency.value = 20000; this.muff.Q.value = 0.5; this.muff.connect(this.musicOut);
    this.secGain = c.createGain(); this.secGain.gain.value = 0.7; this.secGain.connect(this.muff);   // niveau par section (fondus doux)
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.32; this.musicBus.connect(this.secGain);
    this.duck = c.createGain(); this.duck.connect(this.musicBus);          // tout ce qui « pompe » sous le kick
    this.sfx = c.createGain(); this.sfx.gain.value = 0.5 * this.sfxVol; this.sfx.connect(this.master);
    // ---- Réverbes générées : salle (2,8 s, stéréo décorrélée, queue qui s'assombrit) et « gated » (caisse claire 80s)
    const mkIR = (sec, pre, shape, dark) => { const len = Math.floor(c.sampleRate * sec), ir = c.createBuffer(2, len, c.sampleRate), p0 = Math.floor(c.sampleRate * pre);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = p0; i < len; i++) { const x = (i - p0) / (len - p0); const a = dark * x; lp = lp * a + (Math.random() * 2 - 1) * (1 - a); d[i] = lp * shape(x); } } return ir; };
    this.rev = c.createConvolver(); this.rev.buffer = mkIR(2.3, 0.02, x => Math.pow(1 - x, 2.6), 0.85);
    this.revIn = c.createGain(); this.revIn.gain.value = 0.3; const revHP = c.createBiquadFilter(); revHP.type = 'highpass'; revHP.frequency.value = 220;
    this.revIn.connect(revHP); revHP.connect(this.rev); const revOut = c.createGain(); revOut.gain.value = 0.9; this.rev.connect(revOut); revOut.connect(this.duck);
    this.gate = c.createConvolver(); this.gate.buffer = mkIR(0.32, 0.004, x => x < 0.85 ? 0.8 + 0.2 * (1 - x) : (1 - x) * 5, 0.3);
    this.gateIn = c.createGain(); this.gateIn.gain.value = 0.55; this.gateIn.connect(this.gate); const gOut = c.createGain(); gOut.gain.value = 0.5; this.gate.connect(gOut); gOut.connect(this.musicBus);
    // ---- Delay ping-pong pointé (croche pointée), filtré
    const dL = c.createDelay(1.5), dR = c.createDelay(1.5); dL.delayTime.value = SPB * 0.75; dR.delayTime.value = SPB * 0.75;
    const fbL = c.createGain(), fbR = c.createGain(); fbL.gain.value = fbR.gain.value = 0.38; const dF = c.createBiquadFilter(); dF.type = 'lowpass'; dF.frequency.value = 3200;
    const pL = c.createStereoPanner(), pR = c.createStereoPanner(); pL.pan.value = -0.8; pR.pan.value = 0.8;
    this.dly = c.createGain(); this.dly.connect(dF); dF.connect(dL); dL.connect(fbL); fbL.connect(dR); dR.connect(fbR); fbR.connect(dL);
    const dOut = c.createGain(); dOut.gain.value = 0.32; dL.connect(pL); dR.connect(pR); pL.connect(dOut); pR.connect(dOut); dOut.connect(this.duck); dOut.connect(this.revIn);
    // ---- Chorus stéréo pour les nappes (deux lignes modulées)
    this.chorus = c.createGain(); const chOut = c.createGain(); chOut.gain.value = 0.7; this.chorus.connect(chOut);
    [[-0.9, 0.011, 0.27], [0.9, 0.017, 0.33]].forEach(([pan, base, rate]) => { const d = c.createDelay(0.05); d.delayTime.value = base; const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = rate; lg.gain.value = 0.004; lfo.connect(lg); lg.connect(d.delayTime); lfo.start(); const p = c.createStereoPanner(); p.pan.value = pan; this.chorus.connect(d); d.connect(p); p.connect(chOut); });
    chOut.connect(this.duck);
    // bruit
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noise = nb;
    // ---- Voix persistantes (économes pour les téléphones)
    const mkVoice = (types, detunes, pans, dest, cutoff, q = 2) => {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = q;
      const g = c.createGain(); g.gain.value = 0; f.connect(g); if (dest) g.connect(dest);
      const oscs = types.map((t, i) => { const o = c.createOscillator(); o.type = t; o.detune.value = detunes[i] || 0;
        if (pans && pans[i]) { const p = c.createStereoPanner(); p.pan.value = pans[i]; o.connect(p); p.connect(f); } else o.connect(f); o.start(); return o; });
      return { f, g, oscs };
    };
    // nappe supersaw : 3 voix × 3 scies désaccordées étalées en stéréo, chorus + réverbe
    this.pad = [0, 1, 2, 3].map(() => mkVoice(['sawtooth', 'sawtooth', 'sawtooth'], [-14, 0, 13], [-0.7, 0, 0.7], this.duck, 900, 0.7));
    this.pad.forEach(v => { v.g.connect(this.chorus); v.g.connect(this.revIn); });
    // lead supersaw (5 scies + carré une octave plus bas)
    this.lead = mkVoice(['sawtooth', 'sawtooth', 'sawtooth', 'sawtooth', 'square'], [-19, -7, 0, 8, -1200], [-0.5, -0.2, 0, 0.25, 0], this.duck, 3000, 1.5);
    this.lead.g.connect(this.dly); this.lead.g.connect(this.revIn);
    // arpège / pluck
    this.arp = mkVoice(['square', 'sawtooth'], [0, 7], [-0.35, 0.35], this.duck, 1200, 4); this.arp.g.connect(this.dly);
    // cloche / piano FM (porteuse sinus + modulateur)
    { const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain(), p = c.createStereoPanner(); car.type = 'sine'; mod.type = 'sine'; mg.gain.value = 0; g.gain.value = 0;
      mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(p); p.connect(this.duck); g.connect(this.dly); g.connect(this.revIn); car.start(); mod.start(); p.pan.value = 0.2; this.bell = { car, mod, mg, g, p }; }
    // basse : scie + sous-basse sinus, saturation dosable (boss)
    this.bass = mkVoice(['sawtooth', 'sine', 'sawtooth'], [0, -1200, 9], [0, 0, 0], null, 400, 5);
    this.bassDrive = c.createGain(); this.bassDrive.gain.value = 1.2; const sh = c.createWaveShaper(); const bc = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; bc[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); } sh.curve = bc; const bOut = c.createGain(); bOut.gain.value = 0.75;
    this.bass.g.connect(this.bassDrive); this.bassDrive.connect(sh); sh.connect(bOut); bOut.connect(this.duck);
    this.timer = setInterval(() => this.schedule(), 25);
    if (typeof document !== 'undefined' && !this._vis) { this._vis = true; document.addEventListener('visibilitychange', () => { if (!this.ctx || !this.ctx.suspend) return; if (document.hidden) this.ctx.suspend().catch(() => {}); else this.ctx.resume().catch(() => {}); }); }
    this.clock(); if (this.gridT0 == null) { this.gridT0 = this.clock() + 0.15; this.nextStep = 0; }
    this.applyVol();
  }
  // iOS / Android : jouer un son muet pendant le geste débloque la sortie audio
  unlock() { const c = this.ctx; if (!c || this._unlocked) return; try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); this._unlocked = true; } catch (e) {} }
  applyVol() { if (!this.master) return; const t = this.ctx.currentTime; this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol, t, 0.03);
    this.musicOut.gain.setTargetAtTime(this.musicVol, t, 0.03); this.sfx.gain.setTargetAtTime(0.5 * this.sfxVol, t, 0.03); }
  setVolume(v) { this.vol = v; this.applyVol(); }
  setMusicVolume(v) { this.musicVol = v; this.applyVol(); }
  setSfxVolume(v) { this.sfxVol = v; this.applyVol(); }
  // pause : musique étouffée (filtre passe-bas) et un peu plus basse
  muffle(on) { this.muffled = on; if (!this.muff) return; const t = this.ctx.currentTime; this.muff.frequency.setTargetAtTime(on ? 650 : 20000, t, on ? 0.12 : 0.25); this.musicBus.gain.setTargetAtTime(on ? 0.22 : 0.32, t, 0.2); }
  setIntensity(x) { this.intensity = Math.max(0, Math.min(1, x || 0)); }
  // Demandes du jeu (appliquées à la prochaine mesure)
  startWave(boss) { this.req = boss ? 'buildboss' : 'build'; this.waveMode = true; this.bossMode = !!boss; this.inShop = false; }
  toChill() { this.req = 'chill'; this.waveMode = false; this.bossMode = false; this.inShop = false; }
  toShop() { this.req = 'shop'; this.waveMode = false; this.bossMode = false; this.inShop = true; }
  toTitle() { this.req = 'title'; this.waveMode = false; this.bossMode = false; this.inShop = false; }
  setKey(k) { this.reqKey = k; }
  setLevel(i) { this.reqLevel = i; }
  sectionAt(t) { let s = this.timeline[0]; for (const e of this.timeline) { if (e.t <= t) s = e; else break; } return s; }
  beatPos(t) { if (this.gridT0 == null) return 0; return (t - this.gridT0) / SPB; }
  nextBar(t) { const b = Math.ceil((t - this.gridT0) / (SPB * 4)); return this.gridT0 + b * SPB * 4; }
  // séquenceur (mêmes sections et longueurs qu'avant : le jeu en dépend)
  advanceBar(t) {
    const p = this.plan;
    if (this.req) {
      const r = this.req; this.req = null; this.trans = p.name !== (r === 'buildboss' ? 'build' : r);
      if (r === 'build' || r === 'buildboss') { p.name = 'build'; p.bar = 0; p.len = r === 'buildboss' ? 4 : 8; }
      else { p.name = r; p.bar = 0; p.len = SECTIONS[r]; }
    } else if (p.bar >= p.len) {
      p.bar = 0;
      if (this.waveMode) {
        if (p.name === 'build') { p.name = this.bossMode ? 'boss' : 'drop'; }
        else if (p.name === 'drop' || p.name === 'boss') { p.name = 'break'; }
        else { p.name = this.bossMode ? 'boss' : 'drop'; }
        p.len = p.name === 'break' ? (this.bossMode ? 4 : 8) : SECTIONS[p.name];
      } else { p.len = SECTIONS[p.name] || 4; }
    }
    if (p.bar === 0) { this.timeline.push({ t, name: p.name, bar: 0, len: p.len }); if (this.timeline.length > 40) this.timeline.splice(0, 20); }
    this.key = this.reqKey; this.level = this.reqLevel;
    p.bar++;
    return { name: p.name, bar: p.bar - 1, len: p.len };
  }
  schedule() {
    const now = this.clock();
    if (this.gridT0 == null) this.gridT0 = now + 0.1;
    if (!this.ctx || this.mode === 0) { // pas de son : on garde le séquenceur à jour pour la ligne du temps
      while (this.gridT0 + this.nextStep * STEP < now + 0.12) { if (this.nextStep % 16 === 0) this.cur = this.advanceBar(this.gridT0 + this.nextStep * STEP); this.nextStep++; }
      return;
    }
    while (this.gridT0 + this.nextStep * STEP < now + 0.12) {
      const t = this.gridT0 + this.nextStep * STEP; const st = this.nextStep % 16;
      if (st === 0) this.cur = this.advanceBar(t);
      this.playStep(t - this.off, st, this.cur, Math.floor(this.nextStep / 16));
      this.nextStep++;
    }
  }
  themeFor(name) { return name === 'title' ? THEMES.title : name === 'shop' ? THEMES.shop : (name === 'boss' || (this.bossMode && name !== 'chill')) ? THEMES.boss : THEMES[LEVEL_THEMES[this.level] || 'vq']; }
  playStep(t, st, sec, absBar) {
    const k = this.key, name = sec.name, bar = sec.bar, len = sec.len;
    this.intS += (this.intensity - this.intS) * 0.04; const I = this.intS;
    const TH = this.themeFor(name);
    const drop = name === 'drop' || name === 'boss', build = name === 'build', brk = name === 'break', title = name === 'title', shop = name === 'shop';
    const chill = name === 'chill' || name === 'outro', calm = chill || title || shop;
    // position dans la progression (2 mesures par accord). En section, on repart au début de la progression.
    const pb = (bar + (calm ? absBar : 0)) % 8, chordI = Math.floor(pb / 2) % 4, ch = TH.prog[chordI];
    const half = pb % 2; // 1re ou 2e mesure de l'accord
    const B2 = drop && bar >= 8; // 2e moitié du drop : variation
    const prog = len ? (bar * 16 + st) / (len * 16) : 0;
    if (st === 0) this.secGain.gain.setTargetAtTime(drop ? 1 : build ? 0.85 + 0.15 * prog : brk ? 0.85 : title ? 0.62 : shop ? 0.7 : 0.55, t, 0.8);
    // ---------- Nappe ----------
    if (st === 0 && (half === 0 || bar === 0)) {
      const tones = ch.t.length > 3 ? ch.t.slice(0, 4) : [...ch.t, ch.t[0] + 12];
      const lvl = (drop ? 0.034 : brk ? 0.05 : title ? 0.036 : shop ? 0.03 : chill ? 0.036 : 0.038);
      const cut = drop ? 2600 + 1400 * I : build ? 500 + 2600 * prog : brk ? 1600 : title ? 1300 : shop ? 900 : 750;
      this.pad.forEach((v, i) => { let n = 57 + k + tones[i]; while (n < 52) n += 12; while (n > 68) n -= 12;
        v.oscs.forEach(o => o.frequency.setTargetAtTime(mtof(n), t, calm ? 0.06 : 0.015)); v.g.gain.setTargetAtTime(lvl, t, calm ? 0.6 : 0.25); v.f.frequency.setTargetAtTime(cut, t, build ? 1.5 : 0.5); });
    }
    if (build && st % 4 === 0) this.pad.forEach(v => v.f.frequency.setTargetAtTime(500 + 2600 * prog, t, 0.3));
    // ---------- Batterie ----------
    const D = TH.drums, beat = st % 4 === 0;
    const kickOn = drop || (build && bar >= len / 2) || ((title || shop) && (D === 'half' || D === 'lofi'));
    let kick = false;
    if (kickOn) {
      if (D === 'half' || D === 'lofi') kick = st === 0 || st === 10 || (D === 'half' && st === 7 && half === 1);
      else if (D === 'ice' && !drop) kick = st === 0 || st === 8;
      else kick = beat || (D === 'funk' && st === 14 && bar % 2 === 1) || (D === 'boss' && bar % 4 === 3 && st >= 12 && st % 2 === 0);
    }
    if (kick) { const soft = title || shop; this.kick(t, soft ? 0.45 : drop ? 1 : 0.8, soft);
      const dd = soft ? 0.65 : 0.25; this.duck.gain.cancelScheduledValues(t); this.duck.gain.setValueAtTime(dd, t); this.duck.gain.linearRampToValueAtTime(1, t + SPB * (soft ? 0.5 : 0.85)); }
    else if (!kickOn && beat) { this.duck.gain.cancelScheduledValues(t); this.duck.gain.setValueAtTime(1, t); }
    // caisse claire / clap
    if (drop) {
      if (D === 'ice') { if (st === 8) this.snare(t, 0.55, true); }
      else if (st === 4 || st === 12) { if (D === 'rain' || D === 'funk') this.clap(t, 0.42); this.snare(t, D === 'classic' || D === 'boss' ? 0.55 : 0.3, D === 'classic' || D === 'boss'); }
      if (D === 'funk' && (st === 7 || st === 15) && I > 0.4) this.snare(t, 0.08, false);
    }
    if (title && st === 8) this.snare(t, 0.4, true);
    if (shop && (st === 4 || st === 12)) this.rim(t, 0.2);
    // remplissages : fin de phrase de 4 mesures et roulement de fin de build/break
    if (drop && bar % 4 === 3 && st >= 12) { if (bar % 8 === 7) { this.tom(t, [0, 0, 0, 0, 220, 180, 150, 120][st - 8] || 150, 0.35); } else if (st % 2 === 0) this.snare(t, 0.15 + 0.05 * (st - 12), false); }
    if ((build || brk) && bar >= len - 2) { const dens = bar === len - 1 ? 1 : 2; if (st % dens === 0) this.snare(t, 0.07 + 0.3 * ((bar - (len - 2)) * 16 + st) / 32, false); }
    // charlestons, shaker, cloche
    const sw = (shop || D === 'funk') && st % 2 === 1 ? STEP * 0.18 : 0; // swing
    if ((drop || build) && st % 4 === 2) this.hat(t, D === 'ice' ? 0.07 : 0.11, 0.12, true);
    if (drop && st % 2 === 1 && (I > 0.25 || B2 || D === 'boss')) this.hat(t + sw, 0.035 + 0.02 * I, 0.03);
    if (drop && I > 0.7 && st % 2 === 0 && st % 4 !== 2) this.hat(t, 0.025, 0.025);
    if (D === 'rain' && (drop || brk || build)) this.shaker(t, (st % 2 ? 0.02 : 0.035) * (0.6 + 0.6 * I));
    if (D === 'funk' && drop && [3, 6, 11, 14].includes(st)) this.cow(t, 0.05 + 0.03 * I);
    if (D === 'ice' && (drop || brk) && st % 4 === 2) this.tick(t, 0.04);
    if (title && st % 2 === 0) this.hat(t, 0.03, 0.03);
    if ((shop || chill) && st % 2 === 1) this.shaker(t + sw, chill ? 0.014 : 0.034);
    if (shop && st % 4 === 2) this.hat(t, 0.03, 0.05);
    if (drop && st === 0 && (bar === 0 || bar === 8 || (D === 'boss' && bar % 4 === 0))) this.crash(t);
    if (this.trans && st === 0) { this.trans = false; if (!drop) this.down(t); }
    // ---------- Basse ----------
    const bassOn = drop || (build && bar >= len / 2) || title || shop || brk;
    if (bassOn) {
      const v = this.bass, pat = TH.bass, root = 33 + k + ch.r + (ch.r < -3 ? 12 : 0);
      let semi = pat[st];
      if (brk) semi = st === 0 ? 0 : st === 8 && half ? 12 : -1;
      if (semi >= 0 && !(kick && !calm && semi === 0 && D !== 'boss' && D !== 'funk' && D !== 'ice')) {
        const n = root + 12 + semi, dur = calm ? STEP * (title ? 7 : 3.5) : brk ? SPB * 2 : STEP * (D === 'ice' ? 1.7 : 0.9);
        v.oscs.forEach(o => (TH.glide && !calm) ? o.frequency.setTargetAtTime(mtof(n), t, TH.glide) : o.frequency.setValueAtTime(mtof(n), t));
        const lv = (drop ? 0.16 : title ? 0.09 : calm ? 0.1 : 0.14) * (D === 'boss' ? 0.8 : 1);
        v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(0.0001, t); v.g.gain.linearRampToValueAtTime(lv, t + 0.006); v.g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const cut = (drop ? 700 + 900 * I : calm ? 380 : 500) * (D === 'boss' ? 1.6 : 1);
        v.f.frequency.cancelScheduledValues(t); v.f.frequency.setValueAtTime(cut * 2.2, t); v.f.frequency.exponentialRampToValueAtTime(Math.max(120, cut * 0.35), t + dur * 0.9);
        this.bassDrive.gain.setValueAtTime(D === 'boss' && drop ? 3.5 : 1.2, t);
      }
    }
    // ---------- Arpège ----------
    const arpOn = !(drop && D === 'boss' && bar % 8 < 4) && !(shop && st % 2);
    if (arpOn && TH.arp !== 'keys') {
      const tn = ch.t, ext = i => tn[i % tn.length] + 12 * Math.floor(i / tn.length);
      let idx; const s = st;
      if (TH.arp === 'updown') idx = [0, 1, 2, 3, 4, 3, 2, 1][s % 8];
      else if (TH.arp === 'skip') idx = [0, 2, 1, 3, 2, 4, 3, 1][s % 8];
      else if (TH.arp === 'bell') idx = [0, 2, 4, 3, 5, 4, 2, 3][s % 8] + (s >= 8 ? 1 : 0);
      else idx = [0, 1, 2, 3][s % 4] + (s >= 8 ? 3 : 0);
      if (drop && I > 0.6 && s % 4 === 3) idx += 3;
      const n = 69 + k + ext(idx) - (TH.arp === 'bell' ? 0 : 0);
      const lv = (drop ? 0.022 + 0.012 * I : brk ? 0.04 : build ? 0.02 + 0.035 * prog : title ? 0.022 : 0.026) * (TH.bell >= 1 ? 0.5 : 1);
      if (!(calm && s % 2 === 1 && !title)) {
        const v = this.arp; v.oscs.forEach(o => o.frequency.setValueAtTime(mtof(n), t));
        v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(lv, t); v.g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * (calm ? 1.8 : 0.95));
        const cut = build ? 500 + 3500 * prog : brk ? 1800 : calm ? 1000 : 2200 + 1800 * I;
        v.f.frequency.cancelScheduledValues(t); v.f.frequency.setValueAtTime(cut * 1.6, t); v.f.frequency.exponentialRampToValueAtTime(cut * 0.45, t + STEP);
        if (TH.bell && (brk || calm || drop) && s % 2 === 0) this.ring(t, mtof(n + 12), (brk || calm ? 0.05 : 0.03) * TH.bell, calm ? 1.2 : 0.6, 3.5);
      }
    }
    if (shop && (st === 0 || st === 6 || st === 10) ) { // piano FM : accords égrenés
      const tn = ch.t; tn.forEach((x, j) => this.ring(t + j * 0.025, mtof(69 + k + x - 12 + (st === 10 ? 12 : 0)), 0.035, 1.6, 1));
    }
    // ---------- Mélodie (lead supersaw au drop, cloche au break/titre) ----------
    const leadOn = drop || title || (brk && bar >= 2) || (build && bar >= len - 4 && D !== 'boss');
    if (leadOn) {
      const ph = (half * 16 + st), rhy = TH.rhy; const ri = rhy.findIndex(r => r[0] === ph);
      if (ri >= 0) {
        const tn = ch.t, ext = i => tn[i % tn.length] + 12 * Math.floor(i / tn.length);
        const cont = (B2 || (title && Math.floor(absBar / 8) % 2)) ? TH.B : TH.A;
        const n = 69 + k + ext(cont[ri]) + (TH.oct || 0) - (title ? 12 : 0);
        const dur = rhy[ri][1] * STEP;
        if (drop || title) {
          const v = this.lead, lv = (name === 'boss' ? 0.06 : 0.056) * (title ? 0.75 : 1) * (0.85 + 0.25 * I);
          v.oscs.forEach(o => TH.glide ? o.frequency.setTargetAtTime(mtof(n), t, TH.glide) : o.frequency.setValueAtTime(mtof(n), t));
          v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value > 0.001 && TH.glide ? lv * 0.6 : 0.0001, t); v.g.gain.linearRampToValueAtTime(lv, t + 0.012);
          v.g.gain.setTargetAtTime(lv * 0.6, t + 0.05, dur * 0.5); v.g.gain.setTargetAtTime(0.0001, t + dur * 0.92, 0.05);
          const lc = TH.leadCut * (title ? 0.8 : 1) * (0.85 + 0.3 * I);
          v.f.frequency.cancelScheduledValues(t); v.f.frequency.setValueAtTime(lc, t); v.f.frequency.exponentialRampToValueAtTime(lc * 0.4, t + Math.max(STEP, dur));
          if (title || D === 'ice') this.ring(t, mtof(n + 12), 0.02, dur * 1.5, 2);
        } else this.ring(t, mtof(n + (brk ? 12 : 0)), brk ? 0.055 : 0.03, Math.max(0.4, dur * 1.4), 2);
      }
    }
    // ---------- Montées / descentes ----------
    if (build && st === 0 && bar === Math.max(0, len - 4)) this.rise(t, SPB * 16);
    if (brk && st === 0 && bar === len - 2) this.rise(t, SPB * 8);
    if (drop && bar === len - 1 && st === 8) this.rise(t, SPB * 2, 0.06);
  }
  // ---------- Batterie synthétisée ----------
  kick(t, v, soft) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(soft ? 120 : 170, t); o.frequency.exponentialRampToValueAtTime(soft ? 50 : 46, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.35); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.95, t + 0.003); g.gain.setTargetAtTime(v * 0.5, t + 0.04, 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + (soft ? 0.3 : 0.42)); o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.45);
    if (!soft) this.nz(t, 0.012, 'highpass', 3000, v * 0.22, this.musicBus); }
  nz(t, dur, type, f, v, dest, q, pan) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl); fl.connect(g);
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest || this.duck); } else g.connect(dest || this.duck);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); return { fl, g }; }
  hat(t, v, d, open) { this.nz(t, open ? d * 1.6 : d, 'highpass', open ? 7000 : 9000, v, this.musicBus, 0.7, open ? 0.25 : -0.3); }
  shaker(t, v) { this.nz(t, 0.05, 'bandpass', 6500, v, this.musicBus, 1.5, 0.45); }
  tick(t, v) { this.nz(t, 0.02, 'bandpass', 11000, v, this.musicBus, 6, -0.5); }
  clap(t, v) { [0, 0.011, 0.023].forEach((d, i) => { const n = this.nz(t + d, i === 2 ? 0.16 : 0.02, 'bandpass', 1300, v, this.musicBus, 1.1); if (i === 2) n.g.connect(this.revIn); }); }
  snare(t, v, gated) { const c = this.ctx; const n = this.nz(t, 0.16, 'highpass', 1200, v * 0.8, this.musicBus, 0.6); if (gated) n.g.connect(this.gateIn); else n.g.connect(this.revIn);
    const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.05);
    g.gain.setValueAtTime(v * 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09); o.connect(g); g.connect(this.musicBus); if (gated) g.connect(this.gateIn); o.start(t); o.stop(t + 0.1); }
  rim(t, v) { this.nz(t, 0.03, 'bandpass', 2600, v, this.musicBus, 4, 0.2); }
  cow(t, v) { const c = this.ctx; [540, 800].forEach(f => { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2; o.connect(bp); bp.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.14); }); }
  tom(t, f, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.2);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(this.musicBus); g.connect(this.gateIn); o.start(t); o.stop(t + 0.32); }
  crash(t) { const n = this.nz(t, 1.8, 'highpass', 4500, 0.13, this.musicBus, 0.5, 0.3); n.g.connect(this.revIn); const m = this.nz(t, 1.2, 'highpass', 6000, 0.08, this.musicBus, 0.5, -0.4); }
  ring(t, f, v, dur, ratio) { const B = this.bell; if (!B) return; B.car.frequency.setValueAtTime(f, t); B.mod.frequency.setValueAtTime(f * ratio, t);
    B.mg.gain.cancelScheduledValues(t); B.mg.gain.setValueAtTime(f * (ratio > 1.5 ? 2.2 : 1.1), t); B.mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
    B.g.gain.cancelScheduledValues(t); B.g.gain.setValueAtTime(0.0001, t); B.g.gain.linearRampToValueAtTime(v, t + 0.004); B.g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  rise(t, dur, peak = 0.11) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(8000, t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.05); s.connect(f); f.connect(g); g.connect(this.musicBus); g.connect(this.revIn); s.start(t); s.stop(t + dur + 0.1); }
  // descente de transition (changement d'état) : souffle filtré qui redescend
  down(t) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(6000, t); f.frequency.exponentialRampToValueAtTime(300, t + SPB * 4); const g = c.createGain(); g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + SPB * 4);
    s.connect(f); f.connect(g); g.connect(this.musicBus); g.connect(this.revIn); s.start(t); s.stop(t + SPB * 4 + 0.1); }
  // ---------- Effets sonores ----------
  ok() { return this.ctx && this.mode; }
  tone(type, f0, f1, dur, v, delay = 0, dest) { if (!this.ok()) return; const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.02); }
  snz(dur, type, f, v, delay = 0) { if (!this.ok()) return; this.nz(this.ctx.currentTime + delay, dur, type, f, v, this.sfx, 1); }
  scale(i) { const pent = [0, 3, 5, 7, 10]; return mtof(69 + this.key + pent[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5)); }
  shoot(kind, onBeat) {
    if (kind === 'baton') { this.snz(0.12, 'bandpass', onBeat ? 1800 : 1100, 0.3); this.tone('triangle', 300, 90, 0.1, 0.2); }
    else if (kind === 'pelle') { this.snz(0.06, 'highpass', 2500, 0.16); this.tone('square', onBeat ? 900 : 600, 120, 0.05, 0.05); this.tone('sine', 160, 60, 0.07, 0.12); }
    else if (kind === 'bordee') { this.snz(0.25, 'lowpass', 2200, 0.45); this.tone('sawtooth', 200, 50, 0.2, 0.18); }
    else if (kind === 'onde') { this.tone('sine', onBeat ? 1320 : 880, 220, 0.16, 0.16); this.tone('square', 440, 110, 0.12, 0.035); }
    else if (kind === 'puck') { this.snz(0.08, 'bandpass', 3000, 0.35); this.tone('square', 1200, 300, 0.1, 0.08); }
    else if (kind === 'pulse') { this.tone('sine', 120, 30, 0.6, 0.45); this.snz(0.5, 'lowpass', 900, 0.35); }
    if (onBeat) this.tone('triangle', this.scale(10), 0, 0.14, 0.07);
  }
  hit() { this.tone('square', 260 + Math.random() * 60, 120, 0.05, 0.045); }
  kill(i) { this.tone('triangle', this.scale(5 + (i % 8)), 0, 0.25, 0.13); this.tone('sine', this.scale(10 + (i % 8)), 0, 0.3, 0.06, 0.04); this.snz(0.16, 'bandpass', 2400, 0.1); }
  coin(i) { this.tone('square', this.scale(10 + (i % 10)), 0, 0.07, 0.035); }
  hurt() { this.tone('sawtooth', 180, 60, 0.25, 0.25); this.snz(0.15, 'lowpass', 600, 0.3); }
  dash() { this.snz(0.22, 'bandpass', 1200, 0.25); this.tone('sine', 300, 900, 0.15, 0.05); }
  buy() { [0, 2, 4].forEach((s, j) => this.tone('square', this.scale(10 + s), 0, 0.12, 0.06, j * 0.06)); }
  deny() { this.tone('square', 160, 120, 0.15, 0.07); }
  horn() { [0, 0.18].forEach(d => this.tone('sawtooth', 220, 210, 0.4, 0.11, d)); }
  roar() { this.tone('sawtooth', 90, 40, 1.2, 0.32); this.snz(1, 'lowpass', 500, 0.32); }
  blip() { this.tone('square', 600 + Math.random() * 300, 0, 0.03, 0.02); }
  stomp() { this.tone('sine', 80, 28, 0.5, 0.45); this.snz(0.3, 'lowpass', 400, 0.35); }
  enemyShot() { this.tone('triangle', 700, 350, 0.12, 0.045); }
  win() { [0, 2, 4, 5, 7].forEach((s, j) => this.tone('triangle', this.scale(5 + s), 0, 0.3, 0.11, j * 0.11)); }
}
