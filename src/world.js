import { RESOURCES } from './data.js';

export function hash(i, seed = 0) {
  let h = Math.imul((i | 0) ^ Math.imul(seed, 374761393), 2654435761);
  h ^= h >>> 15; h = Math.imul(h, 2246822519);
  h ^= h >>> 13; h = Math.imul(h, 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296; // 0..1
}

export function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Altura del terreno relativa a la línea base (px). Negativo = más alto.
export function terrain(x) {
  return (noise(x / 700, 1) - 0.5) * 70 + (noise(x / 180, 2) - 0.5) * 14;
}

export function biome(x) {
  if (Math.abs(x) < 900) return 'bosque'; // zona inicial segura-ish
  const n = noise(x / 3500, 7);
  if (n < 0.4) return 'estepa';
  if (n < 0.68) return 'bosque';
  return 'roca';
}

export const BIOME_NAME = { bosque: 'Bosque', estepa: 'Estepa', roca: 'Tierras rocosas' };

const TABLE = {
  bosque: { arbol: 5, arbusto: 2, hierba: 2, roca: 1, huesos: 0.3 },
  estepa: { hierba: 5, arbusto: 1, roca: 1, arbol: 0.6, huesos: 0.8 },
  roca:   { roca: 5, hierba: 1, arbol: 0.5, huesos: 1.2, arbusto: 0.3 },
};

export function pick(weights, r) {
  let total = 0; for (const k in weights) total += weights[k];
  let v = r * total;
  for (const k in weights) { v -= weights[k]; if (v <= 0) return k; }
  return Object.keys(weights)[0];
}

export const CHUNK = 600;

export function generateChunk(ci, depleted) {
  const r = rng(ci * 7919 + 13);
  const out = [];
  const n = 5 + Math.floor(r() * 5);
  for (let k = 0; k < n; k++) {
    const x = ci * CHUNK + r() * CHUNK;
    const type = pick(TABLE[biome(x)], r());
    const id = `${ci}:${k}`;
    if (depleted.has(id)) continue;
    out.push({ id, type, x, hp: RESOURCES[type].hp, scale: 0.8 + r() * 0.5, shake: 0 });
  }
  return out;
}
