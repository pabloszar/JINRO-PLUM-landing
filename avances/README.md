# Bitácora de CLAN

Historial de versiones para armar los videos de avances. Cada versión anota su commit (`git checkout <commit>` la recupera tal cual era), sus capturas y, desde la v0.3, un video corto grabado del juego.

| Versión | Commit | Fecha | Qué cambió | Material |
| --- | --- | --- | --- | --- |
| v0.3 · Cámara natural | `ab62e53` | 2026-11-07 | La cámara sigue al mouse sin hacer clic; se aleja sola al caminar hacia ella; gira y deja espacio hacia donde caminas; opción de probar giro libre de 360° (tecla V). | [capturas y video](v0.3-camara-natural/) |
| v0.2 · Cámara 2.5D | `3e5a4ca` | 2026-11-07 | Primer mundo 3D con personajes 2D. Personaje que se ve de frente, espalda y perfil. Cámara que se inclina, gira ±30° y se acerca. Modos de tensión (lobo que acecha) y contemplación (sentado junto al fuego). Día, atardecer y noche con ojos que se adaptan a la oscuridad. Mamuts a lo lejos para dar escala. | [capturas](v0.2-camara-2.5d/) |
| v0.1 · Prototipo 2D | `5ec661a` | 2026-10-31 | Primer prototipo jugable en 2D de lado: recolección, fabricación, fauna hostil, día y noche, combate al ritmo del tambor y unirse a una tribu. Después se descartó el ritmo y el 2D plano. | [capturas](v0.1-prototipo-2d/) |

## Decisiones que cambiaron el rumbo

- **v0.1 → v0.2:** se descarta el 2D plano y la mecánica de ritmo; se elige 2.5D (personajes 2D en un mundo 3D) para dar profundidad y una cámara cinematográfica.
- **v0.2 → v0.3:** el control de cámara con arrastre se sentía extraño; se pasa a un control estándar con el mouse y a una cámara que se anticipa al movimiento.

## Cómo se graba el material

Las capturas y el video se generan con un navegador automatizado que juega una ruta fija (caminar, sentarse junto al fuego, pasar a la noche, encuentro con el lobo). Así cada versión se graba con el mismo recorrido y se puede comparar lado a lado en el video de avances.
