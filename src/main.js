import { ITEMS, RESOURCES, ANIMALS, SPAWNS, NIGHT_BOOST, DANGEROUS, RECIPES, WEAPONS, TRIBE_X, RENOWN_NEEDED, DAY_LENGTH, BEAT } from './data.js';
import { terrain, biome, BIOME_NAME, generateChunk, CHUNK, pick, noise } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);
let W = 0, H = 0, BASE = 0;

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  BASE = H * 0.72;
}
addEventListener('resize', resize); resize();

const groundY = (x) => BASE + terrain(x);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const HUMANS = new Set(['neandertal', 'cazador']);

// ---------- Estado ----------
const SAVE_KEY = 'paleo-clan-save-v1';
let S; // estado persistente
function newState() {
  return {
    player: { x: 0, hp: 100, hunger: 100 },
    inv: {}, crafted: [], fires: [], depleted: [],
    renown: 0, time: 0.08, spawnX: 0, joined: false, kills: 0,
  };
}
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return { ...newState(), ...JSON.parse(raw) }; } catch { /* sin storage */ }
  return newState();
}
function save() {
  try { S.player.x = P.x; S.player.hp = P.hp; S.player.hunger = P.hunger; S.depleted = [...depleted]; S.crafted = [...crafted]; localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* sin storage */ }
}

let P, depleted, crafted, chunks, animals, particles, floaters;
function init(fresh) {
  if (fresh) { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } }
  S = fresh ? newState() : load();
  P = { x: S.player.x, z: 0, vz: 0, vx: 0, kb: 0, facing: 1, hp: S.player.hp, hunger: S.player.hunger, atkCd: 0, atkAnim: 0, gatherCd: 0, flash: 0, walk: 0, alive: true };
  depleted = new Set(S.depleted); crafted = new Set(S.crafted);
  chunks = new Map(); animals = []; particles = []; floaters = [];
  combo = 0; fervor = 0; lastJudge = null;
}

// ---------- Input ----------
const held = {}; const pressed = new Set();
const KEYMAP = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'jump', ArrowUp: 'jump', Space: 'jump', KeyJ: 'attack', KeyK: 'attack', KeyE: 'gather', KeyF: 'eat', KeyC: 'craft', KeyM: 'mute' };
addEventListener('keydown', (e) => { const k = KEYMAP[e.code]; if (!k) return; e.preventDefault(); if (!held[k]) pressed.add(k); held[k] = true; });
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) held[k] = false; });
canvas.addEventListener('mousedown', () => pressed.add('attack'));
document.querySelectorAll('#touch button').forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!held[k]) pressed.add(k); held[k] = true; });
  const up = () => { held[k] = false; };
  b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
});

// ---------- Audio (tambor) ----------
let actx = null, muted = false;
function initAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch { actx = null; } }
function drum(freq, vol, len = 0.18) {
  if (!actx || muted) return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.45, t + len);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + len);
}

// ---------- Ritmo ----------
let beatClock = 0, beatCount = 0, combo = 0, fervor = 0, lastJudge = null, judgeT = 0;
function beatWindow() { return crafted.has('tambor') ? 0.14 : 0.1; }
function judgeBeat() {
  const ph = beatClock % BEAT;
  return Math.min(ph, BEAT - ph) <= beatWindow();
}

// ---------- Mundo ----------
function ensureChunks(camX) {
  const a = Math.floor((camX - CHUNK) / CHUNK), b = Math.floor((camX + W + CHUNK) / CHUNK);
  for (let ci = a; ci <= b; ci++) if (!chunks.has(ci)) chunks.set(ci, generateChunk(ci, depleted));
  for (const ci of chunks.keys()) if (ci < a - 4 || ci > b + 4) chunks.delete(ci);
}
function* nearbyResources(x, r) {
  const a = Math.floor((x - r) / CHUNK), b = Math.floor((x + r) / CHUNK);
  for (let ci = a; ci <= b; ci++) { const c = chunks.get(ci); if (c) for (const res of c) yield [res, c]; }
}
const daylight = () => clamp(0.5 + 1.3 * Math.sin(S.time * Math.PI * 2), 0, 1);
const isNight = () => daylight() < 0.25;
const nearFire = (x, r) => S.fires.some((f) => Math.abs(f.x - x) < r);
const nearTribe = (x, r) => Math.abs(x - TRIBE_X) < r;

function addItems(drops, x, bonus = {}) {
  let dy = 0;
  for (const k in drops) {
    const n = drops[k] + (bonus[k] || 0);
    S.inv[k] = (S.inv[k] || 0) + n;
    float(`+${n} ${ITEMS[k]}`, x, 90 + dy, '#f3e9d2'); dy += 18;
  }
}
function float(text, x, z, color = '#fff') { floaters.push({ text, x, z, t: 1.4, color }); }
function burst(x, z, color, n = 8) {
  for (let i = 0; i < n; i++) particles.push({ x, z, vx: (Math.random() - 0.5) * 300, vz: Math.random() * 300 + 50, t: 0.6, color });
}
let shake = 0;

