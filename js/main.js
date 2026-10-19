// Remparts Néon — jeu de survie par vagues, néon québécois satirique.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Music, SPB } from './audio.js';
import { LEVELS, buildLevel } from './world.js';
import { TYPES, makeEnemy, animate } from './enemies.js';
import { FX } from './fx.js';
import { LINES, DJ, PATHS } from './text.js';

const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const isTouch = Q.has('touch') || (matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window);
const SAVE_KEY = 'remparts-neon-v1';
let saved = {}; try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch (e) {}
const save = Object.assign({ vol: 0.8, mvol: 1, svol: 1, sens: 1, qual: isTouch ? 'low' : 'high', auto: true, unlocked: 0, best: 0, shake: 1, nums: true, vib: true, diff: 1, mode: 'histoire', scores: [] }, saved);
if (Q.get('q')) save.qual = Q.get('q');
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const V3 = THREE.Vector3;
window.addEventListener('error', e => { const el = $('err'); el.textContent = 'Erreur : ' + e.message; el.classList.remove('hidden'); });
if (isTouch) document.body.classList.add('touch');

// ---------- Rendu ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
$('app').appendChild(renderer.domElement);
const canvas = renderer.domElement;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 900);
camera.rotation.order = 'YXZ'; scene.add(camera);
let composer = null, bloom = null;
function setupQuality() {
  const hi = save.qual === 'high';
  const pr = Math.min(devicePixelRatio || 1, hi ? 1.5 : 1);
  renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight);
  if (composer) { composer.dispose?.(); composer = null; bloom = null; }
  if (hi) {
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.42); composer.addPass(bloom); composer.addPass(new OutputPass());
    composer.setPixelRatio(Math.min(pr, 1)); composer.setSize(innerWidth, innerHeight);
  }
  fx && fx.setScale(innerHeight * pr);
}
function onResize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer && composer.setSize(innerWidth, innerHeight); fx && fx.setScale(innerHeight * renderer.getPixelRatio());
  $('rotate').classList.toggle('hidden', !(isTouch && innerHeight > innerWidth)); }
addEventListener('resize', onResize);

const music = new Music(); music.setVolume(save.vol); music.setMusicVolume(save.mvol); music.setSfxVolume(save.svol);
let fx = new FX(scene, save.qual);
setupQuality(); onResize();

// ---------- Difficulté ----------
const DIFF = [{ name: 'Facile', hp: 0.7, dmg: 0.6, n: 0.8, cash: 1.15 }, { name: 'Normal', hp: 1, dmg: 1, n: 1, cash: 1 }, { name: 'Difficile', hp: 1.3, dmg: 1.35, n: 1.2, cash: 0.95 }];
// ---------- Améliorations ----------
const UPG = [
  { id: 'hp', name: 'Poutine double', desc: '+25 PV max, et ça soigne', max: 5, cost: [30, 50, 70, 105, 140], c: '#ff3fd2' },
  { id: 'spd', name: 'Bottes à crampons', desc: '+10 % de vitesse', max: 3, cost: [40, 70, 105], c: '#ffd23a' },
  { id: 'dash', name: 'Patins aiguisés', desc: 'Esquive plus souvent (2 charges au niv. 2)', max: 3, cost: [40, 70, 105], c: '#2bf0ff' },
  { id: 'beat', name: 'Métronome de poche', desc: 'Beat plus facile à attraper, bonus +25 %', max: 3, cost: [45, 80, 130], c: '#ff3fd2' },
  { id: 'mag', name: 'Aimant à piasses', desc: 'Ramasse de plus loin, +10 % de piasses', max: 3, cost: [25, 50, 80], c: '#8dff3a' },
  { id: 'heal', name: 'Soupe aux pois', desc: 'Soin complet, tout de suite', max: 99, cost: [20], c: '#8dff3a', use: true },
  { id: 'crit', name: 'Tuque porte-bonheur', desc: '+8 % de chances de coup critique (×2)', max: 4, cost: [50, 85, 130, 180], c: '#ffd23a' },
  { id: 'armor', name: 'Banc de neige portatif', desc: '−8 % de dégâts reçus', max: 4, cost: [50, 85, 130, 180], c: '#2bf0ff' },
  { id: 'regen', name: 'Café filtre', desc: 'Régénère 1,5 PV/s quand on ne te touche pas', max: 3, cost: [60, 110, 170], c: '#ffb43a' },
  { id: 'boom', name: 'Feux de la Saint-Jean', desc: 'Les ennemis éliminés explosent en feux d\'artifice', max: 3, cost: [70, 120, 180], c: '#ff3fd2' },
  { id: 'xtra', name: 'Heures supplémentaires', desc: '+5 % de dégâts (achat illimité ou presque)', max: 20, cost: Array.from({ length: 20 }, (_, i) => 60 + i * 25), c: '#8dff3a' },
  { id: 'b_dmg', path: 'baton', name: 'Ruban de friction', desc: '+25 % de dégâts', max: 5, cost: [40, 60, 90, 130, 170], c: '#ff3fd2' },
  { id: 'b_arc', path: 'baton', name: 'Palette courbée', desc: 'Coup plus large et plus long', max: 3, cost: [45, 80, 130], c: '#ffd23a' },
  { id: 'b_puck', path: 'baton', name: 'Lancer frappé', desc: 'Rondelle : recharge −25 %, perce +1', max: 3, cost: [45, 80, 130], c: '#2bf0ff' },
  { id: 'b_leech', path: 'baton', name: 'Mise en échec', desc: '+3 PV par élimination', max: 3, cost: [40, 75, 120], c: '#8dff3a' },
  { id: 'p_dmg', path: 'pelle', name: 'Sel de déglaçage', desc: '+20 % de dégâts', max: 5, cost: [40, 60, 90, 130, 170], c: '#ffb43a' },
  { id: 'p_rate', path: 'pelle', name: 'Gâchette chauffée', desc: '+15 % de cadence', max: 5, cost: [40, 60, 90, 130, 170], c: '#ff3fd2' },
  { id: 'p_burst', path: 'pelle', name: 'Grosse bordée', desc: 'Clic droit : +3 plombs, recharge −15 %', max: 3, cost: [45, 80, 130], c: '#2bf0ff' },
  { id: 'p_pierce', path: 'pelle', name: 'Grenaille de glace', desc: 'Les tirs traversent 1 ennemi de plus', max: 2, cost: [70, 135], c: '#8dff3a' },
  { id: 'o_dmg', path: 'onde', name: 'Condensateur boréal', desc: '+20 % de dégâts', max: 5, cost: [40, 60, 90, 130, 170], c: '#2bf0ff' },
  { id: 'o_rad', path: 'onde', name: 'Résonance', desc: 'Explosions plus grosses', max: 4, cost: [45, 75, 110, 160], c: '#ff3fd2' },
  { id: 'o_pulse', path: 'onde', name: 'Pulsation', desc: 'Clic droit : recharge −20 %, +30 % dégâts', max: 3, cost: [45, 80, 130], c: '#ffd23a' },
  { id: 'o_chain', path: 'onde', name: 'Arc électrique', desc: 'Chaque explosion frappe +1 ennemi proche', max: 3, cost: [50, 90, 140], c: '#8dff3a' },
];
function computeStats() {
  const lv = id => G.up[id] || 0, p = G.path;
  const s = { spd: (p === 'baton' ? 7.4 : 6.8) * (1 + 0.1 * lv('spd')), dashMax: 1 + (lv('dash') >= 2 ? 1 : 0), dashCd: 1.7 * (1 - 0.15 * lv('dash')),
    beatWin: 0.085 + 0.025 * lv('beat'), beatMul: 1.5 + 0.25 * lv('beat'), crit: 0.08 * lv('crit'), armor: 1 - 0.08 * lv('armor'), regen: 1.5 * lv('regen'), boom: lv('boom'), gdmg: 1 + 0.05 * lv('xtra'), magnet: 3.5 + 2.5 * lv('mag'), cashMul: 1 + 0.1 * lv('mag'), hpMax: (p === 'baton' ? 125 : 100) + 25 * lv('hp') };
  if (p === 'baton') Object.assign(s, { dmg: 30 * (1 + 0.25 * lv('b_dmg')), rate: 0.42, range: 2.9 + 0.35 * lv('b_arc'), arc: (100 + 18 * lv('b_arc')) * Math.PI / 180,
    altCd: 2.4 * Math.pow(0.75, lv('b_puck')), altDmg: 55 * (1 + 0.25 * lv('b_dmg')) * (1 + 0.2 * lv('b_puck')), pierce: 2 + lv('b_puck'), leech: 1 + 3 * lv('b_leech'), altName: 'RONDELLE' });
  if (p === 'pelle') Object.assign(s, { dmg: 8.5 * (1 + 0.2 * lv('p_dmg')), rate: 1 / (7.5 * (1 + 0.15 * lv('p_rate'))), spread: 0.014, pierce: 1 + lv('p_pierce'),
    altCd: 1.6 * Math.pow(0.85, lv('p_burst')), pellets: 9 + 3 * lv('p_burst'), altDmg: 9 * (1 + 0.2 * lv('p_dmg')), leech: 0, altName: 'BORDÉE' });
  if (p === 'onde') Object.assign(s, { dmg: 24 * (1 + 0.2 * lv('o_dmg')), rate: 1 / 3.2, radius: 2.4 + 0.6 * lv('o_rad'), chain: lv('o_chain'),
    altCd: 5 * Math.pow(0.8, lv('o_pulse')), altDmg: 45 * (1 + 0.3 * lv('o_pulse')) * (1 + 0.2 * lv('o_dmg')), pulseR: 7.5 + lv('o_pulse'), leech: 0, altName: 'PULSATION' });
  G.st = s; if (G.P) G.P.hpMax = s.hpMax;
}

// ---------- État ----------
const G = { state: 'title', li: 0, wi: 0, path: 'baton', cash: 0, score: 0, kills: 0, up: {}, P: null, enemies: [], projs: [], shocks: [], level: null, wave: null,
  t: 0, streak: 0, bestStreak: 0, shake: 0, hitstop: 0, timers: [], lastBeat: -1, secT: -99, pulse: 0, deaths: 0, beatHits: 0, shots: 0, snap: null, st: null, magnetAll: 0, cap: 16 };
const input = { keys: new Set(), fire: false, alt: false, mdx: 0, mdy: 0, tmx: 0, tmz: 0, tfire: false, padMx: 0, padMz: 0, padFire: false, padAlt: false, botMx: 0, botMz: 0, botFire: false, botAlt: false, dashReq: false, altReq: false, lastPad: false };
const later = (t, fn) => G.timers.push({ t, fn });

// ---------- Monde ----------
function disposeTree(o) { o.traverse(c => { if (c.geometry && !c.geometry.userData.shared) c.geometry.dispose(); if (c.material) { const ms = Array.isArray(c.material) ? c.material : [c.material]; ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } }); }
function loadLevel(li) {
  if (G.level) { scene.remove(G.level.root); disposeTree(G.level.root); }
  G.level = buildLevel(scene, LEVELS[li], save.qual);
}

