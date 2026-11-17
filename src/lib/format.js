const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
export const eur = (n) => (n == null || Number.isNaN(n) ? '—' : eurFmt.format(n))

export const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ%,.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const tokens = (s) => norm(s).split(' ').filter(Boolean)

export function parseNum(v) {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/[€\s]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

export const isoDate = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const wd = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - wd)
  return x
}

export const daysBetween = (a, b) => Math.round((b - a) / 86400000)

const dFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const dLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const mFmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
export const fmtDay = (d) => dFmt.format(typeof d === 'string' ? parseDate(d) : d)
export const fmtLong = (d) => dLong.format(typeof d === 'string' ? parseDate(d) : d)
export const fmtMonth = (d) => mFmt.format(d)
export const pct = (n) => `${n > 0 ? '+' : ''}${Math.round(n * 100)} %`