// ---------- Animales ----------
let spawnT = 0;
function spawnAnimals(dt) {
  spawnT -= dt; if (spawnT > 0) return; spawnT = 1.5;
  const cap = 6 + (isNight() ? 3 : 0);
  if (animals.length >= cap) return;
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = P.x + side * (W / 2 + 150 + Math.random() * 450);
  if (nearTribe(x, 600)) return;
  const danger = Math.min(1.5, Math.abs(x) / 4000);
  const w = { ...SPAWNS[biome(x)] };
  for (const k in w) {
    if (isNight() && NIGHT_BOOST[k]) w[k] *= NIGHT_BOOST[k];
    if (DANGEROUS.has(k)) w[k] *= 0.1 + danger;
  }
  const type = pick(w, Math.random()), cfg = ANIMALS[type];
  animals.push({ type, x, hp: cfg.hp, dir: 0, stateT: 0, atkCd: 1, flash: 0, kb: 0, vx: 0, facing: -side, walk: 0, angry: false, scared: 0, chasing: false });
}

function updateAnimals(dt) {
  for (const a of animals) {
    const cfg = ANIMALS[a.type];
    a.atkCd -= dt; a.flash -= dt; a.stateT -= dt; a.scared -= dt;
    const dx = P.x - a.x, dist = Math.abs(dx), dirTo = Math.sign(dx) || 1;
    const human = HUMANS.has(a.type);
    const playerSafe = nearTribe(P.x, 350) || (!human && nearFire(P.x, 150));
    let vx = 0; a.chasing = false;
    const wander = () => {
      if (a.stateT <= 0) { a.dir = [-1, 0, 1][Math.floor(Math.random() * 3)]; a.stateT = 2 + Math.random() * 3; }
      return a.dir * cfg.speed * 0.3;
    };
    if (cfg.behavior === 'flee') {
      vx = (dist < 260 || a.scared > 0) && P.alive ? -dirTo * cfg.speed : wander();
    } else if (cfg.behavior === 'hostile' || a.angry) {
      if (P.alive && dist < (cfg.aggro || 600) && !playerSafe) {
        a.chasing = true;
        const reach = cfg.w / 2 + 22;
        if (dist > reach) vx = dirTo * cfg.speed;
        else if (a.atkCd <= 0 && P.z < 40) hitPlayer(a, cfg, dirTo);
      } else vx = wander();
    } else vx = wander();
    // el fuego ahuyenta a las bestias
    if (!human) { const f = S.fires.find((f) => Math.abs(f.x - a.x) < 170); if (f) vx = (Math.sign(a.x - f.x) || 1) * cfg.speed * 0.8; }
    if (nearTribe(a.x, 400)) vx = (Math.sign(a.x - TRIBE_X) || 1) * cfg.speed;
    a.vx = vx;
    a.x += (vx + a.kb) * dt; a.kb *= Math.pow(0.02, dt);
    if (vx) a.facing = Math.sign(vx); else if (a.chasing) a.facing = dirTo;
    a.walk += Math.abs(vx) * dt * 0.05;
  }
  animals = animals.filter((a) => a.hp > 0 && Math.abs(a.x - P.x) < 2200);
}

function hitPlayer(a, cfg, dirTo) {
  a.atkCd = 1.1;
  const armor = crafted.has('hueso') ? 0.5 : crafted.has('ropa') ? 0.3 : 0;
  const dmg = Math.round(cfg.dmg * (1 - armor));
  P.hp -= dmg; P.flash = 0.3; P.kb = dirTo * 380; shake = 8;
  float(`-${dmg}`, P.x, 80, '#ff5c3c'); burst(P.x, 40, '#a01010', 6);
  drum(70, 0.25, 0.25);
}

function playerAttack() {
  if (P.atkCd > 0 || !P.alive) return;
  const weapon = crafted.has('silex') ? WEAPONS.silex : crafted.has('lanza') ? WEAPONS.lanza : WEAPONS.mano;
  P.atkCd = 0.38; P.atkAnim = 0.2;
  const perfect = judgeBeat();
  if (perfect) {
    combo++; drum(320, 0.22, 0.12);
    if (combo >= 4 && fervor <= 0) { fervor = crafted.has('tambor') ? 9 : 6; float('¡FERVOR!', P.x, 130, '#f0b54a'); }
    lastJudge = combo > 1 ? `¡PERFECTO! x${combo}` : '¡PERFECTO!';
  } else { combo = 0; lastJudge = 'fuera de ritmo'; }
  judgeT = 0.6;
  const mult = (perfect ? 1.5 : 1) * (fervor > 0 ? (crafted.has('tambor') ? 2.2 : 1.8) : 1);
  const dmg = Math.round(weapon.dmg * mult);
  for (const a of animals) {
    const cfg = ANIMALS[a.type], dx = a.x - P.x;
    if (dx * P.facing < -15 || Math.abs(dx) > weapon.range + cfg.w / 2) continue;
    a.hp -= dmg; a.flash = 0.15; a.kb = P.facing * (a.type === 'mamut' ? 80 : 320);
    if (cfg.behavior === 'neutral') a.angry = true;
    if (cfg.behavior === 'flee') a.scared = 5;
    float(`${dmg}`, a.x, cfg.h + 20, perfect ? '#f0b54a' : '#fff');
    burst(a.x, cfg.h / 2, '#7a0d0d', perfect ? 12 : 6);
    if (a.hp <= 0) {
      addItems(cfg.drops, a.x);
      S.kills++;
      if (cfg.renown) { S.renown += cfg.renown; float(`+${cfg.renown} renombre`, a.x, cfg.h + 60, '#f0b54a'); }
    }
  }
}

