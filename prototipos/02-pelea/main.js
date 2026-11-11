// Prototipo 2 — Pelea contra un lobo.
// Pregunta que responde: ¿hay tensión de verdad? ¿se puede leer al animal, esquivar, aguantar y huir?
import * as THREE from 'three';
import { canvas, drawHuman, drawWolf, drawMammoth, drawPine, drawBirch, drawRock, drawGrass, drawLogs, drawGlow, drawFlame, mulberry } from './art.js';
import { initAudio, sfx, ambience } from './audio.js';

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
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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
// lienzo cuadrado: deja espacio para la lanza extendida y para caer al suelo
const pCanvas = canvas(384, 384), pCtx = pCanvas.getContext('2d'), pTex = texFrom(pCanvas);
const player = new THREE.Mesh(billboardGeo(2, 2), spriteMat(pTex));
scene.add(player); billboards.push(player);
const pShadow = blob(0.55);
const P = {};
const WOUND_TIME = 50; // segundos que dura una herida en el prototipo (en el juego serían días)

// ---------- Lobo ----------
function wolfTex(phase, pose, eyes = false) { const c = canvas(256, 128); drawWolf(c.getContext('2d'), phase, eyes, pose); return texFrom(c); }
const wolfTx = {
  walk: [0, 1, 2, 3].map((i) => wolfTex((i / 4) * Math.PI * 2, 'walk')),
  crouch: wolfTex(0, 'crouch'), lunge: wolfTex(0, 'lunge'), dead: wolfTex(0, 'dead'),
};
const wolfEyes = { walk: wolfTex(0, 'walk', true), crouch: wolfTex(0, 'crouch', true), lunge: wolfTex(0, 'lunge', true), dead: wolfTex(0, 'dead', true) };
const wolfMat = spriteMat(wolfTx.walk[0], { emissive: 0xffd36a, emissiveMap: wolfEyes.walk, emissiveIntensity: 0 });
const wolf = new THREE.Mesh(billboardGeo(1.9, 0.95), wolfMat);
scene.add(wolf); billboards.push(wolf);
const wShadow = blob(0.9);
const W = {};
const WOLF_HP = 90;

// sangre
const BLOOD = 80, bloodGeo = new THREE.BufferGeometry(), bloodPos = new Float32Array(BLOOD * 3), bloodVel = new Float32Array(BLOOD * 3), bloodLife = new Float32Array(BLOOD);
bloodGeo.setAttribute('position', new THREE.BufferAttribute(bloodPos, 3));
scene.add(new THREE.Points(bloodGeo, new THREE.PointsMaterial({ size: 0.07, color: 0x7a0e0a })));
let bloodNext = 0;
function bleed(x, y, z, n, spread = 1) {
  for (let j = 0; j < n; j++) {
    const i = bloodNext = (bloodNext + 1) % BLOOD;
    bloodPos.set([x, y, z], i * 3);
    bloodVel.set([(Math.random() - 0.5) * 3 * spread, Math.random() * 2.5, (Math.random() - 0.5) * 3 * spread], i * 3);
    bloodLife[i] = 0.8 + Math.random() * 0.4;
  }
}

// Lanza en 3D: al atacar o mantenerla firme se ve salir hacia la fiera desde cualquier ángulo de cámara
const spear = new THREE.Group();
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 2.3, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.35;
const tipM = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.36, 6), new THREE.MeshLambertMaterial({ color: 0x9aa1a8 }));
tipM.rotation.x = Math.PI / 2; tipM.position.z = 1.6;
spear.add(shaft, tipM); spear.visible = false; scene.add(spear);
function updateSpear3D(pose, poseT, py) {
  spear.visible = pose === 'thrust' || pose === 'brace';
  if (!spear.visible) return;
  const ext = pose === 'thrust' ? 0.15 + poseT * 1.05 : 0.35;
  const yy = py + P.y + (pose === 'brace' ? 0.95 : 1.15);
  spear.position.set(P.x + Math.sin(P.facing) * ext, yy, P.z + Math.cos(P.facing) * ext);
  spear.rotation.set(pose === 'brace' ? 0.08 : -0.04, P.facing, 0);
}
// destello en el punto del golpe
const impactTex = (() => { const c = canvas(64, 64); drawGlow(c.getContext('2d'), 'rgba(255,250,220,1)', 'rgba(255,180,80,0)'); return texFrom(c); })();
const impact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: impactTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
impact.visible = false; scene.add(impact); billboards.push(impact);
let impactT = 0;
function showImpact(x, y, z, big) { impact.position.set(x, y, z); impact.visible = true; impactT = big ? 0.32 : 0.22; impact.userData.big = big; }

function reset() {
  Object.assign(P, {
    x: 0, z: 9, facing: Math.PI, phase: 0, speed: 0, sitting: false,
    hp: 100, energy: 100, energyDelay: 0, alive: true,
    leg: 0, arm: 0, bleed: 0, // segundos que le quedan a cada herida
    action: null, iframes: 0, bracing: false, braceT: 0, dodgeCd: 0, downT: 0, whiffT: 0, y: 0, vy: 0, breath: 0, kbx: 0, kbz: 0, hurtT: 0, deadT: 0,
    stats: { bites: 0, dodged: 0, hits: 0, blocked: 0, time: 0 },
  });
  Object.assign(W, {
    x: 34, z: -26, dir: 1, phase: 0, state: 'merodea', t: 0, home: new THREE.Vector2(34, -26), angle: 0, vx: 0, vz: 0,
    hp: WOLF_HP, impaled: 0, flank: 1, cooldown: 2.5, lungeDir: null, hasBit: false, flash: 0, tx: undefined, tz: undefined, fled: false,
  });
  ended = null; document.getElementById('end').classList.add('hidden');
}
let ended = null;

