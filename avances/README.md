# Bitácora de CLAN

Historial de versiones para armar los videos de avances. Cada versión anota su commit (`git checkout <commit>` la recupera tal cual era), sus capturas y, desde la v0.3, un video corto grabado del juego.

| Versión | Commit | Fecha | Qué cambió | Material |
| --- | --- | --- | --- | --- |
| v0.7 · El lobo como amenaza | `948f100` | 2026-11-11 | Tú un poco menos ágil: esquiva más corta y con espera entre una y otra. El lobo varía cuánto tarda en saltar, corrige el rumbo al saltar, a veces muerde dos veces seguidas, castiga las estocadas al aire y te ataca casi sin aviso si le das la espalda; salta hacia atrás ante estocadas sin oportunidad; agachado, un golpe no lo frena: salta y te muerde. Puede derribarte si te muerde cansado o por la espalda. La lanza firme solo funciona en el último cuarto de segundo. En pruebas: sin defenderte mueres en unos 35 s; atacando sin parar también mueres. | [capturas y video](v0.7-lobo-amenaza/) |
| v0.6 · Pelea ajustada | `52f6b48` | 2026-11-10 | Más rápido (caminar y correr), salto, esquiva más larga (Shift corto o C). Cansancio gradual: respira más fuerte, se encorva y la imagen pierde color poco a poco; gasta menos y se recupera antes. Estocada con lanza 3D visible, paso al frente, más alcance e impacto con destello. El lobo lee tu defensa: si ya le apuntas con la lanza, no salta y te rodea; hay que levantarla en el último momento para clavarlo. Quieto ante una fiera, la encaras solo. | [capturas y video](v0.6-pelea-ajustada/) |
| v0.5 · Pelea contra un lobo | `8e41427` | 2026-11-07 | Prototipo 2. El lobo rodea, se acerca gruñendo y avisa antes de saltar (se agacha, orejas atrás, lomo erizado); a veces amaga. Lanzada, lanza firme (si salta contra ella se clava), esquiva con energía, contraataque cuando queda expuesto. Mordidas que dejan heridas: cojera, brazo herido, sangrado. Sin barras: el daño se ve en la pantalla y en el cuerpo. Latido, gruñido y golpes con pausa breve para dar peso. | [capturas y video](v0.5-pelea-lobo/) |
| v0.4 · Cámara cercana | `aa25783` | 2026-11-07 | Giro libre de 360° como decisión final. Cámara mucho más cerca y baja, detrás del hombro, como un juego en tercera persona. En tensión, la cámara gira sola para mirar por encima del hombro hacia la fiera. | [capturas y video](v0.4-camara-cercana/) |
| v0.3 · Cámara natural | `ab62e53` | 2026-11-07 | La cámara sigue al mouse sin hacer clic; se aleja sola al caminar hacia ella; gira y deja espacio hacia donde caminas; opción de probar giro libre de 360° (tecla V). | [capturas y video](v0.3-camara-natural/) |
| v0.2 · Cámara 2.5D | `3e5a4ca` | 2026-11-07 | Primer mundo 3D con personajes 2D. Personaje que se ve de frente, espalda y perfil. Cámara que se inclina, gira ±30° y se acerca. Modos de tensión (lobo que acecha) y contemplación (sentado junto al fuego). Día, atardecer y noche con ojos que se adaptan a la oscuridad. Mamuts a lo lejos para dar escala. | [capturas](v0.2-camara-2.5d/) |
| v0.1 · Prototipo 2D | `5ec661a` | 2026-10-31 | Primer prototipo jugable en 2D de lado: recolección, fabricación, fauna hostil, día y noche, combate al ritmo del tambor y unirse a una tribu. Después se descartó el ritmo y el 2D plano. | [capturas](v0.1-prototipo-2d/) |

## Decisiones que cambiaron el rumbo

- **v0.1 → v0.2:** se descarta el 2D plano y la mecánica de ritmo; se elige 2.5D (personajes 2D en un mundo 3D) para dar profundidad y una cámara cinematográfica.
- **Prototipo 2 cerrado (v0.7):** validado jugando. Se siente el golpe, el cansancio es gradual y el lobo no te deja indiferente: con práctica se domina, pero si te descuidas te mata, y las heridas tardan en sanar. Correcto para un enemigo estándar; la dificultad crecerá con manadas y depredadores mayores.
- **v0.6 → v0.7:** quedó demasiado ágil y el lobo ya no era una amenaza; se recorta la esquiva y el lobo aprende a castigar errores.
- **v0.5 → v0.6:** se sentía lento, sin salto, cansaba de golpe, no se entendía cómo pegar y el lobo se lanzaba contra la lanza sin pensar; se acelera, se agrega salto, cansancio gradual, lanza visible y un lobo que lee la defensa.
- **v0.4 → v0.5:** con la cámara cerrada, se pasa al primer combate; se busca que pelear sea la última opción y que leer al animal sea la verdadera habilidad.
- **v0.3 → v0.4:** el límite de giro de ±30° se sentía trabado y la vista alta parecía otro tipo de juego; se adopta giro libre y cámara cercana en tercera persona.
- **v0.2 → v0.3:** el control de cámara con arrastre se sentía extraño; se pasa a un control estándar con el mouse y a una cámara que se anticipa al movimiento.

## Cómo se graba el material

Las capturas y el video se generan con un navegador automatizado que juega una ruta fija (`herramientas/grabar-avance.cjs`) o, para las peleas, un bot que reacciona a las señales del lobo (`herramientas/grabar-pelea.cjs`) (caminar, sentarse junto al fuego, pasar a la noche, encuentro con el lobo). Así cada versión se graba con el mismo recorrido y se puede comparar lado a lado en el video de avances.
