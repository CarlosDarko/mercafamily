// Herramientas para agentes del navegador (WebMCP). Las que cambian algo piden confirmación.
import { app, searchCatalog, addProduct, addText, lineTotal } from './data.svelte.js'

async function confirmar(agent, msg) {
  if (agent?.requestUserInteraction) return agent.requestUserInteraction(async () => window.confirm(msg))
  return window.confirm(msg)
}

export function registerWebMCP() {
  const mc = navigator.modelContext || document.modelContext
  if (!mc?.registerTool && !mc?.provideContext) return
  const tools = [
    {
      name: 'ver_lista',
      description: 'Devuelve la lista de la compra actual con cantidades, precios previstos y si ya está en el carro.',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        return {
          productos: app.items.map((i) => ({ nombre: i.name, cantidad: i.qty, en_el_carro: i.checked, precio_previsto: lineTotal(i) })),
          total_previsto: app.items.reduce((s, i) => s + (lineTotal(i) || 0), 0)
        }
      }
    },
    {
      name: 'buscar_producto',
      description: 'Busca productos en el catálogo de Mercadona con precio, teniendo en cuenta las preferencias de la familia.',
      inputSchema: { type: 'object', properties: { texto: { type: 'string', description: 'Qué buscar, por ejemplo leche sin lactosa' } }, required: ['texto'] },
      async execute({ texto }) {
        return searchCatalog(texto, 10).map((r) => ({ id: r.p.id, nombre: r.p.n, precio: r.p.p, formato: r.p.z, preferido: r.reasons.length > 0 }))
      }
    },
    {
      name: 'anadir_a_la_lista',
      description: 'Añade un producto a la lista de la compra. Acepta un id del catálogo o un texto libre como 2 tomates. Pide confirmación a la persona.',
      inputSchema: {
        type: 'object',
        properties: { texto: { type: 'string' }, id: { type: 'string' }, cantidad: { type: 'number', minimum: 1, maximum: 99 } }
      },
      async execute({ texto, id, cantidad = 1 }, agent) {
        const p = id ? app.catalog?.byId.get(String(id)) : null
        const label = p ? p.n : texto
        if (!label) return { error: 'Falta el producto' }
        if (!(await confirmar(agent, `¿Añadir ${cantidad} × ${label} a la lista?`))) return { cancelado: true }
        const item = p ? await addProduct(p, cantidad) : await addText(`${cantidad} ${texto}`)
        return { anadido: item?.name ?? label }
      }
    },
    {
      name: 'ir_a',
      description: 'Abre una sección de la app: lista, gastos o ajustes.',
      inputSchema: { type: 'object', properties: { seccion: { type: 'string', enum: ['lista', 'gastos', 'ajustes'] } }, required: ['seccion'] },
      async execute({ seccion }) {
        window.dispatchEvent(new CustomEvent('mf:go', { detail: seccion }))
        return { ok: true }
      }
    }
  ]
  try {
    if (mc.registerTool) tools.forEach((t) => mc.registerTool(t))
    else mc.provideContext({ tools })
  } catch {}
}
