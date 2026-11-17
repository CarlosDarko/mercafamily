<script>
  // Avisos en este móvil: activar, elegir cuáles y probar
  import { Bell, BellOff } from '@lucide/svelte'
  import { app, pushStatus, enablePush, savePushPrefs, disablePush, testPush, toast } from '../lib/data.svelte.js'
  import { DEFAULT_PUSH_PREFS, pushSupported, isIOS, isStandalone } from '../lib/push.js'

  let state = $state('cargando') // cargando | activo | inactivo | no-soportado | ios | local | denegado
  let prefs = $state(structuredClone(DEFAULT_PUSH_PREFS))
  let busy = $state(false)
  const DAYS = [
    [1, 'L'],
    [2, 'M'],
    [3, 'X'],
    [4, 'J'],
    [5, 'V'],
    [6, 'S'],
    [7, 'D']
  ]

  async function refresh() {
    if (app.kind !== 'supabase') return (state = 'local')
    if (isIOS() && !isStandalone()) return (state = 'ios')
    if (!pushSupported()) return (state = 'no-soportado')
    if (Notification.permission === 'denied') return (state = 'denegado')
    const { sub, row } = await pushStatus()
    if (sub && row) {
      prefs = { ...structuredClone(DEFAULT_PUSH_PREFS), ...row.prefs, work: { ...DEFAULT_PUSH_PREFS.work, ...(row.prefs?.work || {}) } }
      state = 'activo'
    } else state = 'inactivo'
  }
  refresh()

  async function on() {
    busy = true
    try {
      await enablePush($state.snapshot(prefs))
      state = 'activo'
      const r = await testPush().catch(() => null)
      toast(r?.sent ? 'Avisos activados: te hemos mandado uno de prueba' : 'Avisos activados')
    } catch (e) {
      if (String(e?.message).includes('permiso')) state = 'denegado'
      else toast('No se han podido activar los avisos. Inténtalo otra vez.')
    }
    busy = false
  }
  async function off() {
    busy = true
    await disablePush()
    state = 'inactivo'
    busy = false
    toast('Avisos desactivados en este móvil')
  }
  let saveTimer
  function changed() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => savePushPrefs(null, $state.snapshot(prefs)).catch(() => toast('No se han podido guardar los avisos')), 400)
  }
  function toggleDay(d) {
    const days = prefs.work.days.includes(d) ? prefs.work.days.filter((x) => x !== d) : [...prefs.work.days, d].sort()
    prefs.work.days = days
    changed()
  }
</script>

<section class="section" aria-labelledby="h-push">
  <h2 id="h-push">Avisos</h2>
  <div class="panel pad stack">
    {#if state === 'local'}
      <p class="muted">Los avisos funcionan cuando la lista está sincronizada con Supabase.</p>
    {:else if state === 'ios'}
      <p>En iPhone los avisos solo llegan con la app instalada: en Safari pulsa Compartir y 'Añadir a pantalla de inicio', ábrela desde ahí y vuelve a esta sección.</p>
    {:else if state === 'no-soportado'}
      <p class="muted">Este navegador no permite avisos. Prueba con Chrome en Android o con la app instalada en iPhone.</p>
    {:else if state === 'denegado'}
      <p>Los avisos están bloqueados para esta app. Actívalos en los ajustes del navegador o del móvil (Notificaciones) y vuelve aquí.</p>
    {:else if state === 'inactivo'}
      <p class="muted">Recibe en este móvil lo que apuntan los demás, el resumen del domingo y un recordatorio al salir del trabajo.</p>
      <button class="btn btn-primary" onclick={on} disabled={busy}><Bell size={18} aria-hidden="true" /> Activar avisos en este móvil</button>
    {:else if state === 'activo'}
      <label class="sw"><input type="checkbox" bind:checked={prefs.added} onchange={changed} /> Cuando alguien apunta algo o lo pide un peque</label>
      <label class="sw"><input type="checkbox" bind:checked={prefs.trips} onchange={changed} /> Cuando alguien termina la compra</label>
      <label class="sw"><input type="checkbox" bind:checked={prefs.budget} onchange={changed} /> Si os pasáis del presupuesto semanal</label>
      <label class="sw"><input type="checkbox" bind:checked={prefs.summary} onchange={changed} /> Resumen del domingo a las {prefs.summaryTime}</label>

      <fieldset class="work">
        <legend><label class="sw"><input type="checkbox" bind:checked={prefs.work.on} onchange={changed} /> Aviso al salir del trabajo</label></legend>
        {#if prefs.work.on}
          <div class="row wrap">
            <label class="field small">
              <span>Hora</span>
              <input class="input" type="time" bind:value={prefs.work.time} onchange={changed} />
            </label>
            <label class="field grow">
              <span>Si hay algo en</span>
              <select class="input" bind:value={prefs.work.list_id} onchange={changed}>
                {#each app.lists as l (l.id)}<option value={l.id === app.household?.id ? null : l.id}>{l.name}</option>{/each}
              </select>
            </label>
          </div>
          <div class="days" role="group" aria-label="Días">
            {#each DAYS as [d, l]}
              <button type="button" class="day" aria-pressed={prefs.work.days.includes(d)} onclick={() => toggleDay(d)} aria-label={['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'][d - 1]}>{l}</button>
            {/each}
          </div>
        {/if}
      </fieldset>

      <div class="row wrap">
        <button class="btn" onclick={() => testPush().then((r) => toast(r?.sent ? 'Aviso de prueba enviado' : 'No se ha podido enviar'))}>Mandarme uno de prueba</button>
        <button class="btn btn-ghost" onclick={off} disabled={busy}><BellOff size={18} aria-hidden="true" /> Desactivar</button>
      </div>
    {:else}
      <p class="muted">Comprobando…</p>
    {/if}
  </div>
</section>

<style>
  .pad {
    padding: 16px;
  }
  .sw {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    font-weight: 600;
    cursor: pointer;
  }
  .sw input {
    width: 22px;
    height: 22px;
    flex: none;
  }
  .work {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .wrap {
    flex-wrap: wrap;
  }
  .small {
    width: 8rem;
  }
  .grow {
    flex: 1;
    min-width: 10rem;
  }
  .days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
    max-width: 22rem;
  }
  .day {
    width: 100%;
    min-height: 44px;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .day[aria-pressed='true'] {
    background: var(--primary-bg);
    border-color: var(--primary-bg);
    color: var(--primary-ink);
  }
</style>