// ---------- Mamuts a lo lejos ----------

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
const user = { yaw: 0, pitch: 14, dist: 6 };
const cam = { yaw: 0, pitch: 14, dist: 6, lookY: 1.45 };
const LIMITS = { pitchMin: 3, pitchMax: 45, distMin: 2.5, distMax: 16 };
const lead = { yaw: 0, dist: 0, pitch: 0, x: 0, z: 0 };
const camTarget = new THREE.Vector3();
let shake = 0, hitstop = 0, mode = 'Exploración';

// ---------- Entrada ----------
const keys = {};
const press = new Set(); // acciones de un solo toque
let showBars = false;
addEventListener('keydown', (e) => {
  initAudio();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'KeyN') timeIdx = (timeIdx + 1) % 3;
  if (e.code === 'KeyH') document.getElementById('help').classList.toggle('hidden');
  if (e.code === 'KeyB') { showBars = !showBars; document.getElementById('bars').classList.toggle('hidden', !showBars); }
  if (e.code === 'KeyJ') press.add('attack');
  if (e.code === 'Space') { e.preventDefault(); press.add('jump'); }
  if (e.code === 'KeyC') press.add('dodge');
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shiftDown = performance.now();
  if (e.code === 'KeyL') callWolf();
  if (e.code === 'KeyR' && ended) reset();
});
addEventListener('keyup', (e) => {
  keys[e.code] = false;
  // Shift: tocar = esquivar, mantener = correr
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && performance.now() - shiftDown < 220) press.add('dodge');
});
let shiftDown = 0;
document.getElementById('btn-again').onclick = () => reset();
document.getElementById('btn-time').onclick = () => { timeIdx = (timeIdx + 1) % 3; };
document.getElementById('btn-wolf').onclick = () => callWolf();
function callWolf() {
  if (W.state === 'muerto' || W.state === 'huye') return;
  const a = Math.random() * Math.PI * 2;
  W.x = P.x + Math.cos(a) * 16; W.z = P.z + Math.sin(a) * 16; W.state = 'acecha'; W.cooldown = 2; W.t = 0;
  toast('El lobo te encontró');
}

const stick = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
const looks = new Map();
const knob = document.getElementById('knob'), base = document.getElementById('stick');
const el = renderer.domElement;
let mouseBrace = false;
el.addEventListener('contextmenu', (e) => e.preventDefault());
el.addEventListener('pointerdown', (e) => {
  initAudio();
  if (e.pointerType === 'mouse') {
    if (document.pointerLockElement !== el) { try { const r = el.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch { /* */ } }
    if (e.button === 0) press.add('attack');
    if (e.button === 2) mouseBrace = true;
    return;
  }
  el.setPointerCapture(e.pointerId);
  if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45 && stick.id === null) {
    stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY;
    base.style.left = `${e.clientX - 50}px`; base.style.top = `${e.clientY - 50}px`; base.classList.add('on');
  } else looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 2) mouseBrace = false; });