function gather() {
  if (P.gatherCd > 0) return;
  if (nearTribe(P.x, 250)) return talkTribe();
  let best = null, bestD = 75, bestChunk = null;
  for (const [res, c] of nearbyResources(P.x, 100)) {
    const d = Math.abs(res.x - P.x);
    if (d < bestD) { best = res; bestD = d; bestChunk = c; }
  }
  if (!best) return;
  P.gatherCd = 0.3; P.atkAnim = 0.15;
  const def = RESOURCES[best.type];
  best.hp -= def.tool && crafted.has('hacha') ? 2 : 1; best.shake = 0.2;
  burst(best.x, 30, best.type === 'arbol' ? '#3b2a14' : '#555', 4);
  drum(180, 0.08, 0.08);
  if (best.hp <= 0) {
    addItems(def.drops, best.x, def.tool && crafted.has('hacha') ? { madera: best.type === 'arbol' ? 1 : 0, piedra: best.type === 'roca' ? 1 : 0 } : {});
    depleted.add(best.id);
    bestChunk.splice(bestChunk.indexOf(best), 1);
  }
}

function eat() {
  if ((S.inv.carne || 0) > 0) {
    S.inv.carne--;
    const cooked = nearFire(P.x, 120);
    P.hunger = Math.min(100, P.hunger + (cooked ? 40 : 20)); P.hp = Math.min(100, P.hp + (cooked ? 15 : 3));
    float(cooked ? 'Carne asada ✓' : 'Carne cruda...', P.x, 100, '#f3e9d2');
  } else if ((S.inv.bayas || 0) > 0) {
    S.inv.bayas--; P.hunger = Math.min(100, P.hunger + 10);
    float('Bayas', P.x, 100);
  } else float('Nada que comer', P.x, 100, '#ff9a7a');
}

function talkTribe() {
  P.gatherCd = 0.5;
  if (S.joined) return dialog('El anciano sonríe: «Tu fuego es nuestro fuego.»\n\n(Próximo capítulo: familia y clan propio.)');
  if (S.renown >= RENOWN_NEEDED) {
    S.joined = true; S.spawnX = TRIBE_X; save();
    dialog('Los cazadores ven tus trofeos. El anciano te ofrece un lugar junto al fuego.\n\n🔥 LA TRIBU TE HA ACEPTADO 🔥\n\nCapítulo 1 completo. Has sobrevivido solo — ahora empieza la historia de tu clan.');
  } else {
    dialog(`Los ancianos te miran con desconfianza. «Un extraño débil trae hambre, no carne.»\n\nRenombre: ${S.renown} / ${RENOWN_NEEDED}. Caza fieras peligrosas y vuelve.`);
  }
}

function die() {
  P.alive = false;
  setTimeout(() => {
    for (const k in S.inv) S.inv[k] = Math.floor(S.inv[k] / 2);
    dialog('Has caído...\n\nDespiertas junto a tu último fuego. Perdiste la mitad de lo que cargabas.', () => {
      P.x = S.spawnX; P.hp = 60; P.hunger = Math.max(P.hunger, 50); P.alive = true; P.z = 0; animals = []; save();
    });
  }, 900);
}

// ---------- UI ----------
let paused = true, dialogCb = null;
function dialog(text, cb) { paused = true; dialogCb = cb || null; $('dialog-text').innerText = text; $('dialog').classList.remove('hidden'); }
$('btn-dialog').onclick = () => { $('dialog').classList.add('hidden'); paused = false; const cb = dialogCb; dialogCb = null; if (cb) cb(); };
let started = false;
function startGame(fresh) { started = true; initAudio(); init(fresh); $('start').classList.add('hidden'); paused = false; }
$('btn-start').onclick = () => startGame(false);
$('btn-new').onclick = () => startGame(true);

