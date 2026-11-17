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
| Avisos | De momento solo dentro de la app. WhatsApp (OpenWA y Whisper) en una fase posterior. |
| Diseño | Skill `disenador-web` con Impeccable, modo Operate. Mundo de mercado y ticket: verde mercado, suelo verde hoja pálido con tarjetas blancas (Impeccable marcó el crema como fondo por reflejo), limón para 'toca comprar', tomate solo para alertas. Bricolage Grotesque autoalojada e iconos Lucide. |
| Listas | Tabla `lists`. La principal tiene el mismo id que el hogar para que no se duplique si dos móviles la crean a la vez. `items.list_id` nulo significa la principal. |
| Ajustes compartidos | `households.settings` (jsonb): favoritos, orden de pasillos aprendido (`aisle`), lo que suele faltar (`missing`). `households.aliases`: búsquedas aprendidas. Tema y tamaño de letra son de cada móvil (localStorage). |
| Tema | Colores por variables en `:root`, oscuro por preferencia del móvil o forzado con `data-theme`. Los componentes no usan `prefers-color-scheme`, solo variables (`--accent-text`, `--primary-bg`…). |
| Menú y recetas | Tablas `recipes` (ingredientes en jsonb con `merc_id`) y `meals` (día y cena). Las recetas de partida resuelven cada ingrediente con el buscador al usarlas. |
| Despensa | No tiene tabla: se estima con `trip_items` (última compra y frecuencia) en `src/lib/home.js`. Las correcciones a mano van en `households.settings.pantry`. |
| Peques | `items.requested` para peticiones. El modo peque es de cada móvil (`prefs.kid` en localStorage) y se sale resolviendo una multiplicación. |
| Dietas | `households.settings.people` con lo que evita cada persona. Se comprueba con ingredientes y alérgenos de `details.json` (`dietConflicts`). |
| Salud | Cambios más sanos: misma familia o familia parecida, Nutri-Score A o B o dos letras mejor, precio por kilo como mucho un 30 % mayor. Si no hay ninguno real, no se propone nada. |
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
4. Sugerencias y avisos: 'toca comprar' por frecuencia, subidas de precio, alternativas más baratas y más sanas. Hecho dentro de la app. Faltan notificaciones push.
5. WhatsApp y voz: pendiente.