// ---------- Arme en main (vue à la première personne) ----------
const vm = new THREE.Group(); camera.add(vm); vm.position.set(0.34, -0.33, -0.62); vm.scale.setScalar(0.8);
let vmGlow = [];
const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.translate(32, 32);
  for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); const g = x.createLinearGradient(0, 0, 30, 0); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, -4); x.lineTo(30, 0); x.lineTo(0, 4); x.fill(); }
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-16, -16, 32, 32); return new THREE.CanvasTexture(c); })();
function buildViewmodel() {
  while (vm.children.length) { const c = vm.children.pop(); disposeTree(c); }
  vmGlow = []; const p = G.path; const g = new THREE.Group(); vm.add(g); const pulseMats = [];
  const M = (c, e = 0.3) => new THREE.MeshLambertMaterial({ color: new THREE.Color(c).multiplyScalar(0.6), emissive: new THREE.Color(c).multiplyScalar(e * 0.5) });
  const B = c => new THREE.MeshBasicMaterial({ color: c });
  const PB = c => { const m = B(c); m.userData.base = new THREE.Color(c); pulseMats.push(m); return m; };
  const box = (w, h, d, x, y, z, mat, rx = 0, ry = 0, rz = 0, par = g) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); par.add(m); return m; };
  const cyl = (r1, r2, h, x, y, z, mat, rx = 0, ry = 0, rz = 0, par = g, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); par.add(m); return m; };
  const glove = (x, y, z, par = g) => { box(0.09, 0.075, 0.11, x, y, z, M(0x1a1030, 0.3), 0, 0, 0, par); box(0.092, 0.012, 0.112, x, y + 0.03, z, PB(0x2bf0ff), 0, 0, 0, par); };
  let tip = new V3(0, 0, -1);
  if (p === 'baton') {
    const shaft = M(0x221a33); box(0.045, 0.045, 1.0, 0, 0, -0.35, shaft); box(0.047, 0.012, 0.86, 0, 0.022, -0.4, PB(0xff3fd2));
    for (let i = 0; i < 4; i++) box(0.05, 0.05, 0.025, 0, 0, -0.02 - i * 0.04, B(0xeeeeee), 0, 0, 0.3);
    box(0.06, 0.06, 0.05, 0, 0, 0.14, B(0xffffff));
    const bl = M(0x221a33); box(0.12, 0.1, 0.04, -0.06, -0.02, -0.86, bl, 0, 0.1); box(0.1, 0.09, 0.04, -0.16, -0.03, -0.875, bl, 0, 0.35); box(0.06, 0.08, 0.035, -0.23, -0.035, -0.9, bl, 0, 0.6);
    box(0.22, 0.02, 0.045, -0.12, 0.035, -0.87, PB(0xff3fd2), 0, 0.3); box(0.22, 0.02, 0.045, -0.12, -0.075, -0.87, PB(0x2bf0ff), 0, 0.3);
    glove(0.0, -0.02, 0.06); glove(0.0, -0.02, -0.32);
    g.rotation.set(-0.35, 0.35, -0.25); g.position.set(0.02, 0.02, 0.1);
    // traînée du coup de bâton
    const tr = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.95, 24, 1, Math.PI * 0.15, Math.PI * 0.7), new THREE.MeshBasicMaterial({ color: 0xff3fd2, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    tr.rotation.set(-1.25, 0, 0); tr.position.set(-0.3, 0.05, -0.55); vm.add(tr); vm.userData.trail = tr;
  } else if (p === 'pelle') {
    const wood = M(0x6a4422, 0.25); cyl(0.024, 0.024, 0.9, 0, 0, 0, wood, Math.PI / 2);
    const dg = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.013, 6, 14, Math.PI), M(0x222222)); dg.position.set(0, 0, 0.5); dg.rotation.set(0, Math.PI / 2, Math.PI / 2); g.add(dg); box(0.13, 0.024, 0.024, 0, 0, 0.56, M(0x222222));
    cyl(0.032, 0.032, 0.08, 0, 0, -0.42, M(0x888899, 0.3), Math.PI / 2);
    const blade = M(0xffb43a, 0.55); box(0.34, 0.02, 0.36, 0, -0.03, -0.62, blade, -0.15); box(0.02, 0.06, 0.34, -0.17, 0.0, -0.62, blade, -0.15); box(0.02, 0.06, 0.34, 0.17, 0.0, -0.62, blade, -0.15);
    box(0.36, 0.03, 0.025, 0, -0.06, -0.8, B(0xffffff), -0.15); box(0.08, 0.002, 0.08, 0, -0.018, -0.6, B(0xffffff), -0.15, 0.78);
    for (const sx of [-0.05, 0.05]) cyl(0.016, 0.016, 0.72, sx, -0.085, -0.34, PB(0x2bf0ff), Math.PI / 2);
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 4, 14), PB(0xff3fd2)); r.position.set(0, -0.085, -0.15 - i * 0.12); g.add(r); }
    cyl(0.045, 0.045, 0.12, 0, -0.13, -0.05, M(0x223344), Math.PI / 2); cyl(0.035, 0.035, 0.124, 0, -0.13, -0.05, new THREE.MeshBasicMaterial({ color: 0x9ff4ff, transparent: true, opacity: 0.7 }), Math.PI / 2);
    glove(0, -0.04, 0.45); glove(0, -0.04, -0.2);
    g.rotation.set(0.05, 0.08, 0); tip = new V3(0, -0.085, -0.72);
  } else {
    const plate = M(0x1a1a4a, 0.4); box(0.11, 0.09, 0.3, 0.02, -0.11, 0.2, plate); box(0.116, 0.012, 0.31, 0.02, -0.06, 0.2, PB(0x2bf0ff)); box(0.12, 0.1, 0.06, 0.02, -0.1, 0.06, M(0x2a2a6a, 0.5));
    for (let i = 0; i < 3; i++) { const f = box(0.022, 0.022, 0.09, -0.02 + i * 0.03, -0.06, -0.01, plate, 0.7); f.position.y += 0.0; }
    cyl(0.03, 0.03, 0.1, 0.02, -0.11, 0.38, PB(0xff3fd2), Math.PI / 2);
    const orb = new THREE.Group(); orb.position.set(0, 0, -0.06); g.add(orb); vm.userData.orb = orb;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), B(0xdffcff)); orb.add(core);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0x2bf0ff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })); orb.add(shell); vm.userData.shell = shell;
    for (let i = 0; i < 3; i++) { const moon = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), PB([0xff3fd2, 0xffd23a, 0x8dff3a][i])); moon.userData.moon = i; orb.add(moon); }
    g.position.set(-0.04, 0.08, -0.32); g.rotation.set(0.15, -0.1, 0); tip = new V3(0, 0, -0.06);
  }
  // éclair de bouche
  const mf = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: p === 'onde' ? 0x7ff4ff : 0xffe0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); mf.visible = false; mf.scale.setScalar(0.22);
  g.add(mf); mf.position.copy(tip); vm.userData.mflash = mf; vm.userData.pulseMats = pulseMats;
  const n = UPG.filter(u => u.path === p).reduce((a, u) => a + (G.up[u.id] || 0), 0);
  const cols = [0xff3fd2, 0x2bf0ff, 0xffd23a, 0x8dff3a];
  for (let i = 0; i < Math.min(n, 12); i++) {
    if (p === 'onde') { const r = new THREE.Mesh(new THREE.TorusGeometry(0.13 + (i % 3) * 0.02, 0.003, 4, 24), B(cols[i % 4])); r.position.set(-0.04, 0.08, -0.38); r.rotation.set(Math.random() * 3, Math.random() * 3, 0); r.userData.spin = (i % 2 ? 1 : -1) * (1.5 + i * 0.3); vm.add(r); vmGlow.push(r); }
    else { const r = new THREE.Mesh(new THREE.TorusGeometry(p === 'pelle' ? 0.03 : 0.035, 0.008, 4, 12), B(cols[i % 4]));
      if (p === 'pelle') { r.position.set(0, 0, 0.3 - i * 0.04); } else { r.position.set(0, 0, -0.2 - i * 0.055); }
      g.add(r); r.userData.spin = 0; vmGlow.push(r); } }
  vm.userData.g = g;
}

// ---------- Projectiles ----------
const projGeo = { tick: new THREE.PlaneGeometry(0.5, 0.3), puck: new THREE.CylinderGeometry(0.16, 0.16, 0.07, 12), orb: new THREE.SphereGeometry(0.22, 12, 8), snow: new THREE.SphereGeometry(0.3, 8, 6), inv: new THREE.PlaneGeometry(0.55, 0.38) };
Object.values(projGeo).forEach(g => g.userData.shared = true);
const invTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 44; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 44); x.strokeStyle = '#ff3fd2'; x.lineWidth = 4; x.strokeRect(2, 2, 60, 40);
  x.fillStyle = '#ff3fd2'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('$$$', 32, 30); x.fillStyle = '#888'; x.fillRect(8, 34, 48, 3); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function tickTex() { const c = document.createElement('canvas'); c.width = 64; c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#eaffd0'; x.fillRect(0, 0, 64, 40); x.strokeStyle = '#5aa020'; x.lineWidth = 4; x.strokeRect(2, 2, 60, 36);
  x.fillStyle = '#2a6000'; x.font = 'bold 13px sans-serif'; x.textAlign = 'center'; x.fillText('AMENDE', 32, 25); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const projMat = { puck: new THREE.MeshBasicMaterial({ color: 0x2bf0ff }), orb: new THREE.MeshBasicMaterial({ color: 0xbffcff }), orbB: new THREE.MeshBasicMaterial({ color: 0xff8af0 }), snow: new THREE.MeshBasicMaterial({ color: 0xeaf6ff }),
  inv: new THREE.MeshBasicMaterial({ map: invTex, side: THREE.DoubleSide }), tick: new THREE.MeshBasicMaterial({ map: tickTex(), side: THREE.DoubleSide }), refl: new THREE.MeshBasicMaterial({ color: 0xff3fd2, side: THREE.DoubleSide }) };
const pool = {};
function addProj(kind, pos, vel, o) {
  const list = pool[kind] || (pool[kind] = []); let m = list.pop();
  if (!m) { m = new THREE.Mesh(projGeo[kind], projMat[kind]); }
  m.material = o.mat ? projMat[o.mat] : projMat[kind]; m.position.copy(pos); m.visible = true; scene.add(m);
  const p = Object.assign({ kind, m, pos: m.position, vel, life: 3, r: 0.3, hit: new Set(), grav: 0 }, o); G.projs.push(p); return p;
}
function freeProj(p) { scene.remove(p.m); (pool[p.kind] || (pool[p.kind] = [])).push(p.m); p.dead = true; }

// ---------- Ennemis ----------
let eid = 0;
function spawnPoint() {
  const L = G.level, P = G.P; const far = L.spawns.filter(s => Math.hypot(s.x - P.x, s.z - P.z) > 9);
  return pick(far.length ? far : L.spawns);
}
function spawn(type, at) {
  const T = TYPES[type], L = LEVELS[G.li]; const mk = makeEnemy(type); const sp = at || spawnPoint();
  const D = DIFF[G.diff], df = G.wave ? G.wave.def : {}; const hp = (T.boss ? T.hp * 1.6 * (df.bossHp || 1) : T.hp * 1.25 * (df.survHp || L.hpMul * (1 + 0.1 * G.wi))) * D.hp;
  const e = { id: ++eid, type, T, mk, x: sp.x + rnd(-1, 1), z: sp.z + rnd(-1, 1), y: T.fly ? 2.6 : 0, hp, hpMax: hp, atk: 0, state: 'walk', t: 0, st: 0, cd: rnd(1.5, 3), flash: 0, born: 0, kx: 0, kz: 0, ph: Math.random() * 6.28, face: 0, dir: null, side: Math.random() < 0.5 ? -1 : 1 };
  mk.root.position.set(e.x, 0, e.z); mk.root.scale.setScalar(0.01); scene.add(mk.root); G.enemies.push(e);
  fx.ring(new V3(e.x, 0, e.z), T.colors[0], 0.3, T.boss ? 8 : 2.6, 0.5); fx.burst(new V3(e.x, 1, e.z), T.colors, T.boss ? 80 : 14, 5, 0.3, 0.6, 2, 3);
  if (T.boss) { G.boss = e; $('bossbox').classList.remove('hidden'); $('bossname').textContent = T.name; music.roar(); banner(T.name, 'gold', 2.5); G.shake = 1; }
  return e;
}
function removeEnemy(e) { e.dead = true; scene.remove(e.mk.root); disposeTree(e.mk.root); }

function bounds(o, m = 0) {
  const b = G.level.bounds;
  if (b.type === 'circle') { const d = Math.hypot(o.x, o.z), R = b.r - m; if (d > R) { o.x *= R / d; o.z *= R / d; return true; } }
  else { const W = b.w / 2 - m, H = b.h / 2 - m; let hit = false; if (o.x < -W) { o.x = -W; hit = true; } if (o.x > W) { o.x = W; hit = true; } if (o.z < -H) { o.z = -H; hit = true; } if (o.z > H) { o.z = H; hit = true; } return hit; }
  return false;
}
function obst(o, r) { for (const ob of G.level.obstacles) { const dx = o.x - ob.x, dz = o.z - ob.z, d = Math.hypot(dx, dz), rr = ob.r + r; if (d < rr && d > 1e-4) { o.x = ob.x + dx / d * rr; o.z = ob.z + dz / d * rr; } } }

function enemyShoot(e, kind, n = 1, spread = 0.25, speed = 11) {
  const P = G.P; const from = new V3(e.x, e.y + e.T.h * 0.7, e.z); const to = new V3(P.x, 1.3, P.z);
  const base = to.sub(from).normalize();
  for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * spread; const v = base.clone().applyAxisAngle(new V3(0, 1, 0), a).multiplyScalar(speed);
    addProj(kind, from, v, { owner: 'e', dmg: (kind === 'snow' ? 12 : 10) * (1 + 0.15 * G.li), life: 4, r: 0.35, spin: rnd(6, 12) }); }
  music.enemyShot();
}
function shockwave(x, z, max, dmg, color) { const spd = 13; G.shocks.push({ x, z, r: 0.5, max, spd, dmg, hit: false }); fx.ring(new V3(x, 0, z), color, 0.5, max, (max - 0.5) / spd); fx.ring(new V3(x, 0, z), 0xffffff, 0.5, max * 0.96, (max - 0.5) / spd); music.stomp(); G.shake = Math.min(1.2, G.shake + 0.6); }

