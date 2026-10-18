// Construction des décors : Québec néon (Vieux-Québec, Saint-Roch, le Pont de glace).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const LEVELS = [
  { id: 'vq', name: 'Vieux-Québec néon', sub: 'Les remparts, minuit', key: 0, weather: 'snow',
    pal: { a: 0xff2bd6, b: 0x22e5ff, sky1: 0x090018, sky2: 0x4a0b63, fog: 0x1b0730, sun: 0xff3fa4 },
    arena: { type: 'circle', r: 23 }, hpMul: 1, cashMul: 1,
    waves: [ { n: 22, mix: { cone: 8, bur: 3 } }, { n: 32, mix: { cone: 6, bur: 4, cons: 2 } }, { n: 26, mix: { cone: 6, bur: 3, cons: 2 }, boss: 'grandcone' } ] },
  { id: 'sr', name: 'Saint-Roch néon', sub: 'La rue des enseignes, pluie néon', key: 3, weather: 'rain',
    pal: { a: 0xff8a1f, b: 0xa64dff, sky1: 0x07020f, sky2: 0x3b1240, fog: 0x1d0a22, sun: 0xff9a3c },
    arena: { type: 'rect', w: 17, h: 58 }, hpMul: 1.3, cashMul: 1.15,
    waves: [ { n: 32, mix: { cone: 4, bur: 3, cons: 3, plow: 2 } }, { n: 38, mix: { bur: 3, cons: 3, plow: 3, drone: 4 } }, { n: 28, mix: { cone: 4, cons: 3, plow: 2, drone: 3 }, boss: 'mere' } ] },
  { id: 'pt', name: 'Le Pont de glace', sub: 'Au-dessus du fleuve gelé', key: -2, weather: 'blizzard',
    pal: { a: 0x2bf0ff, b: 0x4f6bff, sky1: 0x01030f, sky2: 0x0b2b55, fog: 0x081a33, sun: 0x7fe9ff },
    arena: { type: 'rect', w: 14, h: 72 }, hpMul: 1.7, cashMul: 1.3,
    waves: [ { n: 38, mix: { cone: 3, bur: 3, cons: 4, plow: 3, drone: 5 } }, { n: 44, mix: { cone: 3, bur: 4, cons: 4, plow: 4, drone: 5 } }, { n: 32, mix: { cone: 3, cons: 4, plow: 3, drone: 5 }, boss: 'tram' } ] },
];

