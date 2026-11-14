# CLAN — contexto para retomar el trabajo

Juego de supervivencia paleolítica en 2.5D (personajes 2D en un mundo 3D). Un humano pierde a su tribu, sobrevive solo, se hace fuerte, forma familia y clan, y puede convertirse en ancestro. Todo en español.

## Dónde está cada cosa

- **Documento de diseño (fuente de verdad del concepto):** https://claude.ai/artifact/4DGujNeZSkGEzYFw9vnNGz — 15 secciones: visión, historia (mito, no crónica), cámara 2.5D, supervivencia, combate, progresión invisible, clan, retiro y simulación en ausencia, generaciones, ciclo a largo plazo (asentamiento hasta un santuario tipo Göbekli Tepe, descubrimientos, bestias legendarias), mundo y fauna, estética, audio, preguntas abiertas, plan de prototipos. Leerlo antes de proponer cambios de diseño.
- **Bitácora de versiones:** `avances/README.md` (versión, commit, fecha, qué cambió, capturas y video por versión). Se usa para hacer videos de avances: cada versión nueva lleva su fila, capturas y, si aplica, video.
- **Prototipos:** `prototipos/<nn-nombre>/` (Vite + Three.js, sin otras dependencias). Cada uno parte del anterior.
  - `01-camara` (v0.2–v0.4): cámara y movimiento. Página: https://claude.ai/artifact/29e5sA3vmxDf3LxiPjzs5x
  - `02-pelea` (v0.5–v0.7, **validado**): pelea contra un lobo. Página: https://claude.ai/artifact/37JS7y2y61waM6yhbMTViX
  - `03-noche` (v0.8–v0.12, **en prueba**): sobrevivir una noche. Página: https://claude.ai/artifact/54gDsJLDExr2BskTHLqc2Q
  - `index.html` + `src/` en la raíz: prototipo 2D original (v0.1), descartado.
- **Herramientas:** `herramientas/` — `vite.pagina.config.js` + `empaquetar.py` (un prototipo a un solo HTML publicable), `grabar-avance.cjs`, `grabar-pelea.cjs`, `grabar-noche.cjs` (graban video con Playwright).

## Decisiones ya tomadas (no reabrir sin que el usuario lo pida)

- 2.5D con cámara cercana detrás del hombro, giro libre de 360°, mouse sin clic para mirar. Nada de vista alta.
- Sin mecánica de ritmo. Sin barras en pantalla: el daño, el frío y el cansancio se ven en el cuerpo y en la imagen (barras solo con la tecla B para pruebas).
- Rangos invisibles; logros como pinturas en la cueva. Meta: ser ancestro.
- Muerte permanente; la primera partida en modo duro; generaciones (renaces en un hijo o nieto); vida de unas 18 horas; el mundo cambia en cada generación.
- Personaje siempre hombre. Mundo infinito generado. PC primero; pensar en multijugador sin construirlo.
- Combate (validado en v0.7): el lobo avisa (se agacha), corrige el salto, castiga errores, lee la lanza firme (solo funciona levantándola en el último cuarto de segundo), puede derribarte; heridas que tardan en sanar; cansancio gradual.
- Noche (v0.11): el fuego consume leña, frío, hambre, antorcha, lobos que pueden o no venir (sin ritmo fijo) y pierden interés si te quedas en la luz; cama y dormir para acelerar la noche.
- Controles táctiles (v0.12): botones chicos en arco y contextuales; joystick con círculo interior para caminar y anillo exterior para correr (perilla naranja).
- Por probar más adelante: encender el fuego donde quieras.

## Siguiente paso

Esperando que el usuario juegue la v0.11 (dormir) y diga si la noche ya queda del lado de "da miedo" y no de "ya no quiero jugar". Después: **prototipo 4, un compañero** que te sigue y obedece cuatro gestos (sígueme, espera, ataca, huye).

## Forma de trabajar con este usuario

- Respuestas en español, concisas y honestas; decirle cuando algo no le conviene.
- Cada cambio: probar en navegador (Playwright con swiftshader; el navegador de pruebas es lento, así que validar mecánicas con bots que leen el estado expuesto en `window.__clan`), subir versión visible en pantalla, fila en la bitácora con capturas/video, commit y push a la rama `claude/paleolithic-survival-game-zrv3pj`, republicar la página del prototipo con `empaquetar.py` y actualizar el documento de diseño si cambia una mecánica.
- La plataforma no deja subir etiquetas de git; por eso la bitácora anota el commit de cada versión.
