// Ennemis : caricatures fictives faites de primitives néon, avec animations.
import * as THREE from 'three';

export const TYPES = {
  cone:      { name: 'Cône-golem', hp: 30, speed: 4.3, dmg: 8, cash: 3, r: 0.55, h: 1.6, score: 100, colors: [0xff7a1a, 0xffffff, 0xffd23a], quips: ['CÔNE-FISQUÉ!', 'DÉTOUR TERMINÉ!', 'POUF!', 'CHANTIER FERMÉ!'] },
  bur:       { name: 'Bureaucrate zombie', hp: 62, speed: 2.9, dmg: 12, cash: 5, r: 0.6, h: 1.9, score: 160, colors: [0x7dff6a, 0xffffff, 0xb6ff3a], quips: ['FORMULAIRE REFUSÉ!', 'REVENEZ LUNDI!', 'DOSSIER CLASSÉ!', 'EN TROIS COPIES!'] },
  cons:      { name: 'Consultant', hp: 46, speed: 3.6, dmg: 10, cash: 7, r: 0.55, h: 1.9, score: 200, colors: [0xff3fd2, 0x5ff6ff, 0xffffff], quips: ['FACTURE ANNULÉE!', 'RAPPORT DÉCHIQUETÉ!', 'HONORAIRES ZÉRO!'], ranged: true },
  plow:      { name: 'Déneigeuse-bot', hp: 95, speed: 3.0, dmg: 20, cash: 9, r: 1.1, h: 1.7, score: 260, colors: [0xffd23a, 0xff7a1a, 0xffffff], quips: ['DÉNEIGÉ!', 'TOURNÉE ANNULÉE!', 'TABARNOUCHE!'] },
  drone:     { name: 'Drone de tram', hp: 26, speed: 6.2, dmg: 9, cash: 6, r: 0.6, h: 0.6, score: 180, colors: [0x2bf0ff, 0x4f6bff, 0xffffff], quips: ['HORS SERVICE!', 'TERMINUS!', 'CORRESPONDANCE MANQUÉE!'], fly: true },
  parco:     { name: 'Parcomètre enragé', hp: 70, speed: 2.2, dmg: 10, cash: 8, r: 0.5, h: 1.7, score: 220, colors: [0x9dff3a, 0xffd23a, 0xffffff], quips: ['STATIONNEMENT GRATUIT!', 'MONNAIE RENDUE!', 'CONTRAVENTION ANNULÉE!'], ranged: true },
  pigeon:    { name: 'Pigeon néon', hp: 12, speed: 7.5, dmg: 5, cash: 2, r: 0.4, h: 0.4, score: 80, colors: [0xa46bff, 0x2bf0ff, 0xffffff], quips: ['ROUCOULE!', 'PLUS DE MIETTES!', 'COUAC!'], fly: true },
  grandcone: { name: 'LE GRAND CÔNE', hp: 1300, speed: 2.8, dmg: 22, cash: 80, r: 1.9, h: 5.6, score: 5000, colors: [0xff7a1a, 0xffffff, 0xffd23a], quips: ['LE CHANTIER EST FINI!'], boss: true },
  mere:      { name: 'LA DÉNEIGEUSE-MÈRE', hp: 2100, speed: 3.0, dmg: 28, cash: 110, r: 2.6, h: 4, score: 8000, colors: [0xffd23a, 0xff7a1a, 0xff3fd2], quips: ['PRINTEMPS DÉCLARÉ!'], boss: true },
  nid:       { name: 'LE NID-DE-POULE ROYAL', hp: 2600, speed: 3.4, dmg: 26, cash: 150, r: 2.8, h: 2.4, score: 11000, colors: [0xff7a1a, 0x9dff3a, 0x333333], quips: ['RUE ASPHALTÉE!'], boss: true },
  tram:      { name: 'TRAM-O-TRON 3000', hp: 3400, speed: 2.6, dmg: 30, cash: 200, r: 2.8, h: 6, score: 15000, colors: [0x2bf0ff, 0xff3fd2, 0xffffff], quips: ['PROJET ANNULÉ!'], boss: true, fly: false },
};