function updEnemy(e, dt) {
  const P = G.P, T = e.T, mk = e.mk; e.t += dt; e.throwT = (e.throwT || 0) - dt; if (e.dmgT > 0) { e.dmgT -= dt; if (e.dmgT <= 0) flushDmg(e); } e.born = Math.min(1, e.born + dt * 2.2);
  let dx = P.x - e.x, dz = P.z - e.z; const d = Math.hypot(dx, dz) || 0.001; const nx = dx / d, nz = dz / d;
  let vx = 0, vz = 0, sp = T.speed * (G.li >= 2 ? 1.08 : 1); let faceX = nx, faceZ = nz;
  const contact = (range, dmg) => { if (d < T.r + range && Math.abs(e.y - 1) < 2.2) { e.atk += dt; if (e.atk > 0.45) { hurt(dmg); e.atk = -0.7; } } else e.atk = Math.max(0, e.atk - dt); };
  const dmg = T.dmg * (1 + 0.15 * G.li);
  if (e.type === 'cone' || e.type === 'bur') { vx = nx * sp; vz = nz * sp; contact(0.8, dmg); }
  else if (e.type === 'cons') {
    const want = d > 13 ? 1 : d < 8 ? -1 : 0; vx = nx * sp * want - nz * sp * 0.6 * e.side; vz = nz * sp * want + nx * sp * 0.6 * e.side;
    if (Math.sin(e.t * 0.7 + e.ph) > 0.97) e.side *= -1;
    e.cd -= dt; if (e.cd < 0 && d < 26 && e.born >= 1) { enemyShoot(e, 'inv', 1, 0, 13); e.throwT = 0.35; e.cd = rnd(1.8, 2.8) / (1 + 0.12 * G.li); }
    contact(0.8, dmg);
  } else if (e.type === 'plow' || e.type === 'mere') {
    e.st += dt; const big = e.type === 'mere';
    if (e.state === 'walk') { vx = nx * sp; vz = nz * sp; e.cd -= dt; if (e.cd < 0 && d < (big ? 26 : 16) && e.born >= 1) { e.state = 'aim'; e.st = 0; music.horn(); } contact(0.9, dmg); }
    else if (e.state === 'aim') { if (e.st > (big ? 0.8 : 0.95)) { e.state = 'charge'; e.st = 0; e.dir = { x: nx, z: nz }; e.hitDone = false; } }
    else if (e.state === 'charge') { const cs = big ? 17 : 15; vx = e.dir.x * cs; vz = e.dir.z * cs; faceX = e.dir.x; faceZ = e.dir.z;
      if (Math.random() < 0.6) fx.burst(new V3(e.x - e.dir.x * T.r, 0.4, e.z - e.dir.z * T.r), [0xffffff, 0xcfefff], 2, 3, 0.3, 0.5, 6, 2);
      if (!e.hitDone && d < T.r + 0.8) { hurt(dmg); e.hitDone = true; P.kx = e.dir.x * 14; P.kz = e.dir.z * 14; }
      if (e.st > (big ? 1.5 : 1.15) || e.wall) { e.state = 'rest'; e.st = 0; if (big) { enemyShoot(e, 'snow', 5, 0.22, 13); } } }
    else { if (e.st > (big ? 1.0 : 1.2)) { e.state = 'walk'; e.cd = big ? rnd(1.2, 2) : rnd(2, 3.5); } }
  } else if (e.type === 'parco') {
    if (d > 11) { vx = nx * sp; vz = nz * sp; } else if (d < 6) { vx = -nx * sp * 0.6; vz = -nz * sp * 0.6; }
    e.cd -= dt; if (e.cd < 0 && d < 24 && e.born >= 1) { enemyShoot(e, 'tick', 3, 0.2, 12); e.throwT = 0.35; e.cd = rnd(2.4, 3.2); }
    contact(0.8, dmg);
  } else if (e.type === 'pigeon') {
    e.st += dt;
    if (e.state !== 'dive') { e.ph += dt * 1.6; const tx = P.x + Math.cos(e.ph) * 5, tz = P.z + Math.sin(e.ph) * 5; const ddx = tx - e.x, ddz = tz - e.z, dd = Math.hypot(ddx, ddz) || 1;
      vx = ddx / dd * sp; vz = ddz / dd * sp; faceX = ddx / dd; faceZ = ddz / dd; e.y += (2 + Math.sin(e.t * 4 + e.id) * 0.4 - e.y) * dt * 3; e.cd -= dt; if (e.cd < 0 && e.born >= 1) { e.state = 'dive'; e.st = 0; e.dir = { x: nx, z: nz }; } }
    else { vx = e.dir.x * 12; vz = e.dir.z * 12; e.y += (1.2 - e.y) * dt * 5; faceX = e.dir.x; faceZ = e.dir.z;
      if (Math.hypot(P.x - e.x, P.z - e.z) < 0.9 && e.y < 1.8) { hurt(dmg); e.state = 'up'; e.cd = rnd(1.5, 3); }
      if (e.st > 0.9) { e.state = 'up'; e.cd = rnd(1.5, 3); } }
  } else if (e.type === 'nid') {
    e.st += dt; if (e.emerge === undefined) { e.emerge = 1; e.state = 'up'; e.st = 0; }
    if (e.state === 'under') { e.emerge = Math.max(0, e.emerge - dt * 2); vx = nx * 7; vz = nz * 7; if (Math.random() < 0.5) fx.burst(new V3(e.x, 0.2, e.z), [0x333333, 0xff7a1a], 2, 3, 0.3, 0.5, 6, 2); }
    else if (e.state === 'tele') { e.emerge = 0; vx = (e.tx - e.x) * 3; vz = (e.tz - e.z) * 3; if (Math.random() < 0.6) fx.burst(new V3(e.tx + rnd(-2, 2), 0.1, e.tz + rnd(-2, 2)), [0xff7a1a, 0xffd23a], 1, 2, 0.35, 0.5, 0, 3);
      if (e.st > 1.0) { e.state = 'up'; e.st = 0; e.x = e.tx; e.z = e.tz; shockwave(e.x, e.z, 10, 22 * (1 + 0.15 * G.li), 0xff7a1a); if (Math.hypot(P.x - e.x, P.z - e.z) < T.r + 0.6) hurt(dmg); fx.burst(new V3(e.x, 0.5, e.z), [0x333333, 0xff7a1a, 0x9dff3a], 70, 12, 0.5, 0.9); } }
    else { e.emerge = Math.min(1, e.emerge + dt * 3); contact(1.0, dmg); e.cd -= dt; if (e.cd < 0 && e.emerge >= 1) { enemyShoot(e, 'snow', 4, 0.3, 12); e.cd = 1.6; } if (e.st > 4.5) { e.state = 'under'; e.st = 0; } }
    e.untouchable = e.emerge < 0.5;
  } else if (e.type === 'drone') {
    e.st += dt;
    if (e.state !== 'dive') { e.ph += dt * 0.8; const tx = P.x + Math.cos(e.ph) * 7, tz = P.z + Math.sin(e.ph) * 7; const ddx = tx - e.x, ddz = tz - e.z, dd = Math.hypot(ddx, ddz) || 1;
      vx = ddx / dd * sp; vz = ddz / dd * sp; e.y += (2.6 + Math.sin(e.t * 3) * 0.3 - e.y) * dt * 3; e.cd -= dt; if (e.cd < 0 && e.born >= 1) { e.state = 'dive'; e.st = 0; e.dir = { x: nx, z: nz }; } }
    else { const ds = 10; vx = e.dir.x * ds; vz = e.dir.z * ds; e.y += (1.1 - e.y) * dt * 4; faceX = e.dir.x; faceZ = e.dir.z;
      if (Math.hypot(P.x - e.x, P.z - e.z) < 1.1 && e.y < 2) { hurt(dmg); e.state = 'up'; e.cd = rnd(2.5, 4); }
      if (e.st > 1.3) { e.state = 'up'; e.cd = rnd(2.5, 4); } }
  } else if (e.type === 'grandcone') {
    if (e.state === 'jump') { e.st += dt; const f = e.st / (SPB * 2); e.y = Math.sin(Math.min(1, f) * Math.PI) * 4; vx = nx * sp * 1.6; vz = nz * sp * 1.6;
      if (f >= 1) { e.y = 0; e.state = 'walk'; shockwave(e.x, e.z, 12, 18 * (1 + 0.15 * G.li), 0xff7a1a); fx.burst(new V3(e.x, 0.3, e.z), T.colors, 60, 12, 0.5, 0.8); } }
    else { vx = nx * sp; vz = nz * sp; contact(1.0, dmg); }
  } else if (e.type === 'tram') {
    const ph2 = e.hp < e.hpMax * 0.5; vx = nx * sp * (ph2 ? 1.4 : 1); vz = nz * sp * (ph2 ? 1.4 : 1); if (d < 7) { vx *= -0.3; vz *= -0.3; }
    e.y = 0.3 + Math.sin(e.t * 2) * 0.3; contact(1.2, dmg);
    if (e.state === 'jump') { e.st += dt; const f = e.st / (SPB * 2); e.y = Math.sin(Math.min(1, f) * Math.PI) * 5; if (f >= 1) { e.state = 'walk'; shockwave(e.x, e.z, 13, 20 * (1 + 0.15 * G.li), 0x2bf0ff); } }
  }
  // séparation
  for (const o of G.enemies) { if (o === e || o.dead) continue; const ox = e.x - o.x, oz = e.z - o.z, dd = ox * ox + oz * oz, rr = (T.r + o.T.r) * 0.9; if (dd < rr * rr && dd > 1e-5) { const k = (rr / Math.sqrt(dd) - 1) * 0.5; e.x += ox * k * (T.boss ? 0.1 : 1); e.z += oz * k * (T.boss ? 0.1 : 1); } }
  const slow = e.born < 1 ? e.born * 0.6 : 1;
  e.x += (vx * slow + e.kx) * dt; e.z += (vz * slow + e.kz) * dt; const kd = Math.pow(0.004, dt); e.kx *= kd; e.kz *= kd;
  e.wall = bounds(e, -4) && e.state === 'charge'; if (!T.fly) obst(e, T.r * 0.8);
  // repousse le joueur (pas de chevauchement)
  if (!T.fly || e.y < 1.6) { const px = P.x - e.x, pz = P.z - e.z, pd = Math.hypot(px, pz), rr = T.r + 0.4; if (pd < rr && pd > 1e-4) { P.x = e.x + px / pd * rr; P.z = e.z + pz / pd * rr; } }
  // visuel
  const root = mk.root; root.position.set(e.x, 0, e.z); root.scale.setScalar(Math.max(0.01, 1 - Math.pow(1 - e.born, 3)) * (e.flash > 0 ? 1.08 : 1));
  const want = Math.atan2(faceX, faceZ); let df = want - e.face; df = Math.atan2(Math.sin(df), Math.cos(df)); e.face += df * Math.min(1, dt * (T.boss ? 3 : 8)); root.rotation.y = e.face;
  animate(e, dt, Math.hypot(vx, vz));
  if (e.flash > 0) { e.flash -= dt; mk.flash.forEach(m => m.emissive.setHex(0x8a8a8a)); if (e.flash <= 0) mk.flash.forEach((m, i) => m.emissive.copy(mk.base[i])); }
}
const T_R = e => e.T.r;
function onBossBeat(e, b) {
  if (e.dead) return;
  if (e.type === 'grandcone') { if (b % 8 === 0 && e.state === 'walk' && e.born >= 1) { e.state = 'jump'; e.st = 0; } if (b % 16 === 8 && G.enemies.length < G.cap) { spawn('cone', { x: e.x + 3, z: e.z }); spawn('cone', { x: e.x - 3, z: e.z }); } }
  if (e.type === 'nid') { if (b % 8 === 0 && e.state === 'under') { if (Math.random() < 0.4) radio(pick(LINES.nid), 3); e.state = 'tele'; e.st = 0; e.tx = G.P.x; e.tz = G.P.z; fx.ring(new V3(e.tx, 0, e.tz), 0xff7a1a, T_R(e), T_R(e) + 0.2, 1.0); music.horn(); }
    if (b % 16 === 12 && G.enemies.length < G.cap) { spawn('cone', { x: e.x + 3, z: e.z }); spawn('parco', { x: e.x - 3, z: e.z }); } }
  if (e.type === 'mere') { if (b % 16 === 4 && G.enemies.length < G.cap) { spawn('cone', { x: e.x + 3, z: e.z }); spawn('cone', { x: e.x - 3, z: e.z }); } }
  if (e.type === 'tram') { const ph2 = e.hp < e.hpMax * 0.5;
    if (b % 8 === 0) enemyShoot(e, 'inv', ph2 ? 7 : 5, 0.18, 12);
    if (b % 16 === 4 && G.enemies.length < G.cap) { spawn('drone', { x: e.x + 3, z: e.z }); spawn('drone', { x: e.x - 3, z: e.z }); }
    if (ph2 && b % 12 === 6 && e.state === 'walk') { e.state = 'jump'; e.st = 0; } }
}

