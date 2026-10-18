// Moteur audio : trance procédurale (WebAudio) + horloge de beat + effets sonores.
// La musique pilote les vagues : build-up -> drop (la horde) -> breakdown (répit).
const BPM = 138;
export const SPB = 60 / BPM;          // secondes par temps
const STEP = SPB / 4;                 // double-croche
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// Progression Am - F - C - G (2 mesures chacune)
const CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];
const ROOTS = [33, 29, 36, 31];
const LEAD_GATE = [1,0,1,0, 1,1,0,1, 0,1,1,0, 1,0,1,1];
const LEAD_IDX  = [0,0,1,0, 2,1,0,2, 0,3,2,0, 1,2,3,4, 3,0,2,0, 1,2,0,3, 0,2,1,0, 3,2,4,3];
// Plan musical par section : longueur en mesures
export const SECTIONS = { build: 8, drop: 16, break: 8, chill: 4, boss: 16, title: 4, outro: 4 };

export class Music {
  constructor() {
    this.ctx = null; this.mode = 0; this.off = 0; this.lastC = 0;
    this.gridT0 = null; this.nextStep = 0; this.timeline = [{ t: -1, name: 'title', bar: 0, len: 4 }];
    this.plan = { name: 'title', bar: 0 }; this.req = null; this.waveMode = false; this.bossMode = false;
    this.key = 0; this.reqKey = 0; this.vol = 0.8; this.musicVol = 1; this.muted = false;
    this.intensity = 0;
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
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { this.ctx = null; return; }
    const c = this.ctx; this.ctx.resume().catch(() => {});
    this.master = c.createGain(); this.master.gain.value = this.vol;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.55; this.musicBus.connect(this.master);
    this.duck = c.createGain(); this.duck.connect(this.musicBus);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.55; this.sfx.connect(this.master);
    // réverbe générée
    this.rev = c.createConvolver(); const len = c.sampleRate * 2.4, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.rev.buffer = ir; this.revIn = c.createGain(); this.revIn.gain.value = 0.35; this.revIn.connect(this.rev); this.rev.connect(this.musicBus);
    // delay pointé
    this.dly = c.createDelay(1); this.dly.delayTime.value = SPB * 0.75; const fb = c.createGain(); fb.gain.value = 0.32;
    const dOut = c.createGain(); dOut.gain.value = 0.3; this.dly.connect(fb); fb.connect(this.dly); this.dly.connect(dOut); dOut.connect(this.duck);
    // bruit
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noise = nb;
    // Voix persistantes (économes) : pad, lead supersaw, arp, basse
    const mkVoice = (types, detunes, dest, cutoff) => {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 2;
      const g = c.createGain(); g.gain.value = 0; f.connect(g); g.connect(dest);
      const oscs = types.map((t, i) => { const o = c.createOscillator(); o.type = t; o.detune.value = detunes[i] || 0; o.connect(f); o.start(); return o; });
      return { f, g, oscs };
    };
    this.pad = CHORDS[0].map(() => mkVoice(['sawtooth', 'sawtooth'], [-9, 9], this.duck, 900));
    this.pad.forEach(v => v.g.connect(this.revIn));
    this.lead = mkVoice(['sawtooth', 'sawtooth', 'sawtooth', 'sawtooth', 'square'], [-18, -7, 0, 8, 17], this.duck, 3000);
    this.lead.g.connect(this.dly); this.lead.g.connect(this.revIn);
    this.arp = mkVoice(['square', 'sawtooth'], [0, 7], this.duck, 1200); this.arp.g.connect(this.dly);
    this.bass = mkVoice(['sawtooth', 'sine'], [0, -1200], this.duck, 400);
    this.riser = null;
    this.timer = setInterval(() => this.schedule(), 25);
    this.clock(); if (this.gridT0 == null) { this.gridT0 = this.clock() + 0.15; this.nextStep = 0; }
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = this.muted ? 0 : v; }
  // Demandes du jeu (appliquées à la prochaine mesure)
  startWave(boss) { this.req = boss ? 'buildboss' : 'build'; this.waveMode = true; this.bossMode = !!boss; }
  toChill() { this.req = 'chill'; this.waveMode = false; this.bossMode = false; }
  toTitle() { this.req = 'title'; this.waveMode = false; this.bossMode = false; }
  setKey(k) { this.reqKey = k; }
  sectionAt(t) { let s = this.timeline[0]; for (const e of this.timeline) { if (e.t <= t) s = e; else break; } return s; }
  beatPos(t) { if (this.gridT0 == null) return 0; return (t - this.gridT0) / SPB; }
  nextBar(t) { const b = Math.ceil((t - this.gridT0) / (SPB * 4)); return this.gridT0 + b * SPB * 4; }
  // séquenceur
  advanceBar(t) {
    const p = this.plan;
    if (this.req) {
      const r = this.req; this.req = null;
      if (r === 'build' || r === 'buildboss') { p.name = 'build'; p.bar = 0; p.len = r === 'buildboss' ? 4 : 8; }
      else { p.name = r; p.bar = 0; p.len = SECTIONS[r]; }
    } else if (p.bar >= p.len) {
      p.bar = 0;
      if (this.waveMode) {
        if (p.name === 'build') { p.name = this.bossMode ? 'boss' : 'drop'; }
        else if (p.name === 'drop' || p.name === 'boss') { p.name = 'break'; p.len = this.bossMode ? 4 : 8; }
        else { p.name = this.bossMode ? 'boss' : 'drop'; }
        p.len = p.name === 'break' ? (this.bossMode ? 4 : 8) : SECTIONS[p.name];
      } else { p.len = SECTIONS[p.name] || 4; }
    }
    if (p.bar === 0) { this.timeline.push({ t, name: p.name, bar: 0, len: p.len }); if (this.timeline.length > 40) this.timeline.splice(0, 20); }
    this.key = this.reqKey;
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
  playStep(t, st, sec, absBar) {
    const c = this.ctx, k = this.key, name = sec.name, bar = sec.bar, len = sec.len;
    const chordI = Math.floor(absBar / 2) % 4, chord = CHORDS[chordI].map(n => n + k), root = ROOTS[chordI] + k;
    const beat = st % 4 === 0, q = st / 4;
    const drop = name === 'drop' || name === 'boss', build = name === 'build', brk = name === 'break', chill = name === 'chill' || name === 'title' || name === 'outro';
    // Pad : accords (change toutes les 2 mesures)
    if (st === 0) {
      const lvl = drop ? 0.05 : brk ? 0.075 : chill ? 0.06 : 0.055;
      this.pad.forEach((v, i) => { v.oscs.forEach(o => o.frequency.setValueAtTime(mtof(chord[i]), t)); v.g.gain.setTargetAtTime(lvl, t, 0.3);
        const cut = drop ? 2400 : build ? 600 + 2200 * bar / len : brk ? 1500 : 800; v.f.frequency.setTargetAtTime(cut, t, 0.5); });
    }
    // Kick + sidechain
    const kickOn = drop || (build && bar >= len / 2) || (chill && name === 'chill' && false);
    if (kickOn && beat) { this.kick(t, drop ? 1 : 0.8); this.duck.gain.setValueAtTime(0.3, t); this.duck.gain.linearRampToValueAtTime(1, t + SPB * 0.8); }
    else if (beat) { this.duck.gain.setValueAtTime(1, t); }
    // Clap 2 et 4
    if (drop && (st === 4 || st === 12)) this.clap(t, 0.5);
    // Roulement de caisse claire en fin de build / break
    if ((build || brk) && bar >= len - 2) { const dens = bar === len - 1 ? 1 : 2; if (st % dens === 0) this.clap(t, 0.12 + 0.35 * ((bar - (len - 2)) * 16 + st) / 32); }
    // Charlestons
    if ((drop || build) && st % 4 === 2) this.hat(t, 0.16, 0.09);
    if (drop && st % 2 === 1) this.hat(t, 0.05, 0.03);
    if (chill && st % 4 === 2) this.hat(t, 0.04, 0.05);
    if (drop && st === 0 && bar === 0) this.crash(t);
    // Basse roulante (sauf sur le kick)
    if (drop || (build && bar >= len / 2)) {
      if (st % 4 !== 0) { const v = this.bass; v.oscs.forEach(o => o.frequency.setValueAtTime(mtof(root + 12), t));
        v.g.gain.setValueAtTime(0.0001, t); v.g.gain.linearRampToValueAtTime(drop ? 0.26 : 0.16, t + 0.008); v.g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.9);
        v.f.frequency.setValueAtTime(drop ? 900 : 500, t); v.f.frequency.exponentialRampToValueAtTime(180, t + STEP * 0.9); }
    }
    if (brk && st === 0) { const v = this.bass; v.oscs.forEach(o => o.frequency.setValueAtTime(mtof(root + 12), t)); v.g.gain.setValueAtTime(0.12, t); v.g.gain.exponentialRampToValueAtTime(0.0001, t + SPB * 3.5); v.f.frequency.setValueAtTime(300, t); }
    // Arpège
    if (!drop || name === 'drop') {
      const tones = [chord[0], chord[1], chord[2], chord[0] + 12];
      const n = tones[st % 4] + 12 + (st >= 8 ? 12 : 0);
      const v = this.arp, lv = drop ? 0.03 : brk ? 0.05 : build ? 0.03 + 0.04 * bar / len : 0.035;
      v.oscs.forEach(o => o.frequency.setValueAtTime(mtof(n), t));
      v.g.gain.setValueAtTime(lv, t); v.g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.95);
      const cut = build ? 500 + 3500 * (bar * 16 + st) / (len * 16) : brk ? 1800 : chill ? 900 : 2500;
      v.f.frequency.setValueAtTime(cut * 1.6, t); v.f.frequency.exponentialRampToValueAtTime(cut * 0.5, t + STEP);
    }
    // Lead supersaw (drop et boss)
    if (drop && LEAD_GATE[st]) {
      const tones = [chord[0], chord[1], chord[2], chord[0] + 12, chord[1] + 12];
      const idx = LEAD_IDX[(bar % 2) * 16 + st]; const n = tones[idx] + 12 + (name === 'boss' ? 12 : 0);
      const v = this.lead; v.oscs.forEach(o => o.frequency.setValueAtTime(mtof(n), t));
      v.g.gain.setValueAtTime(0.0001, t); v.g.gain.linearRampToValueAtTime(name === 'boss' ? 0.07 : 0.06, t + 0.01); v.g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.7);
      v.f.frequency.setValueAtTime(name === 'boss' ? 5200 : 4200, t); v.f.frequency.exponentialRampToValueAtTime(1400, t + STEP * 1.5);
    }
    // Montée (bruit filtré) sur les 4 dernières mesures du build
    if (build && st === 0 && bar === Math.max(0, len - 4)) this.rise(t, SPB * 16);
    if (brk && st === 0 && bar === len - 2) this.rise(t, SPB * 8);
  }
  kick(t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(v * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38); o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.4); }
  nz(t, dur, type, f, v, dest, q) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl); fl.connect(g); g.connect(dest || this.duck); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); return { fl, g }; }
  hat(t, v, d) { this.nz(t, d, 'highpass', 8000, v); }
  clap(t, v) { this.nz(t, 0.14, 'bandpass', 1500, v, this.musicBus, 0.8); }
  crash(t) { const n = this.nz(t, 1.6, 'highpass', 5000, 0.18); n.g.connect(this.revIn); }
  rise(t, dur) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(8000, t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.13, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.05); s.connect(f); f.connect(g); g.connect(this.musicBus); g.connect(this.revIn); s.start(t); s.stop(t + dur + 0.1); }
  // ---------- Effets sonores ----------
  ok() { return this.ctx && this.mode; }
  tone(type, f0, f1, dur, v, delay = 0, dest) { if (!this.ok()) return; const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.02); }
  snz(dur, type, f, v, delay = 0) { if (!this.ok()) return; this.nz(this.ctx.currentTime + delay, dur, type, f, v, this.sfx, 1); }
  scale(i) { const pent = [0, 3, 5, 7, 10]; return mtof(69 + this.key + pent[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5)); }
  shoot(kind, onBeat) {
    if (kind === 'baton') { this.snz(0.12, 'bandpass', onBeat ? 1800 : 1100, 0.35); this.tone('triangle', 300, 90, 0.1, 0.2); }
    else if (kind === 'pelle') { this.snz(0.07, 'highpass', 2500, 0.22); this.tone('square', onBeat ? 900 : 600, 120, 0.06, 0.08); }
    else if (kind === 'bordee') { this.snz(0.25, 'lowpass', 2200, 0.5); this.tone('sawtooth', 200, 50, 0.2, 0.2); }
    else if (kind === 'onde') { this.tone('sine', onBeat ? 1320 : 880, 220, 0.16, 0.18); this.tone('square', 440, 110, 0.12, 0.04); }
    else if (kind === 'puck') { this.snz(0.08, 'bandpass', 3000, 0.4); this.tone('square', 1200, 300, 0.1, 0.1); }
    else if (kind === 'pulse') { this.tone('sine', 120, 30, 0.6, 0.5); this.snz(0.5, 'lowpass', 900, 0.4); }
    if (onBeat) this.tone('sine', this.scale(10), 0, 0.12, 0.08);
  }
  hit() { this.tone('square', 260 + Math.random() * 60, 120, 0.05, 0.06); }
  kill(i) { this.tone('triangle', this.scale(5 + (i % 8)), 0, 0.25, 0.16); this.tone('sine', this.scale(10 + (i % 8)), 0, 0.3, 0.07, 0.04); this.snz(0.18, 'bandpass', 2400, 0.12); }
  coin(i) { this.tone('square', this.scale(10 + (i % 10)), 0, 0.08, 0.05); }
  hurt() { this.tone('sawtooth', 180, 60, 0.25, 0.25); this.snz(0.15, 'lowpass', 600, 0.3); }
  dash() { this.snz(0.22, 'bandpass', 1200, 0.3); this.tone('sine', 300, 900, 0.15, 0.06); }
  buy() { [0, 2, 4].forEach((s, j) => this.tone('square', this.scale(10 + s), 0, 0.12, 0.07, j * 0.06)); }
  deny() { this.tone('square', 160, 120, 0.15, 0.08); }
  horn() { [0, 0.18].forEach(d => this.tone('sawtooth', 220, 210, 0.4, 0.12, d)); }
  roar() { this.tone('sawtooth', 90, 40, 1.2, 0.35); this.snz(1, 'lowpass', 500, 0.35); }
  blip() { this.tone('square', 600 + Math.random() * 300, 0, 0.03, 0.025); }
  stomp() { this.tone('sine', 80, 28, 0.5, 0.5); this.snz(0.3, 'lowpass', 400, 0.4); }
  enemyShot() { this.tone('triangle', 700, 350, 0.12, 0.05); }
  win() { [0, 2, 4, 5, 7].forEach((s, j) => this.tone('triangle', this.scale(5 + s), 0, 0.3, 0.12, j * 0.11)); }
}
