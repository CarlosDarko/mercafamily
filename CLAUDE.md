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

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Tienda | Mercadona (el 95 % de la compra). Otras tiendas se pueden anotar al terminar la compra, sin catálogo. |
| App | PWA con Svelte 5 y Vite, publicada en GitHub Pages (`/mercafamily/`). Navegación por pestañas con `#lista`, `#gastos` y `#ajustes`. |
| Datos | Supabase (plan gratuito) con seguridad por filas y tiempo real. Sin Supabase la app funciona en modo local (datos en el móvil). |
| Acceso | Código de un solo uso por email (OTP), no enlace mágico, porque en iPhone el enlace abre Safari y no la app instalada. |
| Precios | Catálogo público de Mercadona descargado una vez por semana por una GitHub Action (la API no permite llamadas desde el navegador). Precios de la zona según la variable `MERCADONA_CP`. |
| Historial de precios | `public/data/history.json`, solo se añade un punto cuando cambia el precio. |
| Nutrición | Ingredientes y alérgenos de Mercadona (`public/data/details.json`, incremental, 1.500 fichas por semana). Nutri-Score y valores por 100 g de Open Food Facts en vivo desde la app por código de barras. |
| Preferencias | Frases libres por hogar ('leche semidesnatada sin lactosa', 'evitar aceite de palma') que ordenan la búsqueda y deciden el producto al pulsar Añadir. |
| Avisos | De momento solo dentro de la app. WhatsApp (OpenWA y Whisper) en una fase posterior. |
| Diseño | Skill `disenador-web` con Impeccable, modo Operate. Mundo de mercado y ticket: verde mercado, suelo verde hoja pálido con tarjetas blancas (Impeccable marcó el crema como fondo por reflejo), limón para 'toca comprar', tomate solo para alertas. Bricolage Grotesque autoalojada e iconos Lucide. |
| Keep-alive | La misma Action llama cada lunes a `rpc/heartbeat` de Supabase para que el proyecto gratuito no se pause. |

## Estructura

- `src/lib/data.svelte.js`: estado y acciones. `local.js` y `supa.js` tienen la misma interfaz.
- `src/lib/catalog.js`: carga y búsqueda del catálogo con preferencias e historial.
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