// ---------- Combat du joueur ----------
const tmpV = new V3();
function aimDir() { const P = G.P; return new V3(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch)); }
function eyePos() { return new V3(G.P.x, 1.62, G.P.z); }
function eCenter(e) { return new V3(e.x, e.y + e.T.h * 0.55 * (e.T.boss && e.type !== 'tram' ? 1 : 1), e.z); }
function rayHits(o, d, maxD, fat = 1) {
  const hits = [];
  for (const e of G.enemies) { if (e.dead || e.untouchable) continue; const c = eCenter(e); const r = Math.max(e.T.r, e.T.h * 0.45) * fat * (isTouch ? 1.3 : 1.05);
    tmpV.copy(c).sub(o); const t = tmpV.dot(d); if (t < 0 || t > maxD) continue; const d2 = tmpV.lengthSq() - t * t; if (d2 < r * r) hits.push({ e, t }); }
  return hits.sort((a, b) => a.t - b.t);
}
function beatErr() { const t = music.clock() - music.latency(); const bp = music.beatPos(t); return Math.abs(bp - Math.round(bp)) * SPB; }
function judge(text, cls) { const j = $('judge'); j.textContent = text; j.className = 'on ' + (cls || ''); G.judgeT = 0.45; }
function judgeBeat() {
  const t = music.clock() - music.latency(); const bp = music.beatPos(t); const near = Math.round(bp); const err = Math.abs(bp - near) * SPB;
  const on = err < G.st.beatWin; if (on && near !== G.lastBeatHit) judge(err < 0.04 ? 'PARFAIT!' : 'SUR LE BEAT', err < 0.04 ? 'gold' : 'pink');
  if (on && near !== G.lastBeatHit) { G.lastBeatHit = near; G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak); G.beatHits++; G.beatFlash = 0.25; }
  return on;
}
function dmgEnemy(e, amt, on, kx = 0, kz = 0, at) {
  if (e.dead || e.untouchable) return; amt *= G.st.gdmg; const crit = Math.random() < G.st.crit; if (crit) { amt *= 2; e.dmgOn = true; } e.hp -= amt; e.flash = 0.07; const kb = e.T.boss ? 0.08 : e.type === 'plow' ? 0.4 : 1; e.kx += kx * kb; e.kz += kz * kb;
  const c = at || eCenter(e); fx.burst(c, [e.T.colors[0], 0xffffff], on ? 10 : 5, 4, 0.22, 0.35, 6, 1); music.hit();
  e.dmgAcc = (e.dmgAcc || 0) + amt; e.dmgOn = e.dmgOn || on; if (!(e.dmgT > 0)) e.dmgT = 0.09; e.dmgAt = c;
  hitMark(on ? 'beat' : '');
  if (e.hp <= 0) { flushDmg(e); killEnemy(e, on); }
}
function flushDmg(e) { if (!e.dmgAcc || !save.nums) { e.dmgAcc = 0; return; } const v = Math.round(e.dmgAcc); const big = v >= 40 || e.dmgOn;
  floatText(e.dmgAt.clone().add(new V3(rnd(-0.4, 0.4), 0.3, rnd(-0.4, 0.4))), v + (e.dmgOn ? '!' : ''), e.dmgOn ? '#ff7af0' : v >= 40 ? '#ffd23a' : '#ffffff', big, 0.7, 'num'); e.dmgAcc = 0; e.dmgOn = false; }
function hitMark(kind) { const h = $('hitmark'); h.className = 'on ' + kind; G.hitT = kind === 'kill' ? 0.22 : 0.1; }
function killEnemy(e, on) {
  const T = e.T, L = LEVELS[G.li]; removeEnemy(e); const c = eCenter(e); const boss = T.boss;
  fx.burst(c, T.colors, boss ? 280 : 46, boss ? 18 : 9, boss ? 0.8 : 0.42, boss ? 1.4 : 0.9, 7, 3);
  fx.burst(c, [0xffffff, 0xff3fd2, 0x2bf0ff], boss ? 80 : 14, boss ? 20 : 13, 0.22, 0.35, 0, 0);
  fx.ring(new V3(e.x, 0, e.z), T.colors[0], 0.3, boss ? 16 : 3.6, boss ? 0.9 : 0.45); fx.flash(c, T.colors[0], boss ? 9 : 2.6); fx.flash(c, 0xffffff, boss ? 5 : 1.3); hitMark('kill');
  fx.burst(c, T.colors, boss ? 60 : 16, boss ? 10 : 6, 0.18, 1.6, 4, 2, true); if (on) fx.ring(new V3(e.x, 0, e.z), 0xff3fd2, 0.3, boss ? 18 : 5, 0.55);
  const total = Math.round(T.cash * 0.85 * L.cashMul * G.st.cashMul * DIFF[G.diff].cash) + (on ? 1 : 0); const nc = Math.min(total, boss ? 20 : 4);
  for (let i = 0; i < nc; i++) fx.coin(c, Math.floor(total / nc) + (i < total % nc ? 1 : 0));
  const mult = 1 + Math.min(G.streak, 40) * 0.025; G.score += Math.round(T.score * mult * (on ? 1.25 : 1)); G.kills++; music.kill(G.kills);
  if (G.st.leech) G.P.hp = Math.min(G.P.hpMax, G.P.hp + G.st.leech);
  if (G.st.boom && !boss && (G.boomDepth || 0) < 2) { G.boomDepth = (G.boomDepth || 0) + 1; fx.burst(c, [0xff3fd2, 0x2bf0ff, 0xffd23a, 0x8dff3a], 30, 11, 0.3, 0.8, 3, 2, true); fx.ring(new V3(e.x, 0.5, e.z), 0xffd23a, 0.3, 2.8, 0.3);
    for (const o of G.enemies.slice()) if (!o.dead && Math.hypot(o.x - e.x, o.z - e.z) < 2.8 + o.T.r) dmgEnemy(o, 14 * G.st.boom, false); G.boomDepth--; }
  if (boss || Math.random() < 0.4) floatText(c.clone().add(new V3(0, boss ? 3 : 0.6, 0)), pick(T.quips), '#' + new THREE.Color(T.colors[0]).getHexString(), true, boss ? 2.5 : 1.1);
  if (boss) { G.hitstop = 0.35; G.shake = 1.5; G.boss = null; $('bossbox').classList.add('hidden'); if (G.wave) G.wave.bossDead = true; banner(pick(T.quips), 'pink', 2.5); music.win();
    G.wave && (G.wave.left = 0); later(0.4, () => { for (const o of G.enemies.slice()) if (!o.dead) { o.hp = 0; killEnemy(o, false); } }); }
  else G.hitstop = Math.max(G.hitstop, on ? 0.05 : 0.025);
}
function attack(alt) {
  const P = G.P, st = G.st; if (!P || P.dead) return;
  const on = judgeBeat(); const mul = on ? st.beatMul : 1; const o = eyePos(), d = aimDir(); G.shots++;
  const muzzle = o.clone().add(d.clone().multiplyScalar(0.6)).add(new V3(Math.cos(P.yaw) * 0.25, -0.22, -Math.sin(P.yaw) * 0.25));
  if (on) { $('cross').classList.add('hit'); G.crossT = 0.15; }
  G.mflashT = G.path === 'baton' ? 0 : 0.05;
  if (G.path === 'baton') {
    if (!alt) { G.swing = 1; music.shoot('baton', on); const fw = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
      let n = 0; for (const e of G.enemies.slice()) { if (e.dead) continue; const ex = e.x - P.x, ez = e.z - P.z, dd = Math.hypot(ex, ez); if (dd > st.range + e.T.r || e.y > 3.6) continue;
        const ang = Math.acos(clamp((ex * fw.x + ez * fw.z) / (dd || 1), -1, 1)); if (ang > st.arc / 2 && dd > e.T.r + 0.3) continue;
        dmgEnemy(e, st.dmg * mul, on, ex / (dd || 1) * 9, ez / (dd || 1) * 9); n++; }
      // renvoie les projectiles ennemis (« retour à l'envoyeur »)
      for (const p of G.projs) if (p.owner === 'e' && !p.dead) { const ex = p.pos.x - P.x, ez = p.pos.z - P.z, dd = Math.hypot(ex, ez); if (dd < st.range + 0.6 && (ex * fw.x + ez * fw.z) / (dd || 1) > Math.cos(st.arc / 2)) {
        p.owner = 'p'; p.vel.copy(d).multiplyScalar(26); p.dmg = st.dmg * 1.2; p.m.material = projMat.refl; p.life = 2; floatText(p.pos.clone(), 'RETOUR À L\'ENVOYEUR!', '#ff3fd2', false, 0.9); } }
      const arcC = on ? [0xff3fd2, 0xffffff, 0x2bf0ff] : [0xff3fd2, 0xffffff];
      for (let i = 0; i < (on ? 22 : 12); i++) { const a = P.yaw + (Math.random() - 0.5) * st.arc; const r = st.range * rnd(0.5, 1); fx.burst(new V3(P.x - Math.sin(a) * r, 1.2 + rnd(-0.3, 0.3), P.z - Math.cos(a) * r), arcC, 1, 1.5, 0.22, 0.25, 0, 0); }
      if (n) G.shake = Math.min(1, G.shake + 0.12);
    } else { music.shoot('puck', on); addProj('puck', muzzle, d.clone().multiplyScalar(42), { owner: 'p', dmg: st.altDmg * mul, pierce: st.pierce, life: 1.6, r: 0.4, on, trail: on ? 0xff3fd2 : 0x2bf0ff }); }
  } else if (G.path === 'pelle') {
    const shotsN = alt ? st.pellets : 1, spread = alt ? 0.085 : st.spread; music.shoot(alt ? 'bordee' : 'pelle', on);
    for (let k = 0; k < shotsN; k++) { const dd = d.clone(); dd.x += (Math.random() - 0.5) * spread * 2; dd.y += (Math.random() - 0.5) * spread * 2; dd.z += (Math.random() - 0.5) * spread * 2; dd.normalize();
      const hits = rayHits(o, dd, alt ? 22 : 60, alt ? 1 : 1); const pierce = alt ? 1 : st.pierce; let endT = alt ? 22 : 60;
      for (let i = 0; i < Math.min(pierce, hits.length); i++) { const h = hits[i]; const at = o.clone().add(dd.clone().multiplyScalar(h.t)); dmgEnemy(h.e, (alt ? st.altDmg : st.dmg) * mul, on, dd.x * (alt ? 6 : 1.5), dd.z * (alt ? 6 : 1.5), at); endT = h.t; }
      fx.tracer(muzzle, o.clone().add(dd.multiplyScalar(endT)), on ? 0xff3fd2 : 0xffd27a); }
    G.recoil = alt ? 1 : 0.35; if (alt) G.shake = Math.min(1, G.shake + 0.2);
  } else {
    if (!alt) { music.shoot('onde', on); addProj('orb', muzzle, d.clone().multiplyScalar(30), { owner: 'p', dmg: st.dmg * mul, life: 1.8, r: 0.35, boom: st.radius * (on ? 1.35 : 1), on, mat: on ? 'orbB' : 'orb', trail: on ? 0xff3fd2 : 0x2bf0ff }); G.recoil = 0.5; }
    else { music.shoot('pulse', on); const R = st.pulseR; fx.ring(new V3(P.x, 0, P.z), 0x2bf0ff, 0.5, R, 0.4); fx.ring(new V3(P.x, 0.8, P.z), on ? 0xff3fd2 : 0xffffff, 0.5, R * 0.9, 0.35);
      fx.burst(new V3(P.x, 1, P.z), [0x2bf0ff, 0xffffff, 0xff3fd2], 60, 14, 0.3, 0.5, 0, 0);
      for (const e of G.enemies.slice()) { const ex = e.x - P.x, ez = e.z - P.z, dd = Math.hypot(ex, ez); if (dd < R + e.T.r) dmgEnemy(e, st.altDmg * mul * (1 - 0.4 * dd / R), on, ex / (dd || 1) * 16, ez / (dd || 1) * 16); }
      for (const p of G.projs) if (p.owner === 'e' && p.pos.distanceTo(new V3(P.x, 1.2, P.z)) < R) { freeProj(p); }
      G.shake = Math.min(1, G.shake + 0.4); }
  }
}
function explode(p) {
  const R = p.boom; fx.burst(p.pos, p.on ? [0xff3fd2, 0xffffff, 0x2bf0ff] : [0x2bf0ff, 0xffffff, 0x4f6bff], 34, 9, 0.35, 0.5, 2, 1); fx.ring(new V3(p.pos.x, Math.max(0, p.pos.y - 1), p.pos.z), p.on ? 0xff3fd2 : 0x2bf0ff, 0.3, R, 0.3);
  const hitList = [];
  for (const e of G.enemies.slice()) { const c = eCenter(e); const dd = c.distanceTo(p.pos); if (dd < R + e.T.r) { hitList.push(e); dmgEnemy(e, p.dmg * (1 - 0.35 * dd / R), p.on, (c.x - p.pos.x) * 2, (c.z - p.pos.z) * 2); } }
  // arc électrique vers d'autres ennemis
  let chains = G.st.chain || 0; let from = p.pos.clone();
  while (chains-- > 0) { let best = null, bd = 8; for (const e of G.enemies) { if (e.dead || hitList.includes(e)) continue; const dd = eCenter(e).distanceTo(from); if (dd < bd) { bd = dd; best = e; } }
    if (!best) break; const c = eCenter(best); fx.tracer(from, c, 0x8dff3a); fx.tracer(from.clone().add(new V3(0, 0.2, 0)), c, 0xffffff); hitList.push(best); dmgEnemy(best, p.dmg * 0.6, p.on); from = c; }
  music.tone('sine', 220, 60, 0.2, 0.15);
}
function perfectDodge() { const P = G.P; P.perfect = true; P.inv = 0.7; G.slowmo = 0.45; P.dashN = Math.min(G.st.dashMax, P.dashN + 1); G.streak += 2; G.bestStreak = Math.max(G.bestStreak, G.streak); G.dodges = (G.dodges || 0) + 1;
  banner('ESQUIVE PARFAITE!', 'cyan', 1); fx.ring(new V3(P.x, 0.1, P.z), 0x2bf0ff, 0.5, 6, 0.4); fx.burst(new V3(P.x, 1, P.z), [0x2bf0ff, 0xffffff, 0xff3fd2], 30, 7, 0.25, 0.5, 0, 0); music.tone('sine', 1320, 660, 0.3, 0.12); music.tone('triangle', 990, 0, 0.2, 0.08, 0.06);
  if (Math.random() < 0.3) radio(pick(LINES.dodge || ['Belle esquive!']), 3); }
