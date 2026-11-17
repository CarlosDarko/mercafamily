// MercaFamily: avisos push. Función de Supabase (Deno).
// GET  -> { publicKey } para que la app se suscriba
// POST { type: 'item', id }  -> alguien ha apuntado algo (lo llama un trigger de la base de datos)
// POST { type: 'trip', id }  -> alguien ha terminado una compra (trigger)
// POST { type: 'tick' }      -> cada 15 minutos (pg_cron): aviso al salir del trabajo y resumen del domingo
// POST { type: 'test' }      -> aviso de prueba para las suscripciones del usuario que llama
// Secretos (en Supabase, nunca en el repositorio): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

const APP = 'https://carlosdarko.github.io/mercafamily/'
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const PUB = Deno.env.get('VAPID_PUBLIC_KEY')!
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || APP, PUB, Deno.env.get('VAPID_PRIVATE_KEY')!)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

type Sub = { id: string; household_id: string; user_id: string; member_name: string | null; endpoint: string; p256dh: string; auth: string; prefs: Record<string, any> }

async function send(sub: Sub, payload: Record<string, unknown>) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 6 * 3600 })
    return true
  } catch (e: any) {
    // Suscripción caducada o borrada en el móvil: se limpia
    if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('push_subs').delete().eq('id', sub.id)
    console.error('push', e?.statusCode, e?.body || e?.message)
    return false
  }
}

// Evita avisos repetidos: cada aviso tiene una clave única
async function once(kind: string, key: string) {
  const { error } = await db.from('push_log').insert({ kind, key })
  return !error
}

async function subsOf(household: string) {
  const { data } = await db.from('push_subs').select('*').eq('household_id', household)
  return (data || []) as Sub[]
}

// Hora y día en España
function madrid(d = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  )
  const wd = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].indexOf(String(parts.weekday).replace('.', '')) + 1 // 1 lunes ... 7 domingo
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), wd }
}
const toMin = (hhmm: string) => {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return h * 60 + (m || 0)
}

function weekStartISO(date: string) {
  const d = new Date(date + 'T12:00:00Z')
  const wd = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - wd)
  return d.toISOString().slice(0, 10)
}

async function weekSpent(household: string, today: string) {
  const { data } = await db.from('trips').select('total').eq('household_id', household).gte('date', weekStartISO(today))
  return (data || []).reduce((s, t: any) => s + Number(t.total || 0), 0)
}

async function onItem(id: string) {
  const { data: it } = await db.from('items').select('*').eq('id', id).single()
  if (!it || Date.now() - new Date(it.created_at).getTime() > 3 * 60000) return { skipped: 'viejo' }
  // Una ráfaga de cosas apuntadas por la misma persona se agrupa en un aviso que se va actualizando
  const since = new Date(Date.now() - 5 * 60000).toISOString()
  const { data: recent } = await db.from('items').select('name, list_id, requested').eq('household_id', it.household_id).eq('added_by', it.added_by ?? '').gte('created_at', since).order('created_at')
  const names = (recent || []).map((r: any) => String(r.name).replace(/ Hacendado$/, ''))
  const { data: list } = it.list_id ? await db.from('lists').select('name').eq('id', it.list_id).single() : { data: null }
  const listName = list?.name || 'la lista'
  const who = it.added_by || 'Alguien'
  const title = it.requested ? `${who} pide ${names.length > 1 ? `${names.length} cosas` : names[0]}` : `${who} ha apuntado ${names.length > 1 ? `${names.length} cosas` : names[0]}`
  const body = names.length > 1 ? `${names.slice(-6).join(', ')} en ${listName}` : `En ${listName}`
  let sent = 0
  for (const s of await subsOf(it.household_id)) {
    if (s.member_name && s.member_name === it.added_by) continue
    if (s.prefs?.added === false) continue
    if (await send(s, { title, body, tag: `items-${it.household_id}`, url: `${APP}#lista` })) sent++
  }
  return { sent }
}

async function onTrip(id: string) {
  const { data: t } = await db.from('trips').select('*').eq('id', id).single()
  if (!t || !(await once('trip', id))) return { skipped: true }
  const { data: h } = await db.from('households').select('weekly_budget').eq('id', t.household_id).single()
  const spent = await weekSpent(t.household_id, t.date)
  const budget = h?.weekly_budget ? Number(h.weekly_budget) : null
  let sent = 0
  for (const s of await subsOf(t.household_id)) {
    const own = s.member_name && s.member_name === t.created_by
    if (!own && s.prefs?.trips !== false && (await send(s, { title: `${t.created_by || 'Alguien'} ha terminado la compra`, body: `${eur(Number(t.total))} en ${t.store}. Esta semana lleváis ${eur(spent)}.`, tag: `trip-${id}`, url: `${APP}#gastos` }))) sent++
    if (budget && spent > budget && s.prefs?.budget !== false && (await once('budget', `${s.id}-${weekStartISO(t.date)}`))) {
      if (await send(s, { title: 'Os habéis pasado del presupuesto', body: `${eur(spent)} esta semana de ${eur(budget)}.`, tag: `budget-${t.household_id}`, url: `${APP}#gastos` })) sent++
    }
  }
  return { sent }
}