el.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    const mx = e.movementX || 0, my = e.movementY || 0;
    if (Math.abs(mx) > 200 || Math.abs(my) > 200) return;
    user.yaw -= mx * 0.12;
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
  user.yaw -= (e.clientX - p.x) * 0.15;
  user.pitch = clamp(user.pitch + (e.clientY - p.y) * 0.15, LIMITS.pitchMin, LIMITS.pitchMax);
  p.x = e.clientX; p.y = e.clientY;
});
const release = (e) => {
  if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; base.classList.remove('on'); }
  looks.delete(e.pointerId);
};
el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
el.addEventListener('wheel', (e) => { e.preventDefault(); user.dist = clamp(user.dist * Math.exp(e.deltaY * 0.001), LIMITS.distMin, LIMITS.distMax); }, { passive: false });
// botones táctiles
let touchBrace = false;
document.getElementById('t-attack').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); press.add('attack'); });
document.getElementById('t-dodge').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); press.add('dodge'); });
document.getElementById('t-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); press.add('jump'); });
const tb = document.getElementById('t-brace');
tb.addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); touchBrace = true; });
['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => tb.addEventListener(ev, () => { touchBrace = false; }));

let toastT = 0;
function toast(t, dur = 2) { const n = document.getElementById('toast'); n.textContent = t; n.classList.add('on'); toastT = dur; }

// ---------- Utilidades de combate ----------
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const faceTo = (x, z) => Math.atan2(x - P.x, z - P.z);
const FIGHT_STATES = new Set(['acecha', 'acerca', 'agacha', 'flanquea', 'salta', 'recupera', 'retrocede', 'aturdido']);

function hurtPlayer(dmg, fromX, fromZ) {
  P.hp -= dmg; P.hurtT = 0.35; P.stats.bites++;
  const a = Math.atan2(P.x - fromX, P.z - fromZ);
  P.kbx = Math.sin(a) * 6; P.kbz = Math.cos(a) * 6;
  // las heridas se quedan
  const r = Math.random();
  let msg = '';
  if (r < 0.45 && !P.leg) { P.leg = WOUND_TIME; msg = 'Te mordió la pierna'; }
  else if (r < 0.7 && !P.arm) { P.arm = WOUND_TIME; msg = 'Te mordió el brazo'; }
  if (Math.random() < 0.4) { P.bleed = 18; msg = msg ? `${msg} y sangras` : 'Sangras'; }
  // cansado o mordido por la espalda: te tira al suelo
  const fromBehind = Math.abs(angDiff(Math.atan2(fromX - P.x, fromZ - P.z), P.facing)) > 1.9;
  if (P.energy < 30 || fromBehind) { P.downT = 1.0; P.action = null; msg = msg ? `Te derribó · ${msg.toLowerCase()}` : 'Te derribó'; }
  if (msg) toast(msg, 1.6);
  bleed(P.x, heightAt(P.x, P.z) + 1.1, P.z, 14);
  shake = 0.5; hitstop = 0.09; sfx.bite();
  flashEl.style.opacity = 0.55;
  if (P.hp <= 0) die();
}
function hurtWolf(dmg, kind) {
  W.hp -= dmg; W.flash = 0.22; P.stats.hits++;
  showImpact(lerp(P.x, W.x, 0.75), heightAt(W.x, W.z) + 0.6, lerp(P.z, W.z, 0.75), kind === 'impale');
  const a = Math.atan2(W.x - P.x, W.z - P.z);
  W.vx = Math.sin(a) * 9; W.vz = Math.cos(a) * 9;
  bleed(W.x, heightAt(W.x, W.z) + 0.6, W.z, kind === 'impale' ? 24 : 16, 1.4);
  hitstop = kind === 'impale' ? 0.14 : 0.08; shake = kind === 'impale' ? 0.45 : 0.25;
  (kind === 'impale' ? sfx.impale : sfx.thud)(); sfx.yelp();
  if (W.hp <= 0) { W.state = 'muerto'; W.t = 0; finish('win'); return; }
  if (W.hp < WOLF_HP * 0.35 && Math.random() < 0.55) { W.state = 'huye'; W.t = 0; return; }
  if (kind === 'impale') { W.state = 'aturdido'; W.t = 0; }
  else { W.state = 'retrocede'; W.t = 0; }
}
function die() {
  P.alive = false; P.hp = 0; P.action = null; P.deadT = 0; sfx.death();
  finish('dead');
}
function finish(kind) {
  if (ended) return;
  ended = kind;
  setTimeout(() => {
    const s = P.stats;
    const title = { win: 'Mataste al lobo', fled: 'El lobo huyó herido', dead: 'Has muerto', escaped: 'Escapaste' }[kind];
    const heridas = [P.leg && 'pierna', P.arm && 'brazo', P.bleed && 'sangrado'].filter(Boolean).join(', ') || 'ninguna';
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-stats').innerHTML =
      `Duró ${Math.round(s.time)} s · Mordidas recibidas: ${s.bites} · Esquivadas: ${s.dodged} · Golpes tuyos: ${s.hits} · Clavadas con la lanza firme: ${s.blocked}<br>Heridas abiertas: ${heridas}`;
    document.getElementById('toast').classList.remove('on');
    document.getElementById('end').classList.remove('hidden');
  }, kind === 'dead' ? 1800 : 1400);
}

// ---------- Bucle ----------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
const flashEl = document.getElementById('flash'), hurtEl = document.getElementById('hurt');
let exposure = 1, elapsed = 0;

function update(dtReal) {
  let dt = dtReal;
  if (hitstop > 0) { hitstop -= dtReal; dt = dtReal * 0.06; } // golpe con peso: el tiempo casi se detiene
  elapsed += dt;
  timeT = damp(timeT, timeIdx, 1.2, dtReal);
  if (Math.abs(timeT - timeIdx) < 0.002) timeT = timeIdx;
  const fireI = applyTime(timeT);
  const night = clamp(timeT - 1, 0, 1);

  if (keys.KeyQ) user.yaw += 60 * dt;
  if (keys.KeyE) user.yaw -= 60 * dt;
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  right.set(-fwd.z, 0, fwd.x);

  const wd = Math.hypot(P.x - W.x, P.z - W.z);
  const fighting = FIGHT_STATES.has(W.state) && wd < 24;
  if (fighting && P.alive && !ended) P.stats.time += dt;

  // ---------------- Jugador ----------------
  P.iframes -= dt; P.hurtT -= dt; P.energyDelay -= dt; P.dodgeCd -= dt; P.downT -= dt; P.whiffT -= dt;
  P.leg = Math.max(0, P.leg - dt); P.arm = Math.max(0, P.arm - dt);
  if (P.bleed > 0) { P.bleed = Math.max(0, P.bleed - dt); P.hp -= dt * 0.7; if (Math.random() < dt * 4) bleed(P.x, heightAt(P.x, P.z) + 0.9, P.z, 1, 0.2); if (P.hp <= 0 && P.alive) die(); }
  const nearFire = Math.hypot(P.x - FIRE.x, P.z - FIRE.z);
  if (nearFire < 4 && P.alive) P.hp = Math.min(100, P.hp + dt * 1.5);

  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x;
  let iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y;
  const mag = Math.min(1, Math.hypot(ix, iz));
  const mx = fwd.x * iz + right.x * ix, mz = fwd.z * iz + right.z * ix;
  const exhausted = P.energy < 5;
  const wasBracing = P.bracing;
  P.bracing = P.alive && !P.action && P.y <= 0 && (keys.KeyK || mouseBrace || touchBrace) && P.energy > (wasBracing ? 0 : 15); // agotado no puede volver a levantarla
  if (P.bracing && !wasBracing) P.braceT = 0;
  if (P.bracing) P.braceT += dt;
  // cansancio gradual: 0 descansado, 1 agotado
  const fatigue = clamp(1 - P.energy / 70, 0, 1);

  const down = P.downT > 0; // derribado: no puedes hacer nada un momento
  if (P.alive && !down) {
    // acciones
    if (press.has('attack') && !P.action && !P.bracing && P.energy >= 8) {
      P.action = { type: 'thrust', t: 0, dur: P.arm ? 0.7 : 0.52, hit: false };
      P.energy -= 14; P.energyDelay = 0.5; sfx.whoosh();
      if (wd < 7 && W.state !== 'muerto') P.facing = faceTo(W.x, W.z); // apunta solo si la fiera está cerca
      wolfSeesThrust(wd);
    }
    if (press.has('dodge') && !P.action && P.energy >= 12 && P.y <= 0 && P.dodgeCd <= 0) {
      const d = mag > 0.1 ? Math.atan2(mx, mz) : P.facing + Math.PI; // sin dirección: salto hacia atrás
      P.action = { type: 'dodge', t: 0, dur: 0.38, dir: d };
      P.iframes = 0.2; P.energy -= 20; P.energyDelay = 0.5; P.dodgeCd = 0.75; sfx.whoosh();
    }
    if (press.has('jump') && P.y <= 0 && !P.action && P.energy >= 5) {
      P.vy = P.leg ? 3.6 : 5.4; P.energy -= 6; P.energyDelay = 0.3;
    }
  }
  press.clear();

  let target = 0;
  if (P.alive && !P.action && !down) {
    const run = (keys.ShiftLeft || keys.ShiftRight || Math.hypot(stick.x, stick.y) > 0.95) && !exhausted && !P.leg && !P.bracing;
    const walk = P.leg ? 2.0 : 3.2;
    target = mag > 0.1 ? (run ? 6.6 : walk) * mag * (1 - 0.25 * fatigue) : 0;
    if (P.bracing) target = Math.min(target, 1.1);
    if (exhausted) target = Math.min(target, 1.6);
    if (run && mag > 0.1) { P.energy -= dt * 7; P.energyDelay = 0.4; }
    if (P.bracing) { P.energy -= dt * 4; P.energyDelay = 0.4; }
    if (mag > 0.1 && !(P.bracing && wd < 8)) P.facing += angDiff(Math.atan2(mx, mz), P.facing) * Math.min(1, dt * 12);
    const watching = FIGHT_STATES.has(W.state) && wd < 12 && mag < 0.1; // quieto ante una fiera, la encaras
    if ((P.bracing && wd < 8) || watching) { const d = angDiff(faceTo(W.x, W.z), P.facing); P.facing += clamp(d, -4 * dt, 4 * dt); } // gira hacia ella, pero no al instante
  }
  P.speed = damp(P.speed, target, 14, dt);
  let vx = Math.sin(P.facing) * P.speed, vz = Math.cos(P.facing) * P.speed;

  if (P.action) {
    const A = P.action; A.t += dt;
    if (A.type === 'thrust') {
      const lunge = A.t > 0.1 && A.t < 0.28 ? 4.5 : 0; // paso al frente al clavar
      vx = vx * 0.3 + Math.sin(P.facing) * lunge; vz = vz * 0.3 + Math.cos(P.facing) * lunge;
      if (!A.hit && A.t > 0.12 && A.t < 0.32 && W.state !== 'muerto') {
        const a = faceTo(W.x, W.z);
        if (wd < 3.0 && Math.abs(angDiff(a, P.facing)) < 1.1) {
          A.hit = true;
          const counter = W.state === 'recupera'; // golpe justo después de su salto: el momento débil
          const dmg = 15 * (P.arm ? 0.6 : 1) * (counter ? 1.5 : 1);
          if (counter) toast('¡Contraataque!', 1);
          if (W.state === 'salta') { W.hp -= dmg; W.flash = 0.22; P.stats.hits++; showImpact(lerp(P.x, W.x, 0.75), heightAt(W.x, W.z) + 0.6, lerp(P.z, W.z, 0.75), false); sfx.thud(); bleed(W.x, heightAt(W.x, W.z) + 0.6, W.z, 12, 1.4); if (W.hp <= 0) { W.state = 'muerto'; W.t = 0; finish('win'); } } // ya saltó: lo hieres pero sigue de largo y te muerde
          else if (W.state === 'agacha') { // agachado está firme: el golpe lo hiere menos y salta sobre ti
            W.hp -= dmg * 0.5; W.flash = 0.22; P.stats.hits++; sfx.thud(); showImpact(lerp(P.x, W.x, 0.75), heightAt(W.x, W.z) + 0.6, lerp(P.z, W.z, 0.75), false);
            if (W.hp <= 0) { W.state = 'muerto'; W.t = 0; finish('win'); }
            else { W.state = 'salta'; W.t = 0; W.hasBit = false; W.missed = false; W.lungeDir = Math.atan2(P.x - W.x, P.z - W.z); }
          }
          else hurtWolf(dmg, 'hit');
        }
      }
    } else if (A.type === 'dodge') {
      const sp = (P.leg ? 5.5 : 8.5) * Math.pow(clamp(1 - A.t / A.dur, 0, 1), 1.5);
      vx = Math.sin(A.dir) * sp; vz = Math.cos(A.dir) * sp;
    }
    if (A.t >= A.dur) { if (A.type === 'thrust' && !A.hit) P.whiffT = 0.6; P.action = null; } // fallar deja un hueco
  }
  if (!P.alive || P.downT > 0) { vx = 0; vz = 0; if (!P.alive) P.deadT += dt; }
  P.x += (vx + P.kbx) * dt; P.z += (vz + P.kbz) * dt;
  P.kbx *= Math.pow(0.002, dt); P.kbz *= Math.pow(0.002, dt);
  const pr = Math.hypot(P.x, P.z); if (pr > 200) { P.x *= 200 / pr; P.z *= 200 / pr; }
  const fd = Math.hypot(P.x - FIRE.x, P.z - FIRE.z); if (fd < 1.2) { P.x = FIRE.x + (P.x - FIRE.x) / fd * 1.2; P.z = FIRE.z + (P.z - FIRE.z) / fd * 1.2; }
  if (P.energyDelay <= 0 && !P.action) P.energy = Math.min(100, P.energy + dt * (P.bleed ? 16 : 26));
  P.energy = Math.max(0, P.energy);
  P.phase += Math.hypot(vx, vz) * dt * 2.6;
  if (P.y > 0 || P.vy > 0) { P.vy -= 16 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0) { P.vy = 0; sfx.step(); } }
  P.breath += dt * (2 + 7 * fatigue);
  const py = heightAt(P.x, P.z);
  player.position.set(P.x, py - 0.05 + P.y, P.z);
  pShadow.position.set(P.x, py + 0.04, P.z);

  const facingV = new THREE.Vector3(Math.sin(P.facing), 0, Math.cos(P.facing));
  const f = -facingV.dot(fwd), s = facingV.dot(right);
  let pose = 'normal', poseT = 0;
  if (!P.alive) pose = 'dead';
  else if (P.downT > 0) pose = 'dead'; // en el suelo
  else if (P.hurtT > 0) pose = 'hurt';
  else if (P.action?.type === 'thrust') { pose = 'thrust'; const t = P.action.t; poseT = t < 0.1 ? 0 : t < 0.22 ? (t - 0.1) / 0.12 : 1 - (t - 0.22) / (P.action.dur - 0.22); }
  else if (P.action?.type === 'dodge') pose = 'dodge';
  else if (P.bracing) pose = 'brace';
  drawHuman(pCtx, f, s, P.phase, clamp(Math.hypot(vx, vz) / 3, 0, 1.3), { pose, poseT: clamp(poseT, 0, 1), limp: P.leg > 0, armHurt: P.arm > 0 && pose === 'normal', noSpear: pose === 'thrust' || pose === 'brace', breath: P.breath, fatigue: P.alive ? fatigue : 0, air: P.y > 0.05 });
  updateSpear3D(pose, poseT, py);
  pTex.needsUpdate = true;

  // ---------------- Lobo ----------------
  updateWolf(dt, wd, night);
  const wy = heightAt(W.x, W.z);

  // ---------------- Mamuts y fuego ----------------
  for (const M of mammoths) {
    const x = ((elapsed * 1.4 + M.off + 220) % 440) - 220;
    M.phase += dt * 1.4;
    M.m.position.set(x, heightAt(x, M.z) - 0.3, M.z);
    M.m.material.map = mamFrames[Math.floor(M.phase) % 2];
  }
  const flick = 0.85 + Math.sin(elapsed * 13) * 0.08 + Math.sin(elapsed * 7.3) * 0.07;
  fireLight.intensity = fireI * flick;
  flames.forEach((m, i) => { const k = flick * (1 - i * 0.18); m.scale.set(k, k * (1 + Math.sin(elapsed * 9 + i) * 0.12), 1); });
  for (let i = 0; i < SPARKS; i++) {
    sparkLife[i] -= dt;
    if (sparkLife[i] <= 0) { sparkLife[i] = 1 + Math.random() * 1.5; sparkPos[i * 3] = FIRE.x + (Math.random() - 0.5) * 0.4; sparkPos[i * 3 + 1] = FIRE.y + 0.4; sparkPos[i * 3 + 2] = FIRE.z + (Math.random() - 0.5) * 0.4; }
    sparkPos[i * 3] += Math.sin(elapsed * 3 + i) * dt * 0.3; sparkPos[i * 3 + 1] += dt * 1.6;
  }
  sparkGeo.attributes.position.needsUpdate = true;
  for (let i = 0; i < BLOOD; i++) {
    if (bloodLife[i] <= 0) continue;
    bloodLife[i] -= dt;
    bloodVel[i * 3 + 1] -= 9 * dt;
    for (let a = 0; a < 3; a++) bloodPos[i * 3 + a] += bloodVel[i * 3 + a] * dt;
    const gy = heightAt(bloodPos[i * 3], bloodPos[i * 3 + 2]) + 0.02;
    if (bloodPos[i * 3 + 1] < gy) { bloodPos[i * 3 + 1] = gy; bloodVel[i * 3] = bloodVel[i * 3 + 1] = bloodVel[i * 3 + 2] = 0; }
    if (bloodLife[i] <= 0) bloodPos[i * 3 + 1] = -999;
  }
  bloodGeo.attributes.position.needsUpdate = true;
  if (impactT > 0) { impactT -= dtReal; const k = impact.userData.big ? 2.4 : 1.6; impact.scale.setScalar(k * (1.2 - impactT * 2)); impact.material.opacity = clamp(impactT * 5, 0, 1); if (impactT <= 0) impact.visible = false; }

  // ---------------- Cámara ----------------
  const tension = fighting && W.state !== 'muerto' && P.alive;
  mode = !P.alive ? 'Muerte' : tension ? 'Tensión' : 'Exploración';
  const vFwd = (vx * fwd.x + vz * fwd.z) / 6.2, vSide = (vx * right.x + vz * right.z) / 6.2;
  lead.dist = damp(lead.dist, clamp(-vFwd, 0, 1) * 0.22, 1.1, dt);
  lead.pitch = damp(lead.pitch, clamp(-vFwd, 0, 1) * 3, 1.1, dt);
  lead.yaw = damp(lead.yaw, tension ? 0 : -vSide * 16, 0.9, dt);
  lead.x = damp(lead.x, tension ? 0 : vx * 0.45, 1.5, dt); lead.z = damp(lead.z, tension ? 0 : vz * 0.45, 1.5, dt);
  const want = { yaw: user.yaw + lead.yaw, pitch: user.pitch + lead.pitch, dist: user.dist * (1 + lead.dist), lookY: 1.45 };
  if (tension) {
    want.pitch = 13; want.dist = clamp(wd * 0.25 + 4.5, 6, 9); want.lookY = 1.3;
    const toThreat = Math.atan2(-(W.x - P.x), -(W.z - P.z)) / DEG + 32; // tres cuartos: se ve la lanza y la fiera
    user.yaw += angDiff(toThreat * DEG, user.yaw * DEG) / DEG * (1 - Math.exp(-1.6 * dt));
    want.yaw = user.yaw;
  }
  if (!P.alive) { want.pitch = 40; want.dist = 5 + P.deadT * 0.6; want.lookY = 0.4; user.yaw += dt * 6; want.yaw = user.yaw; }
  const k = tension ? 3 : 1.6;
  cam.yaw = damp(cam.yaw, want.yaw, k * 1.5, dtReal); cam.pitch = damp(cam.pitch, want.pitch, k, dtReal);
  cam.dist = damp(cam.dist, want.dist, k, dtReal); cam.lookY = damp(cam.lookY, want.lookY, k, dtReal);
  const focus = tension ? 0.15 : 0;
  camTarget.lerp(new THREE.Vector3(lerp(P.x + lead.x, W.x, focus), lerp(py, wy, focus) + cam.lookY, lerp(P.z + lead.z, W.z, focus)), 1 - Math.exp(-(tension ? 3 : 8) * dtReal));
  const yr = cam.yaw * DEG, pr2 = cam.pitch * DEG, h = Math.cos(pr2) * cam.dist;
  camera.position.set(camTarget.x + Math.sin(yr) * h, camTarget.y + Math.sin(pr2) * cam.dist, camTarget.z + Math.cos(yr) * h);
  const ground = heightAt(camera.position.x, camera.position.z) + 0.6;
  if (camera.position.y < ground) camera.position.y = ground;
  camera.lookAt(camTarget);
  if (shake > 0) { shake -= dtReal; const a = shake * 0.25; camera.position.x += (Math.random() - 0.5) * a; camera.position.y += (Math.random() - 0.5) * a; }
  sky.position.copy(camera.position);
  updateBillboards(Math.atan2(camera.position.x - camTarget.x, camera.position.z - camTarget.z));
  sun.target.position.copy(camTarget);

  // ojos que se adaptan a la oscuridad
  const nf = clamp(1 - (nearFire - 2) / 12, 0, 1);
  const targetExp = lerp(1, lerp(3.6, 0.85, nf), night);
  exposure = damp(exposure, targetExp, targetExp > exposure ? 0.45 : 2.5, dtReal);
  renderer.toneMappingExposure = exposure;

  // sonido
  const growl = W.state === 'agacha' ? 1 : W.state === 'flanquea' ? 0.7 : W.state === 'acerca' ? 0.45 : W.state === 'acecha' && wd < 14 ? 0.2 : 0;
  const fear = !P.alive ? 0 : clamp((tension ? 0.45 : 0) + (1 - P.hp / 100) * 0.6, 0, 1);
  ambience(growl, fear, dt, P.alive ? fatigue : 0);

  // interfaz: sin barras; el daño se lee en la pantalla y en el cuerpo
  flashEl.style.opacity = Math.max(0, parseFloat(flashEl.style.opacity || 0) - dtReal * 2.2);
  hurtEl.style.opacity = clamp((1 - P.hp / 100) * 1.1 + (P.bleed ? 0.15 + Math.sin(elapsed * 6) * 0.08 : 0), 0, 0.95);
  renderer.domElement.style.filter = fatigue > 0.05 ? `saturate(${1 - fatigue * 0.65})` : '';
  document.getElementById('mode').textContent = mode;
  document.getElementById('mode').className = tension ? 'tension' : '';
  document.getElementById('vignette').style.opacity = tension ? 0.7 : 0;
  document.getElementById('time').textContent = TIMES[timeIdx].name;
  document.getElementById('bar-hp').style.width = `${Math.max(0, P.hp)}%`;
  document.getElementById('bar-en').style.width = `${P.energy}%`;
  document.getElementById('bar-wolf').style.width = `${Math.max(0, W.hp / WOLF_HP * 100)}%`;
  document.getElementById('bar-state').textContent = `Lobo: ${W.state}`;
  if (toastT > 0) { toastT -= dtReal; if (toastT <= 0) document.getElementById('toast').classList.remove('on'); }
}

