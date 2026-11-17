// Cálculos sobre el histórico: frecuencia de compra, gasto por periodos y subidas de precio
import { parseDate, weekStart, daysBetween, isoDate } from './format.js'

const keyOf = (ti) => ti.merc_id || `t:${ti.name.toLowerCase()}`

// 'Compráis huevos cada 8 días y hace 9'
export function dueSuggestions(tripItems, items, catalog, today = new Date()) {
  const onList = new Set(items.map(keyOf))
  const byKey = new Map()
  for (const ti of tripItems) {
    const k = keyOf(ti)
    let e = byKey.get(k)
    if (!e) byKey.set(k, (e = { key: k, merc_id: ti.merc_id, name: ti.name, category: ti.category, price: ti.price, dates: new Set(), qty: 0 }))
    e.dates.add(ti.bought_on)
    e.qty += ti.qty || 1
    e.name = ti.name
  }
  const out = []
  for (const e of byKey.values()) {
    if (onList.has(e.key)) continue
    if (e.merc_id && catalog && !catalog.byId.has(e.merc_id)) continue
    const dates = [...e.dates].sort()
    const last = parseDate(dates[dates.length - 1])
    const since = daysBetween(last, today)
    const times = dates.length
    let every = null
    if (times >= 2) every = daysBetween(parseDate(dates[0]), last) / (times - 1)
    const ratio = every ? since / every : 0
    out.push({ ...e, times, every, since, ratio, due: every != null && every >= 2 && ratio >= 0.85, qtyAvg: Math.max(1, Math.round(e.qty / times)) })
  }
  const due = out.filter((x) => x.due).sort((a, b) => b.ratio - a.ratio)
  const usual = out.filter((x) => !x.due && x.times >= 2).sort((a, b) => b.times - a.times)
  return { due, usual }
}

export function spendByWeek(trips, weeks = 12, today = new Date()) {
  const start = weekStart(today)
  const buckets = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(start)
    d.setDate(d.getDate() - i * 7)
    buckets.push({ start: d, key: isoDate(d), total: 0, trips: 0 })
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]))
  for (const t of trips) {
    const k = isoDate(weekStart(parseDate(t.date)))
    const i = idx.get(k)
    if (i != null) {
      buckets[i].total += Number(t.total) || 0
      buckets[i].trips++
    }
  }
  return buckets
}

export function monthTotal(trips, y, m) {
  return trips.filter((t) => {
    const d = parseDate(t.date)
    return d.getFullYear() === y && d.getMonth() === m
  }).reduce((s, t) => s + (Number(t.total) || 0), 0)
}

export function weekTotal(trips, today = new Date()) {
  const k = isoDate(weekStart(today))
  return trips.filter((t) => isoDate(weekStart(parseDate(t.date))) === k).reduce((s, t) => s + (Number(t.total) || 0), 0)
}

export function byCategory(tripItems, catalog, fromDate) {
  const m = new Map()
  for (const ti of tripItems) {
    if (fromDate && ti.bought_on < fromDate) continue
    const name = catalog?.cats.get(ti.category)?.n || 'Otros'
    m.set(name, (m.get(name) || 0) + (ti.price || 0) * (ti.qty || 1))
  }
  return [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
}

// Productos que compráis (o tenéis en la lista) cuyo precio ha cambiado según el historial semanal de Mercadona
export function priceChanges(history, ids, catalog) {
  const out = []
  for (const id of ids) {
    const h = history?.prices?.[id]
    const p = catalog?.byId.get(id)
    if (!h || h.length < 2 || !p) continue
    const [, prev] = h[h.length - 2]
    const [when, now] = h[h.length - 1]
    if (!prev || prev === now) continue
    out.push({ p, prev, now, when, diff: (now - prev) / prev })
  }
  return out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
}
