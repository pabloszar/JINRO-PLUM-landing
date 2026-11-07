// Prototipo 1 — Cámara y movimiento 2.5D.
// Pregunta que responde: ¿se siente bien caminar en todas direcciones y mover la cámara?
import * as THREE from 'three';
import { canvas, drawHuman, drawWolf, drawMammoth, drawPine, drawBirch, drawRock, drawGrass, drawLogs, drawGlow, drawFlame, mulberry } from './art.js';

// ---------- Utilidades ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const DEG = Math.PI / 180;

function hash2(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function heightAt(x, z) {
  let h = (vnoise(x / 70, z / 70) - 0.5) * 22 + (vnoise(x / 22, z / 22) - 0.5) * 5 + (vnoise(x / 7, z / 7) - 0.5) * 0.7;
  const d = Math.hypot(x, z);
  const flat = clamp((d - 8) / 30, 0, 1);
  h *= flat * flat;
  h += Math.pow(Math.max(0, d - 170) / 120, 2) * 90; // montañas al fondo
  return h;
}

// ---------- Render ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1200);
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// Cielo: cúpula con degradado
const skyUniforms = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(900, 24, 12),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float vH; void main(){ vH = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float vH; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.05, 0.45, vH)), 1.0); }',
  }),
);
scene.add(sky);
scene.fog = new THREE.Fog(0xffffff, 40, 420);

const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2);
scene.add(sun, sun.target);

// Terreno
const SIZE = 640, SEG = 256;
const tGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
tGeo.rotateX(-Math.PI / 2);
const pos = tGeo.attributes.position, cols = [];
const cA = new THREE.Color('#7f8b45'), cB = new THREE.Color('#a59a58'), cC = new THREE.Color('#5d6b38'), cR = new THREE.Color('#8a8279'), tmp = new THREE.Color();
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i), y = heightAt(x, z);
  pos.setY(i, y);
  tmp.copy(cA).lerp(cB, vnoise(x / 30 + 9, z / 30)).lerp(cC, clamp(vnoise(x / 12, z / 12 + 5) - 0.3, 0, 1));
  if (y > 18) tmp.lerp(cR, clamp((y - 18) / 25, 0, 1));
  cols.push(tmp.r, tmp.g, tmp.b);
}
tGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
tGeo.computeVertexNormals();
scene.add(new THREE.Mesh(tGeo, new THREE.MeshLambertMaterial({ vertexColors: true })));

// ---------- Billboards ----------
function texFrom(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function billboardGeo(w, h) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); return g; }
function spriteMat(tex, extra = {}) { return new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, ...extra }); }

const billboards = []; // mallas sueltas que miran a cámara
const instanced = [];  // { mesh, items:[{x,y,z,s}] }
const rnd = mulberry(1234);

function scatter(drawFn, variants, count, w, h, opts) {
  for (let v = 0; v < variants; v++) {
    const c = canvas(opts.cw, opts.ch); drawFn(c.getContext('2d'), v * 97 + 3);
    const mesh = new THREE.InstancedMesh(billboardGeo(w, h), spriteMat(texFrom(c)), Math.ceil(count / variants));
    const items = [];
    let tries = 0;
    while (items.length < mesh.count && tries++ < 20000) {
      const x = (rnd() - 0.5) * opts.range * 2, z = (rnd() - 0.5) * opts.range * 2;
      const d = Math.hypot(x, z);
      if (d < opts.clear) continue;
      if (opts.density && vnoise(x / 40 + 3, z / 40) < opts.density) continue;
      items.push({ x, y: heightAt(x, z) - 0.15, z, s: opts.minS + rnd() * (opts.maxS - opts.minS) });
    }
    mesh.count = items.length;
    scene.add(mesh); instanced.push({ mesh, items });
  }
}
scatter(drawPine, 3, 520, 5, 10, { cw: 256, ch: 512, range: 230, clear: 16, minS: 0.7, maxS: 1.4, density: 0.42 });
scatter(drawBirch, 2, 160, 5, 8, { cw: 256, ch: 410, range: 200, clear: 14, minS: 0.7, maxS: 1.2, density: 0.5 });
scatter(drawRock, 2, 160, 2.6, 1.6, { cw: 256, ch: 160, range: 220, clear: 6, minS: 0.5, maxS: 2.2 });
scatter(drawGrass, 3, 3000, 1.1, 0.8, { cw: 128, ch: 96, range: 120, clear: 2, minS: 0.7, maxS: 1.5 });

