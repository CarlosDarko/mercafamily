// Estado de la app y acciones. La interfaz no sabe si los datos están en el móvil o en Supabase.
import { createLocalBackend } from './local.js'
import { loadCatalog, search, parsePrefs } from './catalog.js'
import { uid, isoDate, tokens } from './format.js'

const CFG_KEY = 'mf:supabase'
const ME_KEY = 'mf:me'

export const app = $state({
  screen: 'loading', // loading | welcome | login | household | ready
  kind: 'local',
  live: false,
  household: null,
  members: [],
  items: [],
  trips: [],
  tripItems: [],
  catalog: null,
  me: '',
  email: '',
  toast: null,
  error: ''
})

let be = null
let reloadTimer = null

export function supabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (url && key) return { url, key, fromBuild: true }
  try {
    const c = JSON.parse(localStorage.getItem(CFG_KEY))
    if (c?.url && c?.key) return { ...c, fromBuild: false }
  } catch {}
  return null
}

export function saveSupabaseConfig(url, key) {
  if (url && key) localStorage.setItem(CFG_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }))
  else localStorage.removeItem(CFG_KEY)
  location.reload()
}

export function toast(msg, action = null, ms = 3500) {
  const t = { id: uid(), msg, action }
  app.toast = t
  setTimeout(() => {
    if (app.toast?.id === t.id) app.toast = null
  }, ms)
}

function fail(e) {
  console.error(e)
  toast('No se ha podido guardar. Reintento al volver a abrir.')
  scheduleReload()
}

export async function boot() {
  app.me = localStorage.getItem(ME_KEY) || ''
  loadCatalog()
    .then((c) => (app.catalog = c))
    .catch(() => toast('No se ha podido cargar el catálogo de Mercadona'))

  const cfg = supabaseConfig()
  if (cfg) {
    app.kind = 'supabase'
    try {
      const { createSupabaseBackend } = await import('./supa.js')
      be = createSupabaseBackend(cfg)
      be.onAuth((ev) => {
        if (ev === 'SIGNED_IN' && (app.screen === 'login' || app.screen === 'loading')) enterHousehold()
        if (ev === 'SIGNED_OUT') app.screen = 'login'
      })
      const user = await be.user()
      if (!user) {
        app.screen = 'login'
        return
      }
      app.email = user.email
      await enterHousehold()
    } catch (e) {
      console.error(e)
      app.error = 'No se puede conectar con Supabase. Revisa la conexión o los datos en Ajustes.'
      app.screen = 'login'
    }
  } else {
    be = createLocalBackend()
    app.kind = 'local'
    await reloadAll()
    be.subscribe(() => scheduleReload())
    app.screen = app.me ? 'ready' : 'welcome'
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && app.screen === 'ready') reloadAll()
  })
}

async function enterHousehold() {
  const user = await be.user()
  app.email = user?.email || ''
  const h = await be.myHousehold()
  if (!h) {
    app.screen = 'household'
    return
  }
  if (h.display_name) setMe(h.display_name)
  await reloadAll()
  be.subscribe((what) => {
    if (what.startsWith('status:')) app.live = what === 'status:SUBSCRIBED'
    else scheduleReload()
  })
  app.screen = 'ready'
}

