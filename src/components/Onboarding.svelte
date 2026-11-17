<script>
  // Bienvenida guiada: cuatro pasos cortos la primera vez
  import { Search, Store, ChefHat, Users } from '@lucide/svelte'
  import { markOnboarded } from '../lib/data.svelte.js'

  let { onclose } = $props()
  let dlg
  let step = $state(0)
  const STEPS = [
    { icon: Search, title: 'Apuntad lo que falta', text: "Escribid 'leche' o '2 tomates' y la app elige el producto de Mercadona con su foto y su precio. Si guardáis vuestras preferencias ('leche semidesnatada sin lactosa'), acierta a la primera." },
    { icon: Store, title: 'En el súper, modo tienda', text: "Pantalla grande que no se apaga, ordenada por los pasillos de vuestro Mercadona. Un toque para 'cogido', otro para 'No había', y el total del carro al momento." },
    { icon: ChefHat, title: 'En casa, menú y despensa', text: "Elegid las cenas de la semana y la app apunta los ingredientes que faltan. 'Prepárame la lista' junta además lo que se acaba en casa y lo que toca comprar." },
    { icon: Users, title: 'Todos a la vez', text: "Lo que apunta uno aparece al momento en el móvil de los demás, con el color de cada persona. Los peques pueden pedir cosas y un adulto las acepta." }
  ]
  const cur = $derived(STEPS[step])

  function done() {
    markOnboarded()
    onclose()
  }
  $effect(() => {
    dlg.showModal()
  })
</script>

<dialog bind:this={dlg} class="onb" aria-labelledby="onb-title" aria-describedby="onb-text" oncancel={(e) => (e.preventDefault(), done())}>
  <div class="sheet">
    <div class="art" aria-hidden="true"><cur.icon size={44} strokeWidth={1.8} /></div>
    <p class="count num">Paso {step + 1} de {STEPS.length}</p>
    <h2 id="onb-title">{cur.title}</h2>
    <p id="onb-text">{cur.text}</p>
    <div class="dots" aria-hidden="true">
      {#each STEPS as _, i}<span class:on={i === step}></span>{/each}
    </div>
    <div class="row">
      <button class="btn btn-ghost" onclick={done}>Saltar</button>
      <span class="spacer"></span>
      {#if step < STEPS.length - 1}
        <button class="btn btn-primary" onclick={() => step++}>Siguiente</button>
      {:else}
        <button class="btn btn-primary" onclick={done}>Empezar</button>
      {/if}
    </div>
  </div>
</dialog>

<style>
  .onb .sheet {
    gap: 14px;
    padding-top: 28px;
  }
  .art {
    display: grid;
    place-items: center;
    width: 88px;
    height: 88px;
    border-radius: 24px;
    background: var(--market-soft);
    color: var(--accent-text);
  }
  .count {
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--ink-2);
  }
  h2 {
    font-size: 1.5rem;
  }
  .dots {
    display: flex;
    gap: 6px;
  }
  .dots span {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background: var(--line);
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dots span.on {
    width: 24px;
    background: var(--primary-bg);
  }
</style>
