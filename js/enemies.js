// Ennemis : caricatures fictives faites de primitives néon.
import * as THREE from 'three';

export const TYPES = {
  cone:      { name: 'Cône-golem', hp: 30, speed: 4.3, dmg: 8, cash: 3, r: 0.55, h: 1.6, score: 100, colors: [0xff7a1a, 0xffffff, 0xffd23a], quips: ['CÔNE-FISQUÉ!', 'DÉTOUR TERMINÉ!', 'POUF!', 'CHANTIER FERMÉ!'] },
  bur:       { name: 'Bureaucrate zombie', hp: 62, speed: 2.9, dmg: 12, cash: 5, r: 0.6, h: 1.9, score: 160, colors: [0x7dff6a, 0xffffff, 0xb6ff3a], quips: ['FORMULAIRE REFUSÉ!', 'REVENEZ LUNDI!', 'DOSSIER CLASSÉ!', 'EN TROIS COPIES!'] },
  cons:      { name: 'Consultant', hp: 46, speed: 3.6, dmg: 10, cash: 7, r: 0.55, h: 1.9, score: 200, colors: [0xff3fd2, 0x5ff6ff, 0xffffff], quips: ['FACTURE ANNULÉE!', 'RAPPORT DÉCHIQUETÉ!', 'HONORAIRES ZÉRO!'], ranged: true },
  plow:      { name: 'Déneigeuse-bot', hp: 95, speed: 3.0, dmg: 20, cash: 9, r: 1.1, h: 1.7, score: 260, colors: [0xffd23a, 0xff7a1a, 0xffffff], quips: ['DÉNEIGÉ!', 'TOURNÉE ANNULÉE!', 'TABARNOUCHE!'] },
  drone:     { name: 'Drone de tram', hp: 26, speed: 6.2, dmg: 9, cash: 6, r: 0.6, h: 0.6, score: 180, colors: [0x2bf0ff, 0x4f6bff, 0xffffff], quips: ['HORS SERVICE!', 'TERMINUS!', 'CORRESPONDANCE MANQUÉE!'], fly: true },
  grandcone: { name: 'LE GRAND CÔNE', hp: 1300, speed: 2.8, dmg: 22, cash: 80, r: 1.9, h: 5.6, score: 5000, colors: [0xff7a1a, 0xffffff, 0xffd23a], quips: ['LE CHANTIER EST FINI!'], boss: true },
  mere:      { name: 'LA DÉNEIGEUSE-MÈRE', hp: 2100, speed: 3.0, dmg: 28, cash: 110, r: 2.6, h: 4, score: 8000, colors: [0xffd23a, 0xff7a1a, 0xff3fd2], quips: ['PRINTEMPS DÉCLARÉ!'], boss: true },
  tram:      { name: 'TRAM-O-TRON 3000', hp: 3400, speed: 2.6, dmg: 30, cash: 200, r: 2.8, h: 6, score: 15000, colors: [0x2bf0ff, 0xff3fd2, 0xffffff], quips: ['PROJET ANNULÉ!'], boss: true, fly: false },
};

const G = {}; // géométries partagées
function geo() {
  if (G.ok) return G; G.ok = true;
  G.cone = new THREE.ConeGeometry(0.5, 1.1, 10); G.coneB = new THREE.CylinderGeometry(0.62, 0.62, 0.14, 4);
  G.band = new THREE.CylinderGeometry(0.33, 0.39, 0.12, 10, 1, true);
  G.eye = new THREE.SphereGeometry(0.07, 6, 4); G.box = new THREE.BoxGeometry(1, 1, 1); G.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  G.ring = new THREE.RingGeometry(0.75, 1, 24); G.ring.rotateX(-Math.PI / 2);
  G.plane = new THREE.PlaneGeometry(1, 1); G.sph = new THREE.SphereGeometry(0.5, 10, 8);
  return G;
}
const basic = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.8) });
const lam = (c, e = 0.25) => new THREE.MeshLambertMaterial({ color: new THREE.Color(c).multiplyScalar(0.7), emissive: new THREE.Color(c).multiplyScalar(e * 0.55) });

function m(g, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent) { const o = new THREE.Mesh(g, mat); o.position.set(x, y, z); o.scale.set(sx, sy, sz); parent.add(o); return o; }

