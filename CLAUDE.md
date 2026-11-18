# MercaFamily: instrucciones para Claude

App familiar para llevar juntos la compra de casa: lista compartida en tiempo real, precios de Mercadona automáticos, gastos, sugerencias y avisos.

## Reglas

- Hablar siempre en castellano con el usuario.
- Nunca usar punto y coma en los textos.
- Usar comillas simples (') en lugar de dobles en los textos.
- Documentación del proyecto en castellano.
- Nada de claves, tokens ni datos personales en el repositorio (ni nombres de la familia, ni emails, ni dirección o código postal). La configuración va en variables de GitHub Actions o en la propia app.
- No tocar el repositorio `mr-press`: es otro proyecto (se puede leer para consultar sus referencias).
- Todo lo más automático posible: la familia no debería tener que rellenar precios ni datos a mano.
- Con cada cambio, actualizar también el repositorio y su información: commit y push, README, este `CLAUDE.md`, `docs/` y las capturas de `docs/capturas/` cuando cambie lo que se ve.
- Los cambios de base de datos van siempre en `supabase/schema.sql` (que se puede ejecutar más de una vez) y se aplican al proyecto con la API de gestión de Supabase (token en el formulario seguro de la sesión, nunca en el repositorio).

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Tienda | Mercadona (el 95 % de la compra). Otras tiendas se pueden anotar al terminar la compra, sin catálogo. |
| App | PWA con Svelte 5 y Vite, publicada en GitHub Pages (`/mercafamily/`). Navegación por pestañas con `#lista`, `#gastos` y `#ajustes`. |
| Datos | Supabase (plan gratuito) con seguridad por filas y tiempo real. Sin Supabase la app funciona en modo local (datos en el móvil). |
| Acceso | Email y contraseña con 'Confirm email' desactivado. Supabase ya no deja editar sus plantillas de email sin SMTP propio, y el enlace mágico en iPhone abre Safari y no la app instalada. |
| Precios | Catálogo público de Mercadona descargado una vez por semana por una GitHub Action (la API no permite llamadas desde el navegador). Precios de la zona según la variable `MERCADONA_CP`. |
| Historial de precios | `public/data/history.json`, solo se añade un punto cuando cambia el precio. |
| Nutrición | Ingredientes y alérgenos de Mercadona (`public/data/details.json`, incremental, 1.500 fichas por semana). Nutri-Score y valores por 100 g de Open Food Facts en vivo desde la app por código de barras. |
| Preferencias | Frases libres por hogar ('leche semidesnatada sin lactosa', 'evitar aceite de palma') que ordenan la búsqueda y deciden el producto al pulsar Añadir. |
| Avisos | Web push con VAPID: función de Supabase `push` (`supabase/functions/push`), triggers con pg_net en `items` y `trips`, pg_cron cada 15 minutos, suscripciones en `push_subs`. Claves VAPID solo como secretos de Supabase. Detalle en `docs/avisos.md`. WhatsApp en una fase posterior. |
| Diseño | Skill `disenador-web` con Impeccable, modo Operate. Mundo de mercado: suelo verde hoja pálido con tarjetas blancas, pero sin que todo sea verde. Cada familia de Mercadona tiene icono y color propio (`src/lib/look.js` y variables `--c-huerta`, `--c-mar`, `--c-carne`, `--c-horno`, `--c-leche`, `--c-dulce`, `--c-limon`, `--c-aceite`, `--c-tomate`, `--c-hielo`, `--c-uva`, `--c-limpio`), también cada pestaña y cada receta según su ingrediente principal. Limón para 'toca comprar' y la tarjeta 'Hoy', tomate para la marca y alertas. Barra de añadir en una sola línea con micro y escáner dentro (pasan a '+' al escribir). Acciones rápidas como baldosas en una fila deslizable. Movimiento: transición entre pestañas (View Transitions), indicador de pestaña que se desliza, entrada escalonada (`.rise`), casilla con rebote, total que cuenta, confeti al coger lo último (`src/lib/fx.js`). Todo se apaga con `prefers-reduced-motion`. Huecos de abajo en `rem` para que la letra grande del móvil no tape nada. Bricolage Grotesque autoalojada e iconos Lucide. |
| Listas | Tabla `lists`. La principal tiene el mismo id que el hogar para que no se duplique si dos móviles la crean a la vez. `items.list_id` nulo significa la principal. |
| Ajustes compartidos | `households.settings` (jsonb): favoritos, orden de pasillos aprendido (`aisle`), lo que suele faltar (`missing`). `households.aliases`: búsquedas aprendidas. Tema y tamaño de letra son de cada móvil (localStorage). |
| Tema | Colores por variables en `:root`, oscuro por preferencia del móvil o forzado con `data-theme`. Los componentes no usan `prefers-color-scheme`, solo variables (`--accent-text`, `--primary-bg`…). |
| Menú y recetas | Tablas `recipes` (ingredientes en jsonb con `merc_id`) y `meals` (día y `slot` comida o cena). Las recetas de partida (`STARTER_RECIPES` con `slot` y `tags`) resuelven cada ingrediente con el buscador al usarlas. `suggestWeek` propone el menú: sin repetir, 2 de legumbre y 2 de pescado si hay huecos, sin legumbre de cena, aprovechando la despensa. |
| Recetario | `src/lib/recipes-kb.js` (`KB` = las de ese archivo más las de `src/lib/recipes-more.js`, escritas en formato de una línea por receta con marcas k peques, f divertida, x exprés, n sin cocinar, y slot `merienda` que no entra en el menú). En total unas 280. `src/lib/recipes-kb.js`: recetas escritas para la app, para 3, con `q` (lo que se busca en el catálogo), cantidad, `basic` para sal, aceite y especias, pasos, tiempo, `slot`, `tags`, `kids` y `season`. Al añadir un ingrediente nuevo, comprobar con el buscador que lleva a un producto razonable. Al usar una receta se guarda como receta de casa con `kb_id`, `steps` y `meta`. |
| Decidir menos | `TodayCard.svelte` en la lista: 'Hoy coméis' con propuesta de un toque ('Vale' y 'Otra'), lo que falta (`atHome` en `src/lib/home.js`, compara con la despensa estimada y la lista), qué descongelar para mañana y, de viernes a domingo, `#menu-proponer` para la semana siguiente. Valoraciones por nombre de receta: `settings.ratings` (1 nos gusta, -1 no nos gusta, que solo resta puntos y nunca quita la receta) y `settings.snoozed` ('Ahora no': fuera de las propuestas 21 días, vuelve sola). Todo con 'Deshacer' y filtro 'Apartadas' en el recetario. `suggestWeek(..., opts)` sube lo que gusta, baja lo que no, quita lo apartado y lo de temporada y prefiere cenas rápidas entre semana. Aviso push del menú del día (`prefs.today` con hora, en el `tick` de la función `push`). |
| Temporada y equilibrio | Calendario de fruta y verdura de España por mes en `src/lib/home.js` (`SEASON`). `foodGroup` clasifica por categorías de Mercadona y `balance` compara el reparto del gasto con referencias sencillas (orientativo, no raciones). |
| Buscador al añadir | Se enseñan los 8 mejores y 'Ver los N' con todo (hasta 300). Si hay al menos 8 con lo buscado en el nombre, la lista completa deja fuera los que solo comparten familia (muesli al buscar 'galleta'). |
| Avisos dentro de hojas | Con un `<dialog>` modal abierto lo de fuera no se puede pulsar. `app.sheets` lleva las hojas abiertas y el aviso (con su 'Deshacer') se pinta dentro de la de arriba. |
| Errores de pantalla | Cada pantalla va dentro de `<svelte:boundary>`: si falla, aviso con botón para recargar y el error se apunta en el panel de estado. |
| Despensa | No tiene tabla: se estima con `trip_items` (última compra y frecuencia) en `src/lib/home.js`. Las correcciones a mano van en `households.settings.pantry` (con `name` y `merc_id`, así cuenta también lo que no se compró con la app). Se corrige sola: al añadir una receta, 'Sí, lo tenemos' apunta lo desmarcado (`pantryHave`), y '¿Os queda…?' (`PantryCheck.svelte`, `pantryDoubts`) pregunta en la lista por 3 cosas que se acaban y nadie ha confirmado esa semana. El resumen push del domingo invita a responderlo. |
| Peques | `items.requested` para peticiones. El modo peque es de cada móvil (`prefs.kid` en localStorage) y se sale resolviendo una multiplicación. |
| Dietas | `households.settings.people` con lo que evita cada persona. Se comprueba con ingredientes y alérgenos de `details.json` (`dietConflicts`). |
| Salud | Cambios más sanos: misma familia o familia parecida, Nutri-Score A o B o dos letras mejor, precio por kilo como mucho un 30 % mayor. Si no hay ninguno real, no se propone nada. |
| Dinero | Objetivos (`settings.goals` por categoría), ahorro (`settings.savings`, se apunta al cambiar por un producto más barato), tendencia de precio desde `history.json`. Sin tablas nuevas. |
| Bienvenida | Guía de cuatro pasos la primera vez (`mf:onboarded` en localStorage). No se muestra a navegadores automatizados. |
| Voz | Web Speech API (`SpeechRecognition`, en iPhone y Android). `src/lib/voice.js` convierte la frase en productos con cantidades. |
| Ticket con foto | tesseract.js con idioma español, cargado bajo demanda (worker y datos desde CDN la primera vez). `src/lib/ticket.js` lee total y líneas de Mercadona y las une con el carro. Los precios leídos se guardan en `trip_items.price`. |
| Sin cobertura | `src/lib/offline.js`: los cambios a Supabase pasan por una cola en localStorage (`mf:queue`) y se envían en orden. Lo que falla por red se queda, lo demás se descarta con aviso. Copia local de los datos (`mf:snap`) para abrir sin red. El service worker guarda todos los archivos de `asset-list.json` (lo genera `vite.config.js`) y el catálogo. |
| Otras tiendas | Función de Supabase `compare` (`supabase/functions/compare`): busca en las APIs públicas de Dia y Consum con caché de 7 días (`compare_cache`). Solo se compara por kilo o litro. Carrefour, Eroski y Caprabo bloquean consultas automáticas (no se fuerzan) y Alcampo no tiene buscador público. |
| Quién va | `households.settings.going` (nombre y hora, dura 2 horas o hasta terminar la compra). Aviso push con `type: 'going'` en la función `push`. |
| Formatos | `cheaperFormat` en `src/lib/home.js`: mismo nombre quitando palabras de tamaño, misma familia y unidad, al menos un 5 % más barato. |
| Informe e IPC | `MonthReport.svelte` (imprimir a PDF con estilos de impresión, compartir texto). `basketInflation` en `src/lib/insights.js`: primer precio pagado frente al actual, pesado por gasto, frente al IPC de alimentos del INE (`scripts/fetch-ipc.mjs`, series IPC290755 e IPC290754, base 2025) en los mismos meses. Aviso push el día 1 a las 9:00 que abre `#gastos-informe`. |
| Keep-alive | La misma Action llama cada lunes a `rpc/heartbeat` de Supabase para que el proyecto gratuito no se pause. |

## Estructura

- `src/lib/data.svelte.js`: estado y acciones. `local.js` y `supa.js` tienen la misma interfaz.
- `src/lib/catalog.js`: carga y búsqueda del catálogo con preferencias e historial.
- `src/lib/home.js`: despensa estimada, recetas de partida y dietas (con pruebas en `tests/`).
- `src/lib/search.js`: motor de búsqueda (índice, plurales, erratas, sinónimos, lo aprendido).
- `src/lib/insights.js`: frecuencia de compra, gasto por periodos y cambios de precio (con pruebas en `tests/`).
- `src/components/`: pantallas y piezas de la interfaz.
- `scripts/`: descargadores del catálogo y de las fichas de Mercadona.
- `supabase/schema.sql`: esquema completo, se puede ejecutar más de una vez.
- `supabase/functions/push/`: función de Supabase que envía los avisos push.
- `supabase/functions/compare/`: función de Supabase que compara con Dia y Consum.
- `src/lib/offline.js`: cola de cambios sin cobertura y copia local (con pruebas en `tests/`).
- `.github/workflows/actualizar-y-publicar.yml`: actualización semanal y publicación.

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173/mercafamily/
npm test
npm run build
```

## Fases

1. Base: lista compartida, categorías, carro, terminar compra. Hecho.
2. Costes e histórico: precios automáticos, total previsto, presupuesto, gastos con gráficas. Hecho.
3. Precios automáticos: catálogo semanal de Mercadona, historial de precios, fichas y Open Food Facts. Hecho, con escáner de código de barras en Android (BarcodeDetector, en iPhone aún no existe).
4. Sugerencias y avisos: 'toca comprar' por frecuencia, subidas de precio, alternativas más baratas y más sanas, y avisos push. Hecho.
5. WhatsApp y voz: voz dentro de la app hecha. WhatsApp pendiente.
