<script>
  // Entrada: nombre (modo local), acceso con código por email y crear o unirse a un hogar (Supabase)
  import { app, setMe, sendCode, verifyCode, createHousehold, joinHousehold, saveSupabaseConfig } from '../lib/data.svelte.js'

  let name = $state(app.me)
  let email = $state(app.email)
  let code = $state('')
  let invite = $state('')
  let homeName = $state('Casa')
  let step = $state(app.screen === 'login' ? 'email' : '')
  let mode = $state('create')
  let busy = $state(false)
  let error = $state(app.error)

  async function run(fn) {
    error = ''
    busy = true
    try {
      await fn()
    } catch (e) {
      error = e?.message || 'Algo ha fallado. Inténtalo otra vez.'
    }
    busy = false
  }

  function start(e) {
    e.preventDefault()
    if (!name.trim()) return (error = 'Escribe tu nombre para que los demás sepan quién apunta cada cosa.')
    setMe(name)
    app.screen = 'ready'
  }
  const askCode = (e) => (e.preventDefault(), run(async () => (await sendCode(email.trim()), (step = 'code'))))
  const checkCode = (e) => (e.preventDefault(), run(() => verifyCode(code.trim())))
  function household(e) {
    e.preventDefault()
    if (!name.trim()) return (error = 'Escribe tu nombre.')
    run(() => (mode === 'create' ? createHousehold(homeName, name) : joinHousehold(invite, name)))
  }
</script>

<main id="main" class="welcome" tabindex="-1">
  <div class="card">
    <p class="brand" aria-hidden="true">MercaFamily</p>

    {#if app.screen === 'welcome'}
      <h1>La compra de casa, entre todos</h1>
      <p class="muted">Apuntáis lo que falta, la app pone el producto y el precio de Mercadona y lleva la cuenta de lo que gastáis.</p>
      <form class="stack" onsubmit={start}>
        <label class="field">
          <span>¿Cómo te llamas?</span>
          <input class="input" bind:value={name} autocomplete="given-name" maxlength="30" required />
        </label>
        {#if error}<p class="error-text" role="alert">{error}</p>{/if}
        <button class="btn btn-primary btn-block" type="submit">Empezar</button>
      </form>
    {:else if app.screen === 'login'}
      <h1>Entrar en la lista familiar</h1>
      {#if step === 'code'}
        <p class="muted">Te hemos mandado un código a <strong>{email}</strong>. Si no llega en un minuto, mira en spam.</p>
        <form class="stack" onsubmit={checkCode}>
          <label class="field">
            <span>Código del email</span>
            <input class="input code" bind:value={code} inputmode="numeric" autocomplete="one-time-code" maxlength="10" required />
          </label>
          {#if error}<p class="error-text" role="alert">{error}</p>{/if}
          <button class="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Comprobando…' : 'Entrar'}</button>
          <button class="btn btn-ghost btn-block" type="button" onclick={() => ((step = 'email'), (code = ''))}>Usar otro email</button>
        </form>
      {:else}
        <p class="muted">Sin contraseñas: escribe tu email y te mandamos un código para entrar.</p>
        <form class="stack" onsubmit={askCode}>
          <label class="field">
            <span>Email</span>
            <input class="input" type="email" bind:value={email} autocomplete="email" required />
          </label>
          {#if error}<p class="error-text" role="alert">{error}</p>{/if}
          <button class="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Mandarme el código'}</button>
        </form>
        {#if app.error}
          <button class="btn btn-ghost btn-block" onclick={() => saveSupabaseConfig(null, null)}>Usar la app solo en este móvil</button>
        {/if}
      {/if}
    {:else if app.screen === 'household'}
      <h1>Vuestra lista</h1>
      <form class="stack" onsubmit={household}>
        <label class="field">
          <span>Tu nombre</span>
          <input class="input" bind:value={name} autocomplete="given-name" maxlength="30" required />
        </label>
        <fieldset class="choice">
          <legend class="label">¿Es la primera vez en casa?</legend>
          <label class="opt"><input type="radio" bind:group={mode} value="create" /> Sí, crear la lista de casa</label>
          <label class="opt"><input type="radio" bind:group={mode} value="join" /> No, alguien ya la ha creado</label>
        </fieldset>
        {#if mode === 'create'}
          <label class="field">
            <span>Nombre de la lista</span>
            <input class="input" bind:value={homeName} maxlength="40" />
          </label>
        {:else}
          <label class="field">
            <span>Código para unirse</span>
            <input class="input code" bind:value={invite} autocapitalize="characters" maxlength="8" required />
            <span class="hint">Lo encuentra quien creó la lista en Ajustes, Familia.</span>
          </label>
        {/if}
        {#if error}<p class="error-text" role="alert">{error}</p>{/if}
        <button class="btn btn-primary btn-block" type="submit" disabled={busy}>{mode === 'create' ? 'Crear la lista' : 'Unirme'}</button>
      </form>
    {/if}
  </div>
</main>

<style>
  .welcome {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 24px var(--gutter);
    background: var(--market);
  }
  .welcome:focus {
    outline: none;
  }
  .card {
    width: 100%;
    max-width: 440px;
    padding: 28px 22px;
    border-radius: 24px;
    background: var(--surface);
    box-shadow: 0 30px 60px -30px rgb(0 0 0 / 0.5);
    display: grid;
    gap: 16px;
  }
  .brand {
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--market-2);
    font-size: 1.1rem;
  }
  @media (prefers-color-scheme: light) {
    .brand {
      color: var(--market);
    }
  }
  h1 {
    font-size: 2rem;
  }
  .code {
    font-size: 1.4rem;
    letter-spacing: 0.15em;
    font-weight: 700;
  }
  .choice {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: var(--tap);
    padding: 0 14px;
    border: 1.5px solid var(--line);
    border-radius: 12px;
    cursor: pointer;
  }
  .opt:has(input:checked) {
    border-color: var(--market-2);
    background: var(--market-soft);
  }
  .opt input {
    width: 20px;
    height: 20px;
  }
</style>