const G = {};
function geo() {
  if (G.ok) return G; G.ok = true;
  G.cone = new THREE.ConeGeometry(0.5, 1.1, 12); G.coneB = new THREE.BoxGeometry(1.15, 0.14, 1.15);
  G.band = new THREE.CylinderGeometry(0.33, 0.39, 0.12, 12, 1, true);
  G.eye = new THREE.SphereGeometry(0.07, 8, 6); G.box = new THREE.BoxGeometry(1, 1, 1); G.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
  G.ring = new THREE.RingGeometry(0.75, 1, 24); G.ring.rotateX(-Math.PI / 2);
  G.plane = new THREE.PlaneGeometry(1, 1); G.sph = new THREE.SphereGeometry(0.5, 12, 8); G.tor = new THREE.TorusGeometry(0.5, 0.12, 6, 16);
  for (const k in G) if (G[k] && G[k].userData) G[k].userData.shared = true;
  return G;
}
const basic = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.8) });
const lam = (c, e = 0.25) => new THREE.MeshLambertMaterial({ color: new THREE.Color(c).multiplyScalar(0.7), emissive: new THREE.Color(c).multiplyScalar(e * 0.55) });
function m(g, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent) { const o = new THREE.Mesh(g, mat); o.position.set(x, y, z); o.scale.set(sx, sy, sz); parent.add(o); return o; }
// membre avec pivot à l'articulation
function limb(parent, g, mat, x, y, z, sx, sy, sz) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); m(g, mat, 0, -sy / 2, 0, sx, sy, sz, p); return p; }