function toggleCraft(open) {
  const el = $('craft');
  open = open ?? el.classList.contains('hidden');
  el.classList.toggle('hidden', !open); paused = open;
  if (open) renderRecipes();
}
$('btn-close-craft').onclick = () => toggleCraft(false);
function canCraft(r) {
  if (!r.repeatable && crafted.has(r.id)) return false;
  if (r.requires && !crafted.has(r.requires)) return false;
  return Object.entries(r.cost).every(([k, n]) => (S.inv[k] || 0) >= n);
}
function renderRecipes() {
  const box = $('recipes'); box.innerHTML = '';
  for (const r of RECIPES) {
    const done = !r.repeatable && crafted.has(r.id);
    const row = document.createElement('div'); row.className = 'recipe' + (done ? ' done' : '');
    const cost = Object.entries(r.cost).map(([k, n]) => `<span class="${(S.inv[k] || 0) >= n ? '' : 'miss'}">${ITEMS[k]} ${S.inv[k] || 0}/${n}</span>`).join(' · ');
    const req = r.requires && !crafted.has(r.requires) ? ` <span class="miss">(requiere ${RECIPES.find((x) => x.id === r.requires).name})</span>` : '';
    row.innerHTML = `<div><div class="name">${r.name}</div><div class="desc">${r.desc}</div><div class="cost">${cost}${req}</div></div>`;
    const b = document.createElement('button'); b.textContent = done ? 'Hecho' : 'Fabricar'; b.disabled = !canCraft(r);
    b.onclick = () => craft(r); row.appendChild(b); box.appendChild(row);
  }
}
function craft(r) {
  if (!canCraft(r)) return;
  for (const [k, n] of Object.entries(r.cost)) S.inv[k] -= n;
  if (r.id === 'fogata') {
    const x = P.x + P.facing * 40;
    S.fires.push({ x }); if (S.fires.length > 8) S.fires.shift();
    S.spawnX = x; float('Fogata encendida', x, 90, '#f0b54a');
    toggleCraft(false);
  } else {
    crafted.add(r.id);
    if (r.id === 'collar') S.renown += 3;
    float(r.name + ' ✓', P.x, 110, '#f0b54a');
    renderRecipes();
  }
  drum(240, 0.2, 0.2); save();
}

// ---------- Update ----------
let camX = 0, saveT = 0;
function update(dt) {
  if (pressed.has('mute')) muted = !muted;
  if (pressed.has('craft')) { toggleCraft(); pressed.clear(); return; }

  S.time = (S.time + dt / DAY_LENGTH) % 1;
  beatClock += dt;
  const bc = Math.floor(beatClock / BEAT);
  if (bc !== beatCount) { beatCount = bc; drum(bc % 4 === 0 ? 95 : 75, bc % 4 === 0 ? 0.14 : 0.07); }
  fervor -= dt; judgeT -= dt;

  if (P.alive) {
    const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    P.vx = dir * 230; if (dir) P.facing = dir;
    if (pressed.has('jump') && P.z <= 0) P.vz = 560;
    if (pressed.has('attack')) playerAttack();
    if (pressed.has('gather')) gather();
    if (pressed.has('eat')) eat();
  } else P.vx = 0;
  P.x += (P.vx + P.kb) * dt; P.kb *= Math.pow(0.01, dt);
  P.vz -= 1600 * dt; P.z = Math.max(0, P.z + P.vz * dt); if (P.z === 0) P.vz = Math.max(0, P.vz);
  P.walk += Math.abs(P.vx) * dt * 0.05;
  P.atkCd -= dt; P.atkAnim -= dt; P.gatherCd -= dt; P.flash -= dt;

  // supervivencia
  P.hunger = Math.max(0, P.hunger - dt * 0.4);
  if (P.hunger <= 0) P.hp -= dt * 2;
  else if (P.hunger > 60) P.hp += dt * 0.5;
  if (nearFire(P.x, 120) || nearTribe(P.x, 250)) P.hp += dt * 3;
  P.hp = Math.min(100, P.hp);
  if (P.alive && P.hp <= 0) { P.hp = 0; die(); }

  ensureChunks(camX);
  spawnAnimals(dt);
  updateAnimals(dt);
  for (const c of chunks.values()) for (const r of c) r.shake -= dt;
  for (const p of particles) { p.x += p.vx * dt; p.z += p.vz * dt; p.vz -= 900 * dt; p.t -= dt; }
  particles = particles.filter((p) => p.t > 0 && p.z > -5);
  for (const f of floaters) { f.z += 40 * dt; f.t -= dt; }
  floaters = floaters.filter((f) => f.t > 0);
  shake *= Math.pow(0.001, dt);

  camX = lerp(camX, P.x - W / 2, 1 - Math.pow(0.001, dt));
  saveT -= dt; if (saveT <= 0) { saveT = 10; save(); }
  pressed.clear();
}

// ---------- Render ----------
const SKY = {
  bosque: [[246, 200, 106], [250, 232, 170]],
  estepa: [[244, 170, 80], [252, 220, 150]],
  roca:   [[226, 132, 90], [244, 196, 150]],
};
const DUSK = [[214, 86, 58], [240, 160, 90]], NIGHT = [[16, 20, 48], [42, 46, 86]];
const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
function skyColors() {
  const d = daylight(), day = SKY[biome(P.x)];
  return d < 0.5 ? [mix(NIGHT[0], DUSK[0], d * 2), mix(NIGHT[1], DUSK[1], d * 2)] : [mix(DUSK[0], day[0], (d - .5) * 2), mix(DUSK[1], day[1], (d - .5) * 2)];
}
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

