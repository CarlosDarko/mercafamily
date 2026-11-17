// Ticket de papel: foto -> texto (tesseract.js, se descarga solo al usarlo) -> total y líneas con precio
import { norm } from './format.js'

const money = (s) => Number(String(s).replace(/\s/g, '').replace(',', '.'))

/**
 * Lee el texto de un ticket de Mercadona.
 * Líneas típicas: '1 LECHE SEMI S/LACT 0,98', '2 TOMATE PERA 1,30 2,60', y para peso
 * '1 PLATANO' seguido de '0,950 kg 1,99 €/kg 1,89'.
 */
export function parseTicket(text) {
  const rows = String(text || '')
    .split(/\r?\n/)
    .map((r) => r.replace(/[|€]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  let total = null
  const lines = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const t = r.match(/^TOTAL\b.*?(\d+[.,]\d{2})\s*$/i)
    if (t) {
      total = money(t[1])
      continue
    }
    if (/^(IVA|BASE|TARJ|CAMBIO|ENTREGADO|EFECTIVO|IMPORTE|SUBTOTAL|DESCRIPCI|FACTURA|OP:|TEL|C\.I\.F|NIF)/i.test(r)) continue
    // Línea de peso: '0,950 kg 1,99 /kg 1,89' pertenece a la anterior
    const w = r.match(/^(\d+[.,]\d{3})\s*kg\s+(\d+[.,]\d{2})\s*\/?\s*kg\s+(\d+[.,]\d{2})$/i)
    if (w && lines.length) {
      const last = lines[lines.length - 1]
      last.qty = 1
      last.unit = money(w[3])
      last.total = money(w[3])
      last.weight = money(w[1])
      continue
    }
    const m = r.match(/^(\d{1,2})\s+([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 .,%/'&+-]*?)(?:\s+(\d+[.,]\d{2}))?(?:\s+(\d+[.,]\d{2}))?$/i)
    if (m && /[A-ZÁÉÍÓÚÑ]{2}/i.test(m[2])) {
      const qty = Number(m[1])
      const a = m[3] ? money(m[3]) : null
      const b = m[4] ? money(m[4]) : null
      const lineTotal = b ?? a
      const unit = b != null ? a : a != null ? a / qty : null
      lines.push({ qty, desc: m[2].trim(), unit: unit != null ? Math.round(unit * 100) / 100 : null, total: lineTotal })
    }
  }
  const sum = Math.round(lines.reduce((s, l) => s + (l.total || 0), 0) * 100) / 100
  return { total: total ?? (sum || null), lines, sum }
}

// Une cada línea del ticket con el producto del carro que más se le parece (palabras en común)
export function matchLines(lines, cart) {
  const tok = (s) => norm(s).replace(/[^a-z0-9ñ ]/g, ' ').split(' ').filter((w) => w.length >= 3)
  const used = new Set()
  const out = []
  for (const l of lines) {
    if (l.unit == null) continue
    const lt = tok(l.desc)
    let best = null
    for (const it of cart) {
      if (used.has(it.id)) continue
      const it_t = tok(it.name)
      // Las abreviaturas del ticket coinciden por el principio de la palabra ('SEMI' con 'semidesnatada')
      const hits = lt.filter((w) => it_t.some((x) => x.startsWith(w) || w.startsWith(x))).length
      const score = hits / Math.max(lt.length, 1)
      if (hits && (!best || score > best.score)) best = { it, score }
    }
    if (best && best.score >= 0.4) {
      used.add(best.it.id)
      out.push({ item: best.it, line: l })
    }
  }
  return out
}

export async function readTicket(file, onProgress) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('spa', 1, {
    logger: (m) => m.status === 'recognizing text' && onProgress?.(m.progress)
  })
  try {
    const { data } = await worker.recognize(file)
    return data.text
  } finally {
    await worker.terminate()
  }
}
