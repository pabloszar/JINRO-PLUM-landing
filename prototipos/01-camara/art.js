// Arte procedural en canvas: todo se dibuja en código para no depender de imágenes.
// Estilo provisional: formas sencillas con color, que la luz del mundo tiñe.

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const lerp = (a, b, t) => a + (b - a) * t;

// ---------- Personaje ----------
// f: cuánto mira hacia la cámara (1 de frente, -1 de espaldas)
// s: cuánto mira hacia la derecha de la pantalla (1 derecha, -1 izquierda)
export function drawHuman(ctx, f, s, phase, speed, sitting, pal = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const P = {
    skin: '#b37a52', skinDark: '#8a5a3a', hair: '#2b1a10', fur: '#7d5432', furLight: '#a97c4a',
    wood: '#6b4a2a', stone: '#9aa1a8', ...pal,
  };
  const k = H / 320; // escala
  const cx = W / 2, ground = H - 8 * k;
  const side = Math.abs(s), front = Math.abs(f), dir = s >= 0 ? 1 : -1;
  const swing = Math.sin(phase) * speed;
  const legLen = (sitting ? 60 : 118) * k, torsoH = 100 * k;
  const hipY = ground - legLen - (sitting ? 0 : 0);
  const shoulderY = hipY - torsoH + 12 * k;
  const headY = shoulderY - 30 * k;
  const torsoW = lerp(25, 34, front) * k;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // piernas
  const legs = [-1, 1].map((i) => {
    const hx = cx + i * 11 * k * front;
    let fx, fy;
    if (sitting) { fx = hx + (dir * side * 48 + i * 22 * front) * k; fy = ground; }
    else {
      fx = hx + dir * side * swing * i * 34 * k;
      fy = ground - front * Math.max(0, swing * i) * 16 * k;
    }
    return { i, hx, fx, fy };
  });
  // la pierna lejana primero y más oscura
  legs.sort((a, b) => (a.i * dir) - (b.i * dir));
  legs.forEach((L, idx) => {
    ctx.strokeStyle = idx === 0 && side > 0.4 ? '#6e4630' : P.skinDark;
    ctx.lineWidth = 15 * k;
    ctx.beginPath(); ctx.moveTo(L.hx, hipY);
    if (sitting) ctx.lineTo(lerp(L.hx, L.fx, 0.55), hipY - 22 * k);
    ctx.lineTo(L.fx, L.fy); ctx.stroke();
    // pie
    ctx.fillStyle = '#4a3020';
    ctx.beginPath(); ctx.ellipse(L.fx + dir * side * 6 * k, L.fy - 3 * k, (7 + 6 * side) * k, 5 * k, 0, 0, 7); ctx.fill();
  });

  // brazo lejano (detrás del cuerpo)
  const arm = (i, behind) => {
    const sx = cx + i * (torsoW - 6 * k) * front + dir * side * -4 * k;
    const hx = sx + dir * side * (-swing * i * 26) * k + i * 4 * k * front;
    const hy = shoulderY + (sitting ? 50 : 68) * k;
    ctx.strokeStyle = behind ? '#7a4f34' : P.skin; ctx.lineWidth = 12 * k;
    ctx.beginPath(); ctx.moveTo(sx, shoulderY + 6 * k); ctx.lineTo(hx, hy); ctx.stroke();
    return { hx, hy };
  };
  const farI = -dir;
  if (side > 0.3) arm(farI, true);

  // torso con piel
  ctx.fillStyle = P.fur;
  ctx.beginPath(); ctx.ellipse(cx, hipY - torsoH / 2 + 14 * k, torsoW, torsoH / 2 + 8 * k, 0, 0, 7); ctx.fill();
  // borde de piel dentado
  ctx.beginPath();
  const hemY = hipY + 14 * k;
  ctx.moveTo(cx - torsoW, hipY - 10 * k);
  for (let i = 0; i <= 8; i++) ctx.lineTo(cx - torsoW + (i * 2 * torsoW) / 8, hemY + (i % 2 ? 10 : 0) * k);
  ctx.lineTo(cx + torsoW, hipY - 10 * k); ctx.fill();
  // luz en el hombro (sugiere volumen)
  ctx.fillStyle = P.furLight;
  ctx.beginPath(); ctx.ellipse(cx - dir * side * 6 * k, shoulderY + 14 * k, torsoW * 0.75, 12 * k, 0, Math.PI, 0); ctx.fill();

  // brazo cercano + lanza
  const nearI = side > 0.3 ? dir : 1;
  const hand = arm(nearI, false);
  if (side <= 0.3) arm(-1, false);
  // lanza
  const tipX = hand.hx + dir * side * 14 * k, tipY = hand.hy - 175 * k;
  ctx.strokeStyle = P.wood; ctx.lineWidth = 5 * k;
  ctx.beginPath(); ctx.moveTo(hand.hx - dir * side * 4 * k, hand.hy + 50 * k); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.fillStyle = P.stone;
  ctx.beginPath(); ctx.moveTo(tipX - 6 * k, tipY + 4 * k); ctx.lineTo(tipX + dir * side * 3 * k, tipY - 22 * k); ctx.lineTo(tipX + 6 * k, tipY + 4 * k); ctx.fill();
  ctx.fillStyle = P.skin; ctx.beginPath(); ctx.arc(hand.hx, hand.hy, 7 * k, 0, 7); ctx.fill();

  // cabeza
  const hx = cx + dir * side * 5 * k;
  ctx.fillStyle = P.skin;
  ctx.beginPath(); ctx.arc(hx, headY, 25 * k, 0, 7); ctx.fill();
  ctx.fillStyle = P.hair;
  if (f < -0.15) {
    // de espaldas: el pelo cubre la cabeza
    ctx.beginPath(); ctx.arc(hx, headY - 2 * k, 27 * k, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx, headY + 22 * k, 20 * k, 16 * k, 0, 0, Math.PI); ctx.fill();
  } else {
    // pelo arriba y hacia atrás
    ctx.beginPath(); ctx.arc(hx, headY - 4 * k, 27 * k, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    if (side > 0.25) { ctx.beginPath(); ctx.ellipse(hx - dir * 16 * k, headY + 4 * k, 14 * k, 26 * k, 0, 0, 7); ctx.fill(); }
    // barba
    ctx.beginPath(); ctx.ellipse(hx + dir * side * 8 * k, headY + 18 * k, (14 - 4 * side) * k, 12 * k, 0, 0, Math.PI); ctx.fill();
    // ojos
    const ex = hx + dir * side * 13 * k, gap = 9 * k * front;
    const eyes = front > 0.35 ? [-1, 1] : [0];
    for (const e of eyes) {
      const x = ex + e * gap;
      ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.ellipse(x, headY - 2 * k, 4.5 * k, 3.4 * k, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a120c'; ctx.beginPath(); ctx.arc(x + dir * side * 1.5 * k, headY - 2 * k, 2.2 * k, 0, 7); ctx.fill();
    }
    // ceja
    ctx.strokeStyle = P.hair; ctx.lineWidth = 3.5 * k;
    ctx.beginPath(); ctx.moveTo(ex - gap - 6 * k, headY - 9 * k); ctx.lineTo(ex + gap + 6 * k, headY - 9 * k); ctx.stroke();
    // nariz de perfil
    if (side > 0.5) { ctx.fillStyle = P.skin; ctx.beginPath(); ctx.arc(hx + dir * 24 * k, headY + 3 * k, 5 * k, 0, 7); ctx.fill(); }
  }
}

// ---------- Lobo (de perfil, mirando a la derecha) ----------
export function drawWolf(ctx, phase, eyesOnly = false) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const k = W / 256, g = H - 4 * k, sw = Math.sin(phase);
  const eye = () => { ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.ellipse(206 * k, g - 78 * k, 4 * k, 3 * k, 0, 0, 7); ctx.fill(); };
  if (eyesOnly) { eye(); return; }
  ctx.lineCap = 'round';
  const body = '#5b544c', dark = '#3d3832', light = '#8a8175';
  ctx.strokeStyle = dark; ctx.lineWidth = 9 * k;
  for (const [x, ph] of [[70, 1], [178, -1]]) { ctx.beginPath(); ctx.moveTo(x * k, g - 50 * k); ctx.lineTo((x + sw * ph * 14) * k, g); ctx.stroke(); }
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(125 * k, g - 62 * k, 72 * k, 24 * k, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(165 * k, g - 80 * k); ctx.lineTo(196 * k, g - 92 * k); ctx.lineTo(236 * k, g - 70 * k); ctx.lineTo(196 * k, g - 58 * k); ctx.fill();
  ctx.beginPath(); ctx.moveTo(190 * k, g - 88 * k); ctx.lineTo(196 * k, g - 110 * k); ctx.lineTo(206 * k, g - 88 * k); ctx.fill();
  ctx.strokeStyle = body; ctx.lineWidth = 12 * k;
  ctx.beginPath(); ctx.moveTo(55 * k, g - 66 * k); ctx.quadraticCurveTo(25 * k, g - 60 * k, 18 * k, g - 36 * k); ctx.stroke();
  ctx.strokeStyle = body; ctx.lineWidth = 9 * k;
  for (const [x, ph] of [[82, -1], [166, 1]]) { ctx.beginPath(); ctx.moveTo(x * k, g - 50 * k); ctx.lineTo((x + sw * ph * 14) * k, g); ctx.stroke(); }
  ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(130 * k, g - 78 * k, 54 * k, 8 * k, 0, Math.PI, 0); ctx.fill();
  eye();
}

// ---------- Mamut (de perfil, mirando a la derecha) ----------
export function drawMammoth(ctx, phase) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const k = W / 512, g = H - 4 * k, sw = Math.sin(phase) * 18;
  const fur = '#5a3a26', dark = '#3e281a', light = '#7d5638';
  ctx.lineCap = 'round';
  ctx.strokeStyle = dark; ctx.lineWidth = 46 * k;
  for (const [x, p] of [[150, 1], [330, -1]]) { ctx.beginPath(); ctx.moveTo(x * k, g - 150 * k); ctx.lineTo((x + sw * p) * k, g - 20 * k); ctx.stroke(); }
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.ellipse(240 * k, g - 200 * k, 170 * k, 115 * k, -0.08, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(330 * k, g - 300 * k, 70 * k, 0, 7); ctx.fill(); // joroba
  ctx.beginPath(); ctx.arc(405 * k, g - 230 * k, 70 * k, 0, 7); ctx.fill(); // cabeza
  // trompa
  ctx.strokeStyle = fur; ctx.lineWidth = 30 * k;
  ctx.beginPath(); ctx.moveTo(450 * k, g - 210 * k); ctx.quadraticCurveTo(490 * k, g - 120 * k, 462 * k, g - 40 * k); ctx.stroke();
  // pelo colgante
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(90 * k, g - 170 * k);
  for (let i = 0; i <= 14; i++) ctx.lineTo((90 + i * 22) * k, g - (110 - (i % 2) * 18) * k);
  ctx.lineTo(400 * k, g - 170 * k); ctx.fill();
  ctx.strokeStyle = fur; ctx.lineWidth = 46 * k;
  for (const [x, p] of [[175, -1], [350, 1]]) { ctx.beginPath(); ctx.moveTo(x * k, g - 150 * k); ctx.lineTo((x + sw * p) * k, g - 20 * k); ctx.stroke(); }
  // colmillo
  ctx.strokeStyle = '#efe4c8'; ctx.lineWidth = 13 * k;
  ctx.beginPath(); ctx.moveTo(430 * k, g - 180 * k); ctx.quadraticCurveTo(520 * k, g - 150 * k, 500 * k, g - 260 * k); ctx.stroke();
  ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(300 * k, g - 330 * k, 60 * k, 16 * k, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#120a06'; ctx.beginPath(); ctx.arc(430 * k, g - 250 * k, 6 * k, 0, 7); ctx.fill();
}

// ---------- Vegetación y rocas ----------
export function drawPine(ctx, seed) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const r = mulberry(seed);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#4a3424'; ctx.fillRect(W / 2 - 9, H * 0.72, 18, H * 0.28);
  const layers = 6;
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const y = H * 0.82 - t * H * 0.72, w = (1 - t * 0.78) * W * 0.46 * (0.9 + r() * 0.2);
    ctx.fillStyle = i % 2 ? '#2f4b30' : '#284229';
    ctx.beginPath(); ctx.moveTo(W / 2 - w, y); ctx.lineTo(W / 2 + (r() - 0.5) * 8, y - H * 0.2); ctx.lineTo(W / 2 + w, y); ctx.fill();
    ctx.fillStyle = '#4e7748';
    ctx.beginPath(); ctx.moveTo(W / 2 - w, y); ctx.lineTo(W / 2 - 2, y - H * 0.2); ctx.lineTo(W / 2 - w * 0.45, y - 4); ctx.fill();
  }
}

export function drawBirch(ctx, seed) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const r = mulberry(seed);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#e4ddcc'; ctx.fillRect(W / 2 - 8, H * 0.35, 16, H * 0.65);
  ctx.fillStyle = '#2a2420';
  for (let i = 0; i < 9; i++) ctx.fillRect(W / 2 - 8 + r() * 6, H * (0.4 + r() * 0.58), 6 + r() * 6, 3);
  const blobs = [[0, 0.3, 0.3], [-0.18, 0.4, 0.22], [0.18, 0.38, 0.24], [0, 0.16, 0.2], [-0.1, 0.22, 0.2], [0.12, 0.25, 0.2]];
  for (const [ox, oy, rr] of blobs) {
    ctx.fillStyle = '#6d8a3e'; ctx.beginPath(); ctx.arc(W / 2 + ox * W, oy * H, rr * W, 0, 7); ctx.fill();
  }
  for (const [ox, oy, rr] of blobs.slice(0, 4)) {
    ctx.fillStyle = '#a3b65a'; ctx.beginPath(); ctx.arc(W / 2 + ox * W - rr * W * 0.3, oy * H - rr * W * 0.3, rr * W * 0.5, 0, 7); ctx.fill();
  }
}