// el lobo reacciona a tus estocadas: si no ve peligro real, salta hacia atrás
function wolfSeesThrust(wd) {
  if (['acecha', 'acerca', 'flanquea'].includes(W.state) && wd < 4.5 && Math.random() < 0.55) {
    const a = Math.atan2(W.x - P.x, W.z - P.z);
    W.vx = Math.sin(a) * 10; W.vz = Math.cos(a) * 10; W.state = 'retrocede'; W.t = 0.4;
  }
}
function crouch(tell) { W.state = 'agacha'; W.t = 0; W.tell = tell; W.feint = false; }

function updateWolf(dt, wd, night) {
  W.t += dt; W.flash -= dt; W.cooldown -= dt;
  const toP = Math.atan2(P.x - W.x, P.z - W.z);
  const playerByFire = Math.hypot(P.x - FIRE.x, P.z - FIRE.z) < 6;
  // ¿la lanza firme le apunta? entonces no se lanza de frente
  const guarded = P.bracing && Math.abs(angDiff(faceTo(W.x, W.z), P.facing)) < 0.6;
  const wary = W.impaled > 0 && P.bracing;
  const backTurned = Math.abs(angDiff(faceTo(W.x, W.z), P.facing)) > 1.8; // le das la espalda
  const tellRange = () => (night > 0.5 ? 0.4 + Math.random() * 0.25 : 0.5 + Math.random() * 0.3);
  // castiga errores: estocada al aire cerca de él = mordida casi sin aviso
  if (P.whiffT > 0 && wd < 4.5 && ['acecha', 'acerca', 'flanquea', 'recupera', 'retrocede'].includes(W.state) && P.alive) { P.whiffT = 0; crouch(0.2); }
  let tx = W.x, tz = W.z, sp = 0, pose = 'walk', faceP = false;
  const goto = (x, z, s) => { tx = x; tz = z; sp = s; };

  switch (W.state) {
    case 'merodea': {
      if (W.tx === undefined || W.t > 6) { W.t = 0; W.tx = W.home.x + (Math.random() - 0.5) * 30; W.tz = W.home.y + (Math.random() - 0.5) * 30; }
      goto(W.tx, W.tz, 1.6);
      if (wd < 26 && P.alive) { W.state = 'acecha'; W.t = 0; W.cooldown = 2.5; }
      break;
    }
    case 'acecha': { // rodea a distancia y espera su momento
      if (!P.alive) { W.state = 'merodea'; break; }
      W.angle += dt * 0.4;
      const r = playerByFire ? 11 : 10;
      const cx = playerByFire ? FIRE.x : P.x, cz = playerByFire ? FIRE.z : P.z;
      if (W.t < 0.1) W.angle = Math.atan2(W.z - cz, W.x - cx);
      goto(cx + Math.cos(W.angle) * r, cz + Math.sin(W.angle) * r, 3.4);
      if ((W.cooldown <= 0 || (backTurned && W.cooldown < 1)) && !playerByFire && wd < 16) { W.state = 'acerca'; W.t = 0; }
      if (wd > 34) { W.state = 'merodea'; W.t = 0; }
      break;
    }
    case 'acerca': { // se acerca de frente, gruñendo
      faceP = true;
      goto(P.x - Math.sin(toP) * 4.2, P.z - Math.cos(toP) * 4.2, 3.2);
      if ((guarded || wary) && wd < 7) { W.state = 'flanquea'; W.t = 0; W.flank = Math.random() < 0.5 ? 1 : -1; W.flanks = (W.flanks || 0) + 1; break; }
      if (backTurned && wd < 6.5) { crouch(0.3); break; } // por la espalda: casi sin aviso
      if (wd < 5) { crouch(tellRange()); W.feint = Math.random() < 0.15; }
      if (playerByFire) { W.state = 'acecha'; W.t = 0; W.cooldown = 3; }
      if (W.t > 5) { W.state = 'acecha'; W.t = 0; W.cooldown = 1; }
      break;
    }
    case 'agacha': { // la señal: se agacha, orejas atrás, lomo erizado
      pose = 'crouch'; faceP = true;
      const tell = W.tell ?? 0.7;
      if (W.t > tell) {
        if (W.feint) { W.state = 'retrocede'; W.t = 0; }
        else if ((guarded || wary) && P.braceT >= 0.25) { W.state = 'flanquea'; W.t = 0; W.flank = Math.random() < 0.5 ? 1 : -1; W.flanks = (W.flanks || 0) + 1; } // vio la lanza con tiempo: no salta. Solo si la levantas en el último cuarto de segundo ya no puede frenar
        else {
          W.state = 'salta'; W.t = 0; W.hasBit = false; W.missed = false;
          // apunta a donde vas a estar, no a donde estás
          const lx = P.x + Math.sin(P.facing) * P.speed * 0.25, lz = P.z + Math.cos(P.facing) * P.speed * 0.25;
          W.lungeDir = Math.atan2(lx - W.x, lz - W.z);
        }
      }
      break;
    }
    case 'flanquea': { // ve la lanza: te rodea buscando un costado, o espera a que te canses
      faceP = true;
      const a = Math.atan2(W.z - P.z, W.x - P.x) + W.flank * dt * 1.5;
      goto(P.x + Math.cos(a) * 4.6, P.z + Math.sin(a) * 4.6, 5.5);
      if (W.flanks >= 3) { W.state = 'retrocede'; W.t = 0; W.flanks = 0; break; } // no encuentra hueco: se retira un momento
      if (!guarded && !wary && wd < 6 && W.t > 0.25) crouch(backTurned ? 0.3 : 0.4); // encontró un hueco: ataca rápido
      else if (W.t > 2.6) { W.state = 'retrocede'; W.t = 0; }
      else if (W.t > 1.3 && Math.random() < dt * 0.8) W.flank *= -1; // cambia de lado para engañarte
      break;
    }
    case 'salta': {
      pose = 'lunge';
      const v = 11;
      // al inicio del salto corrige el rumbo hacia ti: esquivar antes de tiempo no sirve
      if (W.t < 0.18) W.lungeDir += clamp(angDiff(toP, W.lungeDir), -5 * dt, 5 * dt);
      W.vx = Math.sin(W.lungeDir) * v; W.vz = Math.cos(W.lungeDir) * v;
      if (!W.hasBit && wd < 1.35 && P.alive) {
        W.hasBit = true;
        const facing = Math.abs(angDiff(faceTo(W.x, W.z), P.facing)) < 0.5;
        if (P.iframes > 0 || P.y > 0.55) { P.stats.dodged++; toast(P.y > 0.55 ? '¡Lo saltaste!' : '¡Esquivado!', 0.8); }
        else if (P.bracing && facing) { P.stats.blocked++; P.energy -= 12; W.impaled = (W.impaled || 0) + 1; toast('¡Se clavó en tu lanza!', 1.2); hurtWolf(20, 'impale'); if (Math.random() < 0.35) { P.hp -= 8; P.hurtT = 0.3; flashEl.style.opacity = 0.4; sfx.bite(); toast('Se clavó, pero alcanzó a morderte', 1.4); if (P.hp <= 0) die(); } return; }
        else hurtPlayer(night > 0.5 ? 24 : 20, W.x, W.z);
      }
      if (W.t > 0.42) { W.state = 'recupera'; W.t = 0; W.missed = !W.hasBit || P.stats.dodged > (W.dodgedSeen || 0); W.dodgedSeen = P.stats.dodged; W.combo = W.combo || 0; }
      break;
    }
    case 'recupera': { // tras el salto queda expuesto un momento
      faceP = true;
      W.vx *= Math.pow(0.001, dt); W.vz *= Math.pow(0.001, dt);
      // si falló, a veces vuelve a morder enseguida
      if (W.missed && W.combo < 1 && W.t > 0.15 && wd < 4 && Math.random() < 0.45) { W.combo++; crouch(0.22); break; }
      if (W.t > 0.6) { W.state = 'retrocede'; W.t = 0; W.combo = 0; }
      break;
    }
    case 'aturdido': {
      W.vx *= Math.pow(0.01, dt); W.vz *= Math.pow(0.01, dt);
      if (W.t > 1.4) { W.state = 'retrocede'; W.t = 0; }
      break;
    }
    case 'retrocede': {
      goto(P.x - Math.sin(toP) * 9, P.z - Math.cos(toP) * 9, 4.5);
      if (W.t > 1.3) { W.state = 'acecha'; W.t = 0; W.cooldown = (night > 0.5 ? 0.8 : 1.3) + Math.random() * 1.2; }
      break;
    }
    case 'huye': {
      goto(W.x + Math.sin(toP + Math.PI) * 20, W.z + Math.cos(toP + Math.PI) * 20, 6);
      if (W.t > 0.3 && !W.fled) { W.fled = true; toast('El lobo huye herido', 2); finish('fled'); }
      if (W.t > 8) { W.state = 'lejos'; }
      break;
    }
    case 'muerto': pose = 'dead'; W.vx *= Math.pow(0.001, dt); W.vz *= Math.pow(0.001, dt); break;
    case 'lejos': W.x = 999; break;
  }

  if (sp > 0) {
    const dx = tx - W.x, dz = tz - W.z, l = Math.hypot(dx, dz);
    const v = l > 0.4 ? sp : 0;
    W.vx = damp(W.vx, l > 0 ? (dx / l) * v : 0, 5, dt); W.vz = damp(W.vz, l > 0 ? (dz / l) * v : 0, 5, dt);
  } else if (!['salta', 'recupera', 'aturdido', 'muerto'].includes(W.state)) {
    W.vx = damp(W.vx, 0, 6, dt); W.vz = damp(W.vz, 0, 6, dt);
  }
  // no atraviesa al jugador ni entra al fuego
  if (W.state !== 'salta' && wd < 1.6 && W.state !== 'muerto') { W.vx -= Math.sin(toP) * 3; W.vz -= Math.cos(toP) * 3; }
  const fdw = Math.hypot(W.x - FIRE.x, W.z - FIRE.z);
  if (fdw < 7 && W.state !== 'muerto') { const a = Math.atan2(W.x - FIRE.x, W.z - FIRE.z); W.vx += Math.sin(a) * 6 * dt * 10; W.vz += Math.cos(a) * 6 * dt * 10; }
  W.x += W.vx * dt; W.z += W.vz * dt;
  const wspeed = Math.hypot(W.vx, W.vz);
  W.phase += wspeed * dt * 3;
  const wy = heightAt(W.x, W.z);
  wolf.position.set(W.x, wy - 0.05, W.z); wShadow.position.set(W.x, wy + 0.04, W.z);
  const sx = faceP || W.state === 'salta' ? (P.x - W.x) * right.x + (P.z - W.z) * right.z : W.vx * right.x + W.vz * right.z;
  if (Math.abs(sx) > 0.15 && W.state !== 'muerto') W.dir = Math.sign(sx);
  wolf.scale.x = W.dir;
  wolfMat.map = pose === 'walk' ? wolfTx.walk[wspeed > 0.3 ? Math.floor(W.phase) % 4 : 0] : wolfTx[pose];
  wolfMat.emissiveMap = wolfEyes[pose];
  wolfMat.emissiveIntensity = W.state === 'muerto' ? 0 : Math.max(night * 3, pose === 'crouch' ? 1.2 : 0);
  wolfMat.color.setScalar(W.flash > 0 ? 3 : 1);
}

function frame() {
  const dt = Math.min(0.1, clock.getDelta()); // con pocos cuadros por segundo el juego no se pone en cámara lenta
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
reset();
camTarget.set(P.x, heightAt(P.x, P.z) + 1.45, P.z);
requestAnimationFrame(frame);
window.__clan = { P, W, user, setTime: (i) => { timeIdx = i; timeT = i; }, callWolf, press, keys, reset };