export function makeEnemy(type) {
  const g = geo(); const T = TYPES[type]; const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const flash = []; const parts = {};
  const L = (c, e) => { const mt = lam(c, e); flash.push(mt); return mt; };
  const eyeM = basic(0xffffff), dark = basic(0x111111);
  if (type === 'cone' || type === 'grandcone') {
    const s = type === 'grandcone' ? 3.4 : 1; body.scale.setScalar(s);
    const orange = L(0xff6a10, type === 'grandcone' ? 1.1 : 0.7), white = basic(0xffffff);
    m(g.coneB, L(0x331100, 0.2), 0, 0.07, 0, 1, 1, 1, body);
    const top = new THREE.Group(); body.add(top); parts.top = top;
    m(g.cone, orange, 0, 0.62, 0, 1, 1, 1, top); m(g.band, white, 0, 0.55, 0, 1, 1, 1, top); m(g.band, white, 0, 0.8, 0, 0.62, 1, 0.62, top);
    parts.eyes = [m(g.eye, eyeM, -0.12, 0.98, 0.2, 1.2, 1.2, 1, top), m(g.eye, eyeM, 0.12, 0.98, 0.2, 1.2, 1.2, 1, top)];
    m(g.eye, dark, -0.12, 0.98, 0.27, 0.55, 0.55, 0.5, top); m(g.eye, dark, 0.12, 0.98, 0.27, 0.55, 0.55, 0.5, top);
    m(g.box, dark, 0, 0.82, 0.31, 0.16, 0.03, 0.02, top); // bouche fâchée
    parts.arms = [limb(top, g.box, orange, -0.36, 0.72, 0, 0.1, 0.38, 0.1), limb(top, g.box, orange, 0.36, 0.72, 0, 0.1, 0.38, 0.1)];
    parts.arms.forEach((a, i) => a.rotation.z = i ? 1.1 : -1.1);
    if (type === 'grandcone') { m(g.cyl, basic(0xffd23a), 0, 1.2, 0, 0.55, 0.12, 0.55, top); m(g.sph, basic(0xffd23a), 0, 1.24, 0, 0.42, 0.25, 0.42, top); } // casque de chantier
  } else if (type === 'bur') {
    const suit = L(0x3c5a3a, 0.35), skin = L(0x9fe08a, 0.45), pants = L(0x1c2a1c, 0.3);
    parts.legs = [limb(body, g.box, pants, -0.16, 0.86, 0, 0.22, 0.84, 0.24), limb(body, g.box, pants, 0.16, 0.86, 0, 0.22, 0.84, 0.24)];
    const torso = new THREE.Group(); torso.position.y = 0.86; body.add(torso); parts.torso = torso;
    m(g.box, suit, 0, 0.36, 0, 0.66, 0.74, 0.36, torso); m(g.box, basic(0xe8f0e0), 0, 0.5, 0.17, 0.2, 0.4, 0.02, torso);
    parts.tie = m(g.box, basic(0xff3333), 0, 0.36, 0.19, 0.08, 0.4, 0.02, torso);
    const head = new THREE.Group(); head.position.set(0, 0.78, 0); torso.add(head); parts.head = head;
    m(g.box, skin, 0, 0.18, 0, 0.42, 0.42, 0.4, head); m(g.box, L(0x2a3a2a, 0.2), 0, 0.42, -0.04, 0.44, 0.08, 0.42, head);
    m(g.box, basic(0x111111), 0, 0.2, 0.21, 0.36, 0.1, 0.02, head); parts.eyes = [m(g.box, basic(0xb6ff3a), -0.1, 0.2, 0.22, 0.08, 0.05, 0.02, head), m(g.box, basic(0xb6ff3a), 0.1, 0.2, 0.22, 0.08, 0.05, 0.02, head)];
    m(g.box, basic(0x223322), 0, 0.04, 0.21, 0.18, 0.04, 0.02, head);
    parts.arms = [limb(torso, g.box, suit, -0.4, 0.66, 0, 0.14, 0.66, 0.14), limb(torso, g.box, suit, 0.4, 0.66, 0, 0.14, 0.66, 0.14)];
    parts.arms.forEach(a => a.rotation.x = -1.35);
    const clip = new THREE.Group(); clip.position.set(0, -0.62, 0.05); parts.arms[1].add(clip); parts.form = clip;
    m(g.box, L(0x6a4a2a, 0.3), 0, 0, 0, 0.36, 0.02, 0.48, clip); const f = m(g.plane, basic(0xf4fff0), 0, 0.02, 0, 0.32, 0.42, 1, clip); f.rotation.x = -Math.PI / 2;
    m(g.box, basic(0x7dff6a), 0, 0.03, -0.1, 0.24, 0.005, 0.03, clip); m(g.box, basic(0x7dff6a), 0, 0.03, 0.02, 0.18, 0.005, 0.03, clip);
  } else if (type === 'cons') {
    const suit = L(0x1a1a4a, 0.4), skin = L(0xffc9a8, 0.35), pants = L(0x101030, 0.3);
    parts.legs = [limb(body, g.box, pants, -0.15, 0.86, 0, 0.2, 0.84, 0.22), limb(body, g.box, pants, 0.15, 0.86, 0, 0.2, 0.84, 0.22)];
    const torso = new THREE.Group(); torso.position.y = 0.86; body.add(torso); parts.torso = torso;
    m(g.box, suit, 0, 0.36, 0, 0.62, 0.74, 0.32, torso); m(g.box, basic(0xffffff), 0, 0.5, 0.165, 0.18, 0.4, 0.02, torso);
    parts.tie = m(g.box, basic(0xff3fd2), 0, 0.32, 0.18, 0.09, 0.45, 0.02, torso);
    const head = new THREE.Group(); head.position.set(0, 0.76, 0); torso.add(head); parts.head = head;
    m(g.box, skin, 0, 0.18, 0, 0.38, 0.4, 0.38, head); m(g.box, L(0x222222, 0.1), 0, 0.4, -0.03, 0.42, 0.1, 0.44, head); m(g.box, L(0x222222, 0.1), 0.12, 0.42, 0.1, 0.2, 0.08, 0.2, head);
    parts.eyes = [m(g.box, basic(0x5ff6ff), 0, 0.2, 0.2, 0.36, 0.08, 0.02, head)];
    m(g.box, basic(0xffffff), 0, 0.05, 0.195, 0.16, 0.04, 0.01, head); // sourire de vendeur
    parts.arms = [limb(torso, g.box, suit, -0.38, 0.66, 0, 0.13, 0.62, 0.13), limb(torso, g.box, suit, 0.38, 0.66, 0, 0.13, 0.62, 0.13)];
    const brief = new THREE.Group(); brief.position.set(0, -0.66, 0); parts.arms[0].add(brief); parts.brief = brief;
    m(g.box, L(0x5a3a1a, 0.35), 0, -0.15, 0, 0.12, 0.32, 0.46, brief); m(g.box, basic(0xffd23a), 0, 0.03, 0, 0.04, 0.05, 0.16, brief);
    const inv = m(g.plane, basic(0xffffff), 0, -0.7, 0.06, 0.26, 0.18, 1, parts.arms[1]); inv.rotation.x = -0.4; parts.inv = inv;
  } else if (type === 'plow' || type === 'mere') {
    const s = type === 'mere' ? 2.4 : 1; body.scale.setScalar(s);
    const yel = L(0xffb81a, 0.45), blade = L(0xdddddd, 0.3);
    const chassis = new THREE.Group(); body.add(chassis); parts.chassis = chassis;
    m(g.box, yel, 0, 0.75, -0.1, 1.3, 0.9, 1.6, chassis); m(g.box, L(0x2a2a2a, 0.2), 0, 1.4, -0.35, 1, 0.6, 0.8, chassis);
    m(g.box, basic(0x5ff6ff), 0, 1.45, 0.06, 0.9, 0.3, 0.02, chassis); m(g.box, basic(0x111111), 0, 0.75, 0.71, 1.1, 0.12, 0.02, chassis);
    m(g.box, basic(0x111111), -0.25, 1.0, 0.71, 0.3, 0.06, 0.02, chassis); m(g.box, basic(0x111111), 0.25, 1.0, 0.71, 0.3, 0.06, 0.02, chassis);
    parts.eyes = [m(g.box, basic(0xffffff), -0.35, 0.95, 0.72, 0.22, 0.12, 0.02, chassis), m(g.box, basic(0xffffff), 0.35, 0.95, 0.72, 0.22, 0.12, 0.02, chassis)];
    m(g.cyl, L(0x333333, 0.1), 0.5, 1.75, -0.7, 0.1, 0.6, 0.1, chassis); // échappement
    const bladeG = new THREE.Group(); bladeG.position.set(0, 0.45, 0.95); body.add(bladeG); parts.blade = bladeG;
    const bl = m(g.box, blade, 0, 0, 0, 2.1, 0.7, 0.12, bladeG); bl.rotation.x = -0.3;
    m(g.box, basic(0xff7a1a), -0.6, -0.1, 0.07, 0.25, 0.08, 0.02, bladeG); m(g.box, basic(0xff7a1a), 0.6, -0.1, 0.07, 0.25, 0.08, 0.02, bladeG);
    parts.wheels = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.4], [0.6, 0.4]].map(([x, z]) => { const w = new THREE.Group(); w.position.set(x, 0.3, z); body.add(w); const t = m(g.cyl, L(0x111111, 0.1), 0, 0, 0, 0.55, 0.3, 0.55, w); t.rotation.z = Math.PI / 2; m(g.box, basic(0xffd23a), 0, 0, 0, 0.32, 0.5, 0.06, w); return w; });
    parts.beacon = m(g.sph, basic(0xff7a1a), 0, 1.82, -0.35, 0.3, 0.3, 0.3, chassis);
    if (type === 'mere') { m(g.box, basic(0xff3fd2), 0, 1.0, 0.72, 1.2, 0.12, 0.02, chassis); m(g.box, basic(0xff3fd2), 0, 2.0, -0.35, 1.1, 0.08, 0.9, chassis); }
  } else if (type === 'drone') {
    const blue = L(0x2bb8ff, 0.5), wh = L(0xeaf6ff, 0.35);
    m(g.box, wh, 0, 0, 0, 0.5, 0.32, 1.0, body); m(g.box, blue, 0, -0.12, 0, 0.52, 0.1, 1.02, body);
    for (let i = 0; i < 3; i++) { m(g.box, basic(0x5ff6ff), 0.26, 0.05, -0.3 + i * 0.3, 0.02, 0.12, 0.2, body); m(g.box, basic(0x5ff6ff), -0.26, 0.05, -0.3 + i * 0.3, 0.02, 0.12, 0.2, body); }
    m(g.box, basic(0xff3fd2), 0, 0.04, 0.51, 0.4, 0.14, 0.02, body); parts.eyes = [m(g.box, basic(0xffffff), -0.14, -0.08, 0.52, 0.1, 0.05, 0.02, body), m(g.box, basic(0xffffff), 0.14, -0.08, 0.52, 0.1, 0.05, 0.02, body)];
    const pan = new THREE.Group(); pan.position.set(0, 0.16, 0); body.add(pan); parts.pan = pan; const pb = m(g.box, basic(0x2bf0ff), 0, 0.15, 0, 0.03, 0.32, 0.03, pan); pb.rotation.z = 0.5; m(g.box, basic(0x2bf0ff), 0.08, 0.3, 0, 0.3, 0.02, 0.03, pan);
    parts.rotors = [[-0.35, -0.45], [0.35, -0.45], [-0.35, 0.45], [0.35, 0.45]].map(([x, z]) => { const r = new THREE.Group(); r.position.set(x, 0.2, z); body.add(r); m(g.box, basic(0x2bf0ff), 0, 0, 0, 0.5, 0.015, 0.06, r); m(g.box, basic(0x2bf0ff), 0, 0, 0, 0.06, 0.015, 0.5, r); return r; });
  } else if (type === 'parco') {
    const metal = L(0x667788, 0.3), green = L(0x5aa020, 0.6);
    m(g.cyl, L(0x333344, 0.2), 0, 0.5, 0, 0.14, 1.0, 0.14, body); m(g.box, L(0x222233, 0.2), 0, 0.04, 0, 0.5, 0.08, 0.5, body);
    const head = new THREE.Group(); head.position.y = 1.0; body.add(head); parts.head = head;
    m(g.box, metal, 0, 0.3, 0, 0.5, 0.6, 0.36, head); m(g.sph, green, 0, 0.62, 0, 0.5, 0.3, 0.38, head);
    parts.screen = m(g.box, basic(0x9dff3a), 0, 0.34, 0.19, 0.34, 0.2, 0.02, head);
    parts.eyes = [m(g.box, basic(0x111111), -0.08, 0.36, 0.2, 0.06, 0.06, 0.02, head), m(g.box, basic(0x111111), 0.08, 0.36, 0.2, 0.06, 0.06, 0.02, head)];
    m(g.box, basic(0xffd23a), 0, 0.14, 0.19, 0.16, 0.03, 0.02, head); // fente à monnaie
    parts.arms = [limb(head, g.box, metal, -0.3, 0.3, 0, 0.08, 0.45, 0.08), limb(head, g.box, metal, 0.3, 0.3, 0, 0.08, 0.45, 0.08)];
  } else if (type === 'pigeon') {
    const grey = L(0x8a7aa8, 0.5), neck = L(0x2bf0ff, 0.9);
    m(g.sph, grey, 0, 0, 0, 0.36, 0.3, 0.55, body); m(g.sph, neck, 0, 0.12, 0.2, 0.26, 0.24, 0.26, body); m(g.sph, grey, 0, 0.24, 0.3, 0.2, 0.2, 0.2, body);
    m(g.box, basic(0xffb43a), 0, 0.22, 0.42, 0.05, 0.04, 0.1, body); parts.eyes = [m(g.eye, basic(0xff3333), -0.08, 0.28, 0.37, 0.45, 0.45, 0.45, body), m(g.eye, basic(0xff3333), 0.08, 0.28, 0.37, 0.45, 0.45, 0.45, body)];
    m(g.box, grey, 0, 0, -0.32, 0.22, 0.04, 0.22, body);
    parts.wings = [-1, 1].map(sd => { const w = new THREE.Group(); w.position.set(sd * 0.15, 0.08, 0); body.add(w); m(g.box, L(0xa46bff, 0.6), sd * 0.25, 0, 0, 0.5, 0.03, 0.3, w); return w; });
  } else if (type === 'nid') {
    const asph = L(0x26222e, 0.25), lip = L(0x4a4458, 0.3);
    const head = new THREE.Group(); body.add(head); parts.head = head;
    m(g.cyl, asph, 0, 0.6, 0, 4.6, 1.2, 4.6, head); const rim = m(g.tor, lip, 0, 1.2, 0, 4.6, 4.6, 2.5, head); rim.rotation.x = Math.PI / 2;
    m(g.cyl, basic(0x050208), 0, 1.22, 0, 3.2, 0.02, 3.2, head);
    parts.eyes = [m(g.sph, basic(0xff7a1a), -0.7, 1.7, 1.1, 0.6, 0.6, 0.6, head), m(g.sph, basic(0xff7a1a), 0.7, 1.7, 1.1, 0.6, 0.6, 0.6, head)];
    m(g.sph, basic(0x111111), -0.7, 1.7, 1.35, 0.25, 0.3, 0.2, head); m(g.sph, basic(0x111111), 0.7, 1.7, 1.35, 0.25, 0.3, 0.2, head);
    for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.22; m(g.cone, basic(0xeeeeee), Math.sin(a) * 1.5, 1.35, Math.cos(a) * 1.5, 0.25, 0.35, 0.25, head); } // dents
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const c = new THREE.Group(); c.position.set(Math.cos(a) * 2.5, 1.2, Math.sin(a) * 2.5); head.add(c); m(g.cone, L(0xff6a10, 0.8), 0, 0.55, 0, 0.9, 0.9, 0.9, c); m(g.band, basic(0xffffff), 0, 0.5, 0, 0.9, 0.9, 0.9, c); }
  } else if (type === 'tram') {
    body.scale.setScalar(2.6);
    const wh = L(0xeaf6ff, 0.35), blue = L(0x2b6bff, 0.5);
    const cab = new THREE.Group(); body.add(cab); parts.torso = cab;
    m(g.box, wh, 0, 1.3, 0, 1.3, 1.0, 2.4, cab); m(g.box, blue, 0, 0.88, 0, 1.32, 0.18, 2.42, cab);
    m(g.box, basic(0x5ff6ff), 0, 1.5, 1.21, 1.0, 0.4, 0.02, cab);
    for (let i = 0; i < 4; i++) { m(g.box, basic(0x5ff6ff), 0.66, 1.45, -0.9 + i * 0.6, 0.02, 0.32, 0.4, cab); m(g.box, basic(0x5ff6ff), -0.66, 1.45, -0.9 + i * 0.6, 0.02, 0.32, 0.4, cab); }
    m(g.box, basic(0xff3fd2), 0.67, 1.12, 0, 0.02, 0.06, 2.3, cab); m(g.box, basic(0xff3fd2), -0.67, 1.12, 0, 0.02, 0.06, 2.3, cab);
    parts.sign = m(g.box, basic(0xffd23a), 0, 1.92, 1.1, 0.8, 0.14, 0.04, cab);
    const pan = new THREE.Group(); pan.position.set(0, 1.8, 0); cab.add(pan); parts.pan = pan; const pp = m(g.box, basic(0x2bf0ff), 0, 0.25, 0, 0.04, 0.5, 0.04, pan); pp.rotation.z = 0.6;
    parts.legs = [-0.45, 0.45].map(x => limb(body, g.box, L(0x333355, 0.3), x, 0.8, 0, 0.22, 0.8, 0.3));
    parts.arms = [-0.8, 0.8].map(x => { const a = limb(cab, g.box, wh, x, 1.5, 0.3, 0.2, 0.9, 0.2); a.rotation.x = -1.2; return a; });
    parts.eyes = [m(g.eye, basic(0xff3fd2), -0.3, 1.52, 1.23, 1.4, 1.4, 1, cab), m(g.eye, basic(0xff3fd2), 0.3, 1.52, 1.23, 1.4, 1.4, 1, cab)];
  }
  const ringM = new THREE.MeshBasicMaterial({ color: T.colors[0], transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(g.ring, ringM); ring.scale.setScalar(T.r * 1.15); ring.position.y = 0.03; root.add(ring);
  const base = flash.map(mt => mt.emissive.clone());
  return { root, body, parts, flash, base, ring };
}

// Animations (marche, attaque, clignements, roues, rotors…)
export function animate(e, dt, speed) {
  const mk = e.mk, P = mk.parts, T = e.T, t = e.t; const step = e.walk = (e.walk || 0) + dt * (2 + speed * 1.6);
  const atk = Math.max(0, e.atk);
  mk.body.position.y = e.y; mk.body.rotation.set(0, 0, 0);
  if (P.eyes && Math.sin(t * 1.3 + e.ph * 7) > 0.985) P.eyes.forEach(o => o.scale.y = 0.15); else if (P.eyes) P.eyes.forEach(o => o.scale.y = o.userData.sy || (o.userData.sy = o.scale.y));
  switch (e.type) {
    case 'cone': case 'grandcone': { if (e.state === 'jump') { P.top.scale.set(0.9, 1.15, 0.9); break; }
      const hop = Math.abs(Math.sin(step)); mk.body.position.y = e.y + hop * 0.14 * (T.boss ? 3 : 1); mk.body.rotation.z = Math.sin(step) * 0.16;
      const sq = 1 - (1 - hop) * 0.12; P.top.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      P.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (1.1 + Math.sin(step * 2 + i * 3) * 0.4); a.rotation.x = -atk * 2; }); mk.body.rotation.x = atk * 0.5; break; }
    case 'bur': case 'cons': {
      P.legs.forEach((l, i) => l.rotation.x = Math.sin(step + i * Math.PI) * 0.55 * Math.min(1, speed / 2));
      P.torso.position.y = 0.86 + Math.abs(Math.cos(step)) * 0.05; P.torso.rotation.y = Math.sin(step) * 0.08;
      if (e.type === 'bur') { P.torso.rotation.x = 0.15 + atk * 0.6; P.head.rotation.z = Math.sin(t * 1.7 + e.ph) * 0.25; P.head.rotation.x = 0.1;
        P.arms.forEach((a, i) => a.rotation.x = -1.35 + Math.sin(step * 0.5 + i) * 0.15 - atk * 0.6); P.form.rotation.z = Math.sin(t * 9) * 0.08; }
      else { P.arms[0].rotation.x = -Math.sin(step + Math.PI) * 0.5; P.brief.rotation.x = Math.sin(step) * 0.3;
        const th = Math.max(0, e.throwT || 0); P.arms[1].rotation.x = th > 0 ? -2.6 + (0.35 - th) * 8 : Math.sin(step) * 0.5; P.inv.visible = th <= 0.15; P.head.rotation.y = Math.sin(t * 0.9 + e.ph) * 0.4; }
      P.tie.rotation.x = Math.sin(t * 8 + e.ph) * 0.15 - 0.05; break; }
    case 'plow': case 'mere': { const sp = e.state === 'charge' ? 3 : 1; P.wheels.forEach(w => w.rotation.x += dt * speed * 3 * sp);
      P.chassis.position.y = Math.sin(t * 30) * (e.state === 'charge' ? 0.03 : 0.01); P.blade.rotation.x = e.state === 'aim' ? -0.35 : e.state === 'charge' ? 0.1 : 0;
      if (e.state === 'aim') mk.body.rotation.z = Math.sin(t * 50) * 0.05;
      P.beacon.material.color.setHex((e.state === 'aim' ? Math.floor(t * 16) : Math.floor(t * 4)) % 2 ? 0xff7a1a : 0x331100); break; }
    case 'drone': { P.rotors.forEach((r, i) => r.rotation.y = t * 35 * (i % 2 ? 1 : -1)); mk.body.rotation.x = e.state === 'dive' ? 0.5 : Math.sin(t * 2) * 0.08; mk.body.rotation.z = Math.sin(t * 1.6 + e.ph) * 0.15;
      P.pan.rotation.z = Math.sin(t * 3) * 0.3; break; }
    case 'parco': { const hop = Math.abs(Math.sin(step * 0.8)); mk.body.position.y = e.y + hop * 0.25; P.head.rotation.z = Math.sin(step * 0.8) * 0.15;
      P.arms.forEach((a, i) => a.rotation.z = (i ? 1 : -1) * (0.4 + Math.sin(t * 6 + i) * 0.3)); const th = Math.max(0, e.throwT || 0);
      P.screen.material.color.setHex(th > 0 ? 0xffffff : (Math.floor(t * 2) % 2 ? 0x9dff3a : 0x5aa020)); P.head.scale.setScalar(1 + th * 0.4); break; }
    case 'pigeon': { const f = Math.sin(t * 28 + e.ph); P.wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * f * 0.9); mk.body.rotation.x = e.state === 'dive' ? 0.6 : -0.1; mk.body.rotation.z = Math.sin(t * 2 + e.ph) * 0.3; break; }
    case 'nid': { const em = e.emerge ?? 1; mk.body.position.y = -2.6 * (1 - em) + Math.sin(t * 2) * 0.05; P.head.rotation.y += dt * 0.4; mk.body.scale.setScalar(1 + Math.sin(step * 0.5) * 0.02 + atk * 0.15); mk.ring.visible = em > 0.3; break; }
    case 'tram': { P.legs.forEach((l, i) => l.rotation.x = Math.sin(step * 0.6 + i * Math.PI) * 0.5); P.torso.rotation.z = Math.sin(step * 0.6) * 0.04;
      P.arms.forEach((a, i) => a.rotation.x = -1.2 + Math.sin(t * 2 + i * 2) * 0.3); P.pan.rotation.z = Math.sin(t * 2.5) * 0.3; P.sign.material.color.setHex(Math.floor(t * 3) % 2 ? 0xffd23a : 0xff3fd2); break; }
  }
}