function render() {
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  ctx.save(); ctx.translate(sx, sy);
  const [top, bot] = skyColors();
  const g = ctx.createLinearGradient(0, 0, 0, BASE);
  g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);

  // sol / luna
  const ang = S.time * Math.PI * 2, d = daylight();
  ctx.fillStyle = d > 0.25 ? 'rgba(255,240,200,.9)' : 'rgba(230,235,255,.85)';
  const orbX = W * 0.5 + Math.cos(ang - Math.PI / 2) * W * -0.4;
  const orbY = BASE * 0.85 - Math.abs(Math.sin(ang)) * BASE * 0.65;
  ctx.beginPath(); ctx.arc(orbX, orbY, 34, 0, 7); ctx.fill();

  drawLayer(0.15, 1500, 160, 'rgba(0,0,0,.18)', 11);
  drawLayer(0.4, 600, 90, 'rgba(0,0,0,.35)', 12);

  // humo de la tribu (visible desde lejos como guía)
  const tribeScreen = TRIBE_X - camX;
  if (tribeScreen > -200 && tribeScreen < W + 200) drawSmoke(tribeScreen, groundY(TRIBE_X) - 40);

  // suelo
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-20, H + 20);
  for (let x = -20; x <= W + 20; x += 8) ctx.lineTo(x, groundY(camX + x));
  ctx.lineTo(W + 20, H + 20); ctx.fill();

  const onScreen = (x, m = 200) => x - camX > -m && x - camX < W + m;
  for (const c of chunks.values()) for (const r of c) if (onScreen(r.x)) drawResource(r);
  if (onScreen(TRIBE_X, 500)) drawTribe();
  for (const f of S.fires) if (onScreen(f.x)) drawFire(f.x);
  for (const a of animals) if (onScreen(a.x)) drawAnimal(a);
  drawPlayer();
  for (const p of particles) { ctx.fillStyle = p.color; ctx.fillRect(p.x - camX - 2, groundY(p.x) - p.z - 2, 4, 4); }

  drawNight();
  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
  for (const f of floaters) {
    ctx.globalAlpha = clamp(f.t, 0, 1); ctx.fillStyle = '#000';
    ctx.fillText(f.text, f.x - camX + 2, groundY(f.x) - f.z + 2);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x - camX, groundY(f.x) - f.z);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawHUD();
}

function drawLayer(par, scale, amp, color, seed) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, BASE);
  for (let x = 0; x <= W + 10; x += 10) {
    const wx = camX * par + x;
    ctx.lineTo(x, BASE - 40 - noise(wx / scale, seed) * amp - noise(wx / (scale / 4), seed + 1) * amp * 0.25);
  }
  ctx.lineTo(W + 10, BASE); ctx.lineTo(W + 10, H); ctx.lineTo(0, H); ctx.fill();
}

