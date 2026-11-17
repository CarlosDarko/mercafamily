// Sin cobertura: los cambios van a una cola en el móvil y se envían en orden cuando hay conexión.
// Lo que falla por red se queda en la cola. Lo que falla por otro motivo se descarta y se avisa.

const Q_KEY = 'mf:queue'
const SNAP_KEY = 'mf:snap'

export const isNetworkError = (e) => !navigator.onLine || /fetch|network|load failed|timeout|offline|ECONN/i.test(String(e?.message || e))

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(Q_KEY)) || []
  } catch {
    return []
  }
}
const save = (q) => localStorage.setItem(Q_KEY, JSON.stringify(q))
export const pendingCount = () => load().length

export function withQueue(inner, { onChange, onDrop }) {
  let flushing = null

  async function flush() {
    if (flushing) return flushing
    flushing = (async () => {
      let q = load()
      while (q.length) {
        const op = q[0]
        try {
          await inner[op.m](...op.a)
        } catch (e) {
          if (isNetworkError(e)) break
          console.error('Cambio descartado', op, e)
          onDrop?.(op, e)
        }
        q.shift()
        save(q)
      }
      onChange?.(q.length)
      flushing = null
      return q.length
    })()
    return flushing
  }

  const write =
    (m) =>
    async (...a) => {
      const q = load()
      q.push({ m, a, at: Date.now() })
      save(q)
      onChange?.(q.length)
      await flush()
    }

  window.addEventListener('online', () => flush())
  setInterval(() => load().length && navigator.onLine && flush(), 20000)

  return new Proxy(inner, {
    get(target, prop) {
      if (prop === 'upsert' || prop === 'update' || prop === 'remove') return write(prop)
      if (prop === 'flush') return flush
      return Reflect.get(target, prop)
    }
  })
}

// Copia de lo último que se cargó, para abrir la app sin conexión
export function saveSnapshot(data) {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify({ at: Date.now(), ...data }))
  } catch {
    // Si no cabe, se guarda sin el histórico de compras
    try {
      localStorage.setItem(SNAP_KEY, JSON.stringify({ at: Date.now(), ...data, tripItems: [] }))
    } catch {}
  }
}
export function loadSnapshot() {
  try {
    return JSON.parse(localStorage.getItem(SNAP_KEY))
  } catch {
    return null
  }
}