function hurt(amt) {
  const P = G.P; if (!P || G.state !== 'play' || P.dead || G.god) return;
  if (P.inv > 0) { if (G.t - (P.dashStart ?? -9) < 0.34 && !P.perfect) perfectDodge(); return; }
  amt *= G.st.armor * DIFF[G.diff].dmg; P.lastHit = G.t; if (isTouch && save.vib && navigator.vibrate) try { navigator.vibrate(Math.min(60, 15 + amt * 2)); } catch (_) {}
  P.hp -= amt; P.inv = 0.45; G.streak = 0; G.shake = Math.min(1.2, G.shake + 0.55); G.hurtT = 0.5; music.hurt(); G.dmgTaken += amt;
  if (P.hp <= 0) { P.hp = 0; die(); }
  else if (P.hp < P.hpMax * 0.3 && !G.lowSaid) { radio(LINES.low, 5); G.lowSaid = true; }
}

// ---------- Textes flottants, bannière, radio ----------
const floats = []; const floatsEl = $('floats');
for (let i = 0; i < 44; i++) { const d = document.createElement('div'); d.style.display = 'none'; floatsEl.appendChild(d); floats.push({ el: d, life: 0 }); }
function floatText(pos, text, color, big, life = 1, cls = '') { const f = floats.find(f => f.life <= 0) || floats.reduce((a, b) => a.life < b.life ? a : b);
  f.el.textContent = text; f.el.style.color = color; f.el.className = (big ? 'big ' : '') + cls; f.el.style.display = 'block'; f.pos = pos.clone(); f.life = f.max = life; }
const projV = new V3();
function updFloats(dt) { for (const f of floats) { if (f.life <= 0) continue; f.life -= dt; if (f.life <= 0) { f.el.style.display = 'none'; continue; }
  projV.copy(f.pos); projV.y += (1 - f.life / f.max) * 1.2; projV.project(camera); if (projV.z > 1) { f.el.style.opacity = 0; continue; }
  const x = (projV.x + 1) / 2 * innerWidth, y = (1 - projV.y) / 2 * innerHeight; const sc = f.el.classList.contains('num') ? 1 + Math.max(0, f.life / f.max - 0.75) * 2.4 : 1; f.el.style.transform = `translate(${x | 0}px,${y | 0}px) translate(-50%,-50%) scale(${sc.toFixed(2)})`; f.el.style.opacity = Math.min(1, f.life / f.max * 3); } }
function banner(text, cls = '', dur = 1.6) { const b = $('banner'); b.textContent = text; b.className = 'on ' + cls; G.bannerT = dur; }
function toast(text, dur = 2.5) { const t = $('toast'); t.textContent = text; t.classList.add('on'); G.toastT = dur; }
function radio(text, dur = 7) { $('djname').textContent = DJ; $('radio').classList.remove('hidden'); G.radio = { text, shown: 0, hold: dur }; $('rtext').textContent = ''; }
function updRadio(dt) { const R = G.radio; if (!R) return; if (R.shown < R.text.length) { const prev = Math.floor(R.shown); R.shown = Math.min(R.text.length, R.shown + dt * 55); if (Math.floor(R.shown / 3) !== Math.floor(prev / 3)) music.blip(); $('rtext').textContent = R.text.slice(0, Math.floor(R.shown)); }
  else if (G.state === 'play') { R.hold -= dt; if (R.hold <= 0) { $('radio').classList.add('hidden'); G.radio = null; } } }

// ---------- Flux de jeu ----------
const screens = ['title', 'paths', 'help', 'opts', 'shop', 'pause', 'over', 'win', 'lvlcard', 'records'];
function show(id) { screens.forEach(s => $(s).classList.toggle('hidden', s !== id && !(id === 'shop' && s === 'none'))); G.screen = id; document.body.classList.toggle('shopping', id === 'shop'); focusFirst(); }
function setHud(on) { $('hud').classList.toggle('hidden', !on); $('touch').classList.toggle('hidden', !(on && isTouch)); }
function newPlayer() { const L = LEVELS[G.li]; const b = L.arena; const z = b.type === 'circle' ? 13 : b.h / 2 - 8;
  G.P = { x: 0, z, yaw: 0, pitch: 0, vx: 0, vz: 0, kx: 0, kz: 0, hp: G.st.hpMax, hpMax: G.st.hpMax, inv: 0, dashT: 0, dashN: G.st.dashMax, dashRe: 0, fireCd: 0, altCd: 0, bob: 0, dx: 0, dz: 0 }; }
function startRun(path, li = 0, opt = {}) {
  G.mode = opt.mode || save.mode || 'histoire'; G.diff = opt.diff ?? save.diff ?? 1; if (G.mode === 'survie') li = 0; G.dodges = 0;
  music.init(); G.path = path; G.li = li; G.wi = 0; G.cash = li * 220; G.score = 0; G.kills = 0; G.up = {}; G.streak = 0; G.bestStreak = 0; G.deaths = 0; G.beatHits = 0; G.shots = 0; G.dmgTaken = 0; G.t0 = performance.now();
  computeStats(); buildViewmodel(); startLevel(li, 0);
}
function clearField() { for (const e of G.enemies) removeEnemy(e); G.enemies = []; for (const p of G.projs) if (!p.dead) freeProj(p); G.projs = []; G.shocks = []; fx.clear(); G.boss = null; $('bossbox').classList.add('hidden'); }
function startLevel(li, startWi = 0) {
  G.li = li; G.wi = startWi; clearField(); loadLevel(li); computeStats(); newPlayer(); G.state = 'play'; G.wave = null; G.timers = []; music.setKey(LEVELS[li].key); music.setLevel(li); music.toChill();
  const L = LEVELS[li]; show('lvlcard'); $('lvnum').textContent = G.mode === 'survie' ? 'SURVIE · ' + DIFF[G.diff].name.toUpperCase() : 'QUARTIER ' + (li + 1) + ' / ' + LEVELS.length + ' · ' + DIFF[G.diff].name.toUpperCase(); $('lvname').textContent = L.name.toUpperCase(); $('lvsub').textContent = L.sub;
  setHud(true); radio(G.mode === 'survie' && startWi === 0 ? (LINES.survieIntro || LINES.intro[0]) : LINES.intro[li], 6); G.cap = (save.qual === 'low' ? 12 : 16) + (G.mode === 'survie' ? Math.min(9, Math.floor(startWi / 3)) : li * 3);
  later(3.4, () => { show(null); startWave(startWi); });
  lockPointer();
}
function waveDef(wi) {
  const D = DIFF[G.diff];
  if (G.mode !== 'survie') { const d = LEVELS[G.li].waves[wi]; return { ...d, n: Math.round(d.n * D.n) }; }
  const pool = ['cone', 'bur', 'cons', 'plow', 'drone', 'parco', 'pigeon'].filter(t => TYPES[t]);
  const un = pool.slice(0, Math.min(pool.length, 2 + Math.floor(wi / 2))); const mix = {}; un.forEach((t, i) => mix[t] = 2 + ((wi + i) % 4));
  const bosses = ['grandcone', 'mere', 'nid', 'tram'].filter(t => TYPES[t]);
  const boss = (wi + 1) % 5 === 0 ? bosses[Math.floor(wi / 5) % bosses.length] : null;
  return { n: Math.round((16 + 4 * wi) * D.n), mix, boss, survHp: 1 + 0.11 * wi, bossHp: 1 + 0.2 * Math.floor(wi / 5) };
}
function startWave(wi) {
  G.wi = wi; const def = waveDef(wi); G.wave = { def, left: def.n, done: false, bossDead: false, firstDrop: true };
  G.snap = { cash: G.cash, up: { ...G.up }, score: G.score, kills: G.kills }; G.lowSaid = false;
  music.startWave(!!def.boss); radio(G.mode === 'survie' ? (def.boss ? pick(LINES.survieBoss || LINES.drop) : pick(LINES.survie || LINES.shop)) : LINES.waves[G.li][wi], 7); banner((G.mode === 'survie' ? 'SURVIE · ' : '') + 'VAGUE ' + (wi + 1), 'cyan', 1.8);
  G.state = 'play'; show(null); setHud(true);
}
function pickType(def) { const m = def.mix; let tot = 0; for (const k in m) tot += m[k]; let r = Math.random() * tot; for (const k in m) { r -= m[k]; if (r <= 0) return k; } return 'cone'; }
function onBeat(b, sec) {
  G.pulse = 1; if (G.state !== 'play') return;
  if (G.boss) onBossBeat(G.boss, b);
  const W = G.wave; if (!W || W.done) return; const name = sec.name; let n = 0;
  if (name === 'build') { if (b % 8 === 0) n = 1; }
  else if (name === 'drop' || name === 'boss') { W.dropBeats = (W.dropBeats || 0) + 1; n = (b % 2 === 0 || W.dropBeats > 12) ? 1 : 0; if (b % 16 === 0) n++; if (W.firstDrop) { n = 4; W.firstDrop = false; } }
  if (W.def.boss && !W.bossSpawned && name === 'boss') { W.bossSpawned = true; spawn(W.def.boss, spawnPoint()); }
  while (n-- > 0 && W.left > 0 && G.enemies.length < G.cap) { spawn(pickType(W.def)); W.left--; }
}
function onSection(sec) {
  const W = G.wave; const el = $('seclbl'); const map = { build: ['ÇA MONTE…', ''], drop: ['LE DROP!', 'drop'], boss: ['COMBAT DE BOSS!', 'drop'], break: ['RÉPIT', 'break'], chill: ['', ''], title: ['', ''] };
  const m = map[sec.name] || ['', '']; el.textContent = W && !W.done ? m[0] : ''; el.className = m[1];
  if (G.state !== 'play' || !W || W.done) return;
  if (sec.name === 'drop' || sec.name === 'boss') { W.firstDrop = true; W.dropBeats = 0; if (W.left > 0 || (W.def.boss && !W.bossSpawned)) banner(pick(LINES.drop), 'pink', 1.4); G.shake = Math.max(G.shake, 0.5); }
  if (sec.name === 'break' && (W.left > 0 || G.enemies.length)) { banner('RÉPIT', 'cyan', 1.2); radio(pick(LINES.brk), 3); }
}
function checkWave() {
  const W = G.wave; if (!W || W.done) return;
  if (W.left <= 0 && G.enemies.length === 0 && (!W.def.boss || W.bossDead)) {
    W.done = true; music.toChill(); banner('VAGUE TERMINÉE!', 'gold', 2); G.magnetAll = 2.5; $('seclbl').textContent = '';
    const L = LEVELS[G.li];
    later(2.4, () => {
      if (G.state !== 'play') return;
      if (G.mode === 'survie') { const nw = G.wi + 1; if (nw % 5 === 0) openShop({ type: 'survlevel', li: Math.floor(nw / 5) % LEVELS.length, wi: nw }); else openShop({ type: 'wave', wi: nw }); return; }
      if (G.wi < L.waves.length - 1) openShop({ type: 'wave', wi: G.wi + 1 });
      else if (G.li < LEVELS.length - 1) { save.unlocked = Math.max(save.unlocked, G.li + 1); persist(); banner('QUARTIER LIBÉRÉ!', 'pink', 2); radio(LINES.level, 4); later(2, () => openShop({ type: 'level', li: G.li + 1 })); }
      else win();
    });
  }
}
function openShop(next) {
  G.state = 'shop'; G.next = next; unlockPointer(); music.toShop(); show('shop'); setHud(false); renderShop();
  radio(Math.random() < 0.35 ? LINES.path[G.path] : pick(LINES.shop), 99);
  $('bNext').textContent = next.type === 'wave' ? 'VAGUE ' + (next.wi + 1) + ' ▶' : next.type === 'survlevel' ? 'VAGUE ' + (next.wi + 1) + ' · NOUVEAU QUARTIER ▶' : 'QUARTIER SUIVANT ▶';
  const L = LEVELS[next.type === 'wave' ? G.li : next.li]; const keepLi = G.li; if (next.type !== 'wave') G.li = next.li; const def = next.type === 'level' ? waveDef(0) : waveDef(next.wi); G.li = keepLi;
  const names = Object.keys(def.mix).map(k => TYPES[k].name).join(', ');
  $('nextinfo').textContent = (next.type === 'level' ? 'Prochain : ' + L.name + ' · ' : 'Prochaine vague : ') + names + (def.boss ? ' + ' + TYPES[def.boss].name : '');
}
function costOf(u) { return u.cost[Math.min(G.up[u.id] || 0, u.cost.length - 1)]; }
function renderShop() {
  $('scash').textContent = G.cash; const box = $('cards'); const fid = document.activeElement && document.activeElement.dataset.id; box.innerHTML = '';
  const list = UPG.filter(u => !u.path || u.path === G.path).sort((a, b) => (!!b.path - !!a.path));
  for (const u of list) { const lv = G.up[u.id] || 0, max = !u.use && lv >= u.max, cost = costOf(u);
    const b = document.createElement('button'); b.className = 'card' + (max ? ' max' : G.cash < cost ? ' poor' : ''); b.dataset.id = u.id; b.style.setProperty('--c', u.c);
    b.innerHTML = `<div class="cn"></div><div class="cd"></div><div class="cl">${u.use ? '' : Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div><div class="cc"></div>`;
    b.querySelector('.cn').textContent = u.name; b.querySelector('.cd').textContent = u.desc; b.querySelector('.cc').textContent = max ? 'MAXIMUM' : (u.use && G.P.hp >= G.P.hpMax ? 'PLEIN · ' : '') + cost + ' piasses';
    b.onclick = () => buy(u.id); box.appendChild(b); }
  if (fid) { const el = box.querySelector(`[data-id="${fid}"]`); el && el.focus(); }
}
function buy(id) {
  const u = UPG.find(x => x.id === id); if (!u || G.state !== 'shop') return false; const lv = G.up[id] || 0; const cost = costOf(u);
  if ((!u.use && lv >= u.max) || G.cash < cost || (u.use && G.P.hp >= G.P.hpMax)) { music.deny(); return false; }
  G.cash -= cost; if (u.use) G.P.hp = G.P.hpMax; else G.up[id] = lv + 1;
  computeStats(); if (id === 'hp') G.P.hp = Math.min(G.P.hpMax, G.P.hp + 25); if (id === 'dash') G.P.dashN = G.st.dashMax;
  buildViewmodel(); music.buy(); renderShop(); const el = $('cards').querySelector(`[data-id="${id}"]`); if (el) { el.classList.add('bought'); el.focus(); } return true;
}
function nextFromShop() { const n = G.next; if (!n) return; G.next = null; $('radio').classList.add('hidden'); G.radio = null; lockPointer();
  if (n.type === 'wave') startWave(n.wi); else if (n.type === 'survlevel') startLevel(n.li, n.wi); else startLevel(n.li); }