async function pendingIn(household: string, listId: string | null) {
  let q = db.from('items').select('name').eq('household_id', household).eq('checked', false).eq('requested', false)
  q = listId && listId !== household ? q.eq('list_id', listId) : q.is('list_id', null)
  const { data } = await q
  return (data || []).map((r: any) => String(r.name).replace(/ Hacendado$/, ''))
}

async function tick() {
  const now = madrid()
  const { data } = await db.from('push_subs').select('*')
  let sent = 0
  for (const s of (data || []) as Sub[]) {
    const p = s.prefs || {}
    // Aviso al salir del trabajo: a la hora elegida, los días elegidos, si la lista tiene algo
    const w = p.work
    if (w?.on && (w.days || [1, 2, 3, 4, 5]).includes(now.wd) && now.minutes >= toMin(w.time || '18:30') && now.minutes < toMin(w.time || '18:30') + 15) {
      if (await once('work', `${s.id}-${now.date}`)) {
        const names = await pendingIn(s.household_id, w.list_id || null)
        const { data: l } = w.list_id && w.list_id !== s.household_id ? await db.from('lists').select('name').eq('id', w.list_id).single() : { data: null }
        if (names.length && (await send(s, { title: `${l?.name || 'La lista'}: ${names.length} ${names.length === 1 ? 'cosa' : 'cosas'}`, body: names.slice(0, 8).join(', '), tag: `work-${s.id}`, url: `${APP}#lista` }))) sent++
      }
    }
    // Informe del mes, el día 1 a las 9:00
    if (p.report !== false && now.date.endsWith('-01') && now.minutes >= 540 && now.minutes < 555 && (await once('report', `${s.id}-${now.date}`))) {
      const prev = new Date(now.date + 'T12:00:00Z')
      prev.setUTCMonth(prev.getUTCMonth() - 1)
      const m = prev.toISOString().slice(0, 7)
      const { data: tr } = await db.from('trips').select('total').eq('household_id', s.household_id).gte('date', `${m}-01`).lt('date', `${now.date}`)
      const total = (tr || []).reduce((acc, t: any) => acc + Number(t.total || 0), 0)
      const name = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(prev)
      if (tr?.length && (await send(s, { title: `Informe de ${name}`, body: `${eur(total)} en ${tr.length} compras. Toca para verlo.`, tag: `report-${s.id}`, url: `${APP}#gastos-informe` }))) sent++
    }
    // Resumen del domingo
    const sumAt = toMin(p.summaryTime || '19:00')
    if (p.summary !== false && now.wd === 7 && now.minutes >= sumAt && now.minutes < sumAt + 15 && (await once('summary', `${s.id}-${now.date}`))) {
      const { data: h } = await db.from('households').select('weekly_budget').eq('id', s.household_id).single()
      const spent = await weekSpent(s.household_id, now.date)
      const names = await pendingIn(s.household_id, null)
      const budget = h?.weekly_budget ? ` de ${eur(Number(h.weekly_budget))}` : ''
      if (await send(s, { title: 'Resumen de la semana', body: `${eur(spent)} gastados${budget}. ${names.length ? `En la lista quedan ${names.length} cosas.` : 'La lista está vacía.'}`, tag: `summary-${s.id}`, url: `${APP}#gastos` })) sent++
    }
  }
  return { sent, at: now }
}

// 'Voy yo al súper': avisa a los demás de la casa para que añadan lo último
async function going(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /i, '')
  const { data } = await db.auth.getUser(token)
  if (!data?.user) return { error: 'sin sesión' }
  const { data: m } = await db.from('members').select('household_id, display_name').eq('user_id', data.user.id).limit(1).single()
  if (!m || !(await once('going', `${m.household_id}-${new Date().toISOString().slice(0, 13)}`))) return { skipped: true }
  let sent = 0
  for (const s of await subsOf(m.household_id)) {
    if (s.user_id === data.user.id || s.prefs?.going === false) continue
    if (await send(s, { title: `${m.display_name || 'Alguien'} va al súper`, body: 'Si falta algo, apúntalo ahora en la lista.', tag: `going-${m.household_id}`, url: `${APP}#lista` })) sent++
  }
  return { sent }
}

async function test(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /i, '')
  const { data } = await db.auth.getUser(token)
  if (!data?.user) return { error: 'sin sesión' }
  const { data: subs } = await db.from('push_subs').select('*').eq('user_id', data.user.id)
  let sent = 0
  for (const s of (subs || []) as Sub[]) if (await send(s, { title: 'Avisos activados', body: 'Así os llegarán los avisos de MercaFamily.', tag: 'test', url: APP })) sent++
  return { sent }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method === 'GET') return json({ publicKey: PUB })
  const body = await req.json().catch(() => ({}))
  try {
    if (body.type === 'item' && body.id) return json(await onItem(body.id))
    if (body.type === 'trip' && body.id) return json(await onTrip(body.id))
    if (body.type === 'tick') return json(await tick())
    if (body.type === 'test') return json(await test(req))
    if (body.type === 'going') return json(await going(req))
    return json({ error: 'tipo desconocido' }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: String(e) }, 500)
  }
})