export function makeEnemy(type) {
  const g = geo(); const T = TYPES[type]; const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const flash = []; const parts = {};
  const L = (c, e) => { const mt = lam(c, e); flash.push(mt); return mt; };
  const eyeM = basic(0xffffff);
  if (type === 'cone' || type === 'grandcone') {
    const s = type === 'grandcone' ? 3.4 : 1; body.scale.setScalar(s);
    const orange = L(0xff6a10, 0.45), white = basic(0xffffff);
    m(g.coneB, L(0x331100, 0.2), 0, 0.07, 0, 1, 1, 1, body);
    m(g.cone, orange, 0, 0.62, 0, 1, 1, 1, body); m(g.band, white, 0, 0.55, 0, 1, 1, 1, body); m(g.band, white, 0, 0.8, 0, 0.62, 1, 0.62, body);
    m(g.eye, basic(0x111111), -0.12, 0.98, 0.2, 1, 1, 1, body); m(g.eye, basic(0x111111), 0.12, 0.98, 0.2, 1, 1, 1, body);
    m(g.eye, eyeM, -0.12, 0.98, 0.25, 0.5, 0.5, 0.5, body); m(g.eye, eyeM, 0.12, 0.98, 0.25, 0.5, 0.5, 0.5, body);
    // petits bras
    parts.arms = [m(g.box, orange, -0.42, 0.7, 0, 0.32, 0.1, 0.1, body), m(g.box, orange, 0.42, 0.7, 0, 0.32, 0.1, 0.1, body)];
    if (type === 'grandcone') { m(g.box, basic(0xffd23a), 0, 1.25, 0, 0.5, 0.12, 0.08, body); }
  } else if (type === 'bur') {
    const suit = L(0x3c5a3a, 0.35), skin = L(0x9fe08a, 0.4);
    parts.legs = [m(g.box, L(0x1c2a1c, 0.3), -0.16, 0.42, 0, 0.22, 0.84, 0.24, body), m(g.box, L(0x1c2a1c, 0.3), 0.16, 0.42, 0, 0.22, 0.84, 0.24, body)];
    m(g.box, suit, 0, 1.18, 0, 0.66, 0.74, 0.36, body); m(g.box, skin, 0, 1.75, 0, 0.42, 0.42, 0.4, body);
    m(g.box, basic(0xff3333), 0, 1.15, 0.19, 0.08, 0.4, 0.02, body); // cravate
    m(g.box, basic(0xb6ff3a), -0.1, 1.8, 0.21, 0.08, 0.05, 0.02, body); m(g.box, basic(0xb6ff3a), 0.1, 1.8, 0.21, 0.08, 0.05, 0.02, body);
    parts.arms = [m(g.box, suit, -0.4, 1.35, 0.3, 0.14, 0.14, 0.7, body), m(g.box, suit, 0.4, 1.35, 0.3, 0.14, 0.14, 0.7, body)];
    const form = m(g.plane, basic(0xf4fff0), 0, 1.4, 0.72, 0.45, 0.6, 1, body); form.rotation.x = -0.5;
    m(g.box, basic(0x7dff6a), 0, 1.52, 0.68, 0.32, 0.03, 0.01, body);
  } else if (type === 'cons') {
    const suit = L(0x1a1a4a, 0.4), skin = L(0xffc9a8, 0.35);
    parts.legs = [m(g.box, L(0x101030, 0.3), -0.15, 0.42, 0, 0.2, 0.84, 0.22, body), m(g.box, L(0x101030, 0.3), 0.15, 0.42, 0, 0.2, 0.84, 0.22, body)];
    m(g.box, suit, 0, 1.2, 0, 0.62, 0.74, 0.32, body); m(g.box, skin, 0, 1.76, 0, 0.38, 0.4, 0.38, body);
    m(g.box, L(0x222222, 0.1), 0, 1.98, 0, 0.42, 0.08, 0.42, body); // coiffure lissée
    m(g.box, basic(0xff3fd2), 0, 1.15, 0.17, 0.09, 0.45, 0.02, body); // cravate néon
    m(g.box, basic(0x5ff6ff), 0, 1.76, 0.2, 0.36, 0.08, 0.02, body); // lunettes d'expert
    parts.arms = [m(g.box, suit, -0.38, 1.2, 0, 0.13, 0.65, 0.13, body), m(g.box, suit, 0.38, 1.25, 0.15, 0.13, 0.13, 0.6, body)];
    m(g.box, L(0x5a3a1a, 0.3), -0.42, 0.75, 0, 0.12, 0.35, 0.45, body); // mallette
  } else if (type === 'plow' || type === 'mere') {
    const s = type === 'mere' ? 2.4 : 1; body.scale.setScalar(s);
    const yel = L(0xffb81a, 0.4), blade = L(0xdddddd, 0.3);
    m(g.box, yel, 0, 0.75, -0.1, 1.3, 0.9, 1.6, body); m(g.box, L(0x2a2a2a, 0.2), 0, 1.4, -0.35, 1, 0.6, 0.8, body);
    m(g.box, basic(0x5ff6ff), 0, 1.45, 0.06, 0.9, 0.3, 0.02, body); // pare-brise
    const bl = m(g.box, blade, 0, 0.45, 0.95, 2.1, 0.7, 0.12, body); bl.rotation.x = -0.3;
    m(g.box, basic(0xff7a1a), -0.6, 0.35, 1.02, 0.25, 0.08, 0.02, body); m(g.box, basic(0xff7a1a), 0.6, 0.35, 1.02, 0.25, 0.08, 0.02, body);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.4], [0.6, 0.4]]) { const w = m(g.cyl, L(0x111111, 0.1), x, 0.3, z, 0.55, 0.3, 0.55, body); w.rotation.z = Math.PI / 2; }
    parts.beacon = m(g.sph, basic(0xff7a1a), 0, 1.82, -0.35, 0.3, 0.3, 0.3, body);
    if (type === 'mere') { m(g.box, basic(0xff3fd2), 0, 1.0, 0.72, 1.2, 0.12, 0.02, body); }
  } else if (type === 'drone') {
    const blue = L(0x2bb8ff, 0.5), wh = L(0xeaf6ff, 0.35);
    m(g.box, wh, 0, 0, 0, 0.5, 0.32, 1.0, body); m(g.box, blue, 0, -0.12, 0, 0.52, 0.1, 1.02, body);
    m(g.box, basic(0x5ff6ff), 0, 0.04, 0.51, 0.4, 0.14, 0.02, body); m(g.box, basic(0xff3fd2), 0.26, 0.04, 0, 0.02, 0.1, 0.8, body); m(g.box, basic(0xff3fd2), -0.26, 0.04, 0, 0.02, 0.1, 0.8, body);
    const pan = m(g.box, basic(0x2bf0ff), 0, 0.32, 0, 0.04, 0.3, 0.04, body); pan.rotation.z = 0.5;
    parts.rotors = [-0.42, 0.42].map(z => m(g.box, basic(0x2bf0ff), 0, 0.2, z, 0.9, 0.02, 0.08, body));
  } else if (type === 'tram') {
    body.scale.setScalar(2.6);
    const wh = L(0xeaf6ff, 0.35), blue = L(0x2b6bff, 0.5);
    m(g.box, wh, 0, 1.3, 0, 1.3, 1.0, 2.4, body); m(g.box, blue, 0, 0.88, 0, 1.32, 0.18, 2.42, body);
    m(g.box, basic(0x5ff6ff), 0, 1.5, 1.21, 1.0, 0.4, 0.02, body);
    m(g.box, basic(0xff3fd2), 0.66, 1.5, 0, 0.02, 0.3, 2, body); m(g.box, basic(0xff3fd2), -0.66, 1.5, 0, 0.02, 0.3, 2, body);
    const sign = m(g.box, basic(0xffd23a), 0, 1.92, 1.1, 0.8, 0.14, 0.04, body);
    const pan = m(g.box, basic(0x2bf0ff), 0, 2.05, 0, 0.04, 0.5, 0.04, body); pan.rotation.z = 0.6;
    parts.legs = [-0.45, 0.45].map(x => m(g.box, L(0x333355, 0.3), x, 0.4, 0, 0.22, 0.8, 0.3, body));
    parts.arms = [-0.8, 0.8].map(x => m(g.box, wh, x, 1.3, 0.4, 0.2, 0.2, 1.0, body));
    m(g.eye, basic(0xff3fd2), -0.3, 1.52, 1.23, 1.4, 1.4, 1, body); m(g.eye, basic(0xff3fd2), 0.3, 1.52, 1.23, 1.4, 1.4, 1, body);
  }
  // anneau lumineux au sol (lisibilité)
  const ringM = new THREE.MeshBasicMaterial({ color: T.colors[0], transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(g.ring, ringM); ring.scale.setScalar(T.r * 1.15); ring.position.y = 0.03; root.add(ring);
  const base = flash.map(mt => mt.emissive.clone());
  return { root, body, parts, flash, base, ring };
}