export function drawRock(ctx, seed) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const r = mulberry(seed);
  ctx.clearRect(0, 0, W, H);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    pts.push([W / 2 + Math.cos(a) * W * (0.42 + r() * 0.06), H - 2 + Math.sin(a) * H * (0.75 + r() * 0.2)]);
  }
  ctx.fillStyle = '#6f6a63'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fill();
  ctx.fillStyle = '#958e84';
  ctx.beginPath(); ctx.moveTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[4][0], pts[4][1]); ctx.lineTo(W / 2, H * 0.55); ctx.fill();
}

export function drawGrass(ctx, seed) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const r = mulberry(seed);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = W * (0.2 + r() * 0.6), h = H * (0.5 + r() * 0.48);
    ctx.strokeStyle = ['#8a9a48', '#a8a456', '#6e7f3a', '#c2b26a'][Math.floor(r() * 4)];
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + (r() - 0.5) * 20, H - h * 0.6, x + (r() - 0.5) * 34, H - h); ctx.stroke();
  }
}

export function drawLogs(ctx) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round'; ctx.lineWidth = H * 0.22;
  ctx.strokeStyle = '#3b2616';
  ctx.beginPath(); ctx.moveTo(W * 0.12, H * 0.85); ctx.lineTo(W * 0.85, H * 0.55); ctx.stroke();
  ctx.strokeStyle = '#4c3220';
  ctx.beginPath(); ctx.moveTo(W * 0.15, H * 0.55); ctx.lineTo(W * 0.88, H * 0.85); ctx.stroke();
  for (let i = 0; i < 7; i++) { ctx.fillStyle = '#5d5a55'; ctx.beginPath(); ctx.ellipse(W * (0.08 + i * 0.14), H * 0.9, W * 0.07, H * 0.12, 0, 0, 7); ctx.fill(); }
}

export function drawGlow(ctx, inner, outer) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

export function drawFlame(ctx) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.72, 2, W / 2, H * 0.6, W * 0.5);
  g.addColorStop(0, 'rgba(255,245,200,1)'); g.addColorStop(0.35, 'rgba(255,170,60,0.95)');
  g.addColorStop(0.7, 'rgba(220,70,20,0.6)'); g.addColorStop(1, 'rgba(120,20,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(W * 0.15, H); ctx.quadraticCurveTo(W * 0.1, H * 0.45, W / 2, 0); ctx.quadraticCurveTo(W * 0.9, H * 0.45, W * 0.85, H); ctx.fill();
}

export function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