function die() { G.P.dead = true; G.state = 'dead'; G.deaths++; unlockPointer(); music.toChill(); setHud(false);
  later(0, () => {}); show('over'); radio(LINES.dead, 99);
  $('bRetry').textContent = G.mode === 'survie' ? 'NOUVELLE PARTIE' : 'RECOMMENCER LA VAGUE';
  if (G.mode === 'survie') { const rec = { s: G.score, w: G.wi + 1, p: G.path, d: G.diff, k: G.kills, date: new Date().toISOString().slice(0, 10) }; save.scores = (save.scores || []).concat(rec).sort((a, b) => b.s - a.s).slice(0, 10); persist();
    const rank = save.scores.indexOf(rec) + 1; $('overstats').innerHTML = `SURVIE (${DIFF[G.diff].name}) · vague ${G.wi + 1} atteinte<br>Éliminations : ${G.kills} · Pointage : <b>${G.score}</b><br>` + (rank ? `Nouveau record n° ${rank} du top 10!` : 'Pas dans le top 10 cette fois.'); return; }
  $('overstats').innerHTML = `Quartier : ${LEVELS[G.li].name} · vague ${G.wi + 1}<br>Éliminations : ${G.kills} · Pointage : ${G.score}`; }
function renderRecords() { const L = save.scores || []; $('rectable').innerHTML = L.length ? '<tr><th>#</th><th>Pointage</th><th>Vague</th><th>Arme</th><th>Difficulté</th><th>Date</th></tr>' + L.map((r, i) => `<tr><td>${i + 1}</td><td>${r.s}</td><td>${r.w}</td><td>${PATHS[r.p].name}</td><td>${DIFF[r.d].name}</td><td>${r.date}</td></tr>`).join('') : '<tr><td>Aucun record encore. Lance une partie en mode Survie!</td></tr>'; }
function retryWave() { const s = G.snap; G.cash = s.cash; G.up = { ...s.up }; G.score = s.score; G.kills = s.kills; clearField(); computeStats(); buildViewmodel();
  const keep = G.li; const wi = G.wi; newPlayer(); G.li = keep; $('radio').classList.add('hidden'); G.radio = null; G.timers = []; lockPointer(); startWave(wi); }
function win() { G.state = 'win'; unlockPointer(); setHud(false); music.toTitle(); music.win(); show('win'); radio(LINES.win, 99);
  const secs = Math.round((performance.now() - G.t0) / 1000); save.best = Math.max(save.best, G.score); save.unlocked = LEVELS.length - 1; persist();
  $('winstats').innerHTML = `Arme : ${PATHS[G.path].name}<br>Pointage : <b>${G.score}</b> (record : ${save.best})<br>Éliminations : ${G.kills} · Attaques sur le beat : ${G.beatHits}<br>Meilleure série beat : ×${G.bestStreak} · K.-O. : ${G.deaths} · Temps : ${Math.floor(secs / 60)} min ${secs % 60} s`; }
function toTitle() { G.state = 'title'; music.muffle(false); clearField(); setHud(false); $('radio').classList.add('hidden'); G.radio = null; music.toTitle(); loadLevel(0); G.P = null; show('title'); }
function pause() { if (G.state !== 'play') return; G.state = 'pause'; music.muffle(true); show('pause'); unlockPointer(); }
function resume() { if (G.state !== 'pause') return; G.state = 'play'; music.muffle(false); show(G.wave ? null : 'lvlcard'); if (G.wave) show(null); lockPointer(); }

// ---------- Contrôles ----------
function lockPointer() { if (isTouch || G.bot || !canvas.requestPointerLock) return; try { const r = canvas.requestPointerLock(); r && r.catch && r.catch(() => {}); } catch (e) {} }
function unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.state === 'play') pause(); });
canvas.addEventListener('mousedown', e => { music.init(); if (G.state === 'play' && !document.pointerLockElement && !isTouch) lockPointer(); if (e.button === 0) input.fire = true; if (e.button === 2) input.altReq = true; });
addEventListener('mouseup', e => { if (e.button === 0) input.fire = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => { if (document.pointerLockElement === canvas && G.state === 'play') { input.mdx += e.movementX; input.mdy += e.movementY; } });
addEventListener('keydown', e => { music.init(); input.keys.add(e.code);
  if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { input.dashReq = true; e.preventDefault(); }
  if (e.code === 'KeyE') input.altReq = true;
  if (e.code === 'KeyP' || e.code === 'Escape') { if (G.state === 'play') pause(); else if (G.state === 'pause' && e.code === 'KeyP') resume(); }
  if (e.code === 'Enter' && G.state === 'shop' && document.activeElement === document.body) nextFromShop(); });
addEventListener('keyup', e => input.keys.delete(e.code));
addEventListener('pointerdown', () => music.init(), { once: false });
addEventListener('touchend', () => music.init(), { passive: true }); // déblocage audio iOS (geste complet)
addEventListener('blur', () => { input.keys.clear(); input.fire = false; if (G.state === 'play' && !G.bot) pause(); });
// tactile
const tl = $('tl'), tr = $('tr'); let lt = null, rt = null;
tl.addEventListener('touchstart', e => { const t = e.changedTouches[0]; lt = { id: t.identifier, x: t.clientX, y: t.clientY }; const k = $('knob0'); k.style.display = 'block'; k.style.left = t.clientX + 'px'; k.style.top = t.clientY + 'px'; $('khint').style.opacity = 0; e.preventDefault(); }, { passive: false });
tr.addEventListener('touchstart', e => { const t = e.changedTouches[0]; rt = { id: t.identifier, x: t.clientX, y: t.clientY, t: performance.now() }; e.preventDefault(); }, { passive: false });
let onTarget = false; // friction de la visée quand le réticule est sur un ennemi
function touchLook(t) { const now = performance.now(), dtm = Math.max(8, now - (rt.t || now)); let dx = t.clientX - rt.x, dy = t.clientY - rt.y;
  const v = Math.hypot(dx, dy) / dtm; const acc = 0.75 + Math.min(1.1, v * 0.9); const fr = onTarget ? 0.6 : 1; const k = 0.0052 * save.sens * acc * fr;
  G.P.yaw -= dx * k; G.P.pitch = clamp(G.P.pitch - dy * k * 0.8, -1.3, 1.3); rt.x = t.clientX; rt.y = t.clientY; rt.t = now; }
addEventListener('touchmove', e => { for (const t of e.changedTouches) {
  if (lt && t.identifier === lt.id) { let dx = (t.clientX - lt.x) / 50, dy = (t.clientY - lt.y) / 50; let l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; l = 1; } if (l < 0.12) { dx = dy = 0; } else if (l < 0.9 && l > 0) { const g = (l - 0.12) / 0.78 / l; dx *= g * 1.1; dy *= g * 1.1; } input.tmx = dx; input.tmz = -dy; $('knob').style.transform = `translate(${clamp(dx, -1, 1) * 40}px,${clamp(dy, -1, 1) * 40}px)`; }
  if (rt && t.identifier === rt.id && G.P) touchLook(t); } }, { passive: false });
const endT = e => { for (const t of e.changedTouches) { if (lt && t.identifier === lt.id) { lt = null; input.tmx = input.tmz = 0; $('knob0').style.display = 'none'; $('khint').style.opacity = 1; $('knob').style.transform = ''; } if (rt && t.identifier === rt.id) rt = null; } };
addEventListener('touchend', endT); addEventListener('touchcancel', endT);
const tbtn = (id, down, up, look) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); music.init(); down(); const t = e.changedTouches[0]; if (look && !rt) rt = { id: t.identifier, x: t.clientX, y: t.clientY, t: performance.now() }; if (navigator.vibrate && save.vib) try { navigator.vibrate(8); } catch (_) {} }, { passive: false });
  const up2 = e => { e.preventDefault(); b.classList.remove('on'); up && up(); }; b.addEventListener('touchend', up2); b.addEventListener('touchcancel', up2); };