function drawSmoke(x, y) {
  const t = performance.now() / 1000;
  for (let i = 0; i < 14; i++) {
    const k = (i / 14 + t * 0.05) % 1;
    ctx.fillStyle = `rgba(90,90,90,${0.35 * (1 - k)})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(k * 6 + t) * 20 * k + k * 60, y - k * 380, 14 + k * 40, 0, 7); ctx.fill();
  }
}

function drawResource(r) {
  const x = r.x - camX + (r.shake > 0 ? Math.sin(r.shake * 80) * 4 : 0), y = groundY(r.x) + 2, s = r.scale;
  ctx.fillStyle = '#000';
  switch (r.type) {
    case 'arbol':
      ctx.fillRect(x - 6 * s, y - 90 * s, 12 * s, 90 * s);
      for (const [ox, oy, rr] of [[0, -120, 38], [-28, -95, 28], [28, -98, 30], [0, -150, 26]]) { ctx.beginPath(); ctx.arc(x + ox * s, y + oy * s, rr * s, 0, 7); ctx.fill(); }
      break;
    case 'roca':
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath();
      ctx.moveTo(x - 28 * s, y); ctx.lineTo(x - 22 * s, y - 26 * s); ctx.lineTo(x - 4 * s, y - 38 * s); ctx.lineTo(x + 20 * s, y - 30 * s); ctx.lineTo(x + 28 * s, y); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 38 * s); ctx.lineTo(x + 2 * s, y - 14 * s); ctx.stroke();
      break;
    case 'arbusto':
      for (const [ox, oy, rr] of [[-12, -14, 16], [10, -16, 18], [0, -28, 15]]) { ctx.beginPath(); ctx.arc(x + ox * s, y + oy * s, rr * s, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#c0283a';
      for (const [ox, oy] of [[-14, -20], [6, -30], [14, -12], [-2, -10], [2, -22]]) { ctx.beginPath(); ctx.arc(x + ox * s, y + oy * s, 3.5, 0, 7); ctx.fill(); }
      break;
    case 'hierba':
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 4, y); ctx.quadraticCurveTo(x + i * 6, y - 20 * s, x + i * 9, y - (34 - Math.abs(i) * 4) * s); ctx.stroke(); }
      break;
    case 'huesos':
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(x - 18, y - 6, 30, 5); ctx.beginPath(); ctx.arc(x - 18, y - 4, 4, 0, 7); ctx.arc(x + 12, y - 4, 4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 8, y - 14, 9, Math.PI, 0); ctx.fill();
      break;
  }
}

function drawFire(wx) {
  const x = wx - camX, y = groundY(wx), t = performance.now() / 120;
  ctx.fillStyle = '#000'; ctx.save(); ctx.translate(x, y - 4);
  ctx.rotate(0.3); ctx.fillRect(-20, -4, 40, 8); ctx.rotate(-0.6); ctx.fillRect(-20, -4, 40, 8); ctx.restore();
  for (const [c, s] of [['#e2541f', 1], ['#f5a524', 0.65], ['#fff1a8', 0.35]]) {
    ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(x - 16 * s, y - 6); ctx.quadraticCurveTo(x - 12 * s, y - 30 * s, x + Math.sin(t) * 4, y - (48 + Math.sin(t * 1.7) * 6) * s);
    ctx.quadraticCurveTo(x + 12 * s, y - 30 * s, x + 16 * s, y - 6); ctx.fill();
  }
}

function drawTribe() {
  const base = TRIBE_X - camX, t = performance.now() / 1000;
  ctx.fillStyle = '#000';
  for (const ox of [-260, -130, 140, 270]) {
    const y = groundY(TRIBE_X + ox);
    ctx.beginPath(); ctx.moveTo(base + ox - 55, y); ctx.lineTo(base + ox, y - 95); ctx.lineTo(base + ox + 55, y); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(base + ox - 8, y - 110); ctx.lineTo(base + ox + 8, y - 80); ctx.moveTo(base + ox + 8, y - 110); ctx.lineTo(base + ox - 8, y - 80); ctx.stroke();
  }
  drawFire(TRIBE_X);
  [-70, -40, 50, 85, 200].forEach((ox, i) => drawHuman(TRIBE_X + ox, Math.abs(Math.sin(t * 2 + i)) * 4, ox < 0 ? 1 : -1, { eye: '#fff', walk: 0, spear: i % 2 === 0 }));
}

function drawHuman(wx, z, facing, { eye = '#fff', walk = 0, spear = false, attack = false, flash = false, fur = 0, h = 1 } = {}) {
  const x = wx - camX, y = groundY(wx) - z;
  ctx.fillStyle = flash ? '#fff' : '#000'; ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 6; ctx.lineCap = 'round';
  const l = Math.sin(walk * 2) * 10;
  ctx.beginPath(); ctx.moveTo(x - 4, y - 24 * h); ctx.lineTo(x - 4 + l, y); ctx.moveTo(x + 4, y - 24 * h); ctx.lineTo(x + 4 - l, y); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y - 38 * h, 13, 18 * h, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + facing * 2, y - 64 * h, 13, 0, 7); ctx.fill();
  if (fur) { // ropa de piel / hueso
    ctx.fillStyle = fur === 2 ? '#e8dcc0' : '#7a5230';
    ctx.beginPath(); ctx.moveTo(x - 14, y - 46 * h); for (let i = 0; i <= 6; i++) ctx.lineTo(x - 14 + i * 4.6, y - (i % 2 ? 22 : 28) * h); ctx.lineTo(x + 14, y - 46 * h); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#000';
  }
  ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(x + facing * 7, y - 66 * h, 4, 0, 7); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x + facing * 8.5, y - 66 * h, 1.8, 0, 7); ctx.fill();
  ctx.strokeStyle = flash ? '#fff' : '#000';
  if (spear) {
    const reach = attack ? 30 : 0;
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - facing * 26 + facing * reach, y - 44 * h); ctx.lineTo(x + facing * (48 + reach), y - 52 * h); ctx.stroke();
    ctx.fillStyle = spear === 'silex' ? '#9aa3ad' : ctx.strokeStyle; ctx.beginPath();
    const tx = x + facing * (48 + reach), ty = y - 52 * h;
    ctx.moveTo(tx, ty - 5); ctx.lineTo(tx + facing * 14, ty - 1); ctx.lineTo(tx, ty + 4); ctx.fill();
  } else {
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - 46 * h); ctx.lineTo(x + facing * (attack ? 30 : 14), y - (attack ? 50 : 30) * h); ctx.stroke();
  }
}

function drawPlayer() {
  if (!P.alive) { ctx.globalAlpha = 0.4; }
  const spear = crafted.has('silex') ? 'silex' : crafted.has('lanza');
  drawHuman(P.x, P.z, P.facing, { eye: fervor > 0 ? '#f0b54a' : '#fff', walk: P.walk, spear, attack: P.atkAnim > 0, flash: P.flash > 0 && Math.floor(P.flash * 20) % 2 === 0, fur: crafted.has('hueso') ? 2 : crafted.has('ropa') ? 1 : 0 });
  ctx.globalAlpha = 1;
  if (fervor > 0) { ctx.strokeStyle = 'rgba(240,181,74,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x - camX, groundY(P.x) - P.z - 40, 50 + Math.sin(beatClock * 10) * 4, 0, 7); ctx.stroke(); }
}

function drawAnimal(a) {
  const cfg = ANIMALS[a.type];
  if (HUMANS.has(a.type)) {
    return drawHuman(a.x, 0, a.facing, { eye: a.chasing ? '#ff3b2f' : '#fff', walk: a.walk, spear: a.type === 'cazador', attack: a.atkCd > 0.9, flash: a.flash > 0, h: a.type === 'neandertal' ? 0.9 : 1.05, fur: a.type === 'neandertal' ? 1 : 0 });
  }
  const x = a.x - camX, y = groundY(a.x), f = a.facing, w = cfg.w, h = cfg.h, l = Math.sin(a.walk * 2) * 8;
  const col = a.flash > 0 ? '#fff' : '#000';
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
  const legs = (bodyY, len, xs, wdt = 6) => { ctx.lineWidth = wdt; ctx.beginPath(); xs.forEach((ox, i) => { ctx.moveTo(x + ox, bodyY); ctx.lineTo(x + ox + (i % 2 ? l : -l), bodyY + len); }); ctx.stroke(); };
  const eye = (ex, ey, r = 3.5) => { ctx.fillStyle = a.chasing || a.angry ? '#ff3b2f' : '#fff'; ctx.beginPath(); ctx.arc(ex, ey, r, 0, 7); ctx.fill(); ctx.fillStyle = col; };
  switch (a.type) {
    case 'ciervo': {
      legs(y - 26, 26, [-16, -10, 12, 18], 4);
      ctx.beginPath(); ctx.ellipse(x, y - 32, w / 2, 12, 0, 0, 7); ctx.fill();
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + f * 18, y - 36); ctx.lineTo(x + f * 28, y - 58); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + f * 34, y - 60, 10, 6, 0, 0, 7); ctx.fill();
      ctx.lineWidth = 3; ctx.beginPath();
      for (const s of [-1, 1]) { ctx.moveTo(x + f * 28, y - 64); ctx.lineTo(x + f * 28 + s * 16, y - 88); ctx.moveTo(x + f * 28 + s * 8, y - 76); ctx.lineTo(x + f * 28 + s * 18, y - 74); }
      ctx.stroke(); eye(x + f * 36, y - 62, 2.5);
      break;
    }
    case 'lobo': {
      legs(y - 18, 18, [-18, -12, 14, 20], 5);
      ctx.beginPath(); ctx.ellipse(x, y - 22, w / 2, 10, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + f * 20, y - 30); ctx.lineTo(x + f * 44, y - 24); ctx.lineTo(x + f * 22, y - 16); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + f * 20, y - 30); ctx.lineTo(x + f * 24, y - 42); ctx.lineTo(x + f * 30, y - 30); ctx.fill();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - f * 26, y - 24); ctx.quadraticCurveTo(x - f * 40, y - 22, x - f * 44, y - 12); ctx.stroke();
      eye(x + f * 30, y - 26, 2.5);
      break;
    }
    case 'ave': {
      legs(y - 32, 32, [-4, 4], 4);
      ctx.beginPath(); ctx.ellipse(x, y - 40, 22, 16, f * -0.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - f * 18, y - 44); ctx.lineTo(x - f * 38, y - 54); ctx.lineTo(x - f * 20, y - 36); ctx.fill();
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + f * 10, y - 50); ctx.quadraticCurveTo(x + f * 20, y - 62, x + f * 14, y - h + 6); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + f * 16, y - h + 4, 10, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + f * 22, y - h - 2); ctx.lineTo(x + f * 40, y - h + 6); ctx.quadraticCurveTo(x + f * 38, y - h + 14, x + f * 22, y - h + 10); ctx.fill();
      eye(x + f * 18, y - h + 2, 3);
      break;
    }
    case 'dientes': {
      legs(y - 22, 22, [-26, -18, 20, 28], 8);
      ctx.beginPath(); ctx.ellipse(x, y - 28, w / 2, 15, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x + f * 38, y - 34, 14, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + f * 30, y - 46); ctx.lineTo(x + f * 34, y - 54); ctx.lineTo(x + f * 40, y - 46); ctx.fill();
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - f * 38, y - 30); ctx.lineTo(x - f * 46, y - 22); ctx.stroke();
      ctx.fillStyle = '#f3ead2'; ctx.beginPath(); ctx.moveTo(x + f * 42, y - 26); ctx.lineTo(x + f * 44, y - 6); ctx.lineTo(x + f * 47, y - 26); ctx.fill();
      ctx.fillStyle = col; eye(x + f * 43, y - 38, 3);
      break;
    }
    case 'mamut': {
      legs(y - 40, 40, [-40, -26, 26, 40], 16);
      ctx.beginPath(); ctx.ellipse(x, y - 64, w / 2, 40, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x - f * 10, y - 96, 26, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x + f * 58, y - 80, 28, 0, 7); ctx.fill();
      ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x + f * 76, y - 74); ctx.quadraticCurveTo(x + f * 92, y - 40, x + f * 80, y - 14); ctx.stroke();
      ctx.strokeStyle = '#f3ead2'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + f * 70, y - 62); ctx.quadraticCurveTo(x + f * 110, y - 52, x + f * 104, y - 90); ctx.stroke();
      eye(x + f * 66, y - 88, 4);
      break;
    }
  }
  if (a.hp < cfg.hp) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 24, y - h - 22, 48, 5);
    ctx.fillStyle = '#d23c2a'; ctx.fillRect(x - 24, y - h - 22, 48 * (a.hp / cfg.hp), 5);
  }
}

const light = document.createElement('canvas'); const lctx = light.getContext('2d');
function drawNight() {
  const dark = (1 - daylight()) * 0.72;
  if (dark < 0.02) return;
  if (light.width !== W || light.height !== H) { light.width = W; light.height = H; }
  lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = `rgba(4,6,24,${dark})`; lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  const hole = (wx, r) => {
    const x = wx - camX, y = groundY(wx) - 30, g = lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = g; lctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  for (const f of S.fires) hole(f.x, 260 + Math.sin(performance.now() / 90) * 6);
  hole(TRIBE_X, 380); hole(P.x, 140);
  ctx.drawImage(light, 0, 0, W, H);
}

function bar(x, y, w, v, color, label) {
  ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, w + 4, 18);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * clamp(v / 100, 0, 1), 14);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`${label} ${Math.ceil(v)}`, x + 4, y + 11);
}

function drawHUD() {
  const pad = 16, ink = daylight() > 0.45 ? '#000' : '#f3e9d2';
  bar(pad, pad, 180, P.hp, '#c8362a', 'VIDA');
  bar(pad, pad + 24, 180, P.hunger, '#d9902b', 'HAMBRE');
  ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = ink;
  ctx.fillText(`★ Renombre ${S.renown}${S.joined ? ' · Miembro de la tribu' : ` / ${RENOWN_NEEDED}`}`, pad, pad + 62);
  const inv = Object.entries(S.inv).filter(([, n]) => n > 0).map(([k, n]) => `${ITEMS[k]} ${n}`).join('  ·  ');
  ctx.font = '12px system-ui'; ctx.fillText(inv || 'Sin recursos — pulsa E junto a árboles, rocas o hierba', pad, pad + 82, W - pad * 2);

  // tambor
  const ph = (beatClock % BEAT) / BEAT, pulse = Math.max(0, 1 - ph * 4);
  const cx = W / 2, cy = 40;
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 20 + pulse * 8, 0, 7); ctx.fill();
  ctx.fillStyle = fervor > 0 ? '#f0b54a' : '#e8dcc0'; ctx.beginPath(); ctx.arc(cx, cy, 14 + pulse * 6, 0, 7); ctx.fill();
  if (judgeT > 0 && lastJudge) {
    ctx.textAlign = 'center'; ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = ink; ctx.globalAlpha = lastJudge.startsWith('¡') ? 1 : 0.5; ctx.fillText(lastJudge, cx, cy + 46); ctx.globalAlpha = 1;
  }
  if (fervor > 0) { ctx.fillStyle = '#000'; ctx.fillRect(cx - 50, cy + 54, 100, 6); ctx.fillStyle = '#f0b54a'; ctx.fillRect(cx - 50, cy + 54, 100 * clamp(fervor / 9, 0, 1), 6); }

  // info derecha
  ctx.textAlign = 'right'; ctx.font = 'bold 13px system-ui'; ctx.fillStyle = ink;
  ctx.fillText(`${BIOME_NAME[biome(P.x)]} · ${isNight() ? '☾ Noche' : '☀ Día'}${muted ? ' · 🔇' : ''}`, W - pad, pad + 12);
  const dist = Math.round((TRIBE_X - P.x) / 10);
  if (!S.joined && Math.abs(dist) > 25) ctx.fillText(`Humo en el horizonte ${dist > 0 ? '→' : '←'} ${Math.abs(dist)} pasos`, W - pad, pad + 32);

  // pista contextual
  let hint = '';
  if (nearTribe(P.x, 250)) hint = 'E: hablar con la tribu';
  else { for (const [r] of nearbyResources(P.x, 100)) if (Math.abs(r.x - P.x) < 75) { hint = `E: ${{ arbol: 'talar', roca: 'picar piedra', arbusto: 'recoger bayas', hierba: 'arrancar fibra', huesos: 'recoger huesos' }[r.type]}`; break; } }
  if (!hint && P.hunger < 30) hint = 'Tienes hambre — F para comer';
  if (hint) { ctx.textAlign = 'center'; ctx.font = 'bold 15px system-ui'; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(W / 2 - 120, H - 140, 240, 28); ctx.fillStyle = '#f3e9d2'; ctx.fillText(hint, W / 2, H - 121); }
}

// ---------- Loop ----------
init(false);
camX = P.x - W / 2;
let hasSave = false; try { hasSave = !!localStorage.getItem(SAVE_KEY); } catch { /* */ }
$('btn-start').textContent = hasSave ? 'Continuar' : 'Empezar';
if (!hasSave) $('btn-new').style.display = 'none';
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!paused) update(dt);
  else if (pressed.has('craft') && !$('craft').classList.contains('hidden')) { toggleCraft(false); pressed.clear(); }
  else pressed.clear();
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('beforeunload', () => { if (started) save(); });
