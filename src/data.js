// Datos del juego: recursos, animales, recetas. Ajustar balance aquí.

export const ITEMS = {
  madera: 'Madera', piedra: 'Piedra', fibra: 'Fibra', bayas: 'Bayas',
  carne: 'Carne', piel: 'Piel', hueso: 'Hueso', colmillo: 'Colmillo', marfil: 'Marfil',
};

export const RESOURCES = {
  arbol:   { hp: 3, drops: { madera: 2 }, tool: true,  w: 60 },
  roca:    { hp: 4, drops: { piedra: 2 }, tool: true,  w: 50 },
  arbusto: { hp: 1, drops: { bayas: 3 },               w: 44 },
  hierba:  { hp: 1, drops: { fibra: 2 },               w: 30 },
  huesos:  { hp: 1, drops: { hueso: 2 },               w: 40 },
};

// behavior: flee | hostile | neutral
export const ANIMALS = {
  ciervo:     { name: 'Ciervo gigante',  hp: 30,  speed: 170, dmg: 0,  behavior: 'flee',    w: 54, h: 46, renown: 0, drops: { carne: 2, piel: 1 } },
  lobo:       { name: 'Lobo terrible',   hp: 40,  speed: 195, dmg: 8,  behavior: 'hostile', w: 56, h: 32, renown: 1, aggro: 380, drops: { carne: 1, piel: 1 } },
  ave:        { name: 'Ave del terror',  hp: 60,  speed: 270, dmg: 12, behavior: 'hostile', w: 46, h: 70, renown: 2, aggro: 450, drops: { carne: 2, hueso: 2 } },
  dientes:    { name: 'Dientes de sable',hp: 130, speed: 215, dmg: 22, behavior: 'hostile', w: 78, h: 44, renown: 4, aggro: 520, drops: { carne: 3, piel: 2, colmillo: 1 } },
  mamut:      { name: 'Mamut lanudo',    hp: 320, speed: 95,  dmg: 30, behavior: 'neutral', w: 130, h: 110, renown: 5, drops: { carne: 6, piel: 4, marfil: 2 } },
  neandertal: { name: 'Neandertal',      hp: 75,  speed: 150, dmg: 15, behavior: 'hostile', w: 30, h: 58, renown: 2, aggro: 400, drops: { hueso: 1, piedra: 2, piel: 1 } },
  cazador:    { name: 'Cazador hostil',  hp: 60,  speed: 185, dmg: 13, behavior: 'hostile', w: 26, h: 62, renown: 2, aggro: 450, drops: { fibra: 2, piedra: 2, carne: 1 } },
};

// Pesos de aparición por bioma. `night` multiplica de noche, `danger` escala con distancia al origen.
export const SPAWNS = {
  bosque: { ciervo: 4, lobo: 3, dientes: 1, neandertal: 0.6 },
  estepa: { ciervo: 2, ave: 3, mamut: 1.5, lobo: 1, dientes: 0.6 },
  roca:   { neandertal: 2.5, cazador: 2, lobo: 1.5, ave: 1, dientes: 0.8 },
};
export const NIGHT_BOOST = { dientes: 3, lobo: 1.8, ciervo: 0.4, mamut: 0.5 };
export const DANGEROUS = new Set(['dientes', 'ave', 'mamut', 'neandertal', 'cazador']);

export const RECIPES = [
  { id: 'lanza',    name: 'Lanza de madera',   desc: 'Daño 12, alcance largo.',          cost: { madera: 3, fibra: 2 } },
  { id: 'hacha',    name: 'Hacha de piedra',   desc: 'Recolectas el doble de rápido.',   cost: { madera: 2, piedra: 3, fibra: 2 } },
  { id: 'fogata',   name: 'Fogata',            desc: 'Cura, cocina la carne, ahuyenta fieras. Punto de reaparición.', cost: { madera: 4, piedra: 3 }, repeatable: true },
  { id: 'ropa',     name: 'Ropa de piel',      desc: 'Reduce el daño recibido 30%.',     cost: { piel: 3, fibra: 4 } },
  { id: 'tambor',   name: 'Tambor de guerra',  desc: 'Ventana de ritmo más amplia y Fervor más fuerte.', cost: { piel: 2, madera: 3, hueso: 2 } },
  { id: 'silex',    name: 'Lanza de sílex',    desc: 'Daño 22.',                          cost: { madera: 2, piedra: 4, fibra: 3 }, requires: 'lanza' },
  { id: 'hueso',    name: 'Armadura de hueso', desc: 'Reduce el daño recibido 50%.',     cost: { hueso: 5, piel: 3, fibra: 3 }, requires: 'ropa' },
  { id: 'collar',   name: 'Collar de colmillos', desc: 'Símbolo de cazador. +3 renombre.', cost: { colmillo: 2, fibra: 2 } },
];

export const WEAPONS = {
  mano:  { dmg: 6,  range: 60 },
  lanza: { dmg: 12, range: 100 },
  silex: { dmg: 22, range: 105 },
};

export const TRIBE_X = 9000;       // dónde vive la tribu
export const RENOWN_NEEDED = 12;   // renombre para que te acepten
export const DAY_LENGTH = 180;     // segundos por ciclo día/noche
export const BEAT = 0.6;           // segundos por golpe de tambor (100 BPM)
