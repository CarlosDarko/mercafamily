# Avisos push

Los avisos llegan al móvil aunque la app esté cerrada. Cada persona los activa en su móvil en **Ajustes, Avisos** y elige cuáles quiere.

| Aviso | Cuándo |
|---|---|
| Alguien apunta algo (o un peque lo pide) | Al momento. Si apunta varias cosas seguidas, un solo aviso que se va actualizando. |
| Alguien termina la compra | Al guardarla, con el total y lo que lleváis esta semana. |
| Os pasáis del presupuesto | Una vez por semana, al pasarlo. |
| Alguien va al súper | Al pulsar 'Voy yo al súper', para apuntar lo último. |
| Resumen del domingo | Domingo a las 19:00: gasto de la semana y lo que queda en la lista. |
| Informe del mes | Día 1 a las 9:00: gasto del mes anterior. Al tocarlo se abre el informe. |
| Al salir del trabajo | A la hora y los días elegidos, si la lista elegida tiene algo. |

En iPhone solo funcionan con la app instalada en la pantalla de inicio (Safari, Compartir, Añadir a pantalla de inicio).

## Cómo funciona

- `public/sw.js` muestra el aviso y, al tocarlo, abre la sección de la app.
- `src/lib/push.js` y `src/components/PushSettings.svelte` piden permiso, suscriben el móvil y guardan las preferencias en la tabla `push_subs`.
- `supabase/functions/push/index.ts` es la función de Supabase que envía los avisos (web push con VAPID).
- En la base de datos (`supabase/schema.sql`):
  - Los triggers `items_push` y `trips_push` llaman a la función con pg_net.
  - La tarea `mercafamily-push-tick` de pg_cron la llama cada 15 minutos (aviso del trabajo y resumen del domingo).
  - `push_log` evita avisos repetidos.
- La dirección de la función se guarda en la tabla `app_config` (clave `push_url`).

## Volver a desplegar

Las claves VAPID son secretos del proyecto de Supabase (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Nunca van al repositorio. Para desplegar la función con la API de gestión (token personal de Supabase en el formulario seguro de la sesión):

```bash
curl -X POST "https://api.supabase.com/v1/projects/REF/functions/deploy?slug=push" \
  -H "Authorization: Bearer TOKEN" \
  -F 'metadata={"entrypoint_path":"index.ts","name":"push","verify_jwt":false};type=application/json' \
  -F "file=@supabase/functions/push/index.ts;type=application/typescript"
```

Y una vez:

```sql
insert into public.app_config (key, value) values ('push_url', 'https://REF.supabase.co/functions/v1/push')
on conflict (key) do update set value = excluded.value;
```

Si se cambian las claves VAPID, los móviles tienen que desactivar y volver a activar los avisos.
