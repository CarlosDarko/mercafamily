// Estado de la app y acciones. La interfaz no sabe si los datos están en el móvil o en Supabase.
import { createLocalBackend } from './local.js'
import { loadCatalog, search, parsePrefs, loadHistory } from './catalog.js'
import { dietConflicts, keyOf as pantryKey, scaleAmount, packQty, BASE_SERVINGS } from './home.js'
import { loadDetails, detailsSync } from './nutrition.js'
import { withQueue, saveSnapshot, loadSnapshot, isNetworkError, pendingCount } from './offline.js'
import { uid, isoDate, tokens, norm } from './format.js'

const CFG_KEY = 'mf:supabase'
const LIST_KEY = 'mf:list'
const DEFAULT_LIST_NAME = 'Compra semanal'
const ME_KEY = 'mf:me'

export const app = $state({
  sheets: [], // hojas abiertas, la última es la de arriba
  screen: 'loading', // loading | welcome | login | household | ready
  kind: 'local',
  live: false,
  household: null,
  members: [],
  lists: [],
  listId: null,
  recipes: [],
  meals: [],
  items: [],
  trips: [],
  tripItems: [],
  catalog: null,
  me: '',
  myColor: null,
  prefs: { theme: 'auto', scale: 1, kid: false },
  detailsTick: 0,
  history: null,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  lastSync: null,
  lastTrip: null,
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
  logError(e)
  toast('No se ha podido guardar. Reintento al volver a abrir.')
  scheduleReload()
}

export async function boot() {
  app.me = localStorage.getItem(ME_KEY) || ''
  app.myColor = localStorage.getItem('mf:color') || null
  loadPrefs()
  loadCatalog()
    .then((c) => {
      app.catalog = c
      loadHistory().then((h) => (app.history = h))
    })
    .catch(() => toast('No se ha podido cargar el catálogo de Mercadona'))

  const cfg = supabaseConfig()
  if (cfg) {
    app.kind = 'supabase'
    try {
      const { createSupabaseBackend } = await import('./supa.js')
      be = withQueue(createSupabaseBackend(cfg), {
        onChange: (n) => {
          app.pending = n
          snapshotNow()
        },
        onDrop: () => toast('Un cambio no se ha podido guardar. Recarga la app para ver lo último.')
      })
      app.pending = pendingCount()
      window.addEventListener('online', () => ((app.online = true), scheduleReload()))
      window.addEventListener('offline', () => (app.online = false))
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
  let h
  try {
    const user = await be.user()
    app.email = user?.email || ''
    h = await be.myHousehold()
    if (h) localStorage.setItem('mf:hid', h.id)
  } catch (e) {
    // Sin conexión: se abre con la última copia guardada
    const snap = loadSnapshot()
    const hid = localStorage.getItem('mf:hid')
    if (!isNetworkError(e) || !snap || !hid) throw e
    be.useHousehold?.(hid)
    applySnapshot(snap)
    app.online = false
    app.screen = 'ready'
    return
  }
  if (!h) {
    app.screen = 'household'
    return
  }
  if (h.display_name) setMe(h.display_name)
  const snap = loadSnapshot()
  if (snap?.household?.id === h.id) applySnapshot(snap)
  await reloadAll()
  be.subscribe((what) => {
    if (what.startsWith('status:')) app.live = what === 'status:SUBSCRIBED'
    else scheduleReload()
  })
  app.screen = 'ready'
}

function snapshotNow() {
  if (app.kind !== 'supabase' || !app.household) return
  saveSnapshot($state.snapshot({ household: app.household, lists: app.lists, items: app.items, trips: app.trips, tripItems: app.tripItems, recipes: app.recipes, meals: app.meals, members: app.members }))
}

function applySnapshot(s) {
  app.household = s.household
  app.lists = s.lists || []
  app.items = s.items || []
  app.trips = s.trips || []
  app.tripItems = s.tripItems || []
  app.recipes = s.recipes || []
  app.meals = s.meals || []
  app.members = s.members || []
  const saved = localStorage.getItem(LIST_KEY)
  if (!app.listId) app.listId = app.lists.some((l) => l.id === saved) ? saved : s.household?.id
}

const AUTH_ERRORS = [
  [/invalid login credentials/i, 'El email o la contraseña no son correctos.'],
  [/already registered|already exists/i, 'Ya hay una cuenta con ese email. Entra con tu contraseña.'],
  [/password should be at least|weak password/i, 'La contraseña tiene que tener al menos 6 caracteres.'],
  [/email not confirmed|needs-confirm/i, 'Este email quedó pendiente de confirmar en Supabase. En Supabase, Authentication, Users, borra ese usuario (o confírmalo), comprueba que Confirm email está desactivado y vuelve a crear la cuenta.'],
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

// ---------- Ajustes de este dispositivo (tema y tamaño de letra) ----------

const PREFS_KEY = 'mf:prefs'
export function loadPrefs() {
  try {
    Object.assign(app.prefs, JSON.parse(localStorage.getItem(PREFS_KEY)) || {})
  } catch {}
  applyPrefs()
}
export function setPrefs(patch) {
  Object.assign(app.prefs, patch)
  localStorage.setItem(PREFS_KEY, JSON.stringify(app.prefs))
  applyPrefs()
}
function applyPrefs() {
  const root = document.documentElement
  if (app.prefs.theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', app.prefs.theme)
  root.style.setProperty('--scale', String(app.prefs.scale || 1))
}

// ---------- Colores de cada persona ----------

export const PERSON_COLORS = ['#2d6a50', '#b5476b', '#2f62a8', '#a1561c', '#6d4bb0', '#1f7a80']
export function colorOf(name) {
  if (!name) return 'var(--ink-2)'
  if (name === app.me && app.myColor) return app.myColor
  const m = app.members.find((x) => x.display_name === name)
  if (m?.color) return m.color
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PERSON_COLORS[h % PERSON_COLORS.length]
}
export async function setMyColor(color) {
  app.myColor = color
  localStorage.setItem('mf:color', color)
  try {
    await be.updateMe?.({ color })
    if (be.members) app.members = await be.members()
  } catch (e) {
    fail(e)
  }
}

export function setMe(name) {
  app.me = name.trim()
  localStorage.setItem(ME_KEY, app.me)
}

function scheduleReload() {
  clearTimeout(reloadTimer)
  reloadTimer = setTimeout(reloadAll, 250)
}

let reloading = null
export function reloadAll() {
  if (!reloading) reloading = doReload().finally(() => (reloading = null))
  return reloading
}
async function doReload() {
  try {
    // Primero se envían los cambios pendientes; si aún quedan, no se pisa lo que hay en el móvil
    const left = be.flush ? await be.flush() : 0
    const [household, lists, items, trips, tripItems, recipes, meals] = await Promise.all([
      be.household(),
      be.select('lists'),
      be.select('items'),
      be.select('trips'),
      be.select('trip_items'),
      be.select('recipes').catch(() => []),
      be.select('meals').catch(() => [])
    ])
    app.recipes = recipes.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    app.meals = meals
    household.preferences ??= []
    household.aliases ??= {}
    household.settings ??= {}
    app.household = household
    // La lista principal tiene el mismo id que el hogar: si los dos móviles la crean a la vez, es la misma
    if (!lists.some((l) => l.id === household.id)) {
      const main = { id: household.id, name: DEFAULT_LIST_NAME, position: 0, created_at: new Date().toISOString() }
      lists.push(main)
      be.upsert('lists', main).catch(() => {})
    }
    app.lists = lists.sort((a, b) => a.position - b.position || (a.created_at < b.created_at ? -1 : 1))
    const saved = localStorage.getItem(LIST_KEY)
    if (!app.listId || !app.lists.some((l) => l.id === app.listId)) app.listId = app.lists.some((l) => l.id === saved) ? saved : household.id
    if (!left) {
      notifyOthers(items)
      app.items = items
    }
    app.trips = trips.sort((a, b) => (a.date < b.date ? 1 : -1))
    app.tripItems = tripItems
    if (be.members) app.members = await be.members()
    ensureDetails()
    app.online = true
    app.lastSync = Date.now()
    snapshotNow()
  } catch (e) {
    console.error(e)
    if (isNetworkError(e)) app.online = false
    else logError(e)
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
  return search(app.catalog, q, { prefs: parsePrefs(app.household?.preferences), learned: learnedCounts(), aliases: app.household?.aliases || {}, limit })
}

// Lo que la familia llama de una forma y resulta ser un producto concreto: 'dinosaurus' -> galletas X
export async function rememberAlias(query, id) {
  const key = norm(query)
  if (!key || key.length < 2 || !app.household) return
  const aliases = { ...(app.household.aliases || {}) }
  if (aliases[key] === id) return
  aliases[key] = id
  const keys = Object.keys(aliases)
  if (keys.length > 400) delete aliases[keys[0]]
  await updateHousehold({ aliases })
}

// ---------- Listas ----------

export const listOf = (item) => item.list_id || app.household?.id
export const itemsOfList = (id = app.listId) => app.items.filter((i) => listOf(i) === id)

export function setList(id) {
  app.listId = id
  localStorage.setItem(LIST_KEY, id)
}

export async function createList(name, extra = {}) {
  const l = { id: uid(), name: name.trim().slice(0, 40), position: app.lists.length, created_at: new Date().toISOString(), icon: extra.icon || null, color: extra.color || null }
  app.lists.push(l)
  setList(l.id)
  try {
    await be.upsert('lists', l)
  } catch (e) {
    fail(e)
  }
  return l
}

export async function renameList(id, name, extra = {}) {
  const l = app.lists.find((x) => x.id === id)
  if (!l || !name.trim()) return
  const patch = { name: name.trim().slice(0, 40), ...extra }
  Object.assign(l, patch)
  try {
    await be.update('lists', id, patch)
  } catch (e) {
    fail(e)
  }
}

export async function deleteList(id) {
  if (id === app.household?.id) return
  const ids = app.items.filter((i) => i.list_id === id).map((i) => i.id)
  app.items = app.items.filter((i) => i.list_id !== id)
  app.lists = app.lists.filter((l) => l.id !== id)
  if (app.listId === id) setList(app.household.id)
  try {
    if (ids.length) await be.remove('items', ids)
    await be.remove('lists', id)
  } catch (e) {
    fail(e)
  }
}

export async function moveItem(id, listId) {
  await updateItem(id, { list_id: listId === app.household?.id ? null : listId })
}

// ---------- Lista ----------

function newItem(fields) {
  const now = new Date().toISOString()
  const list_id = app.listId && app.listId !== app.household?.id ? app.listId : null
  // En el móvil de los peques, lo que se apunta queda como petición hasta que un adulto la acepte
  return { id: uid(), qty: 1, checked: false, note: null, price: null, merc_id: null, category: null, list_id, requested: !!app.prefs.kid, added_by: app.me || null, created_at: now, updated_at: now, ...fields }
}

function sameOnList(merc_id, name) {
  return itemsOfList().find((i) => !i.checked && (merc_id ? i.merc_id === merc_id : !i.merc_id && i.name.toLowerCase() === name.toLowerCase()))
}

export async function addProduct(p, qty = 1, note = null) {
  const existing = sameOnList(p.id, p.n)
  if (existing && app.prefs.kid) {
    toast(`${p.n} ya está en la lista`)
    return existing
  }
  if (existing) {
    toast(`'${p.n}' ya estaba: ahora ${existing.qty + qty}`)
    return updateItem(existing.id, { qty: existing.qty + qty })
  }
  const item = newItem({ merc_id: p.id, name: p.n, category: p.c, price: p.p, qty, note })
  app.items.push(item)
  ensureDetails().then(() => {
    const c = conflictsOf(item)
    if (c.length) toast(`Ojo: ${p.n} lleva ${c[0].word} (${c[0].person}: ${c[0].label.toLowerCase()})`, null, 6000)
  })
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
    if (best.reasons[0] === 'Lo elegisteis antes') toast(`Puesto el de siempre: ${best.p.n}`)
    else if (best.reasons.length) toast(`Elegido por tu preferencia: ${best.reasons[0]}`)
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

// Lo que hacen los demás, en directo: 'Ana ha cogido la leche'
let seenOnce = false
function notifyOthers(next) {
  if (!seenOnce || app.kind !== 'supabase') {
    seenOnce = true
    return
  }
  const prev = new Map(app.items.map((i) => [i.id, i]))
  const msgs = []
  for (const it of next) {
    const before = prev.get(it.id)
    if (!before && it.added_by && it.added_by !== app.me) msgs.push(`${it.added_by} ha apuntado ${it.name}`)
    else if (before && !before.checked && it.checked && it.taken_by && it.taken_by !== app.me) msgs.push(`${it.taken_by} ha cogido ${it.name}`)
    else if (before && !before.missing && it.missing && it.taken_by !== app.me) msgs.push(`No había ${it.name}`)
  }
  if (msgs.length === 1) toast(msgs[0])
  else if (msgs.length > 1) toast(`${msgs[0]} y ${msgs.length - 1} cambios más`)
}

// ---------- Ajustes compartidos del hogar ----------

export const settings = () => app.household?.settings || {}
export async function updateSettings(patch) {
  await updateHousehold({ settings: { ...settings(), ...patch } })
}

export const isFavorite = (mercId) => (settings().favorites || []).includes(mercId)
export async function toggleFavorite(mercId) {
  const favs = settings().favorites || []
  const next = favs.includes(mercId) ? favs.filter((x) => x !== mercId) : [...favs, mercId].slice(-24)
  await updateSettings({ favorites: next })
  toast(next.includes(mercId) ? 'Añadido a favoritos' : 'Quitado de favoritos')
}

const missKey = (it) => it.merc_id || `t:${it.name.toLowerCase()}`
export const missingCount = (it) => settings().missing?.[missKey(it)] || 0

// Orden de pasillos de vuestro Mercadona: se aprende del orden en que vais marcando
export function aisleRank(catId) {
  const learned = settings().aisle?.[catId]
  if (learned != null) return learned
  const cats = app.catalog?.categories || []
  const i = cats.findIndex((c) => c.id === catId)
  return i < 0 ? 2 : i / Math.max(cats.length - 1, 1)
}
const SEQ_KEY = 'mf:seq:'
function recordAisle(it) {
  if (it.category == null) return
  try {
    const k = SEQ_KEY + (app.listId || '')
    const seq = JSON.parse(localStorage.getItem(k) || '[]')
    if (!seq.includes(it.category)) seq.push(it.category)
    localStorage.setItem(k, JSON.stringify(seq))
  } catch {}
}
function learnAisle() {
  try {
    const k = SEQ_KEY + (app.listId || '')
    const seq = JSON.parse(localStorage.getItem(k) || '[]')
    localStorage.removeItem(k)
    if (seq.length < 3) return null
    const aisle = { ...(settings().aisle || {}) }
    seq.forEach((cat, i) => {
      const pos = i / (seq.length - 1)
      aisle[cat] = aisle[cat] == null ? pos : Math.round((aisle[cat] * 0.6 + pos * 0.4) * 1000) / 1000
    })
    return aisle
  } catch {
    return null
  }
}

export const toggleItem = (it) => {
  const checked = !it.checked
  if (checked) recordAisle(it)
  return updateItem(it.id, { checked, missing: false, taken_by: checked ? app.me || null : null })
}

export const toggleMissing = (it) => updateItem(it.id, { missing: !it.missing, checked: false, taken_by: !it.missing ? app.me || null : null })

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

export async function closeTrip({ store, date, total, prices = {} }) {
  const bought = itemsOfList().filter((i) => i.checked)
  if (!bought.length) return
  const boughtIds = new Set(bought.map((i) => i.id))
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
    price: prices[i.id] ?? unitPrice(i),
    bought_on: trip.date
  }))
  app.trips = [trip, ...app.trips].sort((a, b) => (a.date < b.date ? 1 : -1))
  app.lastTrip = { trip, lines }
  if (settings().going?.name === app.me) updateSettings({ going: null })
  app.tripItems = [...app.tripItems, ...lines]
  app.items = app.items.filter((i) => !boughtIds.has(i.id))
  // Lo que no había se queda en la lista para la próxima vez y se cuenta como 'suele faltar'
  const missing = itemsOfList().filter((i) => i.missing)
  const aisle = learnAisle()
  const counts = { ...(settings().missing || {}) }
  for (const m of missing) counts[missKey(m)] = (counts[missKey(m)] || 0) + 1
  if (missing.length || aisle) updateSettings({ ...(aisle ? { aisle } : {}), ...(missing.length ? { missing: counts } : {}) })
  for (const m of missing) updateItem(m.id, { missing: false, taken_by: null })
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
  const data = { app: 'mercafamily', version: 1, exported_at: new Date().toISOString(), household: app.household, lists: app.lists, items: app.items, trips: app.trips, trip_items: app.tripItems }
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
  if (data.lists?.length) await be.upsert('lists', data.lists.filter((l) => l.id !== data.household?.id).map(strip))
  await be.upsert('trips', (data.trips || []).map(strip))
  await be.upsert('trip_items', (data.trip_items || []).map(strip))
  await be.upsert('items', (data.items || []).map(strip))
  await reloadAll()
}


// ---------- Peticiones de los peques ----------

export const approveRequest = (it) => updateItem(it.id, { requested: false })
export async function rejectRequest(it) {
  app.items = app.items.filter((i) => i.id !== it.id)
  try {
    await be.remove('items', it.id)
  } catch (e) {
    fail(e)
  }
}

// ---------- Recetas y menú de la semana ----------

export async function saveRecipe(r) {
  const row = { id: r.id || uid(), name: r.name.trim().slice(0, 60), ingredients: r.ingredients || [], kb_id: r.kb_id || null, steps: r.steps || [], meta: r.meta || {}, created_at: r.created_at || new Date().toISOString() }
  const i = app.recipes.findIndex((x) => x.id === row.id)
  if (i >= 0) app.recipes[i] = row
  else app.recipes.push(row)
  app.recipes.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  try {
    await be.upsert('recipes', row)
  } catch (e) {
    fail(e)
  }
  return row
}

export async function deleteRecipe(id) {
  app.recipes = app.recipes.filter((r) => r.id !== id)
  try {
    await be.remove('recipes', id)
  } catch (e) {
    fail(e)
  }
}

// De texto a producto del catálogo: 'lenteja pardina' -> el que soléis comprar o el más probable
export function resolveIngredient(text) {
  const best = app.catalog ? searchCatalog(text, 1)[0] : null
  // Fuera de temporada la búsqueda puede caer en algo 'sabor sandía': mejor dejarlo sin producto
  const head = norm(text).split(' ')[0]
  if (best && head.length > 3 && norm(best.p.n).includes('sabor ' + head)) return { merc_id: null, name: text, qty: 1 }
  return best ? { merc_id: best.p.id, name: best.p.n, qty: 1 } : { merc_id: null, name: text, qty: 1 }
}

export async function setMeal({ day, slot = 'cena', name, recipe_id = null }) {
  const existing = app.meals.find((m) => m.day === day && m.slot === slot)
  const row = { id: existing?.id || uid(), day, slot, name: name.trim().slice(0, 60), recipe_id, created_at: existing?.created_at || new Date().toISOString() }
  app.meals = [...app.meals.filter((m) => m.id !== row.id), row]
  try {
    await be.upsert('meals', row)
  } catch (e) {
    fail(e)
  }
}

export async function removeMeal(id) {
  app.meals = app.meals.filter((m) => m.id !== id)
  try {
    await be.remove('meals', id)
  } catch (e) {
    fail(e)
  }
}

const onAnyList = (x) => app.items.some((i) => (x.merc_id ? i.merc_id === x.merc_id : !i.merc_id && i.name.toLowerCase() === x.name.toLowerCase()))

// Ingredientes del menú entre dos fechas que no están ya en ninguna lista ni en la despensa
export function mealNeeds(from, to, pantryList = []) {
  const fresh = new Set(pantryList.filter((p) => p.state === 'ok').map((p) => p.merc_id || p.key))
  const need = new Map()
  for (const m of app.meals) {
    if (m.day < from || m.day > to || !m.recipe_id) continue
    const r = app.recipes.find((x) => x.id === m.recipe_id)
    for (const ing of r?.ingredients || []) {
      if (ing.basic) continue
      const k = ing.merc_id || `t:${ing.name.toLowerCase()}`
      if (onAnyList(ing) || fresh.has(ing.merc_id) || need.has(k)) continue
      // Las del recetario guardan la cantidad para 3: los envases se recalculan para los que sois
      need.set(k, { ...ing, qty: ing.q && ing.amount ? packQty(ing.amount, servings() / BASE_SERVINGS) : ing.qty || 1, why: m.name })
    }
  }
  return [...need.values()]
}

export async function addMany(entries) {
  let n = 0
  for (const e of entries) {
    const p = e.merc_id ? app.catalog?.byId.get(e.merc_id) : null
    if (p) await addProduct(p, e.qty || 1)
    else await addText(`${e.qty || 1} ${e.name}`)
    n++
  }
  return n
}

// ---------- Me gusta, no me gusta y 'ahora no' de las recetas (por hogar) ----------
// 'No nos gusta' no borra la receta: solo sale mucho menos en las propuestas.
// 'Ahora no' la aparta de las propuestas unas semanas y vuelve sola. Todo se puede deshacer.

export const SNOOZE_DAYS = 21
export const ratingOf = (name) => (settings().ratings || {})[name] || 0
export const snoozedUntil = (name) => {
  const u = (settings().snoozed || {})[name]
  return u && u >= isoDate() ? u : null
}
export function activeSnoozed() {
  const today = isoDate()
  return Object.fromEntries(Object.entries(settings().snoozed || {}).filter(([, u]) => u >= today))
}
export async function rateRecipe(name, v) {
  const before = { ratings: { ...(settings().ratings || {}) }, snoozed: { ...activeSnoozed() } }
  const ratings = { ...before.ratings }
  const snoozed = { ...before.snoozed }
  let msg
  if (v === 'snooze') {
    if (snoozed[name]) {
      delete snoozed[name]
      msg = `'${name}' vuelve a las propuestas`
    } else {
      snoozed[name] = isoDate(new Date(Date.now() + SNOOZE_DAYS * 86400000))
      msg = `Apartada ${SNOOZE_DAYS / 7} semanas. Luego vuelve sola.`
    }
  } else if (ratings[name] === v) {
    delete ratings[name]
    msg = 'Valoración quitada'
  } else {
    ratings[name] = v
    delete snoozed[name]
    msg = v === 1 ? 'Os gusta: saldrá más en las propuestas' : 'No os gusta: saldrá mucho menos, pero no desaparece'
  }
  await updateSettings({ ratings, snoozed })
  toast(msg, { label: 'Deshacer', run: () => updateSettings(before) }, 6000)
}

// ---------- Despensa (correcciones a mano) ----------

/** 'Sí, lo tenemos': apunta como que hay en casa varias cosas a la vez (sin tocar la lista) */
export async function pantryHave(entries) {
  const overrides = { ...(settings().pantry || {}) }
  for (const e of entries) overrides[pantryKey(e)] = { state: 'ok', at: isoDate(), name: e.name, merc_id: e.merc_id || null }
  await updateSettings({ pantry: overrides })
}

export async function pantrySet(entry, state) {
  const overrides = { ...(settings().pantry || {}), [entry.key]: { state, at: isoDate(), name: entry.name, merc_id: entry.merc_id || null } }
  await updateSettings({ pantry: overrides })
  if (state === 'out' && !onAnyList(entry)) {
    await addMany([{ merc_id: entry.merc_id, name: entry.name, qty: 1 }])
    toast(`${entry.name}: apuntado en la lista`)
  }
}

// ---------- Personas: dietas y alérgenos ----------

export async function setPeople(people) {
  await updateSettings({ people })
}

// ---------- Avisos de dieta al apuntar ----------

export const people = () => settings().people || []
export function conflictsOf(item) {
  app.detailsTick
  const ppl = people().filter((p) => p.avoid?.length)
  if (!ppl.length || !item) return []
  return dietConflicts(item.name, detailsSync(item.merc_id), ppl)
}
export async function ensureDetails() {
  if (!people().some((p) => p.avoid?.length)) return
  await loadDetails()
  app.detailsTick++
}

// ---------- Dinero: precios, objetivos y ahorro ----------

// Cambio de precio de un producto según el historial semanal de Mercadona
export function priceTrend(mercId) {
  const h = app.history?.prices?.[mercId]
  if (!h || h.length < 2) return null
  const [, prev] = h[h.length - 2]
  const [when, now] = h[h.length - 1]
  if (!prev || prev === now) return null
  return { prev, now, when, diff: (now - prev) / prev }
}

// Histórico de un producto: precios de Mercadona y vuestras compras
export function productHistory(mercId) {
  const prices = app.history?.prices?.[mercId] || []
  const bought = app.tripItems.filter((t) => t.merc_id === mercId).sort((a, b) => (a.bought_on < b.bought_on ? -1 : 1))
  return { prices, bought }
}

export async function recordSaving(amount, label) {
  if (!(amount > 0.01)) return
  const list = [...(settings().savings || []), { at: isoDate(), amount: Math.round(amount * 100) / 100, label }].slice(-200)
  await updateSettings({ savings: list })
}

export async function setGoal(catId, amount) {
  const goals = { ...(settings().goals || {}) }
  if (amount > 0) goals[catId] = amount
  else delete goals[catId]
  await updateSettings({ goals })
}

export function markOnboarded() {
  localStorage.setItem('mf:onboarded', '1')
}
export const needsOnboarding = () => !localStorage.getItem('mf:onboarded')

// ---------- Avisos push ----------

export const pushUrl = () => {
  const cfg = supabaseConfig()
  return cfg ? `${cfg.url.replace(/\/$/, '')}/functions/v1/push` : null
}

export async function pushStatus() {
  const { currentSubscription } = await import('./push.js')
  if (app.kind !== 'supabase') return { sub: null, row: null }
  const sub = await currentSubscription()
  const row = sub ? await be.getPushSub(sub.endpoint).catch(() => null) : null
  return { sub, row }
}

export async function enablePush(prefs) {
  const { subscribe } = await import('./push.js')
  const sub = await subscribe(pushUrl())
  const j = sub.toJSON()
  await be.savePushSub({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, member_name: app.me || null, prefs })
  return sub
}

export async function savePushPrefs(endpoint, prefs) {
  const { currentSubscription } = await import('./push.js')
  const sub = await currentSubscription()
  if (!sub) return
  const j = sub.toJSON()
  await be.savePushSub({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, member_name: app.me || null, prefs })
}

export async function disablePush() {
  const { currentSubscription } = await import('./push.js')
  const sub = await currentSubscription()
  if (!sub) return
  await be.deletePushSub(sub.endpoint).catch(() => {})
  await sub.unsubscribe()
}

export const testPush = () => be.testPush(pushUrl())

// ---------- Registro de errores (para el panel de estado) ----------

export function logError(e) {
  try {
    const list = JSON.parse(localStorage.getItem('mf:errors') || '[]')
    list.push({ at: new Date().toISOString(), msg: String(e?.message || e).slice(0, 200) })
    localStorage.setItem('mf:errors', JSON.stringify(list.slice(-10)))
  } catch {}
}
export const recentErrors = () => {
  try {
    return JSON.parse(localStorage.getItem('mf:errors') || '[]')
  } catch {
    return []
  }
}

export async function syncNow() {
  if (be?.flush) await be.flush()
  await reloadAll()
}
export const catalogInfo = () => (app.catalog ? { updated: app.catalog.updated, count: app.catalog.products.length, wh: app.catalog.wh } : null)

// ---------- Quién va hoy al súper ----------

const GOING_MS = 2 * 3600 * 1000
export function going() {
  const g = settings().going
  return g && Date.now() - new Date(g.at).getTime() < GOING_MS ? g : null
}
export async function setGoing(on) {
  if (on) {
    await updateSettings({ going: { name: app.me || 'Alguien', at: new Date().toISOString(), list_id: app.listId } })
    be.notifyGoing?.(pushUrl()).catch(() => {})
    toast('Avisado: los demás saben que vas al súper')
  } else await updateSettings({ going: null })
}

// ---------- Comparar con Dia y Consum ----------

const OWN_BRANDS = /\b(hacendado|deliplus|bosque verde|compy|solcare|nuestra cocina)\b/gi
export const compareUrl = () => {
  const cfg = supabaseConfig()
  return cfg ? `${cfg.url.replace(/\/$/, '')}/functions/v1/compare` : null
}
export async function compareProducts(products) {
  const url = compareUrl()
  if (!url) return {}
  const items = products.map((p) => ({ key: p.id, q: p.n.replace(OWN_BRANDS, '').replace(/\s+/g, ' ').trim(), rf: p.rf === 'L' ? 'L' : p.rf === 'kg' ? 'kg' : 'ud', ean: detailsSync(p.id)?.e || undefined }))
  const out = {}
  for (let i = 0; i < items.length; i += 15) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: items.slice(i, i + 15) }) })
    if (res.ok) Object.assign(out, (await res.json()).results || {})
  }
  return out
}

