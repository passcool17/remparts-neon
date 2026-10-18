// Effets : éclats de particules colorées, anneaux de choc, traçantes, piasses néon.
import * as THREE from 'three';

const PVS = `attribute vec3 color; attribute float size; varying vec3 vC; uniform float scale;
void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`;
const PFS = `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; float a = 1.0 - r * 4.0; gl_FragColor = vec4(vC * (0.22 + a * 0.7), 1.0); }`;

export class FX {
  constructor(scene, quality) {
    this.scene = scene; this.N = quality === 'low' ? 1400 : 3200; const N = this.N;
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.size = new Float32Array(N);
    this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.max = new Float32Array(N); this.base = new Float32Array(N * 4); this.grav = new Float32Array(N);
    this.n = 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3)); g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo = g; this.mat = new THREE.ShaderMaterial({ vertexShader: PVS, fragmentShader: PFS, uniforms: { scale: { value: 400 } }, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
    // anneaux
    this.rings = []; const rg = new THREE.RingGeometry(0.85, 1, 40); rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 16; i++) { const mt = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const r = new THREE.Mesh(rg, mt); r.visible = false; scene.add(r); this.rings.push({ m: r, t: 0, d: 1, s0: 1, s1: 5 }); }
    // traçantes
    this.TN = 64; this.tpos = new Float32Array(this.TN * 6); this.tcol = new Float32Array(this.TN * 6); this.tl = new Float32Array(this.TN); this.tc = new Float32Array(this.TN * 3); this.ti = 0;
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(this.tpos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(this.tcol, 3));
    this.tgeo = tg; const tl = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); tl.frustumCulled = false; scene.add(tl);
    // piasses néon (instanciées)
    this.CN = 220; const cg = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 8); cg.rotateX(Math.PI / 2);
    this.coinMesh = new THREE.InstancedMesh(cg, new THREE.MeshBasicMaterial({ color: 0x8dff3a }), this.CN); this.coinMesh.frustumCulled = false; scene.add(this.coinMesh);
    this.coins = []; this.dummy = new THREE.Object3D(); this.tmpC = new THREE.Color();
    // éclairs lumineux (sprites additifs)
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const ft = new THREE.CanvasTexture(c); this.flashes = [];
    for (let i = 0; i < 14; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.visible = false; scene.add(sp); this.flashes.push({ s: sp, t: 0, d: 0.18, size: 1 }); }
  }
  setScale(h) { this.mat.uniforms.scale.value = h * 0.6; }
  burst(p, colors, count, speed = 6, size = 0.35, life = 0.7, grav = 9, up = 2, confetti = false) {
    for (let k = 0; k < count; k++) {
      if (this.n >= this.N) this.kill(0); const i = this.n++;
      const th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1), s = speed * (0.3 + Math.random() * 0.9);
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.vel[i * 3] = Math.sin(ph) * Math.cos(th) * s; this.vel[i * 3 + 1] = Math.cos(ph) * s + up; this.vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * s;
      const c = this.tmpC.set(colors[k % colors.length]); this.base[i * 4] = c.r; this.base[i * 4 + 1] = c.g; this.base[i * 4 + 2] = c.b; this.base[i * 4 + 3] = size * (confetti ? 0.5 + Math.random() * 2 : 0.6 + Math.random() * 0.8);
      this.max[i] = this.life[i] = life * (0.5 + Math.random() * 0.8); this.grav[i] = grav;
    }
  }
  kill(i) { const j = --this.n; if (i === j) return;
    for (let a = 0; a < 3; a++) { this.pos[i * 3 + a] = this.pos[j * 3 + a]; this.vel[i * 3 + a] = this.vel[j * 3 + a]; }
    for (let a = 0; a < 4; a++) this.base[i * 4 + a] = this.base[j * 4 + a]; this.life[i] = this.life[j]; this.max[i] = this.max[j]; this.grav[i] = this.grav[j]; }
  flash(p, color, size, d = 0.18) { const f = this.flashes.find(f => !f.s.visible) || this.flashes[0]; f.s.visible = true; f.s.position.copy(p); f.s.material.color.set(color); f.t = 0; f.d = d; f.size = size; }
  ring(p, color, s0, s1, d, y = 0.06) { const r = this.rings.find(r => !r.m.visible) || this.rings[0]; r.m.visible = true; r.m.position.set(p.x, p.y + y, p.z); r.m.material.color.set(color); r.t = 0; r.d = d; r.s0 = s0; r.s1 = s1; }
  tracer(a, b, color) { const i = this.ti++ % this.TN; this.tpos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); this.tl[i] = 0.12; const c = this.tmpC.set(color); this.tc.set([c.r, c.g, c.b], i * 3); }
  coin(p, value) { if (this.coins.length >= this.CN) { this.coins[0].v += value; return; } this.coins.push({ x: p.x, y: p.y + 0.5, z: p.z, vx: (Math.random() - .5) * 5, vy: 4 + Math.random() * 3, vz: (Math.random() - .5) * 5, v: value, t: 0 }); }
  update(dt, player, magnet, onPick) {
    for (let i = this.n - 1; i >= 0; i--) {
      this.life[i] -= dt; if (this.life[i] <= 0) { this.kill(i); continue; }
      this.vel[i * 3 + 1] -= this.grav[i] * dt; const dr = Math.pow(0.12, dt);
      for (let a = 0; a < 3; a++) { this.vel[i * 3 + a] *= dr; this.pos[i * 3 + a] += this.vel[i * 3 + a] * dt; }
      if (this.pos[i * 3 + 1] < 0.05) { this.pos[i * 3 + 1] = 0.05; this.vel[i * 3 + 1] *= -0.4; }
      const f = this.life[i] / this.max[i];
      this.col[i * 3] = this.base[i * 4] * f; this.col[i * 3 + 1] = this.base[i * 4 + 1] * f; this.col[i * 3 + 2] = this.base[i * 4 + 2] * f; this.size[i] = this.base[i * 4 + 3] * (0.4 + 0.6 * f);
    }
    this.geo.setDrawRange(0, this.n); for (const k of ['position', 'color', 'size']) this.geo.attributes[k].needsUpdate = true;
    for (const f of this.flashes) if (f.s.visible) { f.t += dt; const k = f.t / f.d; if (k >= 1) { f.s.visible = false; continue; } f.s.scale.setScalar(f.size * (0.4 + k * 0.9)); f.s.material.opacity = 1 - k * k; }
    for (const r of this.rings) if (r.m.visible) { r.t += dt; const f = r.t / r.d; if (f >= 1) { r.m.visible = false; continue; } const s = r.s0 + (r.s1 - r.s0) * (1 - (1 - f) * (1 - f)); r.m.scale.setScalar(s); r.m.material.opacity = 1 - f; }
    for (let i = 0; i < this.TN; i++) { if (this.tl[i] > 0) this.tl[i] -= dt; const f = Math.max(0, this.tl[i] / 0.12);
      for (let k = 0; k < 2; k++) { this.tcol[i * 6 + k * 3] = this.tc[i * 3] * f * (k ? 1 : 0.3); this.tcol[i * 6 + k * 3 + 1] = this.tc[i * 3 + 1] * f * (k ? 1 : 0.3); this.tcol[i * 6 + k * 3 + 2] = this.tc[i * 3 + 2] * f * (k ? 1 : 0.3); } }
    this.tgeo.attributes.position.needsUpdate = true; this.tgeo.attributes.color.needsUpdate = true;
    // piasses
    const d = this.dummy; let n = 0;
    for (let i = this.coins.length - 1; i >= 0; i--) { const c = this.coins[i]; c.t += dt;
      const dx = player.x - c.x, dz = player.z - c.z, dy = 1 - c.y, dist = Math.hypot(dx, dz);
      if (dist < magnet || c.t > 5) { const sp = 14 + c.t * 8; c.x += dx / (dist + 0.01) * sp * dt; c.z += dz / (dist + 0.01) * sp * dt; c.y += dy * dt * 5; c.vx *= 0.9; c.vz *= 0.9; }
      else { c.vy -= 14 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; if (c.y < 0.3) { c.y = 0.3; c.vy *= -0.45; c.vx *= 0.6; c.vz *= 0.6; } }
      if (dist < 0.9 && c.t > 0.25) { onPick(c.v, c); this.coins.splice(i, 1); continue; } }
    for (const c of this.coins) { d.position.set(c.x, c.y + Math.sin(c.t * 6) * 0.05, c.z); d.rotation.set(0, c.t * 5, 0); d.updateMatrix(); this.coinMesh.setMatrixAt(n++, d.matrix); }
    this.coinMesh.count = n; this.coinMesh.instanceMatrix.needsUpdate = true;
  }
  clear() { this.flashes.forEach(f => f.s.visible = false); this.n = 0; this.coins.length = 0; this.rings.forEach(r => r.m.visible = false); this.tl.fill(0); }
}