tbtn('tFire', () => input.tfire = true, () => input.tfire = false, true); tbtn('tAlt', () => input.altReq = true); tbtn('tDash', () => input.dashReq = true); tbtn('tPause', () => pause());
// manette
let padPrev = []; let navCd = 0;
function pollPad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; } if (!gp) return;
  const dz = v => Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84; const btn = i => gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4);
  const edge = i => btn(i) && !padPrev[i];
  if (G.state === 'play' && G.P) {
    input.padMx = dz(gp.axes[0] || 0); input.padMz = -dz(gp.axes[1] || 0);
    const lx = dz(gp.axes[2] || 0), ly = dz(gp.axes[3] || 0); G.P.yaw -= lx * Math.abs(lx) * 3.2 * save.sens * dt; G.P.pitch = clamp(G.P.pitch - ly * Math.abs(ly) * 2.2 * save.sens * dt, -1.3, 1.3);
    input.padFire = btn(7) || btn(5); input.padAlt = btn(6) || btn(4); if (edge(0) || edge(10)) input.dashReq = true; if (input.padAlt && !input.lastPadAlt) input.altReq = true; input.lastPadAlt = input.padAlt;
    if (edge(9)) pause(); input.usingPad = Math.abs(lx) + Math.abs(ly) + Math.abs(input.padMx) > 0 || input.padFire;
  } else {
    navCd -= dt; const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0); let dir = null;
    if (edge(12) || (ay < -0.6 && navCd <= 0)) dir = 'up'; else if (edge(13) || (ay > 0.6 && navCd <= 0)) dir = 'down'; else if (edge(14) || (ax < -0.6 && navCd <= 0)) dir = 'left'; else if (edge(15) || (ax > 0.6 && navCd <= 0)) dir = 'right';
    if (dir) { navMove(dir); navCd = 0.22; } if (Math.abs(ax) < 0.3 && Math.abs(ay) < 0.3) navCd = 0;
    if (edge(0)) { music.init(); const el = document.activeElement; if (el && el.click && el !== document.body) el.click(); else focusFirst(); }
    if (edge(1)) { const back = document.querySelector('.screen:not(.hidden) [id^=bBack]'); if (back) back.click(); }
    if (edge(9) && G.state === 'pause') resume();
  }
  padPrev = gp.buttons.map(b => b.pressed || b.value > 0.4);
}
function focusables() { const s = document.querySelector('.screen:not(.hidden)'); return s ? [...s.querySelectorAll('button:not(:disabled), select, input')].filter(e => e.offsetParent) : []; }
function focusFirst() { const f = focusables(); if (f.length && !isTouch) f[0].focus({ preventScroll: true }); }
function navMove(dir) { const f = focusables(); if (!f.length) return; const cur = document.activeElement; if (!f.includes(cur)) { f[0].focus(); return; }
  const r = cur.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2; let best = null, bs = 1e9;
  for (const e of f) { if (e === cur) continue; const q = e.getBoundingClientRect(), x = q.x + q.width / 2 - cx, y = q.y + q.height / 2 - cy;
    const ok = dir === 'up' ? y < -5 : dir === 'down' ? y > 5 : dir === 'left' ? x < -5 : x > 5; if (!ok) continue; const s = (dir === 'up' || dir === 'down') ? Math.abs(y) + Math.abs(x) * 2 : Math.abs(x) + Math.abs(y) * 2; if (s < bs) { bs = s; best = e; } }
  if (best) { best.focus(); music.blip(); } }

// ---------- Menus ----------
const ICONS = {
  baton: '<svg viewBox="0 0 120 50"><path d="M20 4 L70 40 L104 40" stroke="#ff3fd2" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="96" cy="22" r="6" fill="#2bf0ff"/></svg>',
  pelle: '<svg viewBox="0 0 120 50"><path d="M10 25 L70 25" stroke="#ffb43a" stroke-width="6" stroke-linecap="round"/><path d="M70 10 L104 14 L104 36 L70 40 Z" fill="none" stroke="#ffb43a" stroke-width="5"/><path d="M40 33 L100 33" stroke="#2bf0ff" stroke-width="4"/></svg>',
  onde: '<svg viewBox="0 0 120 50"><circle cx="60" cy="25" r="10" fill="#fff"/><circle cx="60" cy="25" r="17" fill="none" stroke="#2bf0ff" stroke-width="4"/><circle cx="60" cy="25" r="23" fill="none" stroke="#ff3fd2" stroke-width="2"/></svg>',
};
let pickLi = 0;
function renderPaths() {
  const box = $('pathcards'); box.innerHTML = '';
  for (const k of ['baton', 'pelle', 'onde']) { const p = PATHS[k]; const b = document.createElement('button'); b.className = 'pcard'; b.style.setProperty('--c', p.color); b.dataset.path = k;
    b.innerHTML = `${ICONS[k]}<div class="pn"></div><div class="pt"></div><div class="pd"></div>` + ['Dégâts', 'Cadence', 'Zone'].map((s, i) => `<div class="stat"><span>${s}</span><b style="width:${p.stats[i] * 1.2}em"></b></div>`).join('');
    b.querySelector('.pn').textContent = p.name; b.querySelector('.pt').textContent = p.tag; b.querySelector('.pd').textContent = p.desc; b.onclick = () => startRun(k, pickLi, { mode: save.mode, diff: save.diff }); box.appendChild(b); }
  const mp = $('modepick'); mp.innerHTML = '';
  const chip = (label, sel, fn) => { const b = document.createElement('button'); b.className = 'btn chip' + (sel ? ' sel' : ''); b.textContent = label; b.onclick = () => { fn(); persist(); renderPaths(); }; mp.appendChild(b); };
  const lab = t => { const s = document.createElement('span'); s.textContent = t; mp.appendChild(s); };
  lab('Mode :'); chip('Histoire', save.mode !== 'survie', () => save.mode = 'histoire'); chip('Survie', save.mode === 'survie', () => save.mode = 'survie');
  lab('Difficulté :'); DIFF.forEach((d, i) => chip(d.name, save.diff === i, () => save.diff = i));
  const lp = $('lvlpick'); lp.innerHTML = ''; if (save.unlocked > 0 && save.mode !== 'survie') { const s = document.createElement('span'); s.textContent = 'Départ :'; lp.appendChild(s);
    LEVELS.forEach((L, i) => { if (i > save.unlocked) return; const b = document.createElement('button'); b.className = 'btn' + (i === pickLi ? ' sel' : ''); b.textContent = L.name; b.onclick = () => { pickLi = i; renderPaths(); }; lp.appendChild(b); }); }
}
$('bPlay').onclick = () => { music.init(); renderPaths(); show('paths'); };
$('bRecs').onclick = () => { renderRecords(); show('records'); }; $('bBack4').onclick = () => show('title');
$('bHelp').onclick = () => show('help'); $('bOpts').onclick = () => { G.optsBack = 'title'; show('opts'); };
$('bBack1').onclick = $('bBack2').onclick = () => show('title');
$('bBack3').onclick = () => show(G.optsBack === 'pause' ? 'pause' : 'title');
$('bPOpts').onclick = () => { G.optsBack = 'pause'; show('opts'); };
$('bNext').onclick = () => nextFromShop(); $('bResume').onclick = () => resume(); $('bQuit').onclick = $('bQuit2').onclick = () => toTitle();
$('bRetry').onclick = () => G.mode === 'survie' ? startRun(G.path, 0, { mode: 'survie' }) : retryWave(); $('bAgain').onclick = () => toTitle();
$('oVol').value = save.vol; $('oSens').value = save.sens; $('oQual').value = save.qual; $('oAuto').checked = save.auto;
$('oVol').oninput = e => { save.vol = +e.target.value; music.setVolume(save.vol); persist(); };
$('oMVol').value = save.mvol; $('oSVol').value = save.svol;
$('oMVol').oninput = e => { save.mvol = +e.target.value; music.setMusicVolume(save.mvol); persist(); };
$('oSVol').oninput = e => { save.svol = +e.target.value; music.setSfxVolume(save.svol); persist(); music.coin(3); };
$('oSens').oninput = e => { save.sens = +e.target.value; persist(); };
$('oQual').onchange = e => { save.qual = e.target.value; persist(); setupQuality(); };
$('oAuto').onchange = e => { save.auto = e.target.checked; persist(); };
$('oVib').checked = save.vib; $('oVib').onchange = e => { save.vib = e.target.checked; persist(); };
$('oShake').value = String(save.shake); $('oShake').onchange = e => { save.shake = +e.target.value; persist(); };
$('oNums').checked = save.nums; $('oNums').onchange = e => { save.nums = e.target.checked; persist(); };

