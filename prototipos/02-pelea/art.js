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
// o: { sitting, pose: 'normal'|'thrust'|'brace'|'dodge'|'hurt'|'dead', poseT (0..1), limp, armHurt, pal }
export function drawHuman(ctx, f, s, phase, speed, o = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const k = H / 320;
  if (o.pose === 'dead') {
    const dir = s >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(W / 2 + dir * 140 * k, H - 14 * k);
    ctx.rotate(-dir * Math.PI / 2 * 0.97);
    ctx.translate(-W / 2, -(H - 8 * k));
    humanBody(ctx, 0.2, dir, 0, 0, { ...o, pose: 'normal' });
    ctx.restore();
    return;
  }
  humanBody(ctx, f, s, phase, speed, o);
}

function humanBody(ctx, f, s, phase, speed, o) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const P = {
    skin: '#b37a52', skinDark: '#8a5a3a', hair: '#2b1a10', fur: '#7d5432', furLight: '#a97c4a',
    wood: '#6b4a2a', stone: '#9aa1a8', ...(o.pal || {}),
  };
  const pose = o.pose || 'normal', t = o.poseT ?? 0, sitting = !!o.sitting;
  const k = H / 320;
  const cx = W / 2, ground = H - 8 * k;
  const side = Math.abs(s), front = Math.abs(f), dir = s >= 0 ? 1 : -1;
  const swing = Math.sin(phase) * speed;
  const fat = o.fatigue || 0;
  const crouch = pose === 'dodge' ? 1 : pose === 'brace' ? 0.4 : pose === 'thrust' ? 0.15 * t : o.air ? 0.55 : 0;
  const breathBob = Math.sin(o.breath || 0) * (1.2 + 4 * fat) * k; // respiración: más rápida y profunda con el cansancio
  const limpBob = o.limp ? Math.max(0, Math.sin(phase)) * 9 * k * Math.min(1, speed) : 0;
  const legLen = (sitting ? 60 : 118) * k * (1 - crouch * 0.3);
  const hipY = ground - legLen + limpBob;
  const torsoH = 100 * k;
  const shoulderY = hipY - torsoH + 12 * k + breathBob + fat * 8 * k;
  const headY = shoulderY - 30 * k;
  const torsoW = lerp(25, 34, front) * k;
  const lean = (pose === 'hurt' ? -0.22 : pose === 'dodge' ? 0.3 : pose === 'thrust' ? 0.16 * t : pose === 'brace' ? 0.12 : 0.14 * fat) * dir * Math.max(0.3, side); // agotado se encorva
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // piernas
  const legs = [-1, 1].map((i) => {
    const hx = cx + i * 11 * k * front + (crouch * i * 10 * k * front);
    const hurtLeg = o.limp && i === 1 ? 0.3 : 1;
    let fx, fy;
    if (sitting) { fx = hx + (dir * side * 48 + i * 22 * front) * k; fy = ground; }
    else {
      const stance = crouch * (i === dir ? 26 : -18) * k * side;
      fx = hx + dir * side * swing * i * 34 * k * hurtLeg + stance;
      fy = ground - front * Math.max(0, swing * i) * 16 * k * hurtLeg - (o.air ? 34 * k : 0);
    }
    return { i, hx, fx, fy };
  });
  legs.sort((a, b) => (a.i * dir) - (b.i * dir));
  legs.forEach((L, idx) => {
    ctx.strokeStyle = idx === 0 && side > 0.4 ? '#6e4630' : P.skinDark;
    ctx.lineWidth = 15 * k;
    ctx.beginPath(); ctx.moveTo(L.hx, hipY);
    if (sitting || crouch > 0.2) ctx.lineTo(lerp(L.hx, L.fx, 0.5) + dir * side * crouch * 14 * k, lerp(hipY, L.fy, 0.5) - crouch * 6 * k);
    ctx.lineTo(L.fx, L.fy); ctx.stroke();
    ctx.fillStyle = '#4a3020';
    ctx.beginPath(); ctx.ellipse(L.fx + dir * side * 6 * k, L.fy - 3 * k, (7 + 6 * side) * k, 5 * k, 0, 0, 7); ctx.fill();
  });

  // de la cadera hacia arriba se inclina según la postura
  ctx.save();
  ctx.translate(cx, hipY); ctx.rotate(lean); ctx.translate(-cx, -hipY);

  const shoulderX = (i) => cx + i * (torsoW - 6 * k) * front + dir * side * -4 * k;
  const drawArm = (sx, hx, hy, behind) => {
    ctx.strokeStyle = behind ? '#7a4f34' : P.skin; ctx.lineWidth = 12 * k;
    ctx.beginPath(); ctx.moveTo(sx, shoulderY + 6 * k); ctx.lineTo(hx, hy); ctx.stroke();
  };
  const farI = -dir;
  const fighting = pose === 'thrust' || pose === 'brace';
  if (side > 0.3 && !fighting) {
    const sx = shoulderX(farI);
    drawArm(sx, sx + dir * side * (swing * 26) * k, shoulderY + 68 * k, true);
  }

  // torso
  ctx.fillStyle = P.fur;
  ctx.beginPath(); ctx.ellipse(cx, hipY - torsoH / 2 + 14 * k, torsoW, torsoH / 2 + 8 * k, 0, 0, 7); ctx.fill();
  ctx.beginPath();
  const hemY = hipY + 14 * k;
  ctx.moveTo(cx - torsoW, hipY - 10 * k);
  for (let i = 0; i <= 8; i++) ctx.lineTo(cx - torsoW + (i * 2 * torsoW) / 8, hemY + (i % 2 ? 10 : 0) * k);
  ctx.lineTo(cx + torsoW, hipY - 10 * k); ctx.fill();
  ctx.fillStyle = P.furLight;
  ctx.beginPath(); ctx.ellipse(cx - dir * side * 6 * k, shoulderY + 14 * k, torsoW * 0.75, 12 * k, 0, Math.PI, 0); ctx.fill();

  // cabeza
  const hx = cx + dir * side * 5 * k;
  ctx.fillStyle = P.skin;
  ctx.beginPath(); ctx.arc(hx, headY, 25 * k, 0, 7); ctx.fill();
  ctx.fillStyle = P.hair;
  if (f < -0.15) {
    ctx.beginPath(); ctx.arc(hx, headY - 2 * k, 27 * k, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx, headY + 22 * k, 20 * k, 16 * k, 0, 0, Math.PI); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(hx, headY - 4 * k, 27 * k, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    if (side > 0.25) { ctx.beginPath(); ctx.ellipse(hx - dir * 16 * k, headY + 4 * k, 14 * k, 26 * k, 0, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(hx + dir * side * 8 * k, headY + 18 * k, (14 - 4 * side) * k, 12 * k, 0, 0, Math.PI); ctx.fill();
    const ex = hx + dir * side * 13 * k, gap = 9 * k * front;
    const eyes = front > 0.35 ? [-1, 1] : [0];
    const squint = pose === 'hurt' ? 0.3 : 1;
    for (const e of eyes) {
      const x = ex + e * gap;
      ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.ellipse(x, headY - 2 * k, 4.5 * k, 3.4 * k * squint, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a120c'; ctx.beginPath(); ctx.arc(x + dir * side * 1.5 * k, headY - 2 * k, 2.2 * k * squint, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = P.hair; ctx.lineWidth = 3.5 * k;
    ctx.beginPath(); ctx.moveTo(ex - gap - 6 * k, headY - 9 * k); ctx.lineTo(ex + gap + 6 * k, headY - 9 * (fighting ? 0.6 : 1) * k); ctx.stroke();
    if (side > 0.5) { ctx.fillStyle = P.skin; ctx.beginPath(); ctx.arc(hx + dir * 24 * k, headY + 3 * k, 5 * k, 0, 7); ctx.fill(); }
  }

  // brazos y lanza
  const nearI = side > 0.3 ? dir : 1;
  const sx = shoulderX(nearI);
  let hand, tip, butt;
  // dirección de la lanza en pantalla: de perfil apunta al frente; de frente o espaldas se acorta
  const len = (40 + 150 * side) * k;
  if (fighting) {
    const ext = pose === 'thrust' ? t : 0.35;
    const reach = (18 + 58 * ext) * side * k;
    const down = (pose === 'brace' ? 30 : 22) * k + (f > 0 ? 18 * front * ext * k : -10 * front * ext * k);
    hand = { x: sx + dir * reach, y: shoulderY + down };
    const ang = Math.atan2(f > 0 ? 0.25 + 0.6 * front : -0.15 - 0.7 * front, dir * Math.max(0.12, side));
    tip = { x: hand.x + Math.cos(ang) * len, y: hand.y + Math.sin(ang) * len };
    butt = { x: hand.x - Math.cos(ang) * 70 * k, y: hand.y - Math.sin(ang) * 70 * k };
    // brazo lejano también sujeta la lanza
    const sx2 = shoulderX(-nearI);
    drawArm(sx2, lerp(hand.x, butt.x, 0.45), lerp(hand.y, butt.y, 0.45), side > 0.3);
  } else if (o.armHurt) {
    hand = { x: sx + dir * side * 4 * k, y: shoulderY + 74 * k };
    tip = { x: hand.x + dir * side * 60 * k, y: hand.y - 110 * k };
    butt = { x: hand.x - dir * side * 10 * k, y: hand.y + 50 * k };
  } else {
    hand = { x: sx + dir * side * (-swing * nearI * 26) * k + nearI * 4 * k * front, y: shoulderY + 68 * k };
    tip = { x: hand.x + dir * side * 14 * k, y: hand.y - 175 * k };
    butt = { x: hand.x - dir * side * 4 * k, y: hand.y + 50 * k };
  }
  if (side <= 0.3 && !fighting) { const s2 = shoulderX(-1); drawArm(s2, s2 - 4 * k * front, shoulderY + 68 * k, false); }
  if (!o.noSpear) { // al atacar o mantenerla firme, la lanza se dibuja en 3D
    ctx.strokeStyle = P.wood; ctx.lineWidth = 5 * k;
    ctx.beginPath(); ctx.moveTo(butt.x, butt.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    const ta = Math.atan2(tip.y - butt.y, tip.x - butt.x);
    ctx.fillStyle = P.stone;
    ctx.beginPath();
    ctx.moveTo(tip.x + Math.cos(ta + 1.57) * 6 * k, tip.y + Math.sin(ta + 1.57) * 6 * k);
    ctx.lineTo(tip.x + Math.cos(ta) * 22 * k, tip.y + Math.sin(ta) * 22 * k);
    ctx.lineTo(tip.x + Math.cos(ta - 1.57) * 6 * k, tip.y + Math.sin(ta - 1.57) * 6 * k);
    ctx.fill();
  }
  drawArm(sx, hand.x, hand.y, false);
  ctx.fillStyle = o.armHurt ? '#9a4a3a' : P.skin; ctx.beginPath(); ctx.arc(hand.x, hand.y, 7 * k, 0, 7); ctx.fill();
  if (o.armHurt) { ctx.fillStyle = '#7a1a12'; ctx.beginPath(); ctx.ellipse(lerp(sx, hand.x, 0.4), lerp(shoulderY, hand.y, 0.4), 6 * k, 9 * k, 0, 0, 7); ctx.fill(); }
  ctx.restore();
  if (o.limp) { ctx.fillStyle = '#7a1a12'; const L = legs.find((l) => l.i === 1); ctx.beginPath(); ctx.ellipse(lerp(L.hx, L.fx, 0.55), lerp(hipY, L.fy, 0.55), 6 * k, 10 * k, 0, 0, 7); ctx.fill(); }
}

// ---------- Lobo (de perfil, mirando a la derecha) ----------
// pose: 'walk' | 'crouch' (señal antes de saltar) | 'lunge' | 'dead'
export function drawWolf(ctx, phase, eyesOnly = false, pose = 'walk') {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const k = W / 256, g = H - 4 * k, sw = pose === 'walk' ? Math.sin(phase) : 0;
  const drop = pose === 'crouch' ? 16 : 0, headDrop = pose === 'crouch' ? 14 : pose === 'lunge' ? -6 : 0;
  const stretch = pose === 'lunge' ? 1.18 : 1;
  const ex = 206 + (stretch - 1) * 60, ey = 78 - drop + headDrop * -1;
  const eye = () => { ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.ellipse(ex * k, g - ey * k, (pose === 'crouch' ? 5 : 4) * k, 3 * k, 0, 0, 7); ctx.fill(); };
  if (pose === 'dead') {
    if (eyesOnly) return;
    ctx.fillStyle = '#4d4741';
    ctx.beginPath(); ctx.ellipse(125 * k, g - 22 * k, 80 * k, 20 * k, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(212 * k, g - 18 * k, 26 * k, 13 * k, 0.2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3d3832'; ctx.lineWidth = 8 * k; ctx.lineCap = 'round';
    for (const x of [70, 90, 160, 180]) { ctx.beginPath(); ctx.moveTo(x * k, g - 30 * k); ctx.lineTo((x + 30) * k, g - 52 * k); ctx.stroke(); }
    ctx.fillStyle = '#6a1410'; ctx.beginPath(); ctx.ellipse(120 * k, g - 4 * k, 50 * k, 5 * k, 0, 0, 7); ctx.fill();
    return;
  }
  if (eyesOnly) { eye(); return; }
  ctx.lineCap = 'round';
  const body = '#5b544c', dark = '#3d3832', light = '#8a8175';
  const bx = 125 * k, by = g - (62 - drop) * k;
  const leg = (x, back, near) => {
    ctx.strokeStyle = near ? body : dark; ctx.lineWidth = 9 * k;
    ctx.beginPath(); ctx.moveTo(x * k, by + 12 * k);
    if (pose === 'lunge') ctx.lineTo((x + (back ? -40 : 46)) * k, g - (back ? 6 : 26) * k);
    else if (pose === 'crouch') { ctx.lineTo((x + (back ? -14 : 14)) * k, by + 30 * k); ctx.lineTo(x * k, g); }
    else ctx.lineTo((x + sw * (near ? 1 : -1) * (back ? -1 : 1) * 14) * k, g);
    ctx.stroke();
  };
  leg(70 * (2 - stretch), true, false); leg(178 * stretch - 10, false, false);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(bx, by, 72 * k * stretch, 24 * k, 0, 0, 7); ctx.fill();
  // cabeza
  const hx0 = 165 + (stretch - 1) * 70, hy0 = 80 - drop - headDrop;
  ctx.beginPath(); ctx.moveTo(hx0 * k, g - hy0 * k); ctx.lineTo((hx0 + 31) * k, g - (hy0 + 12) * k); ctx.lineTo((hx0 + 71) * k, g - (hy0 - 10) * k); ctx.lineTo((hx0 + 31) * k, g - (hy0 - 22) * k); ctx.fill();
  if (pose === 'lunge') { // mandíbula abierta
    ctx.fillStyle = '#2a1512'; ctx.beginPath(); ctx.moveTo((hx0 + 34) * k, g - (hy0 - 12) * k); ctx.lineTo((hx0 + 72) * k, g - (hy0 - 10) * k); ctx.lineTo((hx0 + 60) * k, g - (hy0 - 26) * k); ctx.fill();
    ctx.fillStyle = '#efe6d2'; for (const d of [44, 56]) { ctx.beginPath(); ctx.moveTo((hx0 + d) * k, g - (hy0 - 12) * k); ctx.lineTo((hx0 + d + 3) * k, g - (hy0 - 19) * k); ctx.lineTo((hx0 + d + 6) * k, g - (hy0 - 12) * k); ctx.fill(); }
    ctx.fillStyle = body;
  }
  // orejas: hacia atrás cuando se agacha
  ctx.beginPath();
  if (pose === 'crouch') { ctx.moveTo((hx0 + 22) * k, g - (hy0 + 9) * k); ctx.lineTo((hx0 + 2) * k, g - (hy0 + 18) * k); ctx.lineTo((hx0 + 32) * k, g - (hy0 + 6) * k); }
  else { ctx.moveTo((hx0 + 25) * k, g - (hy0 + 8) * k); ctx.lineTo((hx0 + 31) * k, g - (hy0 + 30) * k); ctx.lineTo((hx0 + 41) * k, g - (hy0 + 8) * k); }
  ctx.fill();
  // cola: baja y tensa al agacharse
  ctx.strokeStyle = body; ctx.lineWidth = 12 * k;
  ctx.beginPath(); ctx.moveTo((55 * (2 - stretch)) * k, by - 4 * k);
  if (pose === 'crouch') ctx.quadraticCurveTo(28 * k, by + 4 * k, 16 * k, by + 22 * k);
  else ctx.quadraticCurveTo(25 * k, g - 60 * k, 18 * k, g - 36 * k);
  ctx.stroke();
  leg(82 * (2 - stretch), true, true); leg(166 * stretch - 4, false, true);
  ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(bx + 5 * k, by - 16 * k, 54 * k * stretch, 8 * k, 0, Math.PI, 0); ctx.fill();
  if (pose === 'crouch') { // lomo erizado
    ctx.fillStyle = dark;
    for (let i = 0; i < 9; i++) { const x = 90 + i * 10; ctx.beginPath(); ctx.moveTo((x - 4) * k, by - 22 * k); ctx.lineTo(x * k, by - 32 * k); ctx.lineTo((x + 4) * k, by - 22 * k); ctx.fill(); }
  }
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
