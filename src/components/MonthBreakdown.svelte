<script>
  // Este mes: por categoría con objetivos, por persona y ahorro conseguido con alternativas
  import { Target, PiggyBank, X } from '@lucide/svelte'
  import { catLook } from '../lib/look.js'
  import { app, settings, setGoal, colorOf } from '../lib/data.svelte.js'
  import { eur, parseNum } from '../lib/format.js'
  import Sheet from './Sheet.svelte'

  const now = new Date()
  const ym = (d) => d.slice(0, 7)
  const thisM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  function byCat(month) {
    const m = new Map()
    for (const t of app.tripItems) {
      if (ym(t.bought_on) !== month) continue
      const k = app.catalog?.cats.has(t.category) ? t.category : 'otros'
      m.set(k, (m.get(k) || 0) + (t.price || 0) * (t.qty || 1))
    }
    return m
  }
  const cur = $derived(byCat(thisM))
  const prev = $derived(byCat(prevM))
  const goals = $derived(settings().goals || {})
  const rows = $derived(
    [...new Set([...cur.keys(), ...Object.keys(goals).map((k) => (isNaN(k) ? k : Number(k)))])]
      .map((k) => ({ k, name: k === 'otros' ? 'Otros' : app.catalog?.cats.get(k)?.n || 'Otros', v: cur.get(k) || 0, p: prev.get(k) || 0, goal: goals[k] || null }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 10)
  )
  const max = $derived(Math.max(1, ...rows.map((r) => Math.max(r.v, r.goal || 0))))

  const persons = $derived.by(() => {
    const m = new Map()
    for (const t of app.trips) if (ym(t.date) === thisM) m.set(t.created_by || 'Sin nombre', (m.get(t.created_by || 'Sin nombre') || 0) + Number(t.total || 0))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  })
  const savings = $derived(settings().savings || [])
  const savedMonth = $derived(savings.filter((s) => ym(s.at) === thisM).reduce((s, x) => s + x.amount, 0))
  const savedAll = $derived(savings.reduce((s, x) => s + x.amount, 0))

  let editing = $state(null)
  let value = $state('')
  function edit(r) {
    editing = r
    value = r.goal ? String(r.goal).replace('.', ',') : ''
  }
  async function save(e) {
    e.preventDefault()
    await setGoal(editing.k, parseNum(value) || 0)
    editing = null
  }
</script>

{#if rows.length}
  <section class="section" aria-labelledby="h-month">
    <h2 id="h-month">Este mes por categoría</h2>
    <p class="hint">Toca una categoría para ponerle un objetivo mensual.</p>
    <ul class="cats panel" role="list">
      {#each rows as r (r.k)}
        {@const over = r.goal && r.v > r.goal}
        {@const lk = catLook(r.k)}
        <li style={`--cc:${lk.color}`}>
          <button class="cat" onclick={() => edit(r)} aria-label={`${r.name}: ${eur(r.v)} este mes${r.goal ? `, objetivo ${eur(r.goal)}` : ''}. Cambiar objetivo`}>
            <span class="top">
              <span class="name"><span class="c-ic" aria-hidden="true"><lk.icon size={16} /></span>{r.name}</span>
              <span class="num val" class:over>{eur(r.v)}{#if r.goal}<small>&nbsp;/&nbsp;{eur(r.goal)}</small>{/if}</span>
            </span>
            <span class="track">
              <span class="fill" class:over style={`width:${(r.v / max) * 100}%`}></span>
              {#if r.goal}<span class="goal" style={`left:${(r.goal / max) * 100}%`} aria-hidden="true"></span>{/if}
            </span>
            <span class="sub">
              {#if r.p}El mes pasado {eur(r.p)}{r.v > r.p ? ` · ${eur(r.v - r.p)} más` : ''}{:else}Sin gasto el mes pasado{/if}
              {#if over} · <strong>os habéis pasado del objetivo</strong>{/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if persons.length > 1}
  <section class="section" aria-labelledby="h-person">
    <h2 id="h-person">Quién ha hecho la compra este mes</h2>
    <ul class="persons" role="list">
      {#each persons as [n, v] (n)}
        <li><span class="dot" style={`background:${colorOf(n)}`} aria-hidden="true"></span><span>{n}</span><span class="num">{eur(v)}</span></li>
      {/each}
    </ul>
  </section>
{/if}

{#if savedAll > 0}
  <section class="section save" aria-labelledby="h-save">
    <PiggyBank size={32} aria-hidden="true" />
    <div>
      <h2 id="h-save">Ahorro con alternativas</h2>
      <p>Este mes <strong class="num">{eur(savedMonth)}</strong>, en total <strong class="num">{eur(savedAll)}</strong> por elegir productos más baratos.</p>
    </div>
  </section>
{/if}

{#if editing}
  <Sheet onclose={() => (editing = null)} labelledby="goal-title">
    <form class="stack" onsubmit={save}>
      <div class="sheet-head">
        <h2 id="goal-title"><Target size={20} aria-hidden="true" /> Objetivo para {editing.name}</h2>
        <button type="button" class="icon-btn" onclick={() => (editing = null)} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
      </div>
      <p class="muted">Este mes lleváis {eur(editing.v)}{editing.p ? ` y el mes pasado fueron ${eur(editing.p)}` : ''}.</p>
      <label class="field">
        <span>Máximo al mes (déjalo vacío para quitarlo)</span>
        <input class="input num" bind:value={value} inputmode="decimal" placeholder="Por ejemplo 40" />
      </label>
      <button class="btn btn-primary btn-block" type="submit">Guardar objetivo</button>
    </form>
  </Sheet>
{/if}

<style>
  .cats {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    list-style: none;
    margin: 0;
    padding: 4px 0;
  }
  .cats li + li {
    border-top: 1px solid var(--line);
  }
  .cat {
    width: 100%;
    display: grid;
    gap: 6px;
    padding: 12px 16px;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .name {
    font-weight: 600;
  }
  .val {
    font-weight: 750;
    white-space: nowrap;
  }
  .val small {
    font-weight: 500;
    color: var(--ink-2);
  }
  .val.over {
    color: var(--tomato);
  }
  .track {
    position: relative;
    height: 10px;
    border-radius: 5px;
    background: var(--surface-2);
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 5px;
    background: var(--cc);
    transform-origin: left;
    animation: grow 0.8s var(--ease-out) both;
  }
  @keyframes grow {
    from {
      transform: scaleX(0);
    }
  }
  .fill.over {
    background: var(--c-tomate);
  }
  .c-ic {
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    margin-right: 8px;
    vertical-align: middle;
    border-radius: 8px;
    background: color-mix(in srgb, var(--cc) 15%, var(--surface));
    color: var(--cc);
  }
  .goal {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 3px;
    border-radius: 2px;
    background: var(--ink);
  }
  .sub {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .persons {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .persons li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
  }
  .persons li span:nth-child(2) {
    flex: 1;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .save {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    padding: 16px;
    border-radius: var(--r);
    background: var(--lemon-soft);
    color: var(--lemon-ink);
  }
  .save p {
    color: var(--ink);
  }
  h2 :global(svg) {
    vertical-align: -3px;
  }
</style>