// ---------- Boucle ----------
const clock = new THREE.Clock(); let frameAvg = 16, slowT = 0;
function updPlayer(dt) {
  const P = G.P, st = G.st; if (!P || P.dead) return;
  // visée souris
  const s = 0.0022 * save.sens; P.yaw -= input.mdx * s; P.pitch = clamp(P.pitch - input.mdy * s, -1.35, 1.35); input.mdx = input.mdy = 0;
  // déplacement
  const k = input.keys; let mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0), mz = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  mx += input.tmx + input.padMx + input.botMx; mz += input.tmz + input.padMz + input.botMz; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const fx_ = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const wx = (fx_ * mz + rx * mx) * st.spd, wz = (fz * mz + rz * mx) * st.spd;
  if (input.dashReq) { input.dashReq = false; if (P.dashN > 0 && P.dashT <= 0) { P.dashN--; P.dashT = 0.2; P.dashStart = G.t; P.perfect = false; const bOn = beatErr() < G.st.beatWin; P.inv = Math.max(P.inv, bOn ? 0.45 : 0.3); if (bOn) { G.beatFlash = 0.25; judge('ESQUIVE SUR LE BEAT', 'cyan'); } const l = Math.hypot(wx, wz); P.dx = l > 0.1 ? wx / l : fx_; P.dz = l > 0.1 ? wz / l : fz; music.dash(); G.fovKick = 1;
    fx.burst(new V3(P.x, 0.8, P.z), [0x2bf0ff, 0xffffff], 18, 4, 0.25, 0.4, 0, 0); } }
  if (P.dashT > 0) { P.dashT -= dt; P.vx = P.dx * 22; P.vz = P.dz * 22; if (Math.random() < 0.8) fx.burst(new V3(P.x, rnd(0.3, 1.5), P.z), [0x2bf0ff, 0xff3fd2], 2, 1, 0.3, 0.35, 0, 0); }
  if (G.st.regen && G.t - (P.lastHit || 0) > 3 && P.hp < P.hpMax) P.hp = Math.min(P.hpMax, P.hp + G.st.regen * dt);
  else { const a = Math.min(1, dt * 12); P.vx += (wx - P.vx) * a; P.vz += (wz - P.vz) * a; }
  if (P.dashN < st.dashMax) { P.dashRe += dt; if (P.dashRe >= st.dashCd) { P.dashN++; P.dashRe = 0; } } else P.dashRe = 0;
  P.x += (P.vx + P.kx) * dt; P.z += (P.vz + P.kz) * dt; const kd = Math.pow(0.003, dt); P.kx *= kd; P.kz *= kd;
  bounds(P, 0.5); obst(P, 0.45); P.inv -= dt; P.bob += Math.hypot(P.vx, P.vz) * dt;
  // aide à la visée (tactile / manette / bot)
  const assist = isTouch || input.usingPad; let target = null;
  if (assist || (isTouch && save.auto)) { const o = eyePos(), d = aimDir(); let bestA = isTouch ? 0.24 : 0.1;
    for (const e of G.enemies) { if (e.dead || e.born < 0.5) continue; const c = eCenter(e).sub(o); const dist = c.length(); if (dist > 40) continue; const a = c.normalize().angleTo(d); if (a < bestA) { bestA = a; target = { e, c, dist }; } }
    if (target && assist) { const ty = Math.atan2(-target.c.x, -target.c.z), tp = Math.asin(clamp(target.c.y, -1, 1)); let dy = Math.atan2(Math.sin(ty - P.yaw), Math.cos(ty - P.yaw)); const firing = input.tfire || input.fire || input.padFire || input.botFire; const f = Math.min(1, dt * (isTouch ? (firing ? 7 : 3.5) : 4)); P.yaw += dy * f; P.pitch += (tp - P.pitch) * f; } }
  onTarget = !!(target && target.c && isTouch);
  // attaques
  P.fireCd -= dt; P.altCd -= dt;
  let wantFire = input.fire || input.tfire || input.padFire || input.botFire;
  if (isTouch && save.auto && target && (G.path !== 'baton' || target.dist < st.range + target.e.T.r + 0.5)) wantFire = true;
  if (wantFire && P.fireCd <= 0) { attack(false); P.fireCd = st.rate; }
  if ((input.altReq || input.botAlt) && P.altCd <= 0) { attack(true); P.altCd = st.altCd; }
  input.altReq = false;
}
function updProjs(dt) {
  const P = G.P;
  for (const p of G.projs) { if (p.dead) continue; p.life -= dt; p.vel.y -= p.grav * dt; p.pos.addScaledVector(p.vel, dt);
    if (p.kind === 'inv' || p.kind === 'tick') { p.m.rotation.y += dt * p.spin; p.m.rotation.x += dt * p.spin * 0.6; } if (p.kind === 'puck') p.m.rotation.y += dt * 20;
    if (p.trail && Math.random() < 0.7) fx.burst(p.pos, [p.trail], 1, 0.5, 0.3, 0.3, 0, 0);
    if (p.owner === 'p') {
      let done = false;
      for (const e of G.enemies) { if (e.dead || e.untouchable || p.hit.has(e)) continue; const c = eCenter(e); if (c.distanceTo(p.pos) < Math.max(e.T.r, e.T.h * 0.45) + p.r) {
        if (p.boom) { explode(p); done = true; break; } p.hit.add(e); dmgEnemy(e, p.dmg, p.on, p.vel.x * 0.3, p.vel.z * 0.3); if (--p.pierce <= 0 || p.pierce === undefined || isNaN(p.pierce)) { done = true; break; } } }
      if (!done && p.boom && (p.pos.y < 0.15 || p.life <= 0)) { explode(p); done = true; }
      if (done || p.life <= 0 || p.pos.y < 0) freeProj(p);
    } else {
      const dx = p.pos.x - P.x, dy = p.pos.y - 1.25, dz = p.pos.z - P.z;
      if (dx * dx + dy * dy + dz * dz < 0.55) { hurt(p.dmg); fx.burst(p.pos, [0xffffff, 0xff3fd2], 12, 4, 0.25, 0.4); freeProj(p); continue; }
      if (p.life <= 0 || p.pos.y < 0.1) { fx.burst(p.pos, [0xffffff], 6, 3, 0.2, 0.3); freeProj(p); }
    } }
  G.projs = G.projs.filter(p => !p.dead);
  for (const s of G.shocks) { s.r += s.spd * dt; const d = Math.hypot(P.x - s.x, P.z - s.z); if (!s.hit && Math.abs(d - s.r) < 0.9) { s.hit = true; hurt(s.dmg); P.kx += (P.x - s.x) / (d || 1) * 10; P.kz += (P.z - s.z) / (d || 1) * 10; } }
  G.shocks = G.shocks.filter(s => s.r < s.max);
}
let hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updHud(bp, sec) {
  const P = G.P; if (!P) return; const st = G.st;
  const hpf = clamp(P.hp / P.hpMax, 0, 1); const w = Math.round(hpf * 100) + '%'; if (hudCache.hpw !== w) { hudCache.hpw = w; $('hpfill').style.width = w; }
  setText('hptxt', Math.ceil(P.hp) + ' / ' + P.hpMax); setText('cash', G.cash + ''); setText('score', 'POINTAGE ' + G.score);
  setText('wavelbl', G.mode === 'survie' ? 'SURVIE · ' + LEVELS[G.li].name.toUpperCase() + ' · VAGUE ' + (G.wi + 1) : LEVELS[G.li].name.toUpperCase() + ' · VAGUE ' + (G.wi + 1) + '/' + LEVELS[G.li].waves.length);
  if (isTouch) { const ac = st.altCd ? clamp(1 - P.altCd / st.altCd, 0, 1) : 1, dc = P.dashN > 0 ? 1 : clamp(P.dashRe / st.dashCd, 0, 1);
    const ak = (ac * 20 | 0) + ':' + (dc * 20 | 0); if (hudCache.tcd !== ak) { hudCache.tcd = ak; $('tAlt').style.setProperty('--cd', ac); $('tAlt').classList.toggle('ready', ac >= 1); $('tDash').style.setProperty('--cd', dc); $('tDash').classList.toggle('ready', dc >= 1); } }
  const dk = P.dashN + '/' + st.dashMax; if (hudCache.dash !== dk) { hudCache.dash = dk; $('dashes').innerHTML = Array.from({ length: st.dashMax }, (_, i) => `<i class="${i < P.dashN ? '' : 'off'}"></i>`).join(''); }
  const af = clamp(1 - P.altCd / st.altCd, 0, 1); $('altfill').style.width = Math.round(af * 100) + '%'; $('altbox').classList.toggle('ready', af >= 1); setText('altname', st.altName + (isTouch ? '' : ' · CLIC DROIT'));
  setText('streak', G.streak >= 2 ? 'SÉRIE BEAT ×' + G.streak : '');
  if (G.boss) { $('bossfill').style.width = clamp(G.boss.hp / G.boss.hpMax, 0, 1) * 100 + '%'; }
  // piste du beat : notes qui glissent vers la cible au centre
  if (!G.notes) { const tr = $('beattrack'); G.notes = []; for (let i = 0; i < 8; i++) { const n = document.createElement('i'); n.className = 'note'; tr.appendChild(n); G.notes.push(n); } G.trackW = 0; }
  if (!G.trackW) G.trackW = $('beattrack').clientWidth / 2;
  { const b0 = Math.floor(bp); for (let k = 0; k < 4; k++) { const i = b0 + 1 + k, d = i - bp, x = d / 4 * G.trackW, down = ((i % 4) + 4) % 4 === 0, op = Math.max(0, 1 - d / 4.2);
      for (const sd of [0, 1]) { const n = G.notes[k * 2 + sd]; n.style.transform = `translateX(${(sd ? x : -x).toFixed(1)}px) scaleY(${down ? 1.5 : 1})`; n.style.opacity = op.toFixed(2); n.style.background = sec && (sec.name === 'drop' || sec.name === 'boss') ? '#ff3fd2' : '#2bf0ff'; } }
    $('beattarget').style.transform = `translate(-50%,-50%) scale(${(1 + Math.max(0, 1 - (bp - b0) * 4) * 0.35).toFixed(2)})`; }
  // indicateur de beat : barres qui convergent vers le viseur
  const f = bp - Math.floor(bp); const d1 = (1 - f) * 64 + 12, d2 = d1 + 64; const dropC = sec && (sec.name === 'drop' || sec.name === 'boss') ? '#ff3fd2' : '#2bf0ff';
  const set = (id, x, o) => { const e = $(id); e.style.transform = `translateX(${x - 2}px)`; e.style.opacity = o; e.style.background = dropC; e.style.boxShadow = '0 0 8px ' + dropC; };
  set('beatL', -d1, 1 - f * 0.3); set('beatR', d1, 1 - f * 0.3); set('beatL2', -d2, 0.35); set('beatR2', d2, 0.35);
  $('beatC').style.opacity = Math.max(0, 1 - f * 5) * 0.9 + (G.beatFlash > 0 ? 0.6 : 0); $('beatC').style.transform = `scale(${1 + f * 0.6})`;
  $('hurt').style.opacity = clamp(G.hurtT || 0, 0, 0.8) + (hpf < 0.3 ? 0.25 + 0.15 * Math.sin(G.t * 6) : 0);
}
function frame() {
  requestAnimationFrame(frame);
  let rdt = Math.min(clock.getDelta(), 0.1); frameAvg += (rdt * 1000 - frameAvg) * 0.05;
  let dt = Math.min(rdt, 0.05); if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.15; } if (G.slowmo > 0) { G.slowmo -= rdt; dt *= 0.35; }
  G.t += dt; music.setIntensity(G.state === 'play' && G.wave && !G.wave.done ? Math.min(1, G.enemies.length / Math.max(6, (G.cap || 12) * 0.7)) + (G.boss ? 0.35 : 0) : 0); music.schedule(); pollPad(rdt);
  const ct = music.clock(); const bp = music.beatPos(ct); const sec = music.sectionAt(ct);
  const bi = Math.floor(bp); if (bi !== G.lastBeat) { if (G.lastBeat >= 0 && bi - G.lastBeat < 4) for (let b = G.lastBeat + 1; b <= bi; b++) onBeat(b, sec); else onBeat(bi, sec); G.lastBeat = bi; }
  if (sec.t !== G.secT) { G.secT = sec.t; onSection(sec); }
  const kickSec = sec.name === 'drop' || sec.name === 'boss' || (sec.name === 'build');
  G.pulse = Math.exp(-(bp - Math.floor(bp)) * 6) * (kickSec ? 1 : 0.35);
  for (const t of G.timers) { t.t -= rdt; } const due = G.timers.filter(t => t.t <= 0); G.timers = G.timers.filter(t => t.t > 0); due.forEach(t => t.fn());
  if (G.bannerT > 0) { G.bannerT -= rdt; if (G.bannerT <= 0) $('banner').classList.remove('on'); }
  if (G.toastT > 0) { G.toastT -= rdt; if (G.toastT <= 0) $('toast').classList.remove('on'); }
  if (G.crossT > 0) { G.crossT -= rdt; if (G.crossT <= 0) $('cross').classList.remove('hit'); }
  if (G.judgeT > 0) { G.judgeT -= rdt; if (G.judgeT <= 0) $('judge').className = ''; }
  if (G.hitT > 0) { G.hitT -= rdt; if (G.hitT <= 0) $('hitmark').className = ''; }
  G.beatFlash = (G.beatFlash || 0) - rdt; G.hurtT = Math.max(0, (G.hurtT || 0) - rdt * 1.5);
  updRadio(rdt);
  if (window.__bot && G.P) window.__bot(API, dt);
  if (G.state === 'play' && G.P) {
    updPlayer(dt); for (const e of G.enemies) if (!e.dead) updEnemy(e, dt); G.enemies = G.enemies.filter(e => !e.dead); updProjs(dt); checkWave();
    fx.update(dt, G.P, G.magnetAll > 0 ? 999 : G.st.magnet, (v, c) => { G.cash += v; music.coin(G.coinN = (G.coinN || 0) + 1); });
    G.magnetAll -= dt;
    // caméra
    const P = G.P; G.shake = Math.max(0, G.shake - dt * 2.2); const sh = G.shake * G.shake * 0.12 * save.shake;
    camera.position.set(P.x + rnd(-sh, sh), 1.62 + Math.sin(P.bob * 1.6) * 0.04 + rnd(-sh, sh), P.z + rnd(-sh, sh)); camera.rotation.set(P.pitch, P.yaw, 0);
    G.fovKick = Math.max(0, (G.fovKick || 0) - dt * 4); const fov = 75 + G.fovKick * 9; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
    // arme en main
    const g = vm.userData.g; G.swing = Math.max(0, (G.swing || 0) - dt * 5); G.recoil = Math.max(0, (G.recoil || 0) - dt * 8);
    if (g) { const sw = G.swing; vm.position.set(0.34 + Math.sin(P.bob * 0.8) * 0.015, -0.33 + Math.abs(Math.cos(P.bob * 0.8)) * 0.015 - G.recoil * 0.02, -0.62 + G.recoil * 0.06);
      if (G.path === 'baton') { vm.rotation.set(-sw * 0.6, sw > 0 ? (sw - 0.5) * 2.4 : 0, sw * 0.8); } else vm.rotation.set(G.recoil * 0.15, 0, 0);
      const ud = vm.userData; if (ud.orb) { ud.orb.rotation.y += dt * 2; ud.orb.scale.setScalar(1 + G.pulse * 0.15 + G.recoil * 0.2); ud.orb.children.forEach(c => { if (c.userData.moon !== undefined) { const a = G.t * 4 + c.userData.moon * 2.1; c.position.set(Math.cos(a) * 0.12, Math.sin(a * 1.3) * 0.05, Math.sin(a) * 0.12); } }); }
      if (ud.mflash) { G.mflashT = (G.mflashT || 0) - dt; ud.mflash.visible = G.mflashT > 0; if (ud.mflash.visible) { ud.mflash.material.rotation = Math.random() * 6; ud.mflash.scale.setScalar(0.16 + Math.random() * 0.14); } }
      if (ud.trail) ud.trail.material.opacity = Math.max(0, sw - 0.2) * 1.2;
      if (ud.pulseMats) ud.pulseMats.forEach(m => m.color.copy(m.userData.base).multiplyScalar(0.55 + G.pulse * 0.6 + (G.beatFlash > 0 ? 0.5 : 0))); }
    vmGlow.forEach(r => { if (r.userData.spin) { r.rotation.x += dt * r.userData.spin; r.rotation.y += dt * r.userData.spin * 0.7; } });
    updHud(bp, sec);
    // auto-ajustement de la qualité
    if (save.qual === 'high' && !G.bot) { if (frameAvg > 42) slowT += rdt; else slowT = Math.max(0, slowT - rdt); if (slowT > 5) { save.qual = 'low'; persist(); setupQuality(); $('oQual').value = 'low'; toast('Effets réduits pour garder le jeu fluide'); slowT = 0; } }
  } else if (G.state === 'title' || !G.P) {
    const a = G.t * 0.06; camera.position.set(Math.sin(a) * 15, 4 + Math.sin(G.t * 0.3), Math.cos(a) * 15 + 2); camera.lookAt(0, 5, -40); fx.update(dt, { x: 999, z: 999 }, 0, () => {});
    if (Math.random() < dt * 2) fx.burst(new V3(rnd(-14, 14), rnd(2, 8), rnd(-20, 6)), [pick([0xff3fd2, 0x2bf0ff, 0xffd23a, 0x8dff3a]), 0xffffff], 40, 8, 0.4, 1, 3, 1);
  } else { fx.update(dt * 0.5, G.P, 0, () => {}); }
  if (G.level) G.level.update(G.t, G.pulse, camera.position, dt);
  if (bloom) bloom.strength = 0.55 + G.pulse * 0.2;
  vm.visible = !!G.P && G.state !== 'title';
  updFloats(rdt);
  if (composer) composer.render(); else renderer.render(scene, camera);
}

// ---------- Point d'entrée de test ----------
const API = { G, input, DIFF, waveDef, music, LEVELS, TYPES, UPG, startRun, buy, nextFromShop, retryWave, startWave, spawn, toTitle, costOf, stats: () => G.st, camera, fx, get frameAvg() { return frameAvg; } };
window.__game = API;
if (Q.has('bot')) G.bot = true;
loadLevel(0); show('title'); radio(LINES.title, 99); $('radio').classList.add('hidden');
requestAnimationFrame(frame);