// Lignes néon regroupées par couleur (une seule géométrie par couleur)
class NeonLines {
  constructor() { this.by = new Map(); }
  add(geo, color, m) {
    const e = new THREE.EdgesGeometry(geo, 25); if (m) e.applyMatrix4(m);
    if (!this.by.has(color)) this.by.set(color, []); this.by.get(color).push(e);
  }
  seg(color, pts) { const g = new THREE.BufferGeometry().setFromPoints(pts); if (!this.by.has(color)) this.by.set(color, []); this.by.get(color).push(g); }
  build(group) {
    for (const [color, list] of this.by) {
      const g = mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x), false);
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, fog: true })); group.add(l);
    }
  }
}
function windowTex(seed, cols = 6, rows = 8, palette = ['#ffd27a', '#ff6ad5', '#6af3ff']) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#05010b'; x.fillRect(0, 0, 64, 64); let r = seed;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const cw = 64 / cols, rh = 64 / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (rnd() < 0.42) { x.fillStyle = palette[Math.floor(rnd() * palette.length)]; x.globalAlpha = 0.5 + rnd() * 0.5; x.fillRect(i * cw + cw * 0.25, j * rh + rh * 0.25, cw * 0.5, rh * 0.55); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function signTex(text, color, bg = '#0a0010') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 64); x.strokeStyle = color; x.lineWidth = 4; x.strokeRect(4, 4, 248, 56);
  x.font = '40px "Jersey 10", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color;
  x.shadowColor = color; x.shadowBlur = 10; x.fillText(text, 128, 34); x.fillStyle = '#fff'; x.shadowBlur = 0; x.globalAlpha = 0.6; x.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const groundVS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const groundFS = `uniform vec3 cA; uniform vec3 cB; uniform vec3 fogC; uniform float t; uniform float pulse; uniform float scale; uniform vec3 cam; uniform float arenaR;
varying vec3 vW;
void main(){
  vec2 p = vW.xz / scale; vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p); float l = 1.0 - min(min(g.x, g.y), 1.0);
  vec2 p2 = vW.xz / (scale * 4.0); vec2 g2 = abs(fract(p2 - 0.5) - 0.5) / fwidth(p2); float l2 = 1.0 - min(min(g2.x, g2.y), 1.0);
  float d = length(vW.xz - cam.xz);
  float wave = 0.5 + 0.5 * sin(length(vW.xz) * 0.35 - t * 3.0);
  vec3 lc = mix(cA, cB, wave);
  vec3 col = vec3(0.012, 0.004, 0.03) + lc * (l * (0.35 + pulse * 0.9) + l2 * 0.9);
  col += lc * 0.04 * (1.0 - smoothstep(0.0, 6.0, d));
  float f = 1.0 - exp(-d * 0.035); col = mix(col, fogC, clamp(f, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;
const skyFS = `uniform vec3 c1; uniform vec3 c2; uniform vec3 sun; uniform float t; varying vec3 vW;
void main(){ vec3 d = normalize(vW); float h = d.y;
  vec3 col = mix(c2, c1, smoothstep(-0.05, 0.55, h));
  // soleil-lune synthwave à rayures
  vec2 sp = vec2(atan(d.x, -d.z), h - 0.12); float r = length(sp * vec2(1.0, 1.0));
  float disc = 1.0 - smoothstep(0.17, 0.175, r);
  float stripes = step(0.5, fract((h - 0.05) * 60.0)) + step(0.2, h - 0.1) ;
  col += sun * disc * clamp(stripes, 0.0, 1.0) * (0.8 + 0.6 * smoothstep(0.0, 0.3, h));
  col += sun * 0.25 * exp(-r * 6.0);
  col += c2 * 0.5 * exp(-abs(h) * 18.0);
  gl_FragColor = vec4(col, 1.0); }`;
const skyVS = `varying vec3 vW; void main(){ vW = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`;

export function buildLevel(scene, L, quality) {
  const root = new THREE.Group(); scene.add(root);
  const P = L.pal; const lines = new NeonLines(); const obstacles = []; const spawns = [];
  scene.fog = new THREE.FogExp2(P.fog, 0.022); scene.background = new THREE.Color(P.sky1);
  // ciel
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), new THREE.ShaderMaterial({ vertexShader: skyVS, fragmentShader: skyFS, side: THREE.BackSide, depthWrite: false,
    uniforms: { c1: { value: new THREE.Color(P.sky1) }, c2: { value: new THREE.Color(P.sky2) }, sun: { value: new THREE.Color(P.sun) }, t: { value: 0 } } }));
  sky.renderOrder = -10; root.add(sky);
  // étoiles
  { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, h = 0.15 + Math.random() * 0.85, r = 350;
      pos[i * 3] = Math.cos(a) * r * Math.sqrt(1 - h * h); pos[i * 3 + 1] = h * r; pos[i * 3 + 2] = Math.sin(a) * r * Math.sqrt(1 - h * h); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, fog: false }))); }
  // sol néon
  const gu = { cA: { value: new THREE.Color(P.a) }, cB: { value: new THREE.Color(P.b) }, fogC: { value: new THREE.Color(P.fog) }, t: { value: 0 }, pulse: { value: 0 }, scale: { value: 2 }, cam: { value: new THREE.Vector3() }, arenaR: { value: 20 } };
  const groundMat = new THREE.ShaderMaterial({ vertexShader: groundVS, fragmentShader: groundFS, uniforms: gu });
  const dark = new THREE.MeshLambertMaterial({ color: 0x0b0716, emissive: 0x05020c });
  const darker = new THREE.MeshBasicMaterial({ color: 0x050209 });
  const box = (w, h, d, x, y, z, col, mat = dark, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = ry; m.updateMatrix(); root.add(m); if (col != null) lines.add(g, col, m.matrix); return m; };
  const winMats = [1, 2, 3, 4].map(s => new THREE.MeshBasicMaterial({ map: windowTex(s * 977), fog: true }));
  const building = (w, h, d, x, z, col, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
      // UV répétées selon la taille (fenêtres régulières)
      for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); const sx = face < 2 ? d : w; uv.setXY(i, uv.getX(i) * sx / 4, uv.getY(i) * h / 4); }
      const m = new THREE.Mesh(g, winMats[Math.floor(Math.random() * 4)]); m.position.set(x, h / 2, z); m.rotation.y = ry; m.updateMatrix(); root.add(m); if (col != null) lines.add(g, col, m.matrix); return m; };
  const roof = (r, h, x, y, z, col) => { const g = new THREE.ConeGeometry(r, h, 4); g.rotateY(Math.PI / 4); const m = new THREE.Mesh(g, dark); m.position.set(x, y + h / 2, z); m.updateMatrix(); root.add(m); lines.add(g, col, m.matrix); };
  const lamp = (x, z, col) => { const g = new THREE.CylinderGeometry(0.08, 0.12, 4, 6); const m = new THREE.Mesh(g, darker); m.position.set(x, 2, z); root.add(m);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: col })); b.position.set(x, 4.1, z); root.add(b); obstacles.push({ x, z, r: 0.35 }); };
  const chateau = (cx, cy, cz, s, col) => { // château fictif « à la québécoise » : tours et toits pointus
      const C = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w * s, h * s, d * s); const m = new THREE.Mesh(g, winMats[0]); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 3, uv.getY(i) * h / 3);
        m.position.set(cx + x * s, cy + (y + h / 2) * s, cz + z * s); m.updateMatrix(); root.add(m); lines.add(g, col, m.matrix); };
      C(30, 14, 10, 0, 0, 0); C(10, 26, 10, 0, 0, 0); C(8, 18, 8, -17, 0, 2); C(8, 18, 8, 17, 0, 2); C(6, 20, 6, -9, 0, 6); C(6, 20, 6, 9, 0, 6);
      const R = (r, h, x, y, z) => roof(r * s, h * s, cx + x * s, cy + y * s, cz + z * s, 0x3dffb0);
      R(7.5, 16, 0, 26, 0); R(6, 10, -17, 18, 2); R(6, 10, 17, 18, 2); R(4.5, 9, -9, 20, 6); R(4.5, 9, 9, 20, 6); R(10, 7, -8, 14, -1); R(10, 7, 8, 14, -1);
      // girouette lumineuse
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 5 * s, 4), new THREE.MeshBasicMaterial({ color: 0x3dffb0 })); sp.position.set(cx, cy + 44.5 * s, cz); root.add(sp); };

  let bounds;
  if (L.id === 'vq') {
    const R = L.arena.r; bounds = { type: 'circle', r: R };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat); ground.rotation.x = -Math.PI / 2; root.add(ground);
    // remparts circulaires avec créneaux et portes
    const segs = 36, gates = [0, 6, 12, 18, 24, 30];
    for (let i = 0; i < segs; i++) { const a = i / segs * Math.PI * 2, x = Math.cos(a) * (R + 1.4), z = Math.sin(a) * (R + 1.4); const ry = -a + Math.PI / 2;
      if (gates.includes(i)) { box(1, 6, 1, Math.cos(a - 0.06) * (R + 1.4), 3, Math.sin(a - 0.06) * (R + 1.4), P.b); box(1, 6, 1, Math.cos(a + 0.06) * (R + 1.4), 3, Math.sin(a + 0.06) * (R + 1.4), P.b);
        box(4.6, 1, 1.4, x, 5.5, z, P.a, dark, ry); spawns.push({ x: Math.cos(a) * (R + 4), z: Math.sin(a) * (R + 4) }); continue; }
      box(4.3, 3.2, 1.6, x, 1.6, z, i % 2 ? P.a : P.a, dark, ry);
      box(1.1, 0.8, 1.6, x + Math.cos(a + Math.PI / 2) * 1.2, 3.6, z + Math.sin(a + Math.PI / 2) * 1.2, P.b, dark, ry);
      box(1.1, 0.8, 1.6, x - Math.cos(a + Math.PI / 2) * 1.2, 3.6, z - Math.sin(a + Math.PI / 2) * 1.2, P.b, dark, ry); }
    // fontaine centrale décalée + lampadaires
    lamp(8, 6, P.a); lamp(-9, -5, P.b); lamp(-6, 10, P.a); lamp(10, -9, P.b); lamp(0, -14, P.a); lamp(15, 3, P.b); lamp(-15, 2, P.a);
    const ft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.8, 16), dark); ft.position.set(0, 0.4, 0); root.add(ft); lines.add(new THREE.CylinderGeometry(2.2, 2.4, 0.8, 16), P.b, new THREE.Matrix4().makeTranslation(0, 0.4, 0));
    const ft2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.6, 8), dark); ft2.position.set(0, 1.3, 0); root.add(ft2); lines.add(new THREE.CylinderGeometry(0.4, 0.6, 2.6, 8), P.a, new THREE.Matrix4().makeTranslation(0, 1.3, 0));
    obstacles.push({ x: 0, z: 0, r: 2.6 });
    // château sur le cap, ville autour
    chateau(0, 0, -75, 1.1, P.b);
    for (let i = 0; i < 46; i++) { const a = Math.random() * Math.PI * 2; if (Math.abs(Math.sin(a) + 1) < 0.25 && Math.random() < 0.7) continue; const r = 36 + Math.random() * 40;
      const w = 5 + Math.random() * 6, h = 6 + Math.random() * 14; building(w, h, w, Math.cos(a) * r, Math.sin(a) * r, Math.random() < 0.5 ? P.a : P.b, a);
      if (Math.random() < 0.5) roof(w * 0.72, 3 + Math.random() * 4, Math.cos(a) * r, h, Math.sin(a) * r, 0x3dffb0); }
  } else if (L.id === 'sr') {
    const W = L.arena.w, H = L.arena.h; bounds = { type: 'rect', w: W, h: H };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 400), groundMat); ground.rotation.x = -Math.PI / 2; root.add(ground); gu.scale.value = 1.5;
    // trottoirs
    box(2, 0.25, H + 40, -W / 2 - 1, 0.12, 0, P.b); box(2, 0.25, H + 40, W / 2 + 1, 0.12, 0, P.b);
    const signs = ['POUTINE 24H', 'DÉPANNEUR', 'FRIPERIE', 'CAFÉ NÉON', 'BAR LE 88', 'BINERIE', 'ARCADE', 'BIÈRE FROIDE', 'VÉLOS', 'DISQUAIRE', 'TATOUS', 'CASSE-CROÛTE'];
    const scol = ['#ff4fd8', '#5ff6ff', '#ffb43a', '#a46bff', '#7dff6a', '#ff6a6a'];
    let si = 0;
    for (const side of [-1, 1]) for (let z = -H / 2 - 18; z < H / 2 + 18; ) { const d = 5 + Math.random() * 5, h = 8 + Math.random() * 12;
      const x = side * (W / 2 + 2 + 3.5); building(7, h, d - 0.4, x, z + d / 2, Math.random() < 0.5 ? P.a : P.b);
      if (Math.random() < 0.75) { const tx = signTex(signs[si++ % signs.length], scol[si % scol.length]); const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide, fog: true }));
        if (Math.random() < 0.5) { sg.position.set(side * (W / 2 + 2.05), 3 + Math.random() * 3, z + d / 2); sg.rotation.y = -side * Math.PI / 2; }
        else { sg.position.set(side * (W / 2 + 0.9), 4 + Math.random() * 3, z + d / 2); sg.rotation.y = 0; sg.scale.set(0.6, 0.6, 1); }
        root.add(sg); }
      z += d; }
    // clocher au bout de la rue + ruelles (points d'apparition)
    building(10, 22, 10, 0, -H / 2 - 22, P.b); roof(7.5, 18, 0, 22, -H / 2 - 22, 0x3dffb0);
    building(14, 16, 8, 0, H / 2 + 24, P.a);
    for (let z = -H / 2 + 6; z <= H / 2 - 6; z += 13) { lamp(-W / 2 + 0.6, z, P.a); lamp(W / 2 - 0.6, z + 6, P.b); }
    // voitures de rue (obstacles)
    for (const [x, z] of [[-4, -12], [5, 8], [-5, 20], [4, -22]]) { box(2, 1.2, 4.2, x, 0.6, z, P.b); box(1.8, 0.7, 2.2, x, 1.55, z - 0.2, P.a); obstacles.push({ x, z: z - 1.3, r: 1.2 }, { x, z: z + 1.3, r: 1.2 }); }
    spawns.push({ x: 0, z: -H / 2 - 3 }, { x: 0, z: H / 2 + 3 }, { x: -W / 2 + 1, z: -H / 2 + 1 }, { x: W / 2 - 1, z: H / 2 - 1 }, { x: -W / 2 - 2, z: 0 }, { x: W / 2 + 2, z: 0 });
  } else {
    const W = L.arena.w, H = L.arena.h; bounds = { type: 'rect', w: W, h: H };
    // tablier du pont
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(W + 4, 600), groundMat); deck.rotation.x = -Math.PI / 2; root.add(deck); gu.scale.value = 1.75;
    box(W + 4, 1.4, 600, 0, -0.71, 0, null, darker);
    // fleuve gelé
    const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: 0x03101f, fog: true })); water.rotation.x = -Math.PI / 2; water.position.y = -28; root.add(water);
    for (let i = 0; i < 70; i++) { const s = 3 + Math.random() * 10; const x = (Math.random() - 0.5) * 300, z = (Math.random() - 0.5) * 400; if (Math.abs(x) < 14) continue;
      const g = new THREE.CylinderGeometry(s, s * 1.1, 0.6, 6 + Math.floor(Math.random() * 3)); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x0d2a40, fog: true })); m.position.set(x, -27.7, z); m.rotation.y = Math.random() * 3; m.updateMatrix(); root.add(m); lines.add(g, 0x7fe9ff, m.matrix); }
    // garde-corps et treillis géant (pont en porte-à-faux, version néon)
    for (const side of [-1, 1]) { const x = side * (W / 2 + 0.6);
      lines.seg(P.a, [new THREE.Vector3(x, 1.1, -300), new THREE.Vector3(x, 1.1, 300)]);
      lines.seg(P.a, [new THREE.Vector3(x, 0.05, -300), new THREE.Vector3(x, 0.05, 300)]);
      for (let z = -150; z < 150; z += 6) { lines.seg(P.b, [new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 1.1, z)]); }
      const top = z => 14 + 22 * Math.pow(Math.cos(Math.max(-1, Math.min(1, z / 110)) * Math.PI / 2), 2) * 0 + 26 * (1 - Math.min(1, Math.abs(Math.abs(z) - 60) / 60));
      let prev = null; for (let z = -160; z <= 160; z += 10) { const y = top(z), p = new THREE.Vector3(side * (W / 2 + 2), y, z), b = new THREE.Vector3(side * (W / 2 + 2), -6, z);
        lines.seg(P.b, [b, p]); if (prev) { lines.seg(P.b, [prev.t, p]); lines.seg(P.a, [prev.b, p]); lines.seg(P.a, [prev.t, b]); lines.seg(P.b, [prev.b, b]); } prev = { t: p, b };
        if (z % 20 === 0) lines.seg(P.b, [p, new THREE.Vector3(-p.x, p.y, z)]); }
      obstacles.length; }
    for (let z = -H / 2; z <= H / 2; z += 9) { lamp(-W / 2 + 0.5, z, P.a); lamp(W / 2 - 0.5, z + 4.5, P.b); }
    // voitures abandonnées
    for (const [x, z] of [[-3, -18], [3.5, 4], [-2.5, 24]]) { box(2, 1.2, 4.2, x, 0.6, z, P.a); box(1.8, 0.7, 2.2, x, 1.55, z - 0.2, P.b); obstacles.push({ x, z: z - 1.3, r: 1.2 }, { x, z: z + 1.3, r: 1.2 }); }
    // rives lointaines : la ville et le château
    chateau(-160, -4, -230, 1.3, P.b);
    for (let i = 0; i < 40; i++) { const side = i % 2 ? 1 : -1; const z = -260 + Math.random() * 520; const x = side * (120 + Math.random() * 120); const w = 10 + Math.random() * 14, h = 8 + Math.random() * 30; const m = building(w, h, w, x, z, P.b); m.position.y = h / 2 - 20; m.updateMatrix(); }
    spawns.push({ x: -3, z: -H / 2 - 3 }, { x: 3, z: -H / 2 - 3 }, { x: -3, z: H / 2 + 3 }, { x: 3, z: H / 2 + 3 });
  }
  lines.build(root);
  // lumières
  root.add(new THREE.HemisphereLight(P.b, 0x110018, 0.9));
  const dl = new THREE.DirectionalLight(P.a, 0.7); dl.position.set(5, 10, 3); root.add(dl);
  // météo
  const weather = makeWeather(root, L.weather, quality);
  return { root, gu, sky, bounds, obstacles, spawns, weather,
    update(t, pulse, cam, dt) { gu.t.value = t; gu.pulse.value = pulse; gu.cam.value.copy(cam); weather.update(dt, cam); sky.position.copy(cam); } };
}

function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); }
export const DOT = { tex: null };

function makeWeather(root, kind, quality) {
  const low = quality === 'low';
  if (kind === 'rain') { // pluie néon : traits colorés
    const n = low ? 350 : 900, pos = new Float32Array(n * 6), col = new Float32Array(n * 6); const pal = [[1, .3, .85], [.35, .95, 1], [1, .6, .2]];
    const speed = new Float32Array(n); const off = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { off[i * 3] = (Math.random() - .5) * 50; off[i * 3 + 1] = Math.random() * 20; off[i * 3 + 2] = (Math.random() - .5) * 50; speed[i] = 18 + Math.random() * 10; const c = pal[i % 3]; for (let k = 0; k < 2; k++) { col[i * 6 + k * 3] = c[0] * (k ? .2 : 1); col[i * 6 + k * 3 + 1] = c[1] * (k ? .2 : 1); col[i * 6 + k * 3 + 2] = c[2] * (k ? .2 : 1); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; root.add(l);
    return { update(dt, cam) { for (let i = 0; i < n; i++) { off[i * 3 + 1] -= speed[i] * dt; if (off[i * 3 + 1] < 0) off[i * 3 + 1] += 20;
        const x = cam.x + ((off[i * 3] - cam.x) % 50 + 75) % 50 - 25, z = cam.z + ((off[i * 3 + 2] - cam.z) % 50 + 75) % 50 - 25, y = off[i * 3 + 1];
        pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x + 0.05; pos[i * 6 + 4] = y + 0.9; pos[i * 6 + 5] = z; } g.attributes.position.needsUpdate = true; } };
  }
  const bliz = kind === 'blizzard'; const n = low ? 400 : bliz ? 1400 : 1000, pos = new Float32Array(n * 3), off = new Float32Array(n * 3), sp = new Float32Array(n);
  for (let i = 0; i < n; i++) { off[i * 3] = (Math.random() - .5) * 50; off[i * 3 + 1] = Math.random() * 18; off[i * 3 + 2] = (Math.random() - .5) * 50; sp[i] = 0.6 + Math.random() * 1.4; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (!DOT.tex) DOT.tex = dotTex();
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: DOT.tex, size: 0.14, color: 0xe8f4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; root.add(pts);
  let tt = 0;
  return { update(dt, cam) { tt += dt; const wx = bliz ? 6 : 0.6; for (let i = 0; i < n; i++) { off[i * 3 + 1] -= sp[i] * dt * (bliz ? 2.2 : 1.2); off[i * 3] += (wx + Math.sin(tt + i) * 0.5) * dt; if (off[i * 3 + 1] < 0) off[i * 3 + 1] += 18;
      pos[i * 3] = cam.x + ((off[i * 3] - cam.x) % 50 + 75) % 50 - 25; pos[i * 3 + 1] = off[i * 3 + 1]; pos[i * 3 + 2] = cam.z + ((off[i * 3 + 2] - cam.z) % 50 + 75) % 50 - 25; } g.attributes.position.needsUpdate = true; } };
}
