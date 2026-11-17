# Conectar Supabase (sincronizar los móviles)

Supabase es una base de datos en la nube con plan gratuito. Sirve para que lo que apunta una persona aparezca al momento en los móviles de los demás. Sin ella, la app funciona igual pero cada móvil tiene su propia lista.

Se hace una sola vez y lleva unos 10 minutos.

## 1. Crear la cuenta y el proyecto

1. Entra en [supabase.com](https://supabase.com) y pulsa 'Start your project'. Lo más rápido es 'Continue with GitHub'.
2. Pulsa 'New project':
   - Name: `mercafamily`
   - Database Password: genera una y guárdala en tu gestor de contraseñas (la app no la necesita).
   - Region: 'West EU (Ireland)' o 'Central EU (Frankfurt)'.
   - Plan: Free.
3. Espera un par de minutos a que termine de crearse.

## 2. Crear las tablas

1. Menú de la izquierda: 'SQL Editor', luego 'New query'.
2. Copia entero el archivo [`supabase/schema.sql`](../supabase/schema.sql), pégalo y pulsa 'Run'. Tiene que decir 'Success'.

## 3. Que el email de acceso lleve un código

La app entra con un código de 6 cifras que llega por email (así funciona bien en iPhone con la app instalada).

1. 'Authentication', luego 'Emails' (o 'Email Templates'), plantilla 'Magic Link'.
2. Asunto: `Tu código para MercaFamily`
3. Cuerpo:

   ```html
   <h2>Tu código para entrar en MercaFamily</h2>
   <p style='font-size:28px;font-weight:bold;letter-spacing:4px'>{{ .Token }}</p>
   <p>Escríbelo en la app. Caduca en una hora.</p>
   ```

4. Guarda.

## 4. Decirle a Supabase dónde está la app

'Authentication', luego 'URL Configuration':

- Site URL: `https://carlosdarko.github.io/mercafamily/`
- Redirect URLs: añade la misma dirección.

## 5. Copiar la dirección y la clave pública

'Project Settings', luego 'API' (o 'Data API' y 'API Keys'). Copia:

- 'Project URL', del estilo `https://abcdefgh.supabase.co`
- La clave pública: 'anon public' o 'publishable key'. **Nunca** la 'service_role' ni la 'secret key'.

La clave pública está pensada para ir dentro de la app: lo que protege los datos es la seguridad por filas del paso 2.

## 6. Pasárselas a la app

En GitHub, en el repositorio: 'Settings', 'Secrets and variables', 'Actions', pestaña 'Variables', botón 'New repository variable'. Crea dos:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | la Project URL |
| `SUPABASE_ANON_KEY` | la clave pública |

Después ve a la pestaña 'Actions', elige 'Actualizar y publicar' y pulsa 'Run workflow'. En un par de minutos la app publicada ya usa Supabase en todos los móviles, sin configurar nada en ellos.

## 7. Entrar

1. Abre la app, escribe tu email y el código que te llegue.
2. La primera persona elige 'Sí, crear la lista de casa'.
3. En 'Ajustes', 'Familia' aparece el código para unirse. Los demás entran con su email y eligen 'No, alguien ya la ha creado' con ese código.

Si ya tenías cosas en modo local: antes de todo, en 'Ajustes', 'Copia de seguridad', pulsa 'Exportar copia'. Al entrar con Supabase, 'Importar copia'.

## Bueno saber

- El plan gratuito pausa el proyecto tras 7 días sin uso. La tarea de GitHub lo llama cada lunes para evitarlo, y si aun así se pausa se reactiva con un clic en el panel sin perder datos.
- El servidor de email gratuito de Supabase manda pocos correos por hora. Para tres personas que entran una vez y se quedan con la sesión iniciada sobra.
- Alternativa: si prefieres no hacerlo tú, crea un 'Access token' en Supabase ('Account', 'Access Tokens') y pásaselo a Claude desde el formulario seguro de la sesión, nunca en el chat. Con eso puede hacer los pasos 2 a 6.