const dummy = new THREE.Object3D();
let lastYaw = null;
function updateBillboards(yaw) {
  if (lastYaw === null || Math.abs(yaw - lastYaw) > 0.002) {
    lastYaw = yaw;
    for (const { mesh, items } of instanced) {
      items.forEach((it, i) => { dummy.position.set(it.x, it.y, it.z); dummy.rotation.set(0, yaw, 0); dummy.scale.setScalar(it.s); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  for (const b of billboards) b.rotation.y = yaw;
}

// Sombras de contacto (manchas oscuras bajo los personajes)
const blobTex = (() => { const c = canvas(64, 64); drawGlow(c.getContext('2d'), 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'); return texFrom(c); })();
function blob(r) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; scene.add(m); return m;
}

// ---------- Personaje ----------
const pCanvas = canvas(192, 384), pCtx = pCanvas.getContext('2d'), pTex = texFrom(pCanvas);
const player = new THREE.Mesh(billboardGeo(1, 2), spriteMat(pTex));
scene.add(player); billboards.push(player);
const pShadow = blob(0.55);
const P = { x: 0, z: 9, facing: Math.PI, phase: 0, speed: 0, sitting: false };

// ---------- Fogata ----------
const FIRE = new THREE.Vector3(0, heightAt(0, 0), 0);
const logsC = canvas(128, 64); drawLogs(logsC.getContext('2d'));
const logs = new THREE.Mesh(billboardGeo(1.4, 0.7), spriteMat(texFrom(logsC)));
logs.position.copy(FIRE); scene.add(logs); billboards.push(logs);
const flameC = canvas(128, 192); drawFlame(flameC.getContext('2d'));
const flameTex = texFrom(flameC);
const flames = [0, 1, 2].map((i) => {
  const m = new THREE.Mesh(billboardGeo(0.9, 1.4), new THREE.MeshBasicMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  m.position.copy(FIRE).add(new THREE.Vector3((i - 1) * 0.18, 0.15, (i - 1) * 0.05)); scene.add(m); billboards.push(m); return m;
});
const fireLight = new THREE.PointLight(0xff8a3c, 40, 30, 1.6);
fireLight.position.copy(FIRE).add(new THREE.Vector3(0, 1.2, 0));
scene.add(fireLight);
// chispas
const SPARKS = 60, sparkGeo = new THREE.BufferGeometry(), sparkPos = new Float32Array(SPARKS * 3), sparkLife = new Float32Array(SPARKS);
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
const sparkTex = (() => { const c = canvas(32, 32); drawGlow(c.getContext('2d'), 'rgba(255,200,120,1)', 'rgba(255,120,30,0)'); return texFrom(c); })();
scene.add(new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.12, map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
for (let i = 0; i < SPARKS; i++) sparkLife[i] = Math.random() * 2;
// piedras alrededor del fuego
const campRock = canvas(256, 160); drawRock(campRock.getContext('2d'), 7);
const campRockTex = texFrom(campRock);
for (let i = 0; i < 3; i++) {
  const a = 2.2 + i * 1.6, m = new THREE.Mesh(billboardGeo(1.6, 1), spriteMat(campRockTex));
  m.position.set(Math.cos(a) * 3.2, heightAt(Math.cos(a) * 3.2, Math.sin(a) * 3.2) - 0.1, Math.sin(a) * 3.2);
  scene.add(m); billboards.push(m);
}

// ---------- Lobo ----------
const wolfFrames = [0, 1, 2, 3].map((i) => { const c = canvas(256, 128); drawWolf(c.getContext('2d'), (i / 4) * Math.PI * 2); return texFrom(c); });
const wolfEyesC = canvas(256, 128); drawWolf(wolfEyesC.getContext('2d'), 0, true);
const wolfMat = spriteMat(wolfFrames[0], { emissive: 0xffd36a, emissiveMap: texFrom(wolfEyesC), emissiveIntensity: 0 });
const wolf = new THREE.Mesh(billboardGeo(1.9, 0.95), wolfMat);
scene.add(wolf); billboards.push(wolf);
const wShadow = blob(0.9);
const W = { x: 45, z: -35, dir: 1, phase: 0, mode: 'merodea', t: 0, home: new THREE.Vector2(45, -35), angle: 0, vx: 0, vz: 0 };

// ---------- Mamuts a lo lejos ----------
const mamFrames = [0, 1].map((i) => { const c = canvas(512, 400); drawMammoth(c.getContext('2d'), i * Math.PI); return texFrom(c); });
const mammoths = [0, 1, 2, 3].map((i) => {
  const m = new THREE.Mesh(billboardGeo(6, 4.7), spriteMat(mamFrames[0]));
  m.scale.setScalar(i === 3 ? 0.6 : 1);
  scene.add(m); billboards.push(m);
  return { m, off: i * 13 + (i === 3 ? -5 : 0), z: -95 - (i % 2) * 9, phase: i };
});

// ---------- Día y noche ----------
const TIMES = [
  { name: 'Día', top: '#7fb6e0', bottom: '#e9e2c8', fog: '#d9dccb', sun: '#fff1d6', sunI: 2.4, hemi: 1.1, ground: '#556b33', sunPos: [60, 90, 40], fire: 12 },
  { name: 'Atardecer', top: '#3b4f86', bottom: '#f39a5a', fog: '#e09666', sun: '#ffb070', sunI: 1.8, hemi: 0.55, ground: '#4a3a2a', sunPos: [-120, 18, -60], fire: 30 },
  { name: 'Noche', top: '#050814', bottom: '#162042', fog: '#0c1328', sun: '#8aa2e6', sunI: 0.55, hemi: 0.2, ground: '#10141c', sunPos: [-40, 80, -90], fire: 45 },
];
let timeIdx = 0, timeT = 0; // timeT es continuo entre 0 y 2
const C = (h) => new THREE.Color(h);
function applyTime(t) {
  const i = Math.min(1, Math.floor(t)), f = t - i, A = TIMES[i], B = TIMES[Math.min(2, i + 1)];
  skyUniforms.top.value.copy(C(A.top)).lerp(C(B.top), f);
  skyUniforms.bottom.value.copy(C(A.bottom)).lerp(C(B.bottom), f);
  scene.fog.color.copy(C(A.fog)).lerp(C(B.fog), f);
  sun.color.copy(C(A.sun)).lerp(C(B.sun), f);
  sun.intensity = lerp(A.sunI, B.sunI, f);
  hemi.intensity = lerp(A.hemi, B.hemi, f);
  hemi.groundColor.copy(C(A.ground)).lerp(C(B.ground), f);
  hemi.color.copy(scene.fog.color);
  sun.position.set(...A.sunPos.map((v, k) => lerp(v, B.sunPos[k], f)));
  return lerp(A.fire, B.fire, f);
}

// ---------- Cámara ----------
// Valores que el jugador controla; los modos los sobrescriben un momento y luego vuelven.
const user = { yaw: 0, pitch: 32, dist: 11 };
const cam = { yaw: 0, pitch: 32, dist: 11, lookY: 1.2 };
const LIMITS = { yaw: 30, pitchMin: 6, pitchMax: 62, distMin: 3.5, distMax: 34 };
let freeYaw = false; // V: giro libre de 360° para comparar con el límite de ±30°
const clampYaw = (y) => (freeYaw ? y : clamp(y, -LIMITS.yaw, LIMITS.yaw));
const lead = { yaw: 0, dist: 0, pitch: 0, x: 0, z: 0 }; // ajustes automáticos según hacia dónde caminas
let mode = 'Exploración';
const camTarget = new THREE.Vector3();

// ---------- Entrada ----------
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyN') nextTime();
  if (e.code === 'KeyC') toggleSit();
  if (e.code === 'KeyH') document.getElementById('help').classList.toggle('hidden');
  if (e.code === 'KeyV') { freeYaw = !freeYaw; if (!freeYaw) user.yaw = clamp(((user.yaw + 180) % 360 + 360) % 360 - 180, -LIMITS.yaw, LIMITS.yaw); toast(freeYaw ? 'Giro libre 360°' : 'Giro limitado a ±30°'); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
function nextTime() { timeIdx = (timeIdx + 1) % 3; }
function toggleSit() {
  if (!P.sitting && Math.hypot(P.x - FIRE.x, P.z - FIRE.z) > 4.5) { toast('Acércate al fuego para sentarte'); return; }
  P.sitting = !P.sitting;
}
document.getElementById('btn-time').onclick = nextTime;
document.getElementById('btn-sit').onclick = toggleSit;

const stick = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
const looks = new Map(); // punteros que giran la cámara
const knob = document.getElementById('knob'), base = document.getElementById('stick');
const el = renderer.domElement;
el.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') {
    // con el mouse no hace falta arrastrar: un clic captura el cursor (Esc lo suelta)
    try { const r = el.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch { /* el marco puede no permitirlo */ }
    return;
  }
  el.setPointerCapture(e.pointerId);
  if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45 && stick.id === null) {
    stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY;
    base.style.left = `${e.clientX - 50}px`; base.style.top = `${e.clientY - 50}px`; base.classList.add('on');
  } else looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
el.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    // la cámara sigue al mouse sin hacer clic
    const mx = e.movementX || 0, my = e.movementY || 0;
    if (Math.abs(mx) > 200 || Math.abs(my) > 200) return; // saltos al entrar o salir de la ventana
    user.yaw = clampYaw(user.yaw - mx * 0.12);
    user.pitch = clamp(user.pitch + my * 0.1, LIMITS.pitchMin, LIMITS.pitchMax);
    return;
  }
  if (e.pointerId === stick.id) {
    const dx = e.clientX - stick.ox, dy = e.clientY - stick.oy, m = Math.min(1, Math.hypot(dx, dy) / 50) / (Math.hypot(dx, dy) || 1);
    stick.x = dx * m; stick.y = dy * m;
    knob.style.transform = `translate(${stick.x * 32}px, ${stick.y * 32}px)`;
    return;
  }
  const p = looks.get(e.pointerId); if (!p) return;
  if (looks.size === 2) {
    const [a, b] = [...looks.values()];
    const before = Math.hypot(a.x - b.x, a.y - b.y);
    p.x = e.clientX; p.y = e.clientY;
    const after = Math.hypot(a.x - b.x, a.y - b.y);
    if (before > 0) user.dist = clamp(user.dist * (before / after), LIMITS.distMin, LIMITS.distMax);
    return;
  }
  user.yaw = clampYaw(user.yaw - (e.clientX - p.x) * 0.15);
  user.pitch = clamp(user.pitch + (e.clientY - p.y) * 0.15, LIMITS.pitchMin, LIMITS.pitchMax);
  p.x = e.clientX; p.y = e.clientY;
});
const release = (e) => {
  if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; base.classList.remove('on'); }
  looks.delete(e.pointerId);
};
el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
el.addEventListener('wheel', (e) => { e.preventDefault(); user.dist = clamp(user.dist * Math.exp(e.deltaY * 0.001), LIMITS.distMin, LIMITS.distMax); }, { passive: false });

let toastT = 0;
function toast(t) { const n = document.getElementById('toast'); n.textContent = t; n.classList.add('on'); toastT = 2; }

// ---------- Bucle ----------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
let exposure = 1, elapsed = 0;

function update(dt) {
  elapsed += dt;
  // --- reloj del día
  timeT = damp(timeT, timeIdx, 1.2, dt);
  if (Math.abs(timeT - timeIdx) < 0.002) timeT = timeIdx;
  const fireI = applyTime(timeT);
  const night = clamp(timeT - 1, 0, 1), dusk = clamp(1 - Math.abs(timeT - 1), 0, 1);

  // --- teclado de cámara
  if (keys.KeyQ) user.yaw = clampYaw(user.yaw + 60 * dt);
  if (keys.KeyE) user.yaw = clampYaw(user.yaw - 60 * dt);
  if (keys.KeyR) user.pitch = clamp(user.pitch + 40 * dt, LIMITS.pitchMin, LIMITS.pitchMax);
  if (keys.KeyF) user.pitch = clamp(user.pitch - 40 * dt, LIMITS.pitchMin, LIMITS.pitchMax);
  if (keys.KeyZ) user.dist = clamp(user.dist * Math.exp(-1.2 * dt), LIMITS.distMin, LIMITS.distMax);
  if (keys.KeyX) user.dist = clamp(user.dist * Math.exp(1.2 * dt), LIMITS.distMin, LIMITS.distMax);

  // --- direcciones relativas a la cámara
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  right.set(-fwd.z, 0, fwd.x);

  // --- movimiento del personaje
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x;
  let iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y;
  const mag = Math.min(1, Math.hypot(ix, iz));
  if (mag > 0.1 && P.sitting) P.sitting = false;
  if (P.sitting && Math.hypot(P.x - FIRE.x, P.z - FIRE.z) > 6) P.sitting = false;
  const run = keys.ShiftLeft || keys.ShiftRight || Math.hypot(stick.x, stick.y) > 0.95;
  const target = mag > 0.1 ? (run ? 6.2 : 2.8) * mag : 0;
  P.speed = damp(P.speed, target, 10, dt);
  if (mag > 0.1) {
    const mx = fwd.x * iz + right.x * ix, mz = fwd.z * iz + right.z * ix;
    const want = Math.atan2(mx, mz);
    let d = want - P.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
    P.facing += d * Math.min(1, dt * 12);
  }
  P.x += Math.sin(P.facing) * P.speed * dt;
  P.z += Math.cos(P.facing) * P.speed * dt;
  const rLim = 200; const pr = Math.hypot(P.x, P.z); if (pr > rLim) { P.x *= rLim / pr; P.z *= rLim / pr; }
  // no atravesar la fogata
  const fd = Math.hypot(P.x - FIRE.x, P.z - FIRE.z); if (fd < 1.2) { P.x = FIRE.x + (P.x - FIRE.x) / fd * 1.2; P.z = FIRE.z + (P.z - FIRE.z) / fd * 1.2; }
  P.phase += P.speed * dt * 2.6;
  const py = heightAt(P.x, P.z);
  player.position.set(P.x, py - 0.05, P.z);
  pShadow.position.set(P.x, py + 0.04, P.z);

  // vista del personaje respecto a la cámara (para dibujarlo de frente, espalda o perfil)
  const facingV = new THREE.Vector3(Math.sin(P.facing), 0, Math.cos(P.facing));
  const f = -facingV.dot(fwd), s = facingV.dot(right);
  drawHuman(pCtx, f, s, P.phase, clamp(P.speed / 3, 0, 1.3), P.sitting);
  pTex.needsUpdate = true;

  // --- lobo
  const wd = Math.hypot(P.x - W.x, P.z - W.z);
  const playerSafe = Math.hypot(P.x - FIRE.x, P.z - FIRE.z) < 7 && night > 0.2 ? true : Math.hypot(P.x - FIRE.x, P.z - FIRE.z) < 5;
  let wtx, wtz, wsp;
  if (playerSafe && wd < 40) { W.mode = 'se aleja'; const a = Math.atan2(W.z - FIRE.z, W.x - FIRE.x); wtx = FIRE.x + Math.cos(a) * 22; wtz = FIRE.z + Math.sin(a) * 22; wsp = 4; }
  else if (wd < 30) { W.mode = 'acecha'; W.angle += dt * 0.35; const r = wd < 14 ? 13 : 11; wtx = P.x + Math.cos(W.angle) * r; wtz = P.z + Math.sin(W.angle) * r; wsp = 3.6; if (wd > 20) W.angle = Math.atan2(W.z - P.z, W.x - P.x); }
  else { W.mode = 'merodea'; W.t -= dt; if (W.t <= 0) { W.t = 4 + Math.random() * 4; W.tx = W.home.x + (Math.random() - 0.5) * 40; W.tz = W.home.y + (Math.random() - 0.5) * 40; } wtx = W.tx ?? W.x; wtz = W.tz ?? W.z; wsp = 1.8; }
  const wdx = wtx - W.x, wdz = wtz - W.z, wl = Math.hypot(wdx, wdz);
  const wv = wl > 0.5 ? wsp : 0;
  W.vx = damp(W.vx, wl > 0 ? (wdx / wl) * wv : 0, 4, dt); W.vz = damp(W.vz, wl > 0 ? (wdz / wl) * wv : 0, 4, dt);
  W.x += W.vx * dt; W.z += W.vz * dt;
  const wspeed = Math.hypot(W.vx, W.vz);
  W.phase += wspeed * dt * 3;
  const wy = heightAt(W.x, W.z);
  wolf.position.set(W.x, wy - 0.05, W.z); wShadow.position.set(W.x, wy + 0.04, W.z);
  const sx = W.vx * right.x + W.vz * right.z;
  if (Math.abs(sx) > 0.2) W.dir = Math.sign(sx);
  wolf.scale.x = W.dir;
  wolfMat.map = wolfFrames[wspeed > 0.3 ? Math.floor(W.phase) % 4 : 0];
  wolfMat.emissiveIntensity = night * 3;

  // --- mamuts
  for (const M of mammoths) {
    const x = ((elapsed * 1.4 + M.off + 220) % 440) - 220;
    M.phase += dt * 1.4;
    M.m.position.set(x, heightAt(x, M.z) - 0.3, M.z);
    M.m.material.map = mamFrames[Math.floor(M.phase) % 2];
  }

  // --- fuego
  const flick = 0.85 + Math.sin(elapsed * 13) * 0.08 + Math.sin(elapsed * 7.3) * 0.07;
  fireLight.intensity = fireI * flick;
  flames.forEach((m, i) => { const k = flick * (1 - i * 0.18); m.scale.set(k, k * (1 + Math.sin(elapsed * 9 + i) * 0.12), 1); });
  for (let i = 0; i < SPARKS; i++) {
    sparkLife[i] -= dt;
    if (sparkLife[i] <= 0) { sparkLife[i] = 1 + Math.random() * 1.5; sparkPos[i * 3] = FIRE.x + (Math.random() - 0.5) * 0.4; sparkPos[i * 3 + 1] = FIRE.y + 0.4; sparkPos[i * 3 + 2] = FIRE.z + (Math.random() - 0.5) * 0.4; }
    sparkPos[i * 3] += Math.sin(elapsed * 3 + i) * dt * 0.3; sparkPos[i * 3 + 1] += dt * 1.6;
  }
  sparkGeo.attributes.position.needsUpdate = true;

  // --- modo de cámara
  const tension = W.mode === 'acecha' && wd < 20;
  const contemplate = P.sitting;
  mode = contemplate ? 'Contemplación' : tension ? 'Tensión' : 'Exploración';
  // --- la cámara se adapta a hacia dónde caminas
  // hacia la cámara: se aleja y sube un poco para que veas lo que viene;
  // a los lados: gira hacia donde vas y deja más espacio delante del personaje.
  const vx = Math.sin(P.facing) * P.speed, vz = Math.cos(P.facing) * P.speed;
  const vFwd = (vx * fwd.x + vz * fwd.z) / 6.2, vSide = (vx * right.x + vz * right.z) / 6.2;
  lead.dist = damp(lead.dist, clamp(-vFwd, 0, 1) * 0.55, 1.1, dt);
  lead.pitch = damp(lead.pitch, clamp(-vFwd, 0, 1) * 6, 1.1, dt);
  lead.yaw = damp(lead.yaw, -vSide * 16, 0.9, dt);
  lead.x = damp(lead.x, vx * 0.45, 1.5, dt); lead.z = damp(lead.z, vz * 0.45, 1.5, dt);
  const want = { yaw: clampYaw(user.yaw + lead.yaw), pitch: user.pitch + lead.pitch, dist: user.dist * (1 + lead.dist), lookY: 1.2 };
  if (tension) {
    // encuadre de tensión: cámara baja, entre tú y la fiera, girada para que ambos queden a la vista
    want.pitch = 12; want.dist = clamp(wd * 0.55 + 4, 6.5, 13); want.lookY = 1.0;
    const side = (W.x - P.x) * right.x + (W.z - P.z) * right.z;
    want.yaw = clampYaw(user.yaw + clamp(-side * 2.2, -25, 25));
  }
  if (contemplate) { want.pitch = 5; want.dist = 9; want.lookY = 2.6; want.yaw = user.yaw + Math.sin(elapsed * 0.08) * 12; }
  const k = tension ? 3 : 1.6;
  cam.yaw = damp(cam.yaw, want.yaw, k * 1.5, dt); cam.pitch = damp(cam.pitch, want.pitch, k, dt);
  cam.dist = damp(cam.dist, want.dist, k, dt); cam.lookY = damp(cam.lookY, want.lookY, k, dt);
  const focus = tension ? 0.4 : 0;
  camTarget.lerp(new THREE.Vector3(lerp(P.x + lead.x, W.x, focus), py + cam.lookY, lerp(P.z + lead.z, W.z, focus)), 1 - Math.exp(-(tension ? 3 : 8) * dt));
  const yr = cam.yaw * DEG, pr2 = cam.pitch * DEG, h = Math.cos(pr2) * cam.dist;
  camera.position.set(camTarget.x + Math.sin(yr) * h, camTarget.y + Math.sin(pr2) * cam.dist, camTarget.z + Math.cos(yr) * h);
  const ground = heightAt(camera.position.x, camera.position.z) + 0.6;
  if (camera.position.y < ground) camera.position.y = ground;
  camera.lookAt(camTarget);
  sky.position.copy(camera.position);
  updateBillboards(Math.atan2(camera.position.x - camTarget.x, camera.position.z - camTarget.z));
  sun.target.position.copy(camTarget);

  // --- ojos que se acostumbran a la oscuridad
  // Junto al fuego la luz deslumbra (exposición baja); lejos, los ojos se adaptan poco a poco.
  const nearFire = clamp(1 - (Math.hypot(P.x - FIRE.x, P.z - FIRE.z) - 2) / 12, 0, 1);
  const targetExp = lerp(1, lerp(3.6, 0.85, nearFire), night) * lerp(1, 1.15, dusk);
  const rate = targetExp > exposure ? 0.45 : 2.5; // adaptarse a la oscuridad es lento, deslumbrarse es rápido
  exposure = damp(exposure, targetExp, rate, dt);
  renderer.toneMappingExposure = exposure;

  // --- interfaz
  document.getElementById('mode').textContent = mode;
  document.getElementById('mode').className = tension ? 'tension' : '';
  document.getElementById('vignette').style.opacity = tension ? 0.85 : contemplate ? 0.35 : 0;
  document.getElementById('time').textContent = TIMES[timeIdx].name;
  document.getElementById('btn-sit').textContent = P.sitting ? 'Levantarse' : 'Sentarse';
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) document.getElementById('toast').classList.remove('on'); }
}

function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
camTarget.set(P.x, heightAt(P.x, P.z) + 1.2, P.z);
requestAnimationFrame(frame);
window.__clan = { P, user, setTime: (i) => { timeIdx = i; timeT = i; }, W };