const AUTH_ERRORS = [
  [/invalid login credentials/i, 'El email o la contraseña no son correctos.'],
  [/already registered|already exists/i, 'Ya hay una cuenta con ese email. Entra con tu contraseña.'],
  [/password should be at least|weak password/i, 'La contraseña tiene que tener al menos 6 caracteres.'],
  [/email not confirmed|needs-confirm/i, 'La cuenta está creada pero Supabase pide confirmar el email. Desactiva Confirm email en Supabase (Authentication, Sign In / Providers, Email) o abre el enlace del correo y vuelve a entrar.'],
  [/invalid.*email|unable to validate email/i, 'Ese email no parece válido.'],
  [/rate limit|too many/i, 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.'],
  [/failed to fetch|network/i, 'Sin conexión con la base de datos. Revisa la conexión a internet.']
]
const authError = (e) => new Error(AUTH_ERRORS.find(([re]) => re.test(e?.message || ''))?.[1] || e?.message || 'No se ha podido entrar.')

export async function signIn(email, password) {
  try {
    await be.signIn(email.trim(), password)
  } catch (e) {
    throw authError(e)
  }
  await enterHousehold()
}
export async function signUp(email, password) {
  try {
    await be.signUp(email.trim(), password)
  } catch (e) {
    throw authError(e)
  }
  await enterHousehold()
}

export async function sendCode(email) {
  await be.sendCode(email)
  app.email = email
}
export async function verifyCode(code) {
  await be.verifyCode(app.email, code)
  await enterHousehold()
}
export async function signOut() {
  await be.signOut()
  app.screen = 'login'
}
export async function createHousehold(name, displayName) {
  setMe(displayName)
  await be.createHousehold(name || 'Casa', displayName)
  await enterHousehold()
}
export async function joinHousehold(code, displayName) {
  setMe(displayName)
  await be.joinHousehold(code, displayName)
  await enterHousehold()
}

export function setMe(name) {
  app.me = name.trim()
  localStorage.setItem(ME_KEY, app.me)
}

function scheduleReload() {
  clearTimeout(reloadTimer)
  reloadTimer = setTimeout(reloadAll, 250)
}

export async function reloadAll() {
  try {
    const [household, items, trips, tripItems] = await Promise.all([
      be.household(),
      be.select('items'),
      be.select('trips'),
      be.select('trip_items')
    ])
    household.preferences ??= []
    app.household = household
    app.items = items
    app.trips = trips.sort((a, b) => (a.date < b.date ? 1 : -1))
    app.tripItems = tripItems
    if (be.members) app.members = await be.members()
  } catch (e) {
    console.error(e)
    toast('Sin conexión. Mostrando lo último guardado.')
  }
}

// ---------- Precios y aprendizaje ----------

export const product = (item) => (item?.merc_id ? app.catalog?.byId.get(item.merc_id) : null)
export const unitPrice = (item) => product(item)?.p ?? item.price ?? null
export const lineTotal = (item) => {
  const u = unitPrice(item)
  return u == null ? null : u * (item.qty || 1)
}

export function learnedCounts() {
  const m = new Map()
  for (const ti of app.tripItems) if (ti.merc_id) m.set(ti.merc_id, (m.get(ti.merc_id) || 0) + 1)
  return m
}

export function searchCatalog(q, limit = 20) {
  return search(app.catalog, q, { prefs: parsePrefs(app.household?.preferences), learned: learnedCounts(), limit })
}

// ---------- Lista ----------

function newItem(fields) {
  const now = new Date().toISOString()
  return { id: uid(), qty: 1, checked: false, note: null, price: null, merc_id: null, category: null, added_by: app.me || null, created_at: now, updated_at: now, ...fields }
}

function sameOnList(merc_id, name) {
  return app.items.find((i) => !i.checked && (merc_id ? i.merc_id === merc_id : !i.merc_id && i.name.toLowerCase() === name.toLowerCase()))
}

export async function addProduct(p, qty = 1, note = null) {
  const existing = sameOnList(p.id, p.n)
  if (existing) {
    toast(`'${p.n}' ya estaba: ahora ${existing.qty + qty}`)
    return updateItem(existing.id, { qty: existing.qty + qty })
  }
  const item = newItem({ merc_id: p.id, name: p.n, category: p.c, price: p.p, qty, note })
  app.items.push(item)
  try {
    await be.upsert('items', item)
  } catch (e) {
    fail(e)
  }
  return item
}

// Texto libre: '2 leche' -> busca el mejor producto teniendo en cuenta preferencias e historial
export async function addText(text) {
  let t = text.trim()
  if (!t) return
  let qty = 1
  const m = t.match(/^(\d+)\s*(x\s*)?(.+)$/i)
  if (m) {
    qty = Math.min(Number(m[1]), 99) || 1
    t = m[3]
  }
  const best = app.catalog ? searchCatalog(t, 1)[0] : null
  const strong = best && tokens(t).length > 0 && (best.reasons.length || best.score > 3)
  if (strong) {
    const item = await addProduct(best.p, qty)
    if (best.reasons.length) toast(`Elegido por tu preferencia: ${best.reasons[0]}`)
    return item
  }
  const name = t.charAt(0).toUpperCase() + t.slice(1)
  const item = newItem({ name, qty })
  app.items.push(item)
  try {
    await be.upsert('items', item)
  } catch (e) {
    fail(e)
  }
  return item
}

export async function updateItem(id, patch) {
  const it = app.items.find((i) => i.id === id)
  if (!it) return
  Object.assign(it, patch, { updated_at: new Date().toISOString() })
  try {
    await be.update('items', id, { ...patch, updated_at: it.updated_at })
  } catch (e) {
    fail(e)
  }
}

export const toggleItem = (it) => updateItem(it.id, { checked: !it.checked })

export async function removeItem(id) {
  const it = app.items.find((i) => i.id === id)
  app.items = app.items.filter((i) => i.id !== id)
  try {
    await be.remove('items', id)
  } catch (e) {
    fail(e)
  }
  if (it) toast(`Quitado: ${it.name}`, { label: 'Deshacer', run: () => restoreItem(it) })
}

async function restoreItem(it) {
  app.items.push(it)
  try {
    await be.upsert('items', it)
  } catch (e) {
    fail(e)
  }
}

export async function closeTrip({ store, date, total }) {
  const bought = app.items.filter((i) => i.checked)
  if (!bought.length) return
  const est = bought.reduce((s, i) => s + (lineTotal(i) || 0), 0)
  const trip = {
    id: uid(),
    store: store || 'Mercadona',
    date: date || isoDate(),
    total: total ?? Math.round(est * 100) / 100,
    est_total: Math.round(est * 100) / 100,
    total_is_estimate: total == null,
    items_count: bought.length,
    created_by: app.me || null,
    created_at: new Date().toISOString()
  }
  const lines = bought.map((i) => ({
    id: uid(),
    trip_id: trip.id,
    merc_id: i.merc_id,
    name: i.name,
    category: i.category,
    qty: i.qty || 1,
    price: unitPrice(i),
    bought_on: trip.date
  }))
  app.trips = [trip, ...app.trips].sort((a, b) => (a.date < b.date ? 1 : -1))
  app.tripItems = [...app.tripItems, ...lines]
  app.items = app.items.filter((i) => !i.checked)
  try {
    await be.upsert('trips', trip)
    await be.upsert('trip_items', lines)
    await be.remove('items', bought.map((i) => i.id))
  } catch (e) {
    fail(e)
  }
  return trip
}

export async function deleteTrip(id) {
  app.trips = app.trips.filter((t) => t.id !== id)
  app.tripItems = app.tripItems.filter((t) => t.trip_id !== id)
  try {
    await be.remove('trips', id)
  } catch (e) {
    fail(e)
  }
}

export async function updateTrip(id, patch) {
  const t = app.trips.find((x) => x.id === id)
  if (t) Object.assign(t, patch)
  try {
    await be.update('trips', id, patch)
  } catch (e) {
    fail(e)
  }
}

export async function updateHousehold(patch) {
  Object.assign(app.household, patch)
  try {
    await be.update('households', app.household.id, patch)
  } catch (e) {
    fail(e)
  }
}

// ---------- Copias de seguridad ----------

export function exportBackup() {
  const data = { app: 'mercafamily', version: 1, exported_at: new Date().toISOString(), household: app.household, items: app.items, trips: app.trips, trip_items: app.tripItems }
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `mercafamily-${isoDate()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export async function importBackup(file) {
  const data = JSON.parse(await file.text())
  if (data.app !== 'mercafamily') throw new Error('Este archivo no es una copia de MercaFamily')
  const strip = (r) => {
    const { household_id, ...rest } = r
    return rest
  }
  if (data.household) {
    const { weekly_budget, preferences } = data.household
    await updateHousehold({ weekly_budget: weekly_budget ?? null, preferences: preferences ?? [] })
  }
  await be.upsert('trips', (data.trips || []).map(strip))
  await be.upsert('trip_items', (data.trip_items || []).map(strip))
  await be.upsert('items', (data.items || []).map(strip))
  await reloadAll()
}