// Cuánto habría costado una compra en Dia y en Consum (solo productos comparables por kilo o litro)
export async function tripElsewhere(lines) {
  const prods = []
  for (const l of lines) {
    const p = l.merc_id ? app.catalog?.byId.get(l.merc_id) : null
    if (p && p.r && (p.rf === 'L' || p.rf === 'kg')) prods.push({ p, l })
  }
  if (!prods.length || !compareUrl()) return null
  const res = await compareProducts(prods.map((x) => x.p))
  const out = { total: lines.length, compared: 0, merc: 0, dia: 0, consum: 0, diaN: 0, consumN: 0 }
  for (const { p, l } of prods) {
    const r = res[p.id] || {}
    const ok = (x) => x && x.unit && x.rf === p.rf
    if (!ok(r.dia) && !ok(r.consum)) continue
    const paid = (l.price ?? p.p) * (l.qty || 1)
    // Solo cuentan los productos que existen en las tres tiendas, para comparar lo mismo
    if (!(ok(r.dia) && ok(r.consum))) continue
    out.compared++
    out.merc += paid
    out.dia += paid * (r.dia.unit / p.r)
    out.consum += paid * (r.consum.unit / p.r)
  }
  return out.compared ? out : null
}

// ---------- IPC de alimentos (INE) ----------
let ipcPromise = null
export function loadIpc() {
  ipcPromise ??= fetch(`${import.meta.env.BASE_URL}data/ipc.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
  return ipcPromise
}

// ---------- Recetario ----------

// Ingrediente del recetario ({ q, amount, basic }) o de una receta guardada -> producto del catálogo
// Cuántos coméis en casa (las recetas del recetario están escritas para 3)
export const servings = () => Math.min(20, Math.max(1, Number(settings().servings) || BASE_SERVINGS))
export async function setServings(n) {
  await updateSettings({ servings: Math.min(20, Math.max(1, n)) })
}

// f: veces la receta (personas / 3). La cantidad se recalcula y los envases (latas, botes…) se redondean hacia arriba.
export function resolveKbIngredient(i, f = servings() / BASE_SERVINGS) {
  if (i.merc_id !== undefined && !i.q) return i
  const r = resolveIngredient(i.q)
  return { ...r, amount: scaleAmount(i.amount, f) || null, qty: packQty(i.amount, f), basic: !!i.basic, q: i.q }
}

// Guarda una receta del recetario como receta de casa (si no estaba) y la devuelve
export async function adoptKbRecipe(k) {
  const existing = app.recipes.find((r) => r.kb_id === k.id || r.name === k.name)
  if (existing) return existing
  return saveRecipe({ name: k.name, kb_id: k.id, ingredients: k.ingredients.map((i) => resolveKbIngredient(i, 1)), steps: k.steps, meta: { time: k.time, tags: k.tags, slot: k.slot, kids: k.kids, season: k.season || null, express: !!k.express, fun: !!k.fun, nocook: !!k.nocook } })
}
