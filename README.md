# MercaFamily

Lista de la compra familiar compartida en tiempo real, con el catálogo y los precios de Mercadona actualizados solos cada semana.

**App:** https://carlosdarko.github.io/mercafamily/

## Qué hace

- **Apuntar sin pensar.** Escribes 'leche' o '2 tomates' y aparecen los productos de Mercadona con foto, formato y precio según escribes. Al pulsar Añadir elige solo el que encaja con vuestras preferencias y con lo que soléis comprar.
- **Preferencias de la familia.** Frases como 'leche semidesnatada sin lactosa' o 'evitar aceite de palma' deciden qué producto se elige.
- **Total previsto** con precios de vuestra zona, en una tira fija abajo, y aviso si os pasáis del presupuesto semanal.
- **Lista por pasillos** con las categorías de Mercadona y un carro para lo que ya habéis cogido.
- **Gastos** por semana, mes y categoría, con cada compra guardada y su detalle.
- **Toca comprar:** 'compráis huevos cada 8 días y hace 9', con un botón para añadirlo todo.
- **Cambios de precio** en lo que compráis, a partir del historial semanal.
- **Ficha de cada producto:** ingredientes, alérgenos, Nutri-Score y valores por 100 g, alternativas más baratas por kilo o litro, más sanas y lo que soléis comprar junto.
- **Funciona sin cobertura** en el súper y se instala en el móvil como una app.
- **Accesible:** navegación con teclado y lector de pantalla, contraste AA, botones de 48 px y textos claros.

## Cómo funciona por dentro

| Pieza | Qué hace |
|---|---|
| GitHub Pages | Aloja la app (gratis). |
| GitHub Actions | Cada lunes descarga el catálogo de Mercadona (unos 4.400 productos), completa fichas, guarda el historial de precios y publica. |
| Supabase | Base de datos con tiempo real y acceso por código de email. Guía: [docs/supabase.md](docs/supabase.md). |
| Open Food Facts | Nutri-Score y nutrición por código de barras, consultado desde la app. |

### Variables de GitHub (Settings, Secrets and variables, Actions, Variables)

| Variable | Para qué |
|---|---|
| `MERCADONA_CP` | Código postal de casa: decide el almacén y por tanto los precios. Si os mudáis, se cambia aquí. |
| `SUPABASE_URL` | Dirección del proyecto de Supabase. |
| `SUPABASE_ANON_KEY` | Clave pública de Supabase. |

## Desarrollo

```bash
npm install
npm run dev
npm test
npm run build
node scripts/fetch-mercadona.mjs   # catálogo y precios (MERCADONA_CP opcional)
node scripts/fetch-details.mjs     # fichas pendientes (MAX=1500 por defecto)
```

## Fuentes de datos

- Catálogo público de la tienda online de Mercadona, consultado una vez por semana y solo para uso doméstico. Mercadona no tiene API oficial.
- [Open Food Facts](https://world.openfoodfacts.org/), base de datos abierta de alimentos (licencia ODbL).
