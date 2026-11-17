// Almacenamiento en el propio móvil (sin cuenta). Misma interfaz que supa.js
import { uid } from './format.js'

const KEY = 'mf:local:v1'
const TABLES = ['households', 'lists', 'items', 'trips', 'trip_items']

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null
  } catch {
    return null
  }
}

export function createLocalBackend() {
  let d = read()
  if (!d) {
    d = { households: [], lists: [], items: [], trips: [], trip_items: [] }
  }
  for (const t of TABLES) d[t] ??= []
  if (!d.households.length) {
    d.households.push({ id: uid(), name: 'Casa', invite_code: null, weekly_budget: null, preferences: [], aliases: {}, created_at: new Date().toISOString() })
  }
  const save = () => localStorage.setItem(KEY, JSON.stringify(d))
  save()
  const hid = d.households[0].id
  const clone = (x) => JSON.parse(JSON.stringify(x))

  return {
    kind: 'local',
    householdId: hid,
    async household() {
      return clone(d.households[0])
    },
    async select(t) {
      return clone(d[t])
    },
    async upsert(t, rows) {
      for (const r of [].concat(rows)) {
        const row = { ...r, household_id: t === 'households' ? undefined : hid }
        if (t === 'households') delete row.household_id
        const i = d[t].findIndex((x) => x.id === row.id)
        if (i >= 0) d[t][i] = { ...d[t][i], ...row }
        else d[t].push(row)
      }
      save()
    },
    async update(t, id, patch) {
      const r = d[t].find((x) => x.id === id)
      if (r) Object.assign(r, patch)
      save()
    },
    async remove(t, ids) {
      const set = new Set([].concat(ids))
      d[t] = d[t].filter((x) => !set.has(x.id))
      if (t === 'trips') d.trip_items = d.trip_items.filter((x) => !set.has(x.trip_id))
      if (t === 'lists') d.items = d.items.filter((x) => !set.has(x.list_id))
      save()
    },
    subscribe(cb) {
      // Sincroniza entre pestañas del mismo navegador
      window.addEventListener('storage', (e) => {
        if (e.key === KEY) {
          d = read() || d
          cb('*')
        }
      })
    }
  }
}
