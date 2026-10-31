# CLAN — Supervivencia paleolítica (prototipo)

Te separaste de tu tribu. Sobrevive solo, fabrica herramientas, caza fieras y gana renombre hasta que una tribu te acepte.

Mezcla de la progresión de *Patapon* (ritmo + mejoras) con un mundo abierto procedural.

## Jugar

```bash
npm install
npm run dev
```

| Tecla | Acción |
|---|---|
| A / D | moverse |
| W / Espacio | saltar |
| J / Click | atacar — **al ritmo del tambor = golpe perfecto (x1.5)**, 4 seguidos = **Fervor** |
| E | recolectar / hablar |
| F | comer (cerca del fuego la carne se asa y alimenta el doble) |
| C | fabricar |
| M | silenciar |

En móvil aparecen botones táctiles.

## Lo que hay en el prototipo
- Mundo infinito en ambas direcciones con 3 biomas (bosque, estepa, tierras rocosas).
- Ciclo día/noche: de noche salen más depredadores; el fuego ilumina, cura y ahuyenta bestias (no a los humanos).
- Fauna: ciervo gigante, lobo terrible, ave del terror, dientes de sable, mamut lanudo, neandertales y cazadores hostiles. Más peligro cuanto más lejos del origen.
- Fabricación: lanza, hacha, fogata, ropa de piel, tambor de guerra, lanza de sílex, armadura de hueso, collar de colmillos.
- Hambre, vida, muerte (pierdes la mitad del inventario y reapareces en tu última fogata).
- Objetivo del capítulo 1: llegar al humo de la tribu con 12 de renombre.
- Guardado automático en el navegador.

## Estructura
- `src/data.js` — balance: animales, recursos, recetas.
- `src/world.js` — ruido, biomas, generación por chunks.
- `src/main.js` — loop, IA, combate, render y HUD.
