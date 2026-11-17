// Apuntar por voz: 'añade leche, dos de tomate y pan de molde' -> ['leche', '2 tomate', 'pan de molde']

const NUMS = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, docena: 12, media: 6, quince: 15, veinte: 20
}
const LEAD = /^(por favor\s+)?(apunta|apuntame|añade|añademe|anade|pon|ponme|mete|compra|hay que comprar|necesitamos|falta|faltan|nos falta|nos faltan)\b\s*/i
const FILLER = /\b(por favor|tambien|también|y ya|nada mas|nada más|vale|gracias)\b/gi

export function parseSpoken(text) {
  let t = String(text || '').toLowerCase().trim()
  t = t.replace(LEAD, '').replace(FILLER, ' ')
  // Separadores: comas, ' y ', ' e ', ' más '
  const parts = t
    .split(/\s*,\s*|\s+y\s+|\s+e\s+(?=[a-záéíóú])|\s+más\s+|\s+mas\s+|\.\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  const out = []
  for (let p of parts) {
    let qty = 1
    // 'media docena de huevos', 'una docena de huevos', 'dos docenas de huevos'
    const doz = p.match(/^(media|una|un|dos|tres|\d+)?\s*docenas?\s+de\s+(.+)$/)
    if (doz) {
      const k = doz[1] || 'una'
      qty = k === 'media' ? 6 : 12 * (/^\d+$/.test(k) ? Number(k) : NUMS[k] || 1)
      p = doz[2]
    } else {
      // 'dos de tomate', 'dos tomates', '3 bricks de leche'
      const m = p.match(/^(\d+|[a-záéíóú]+)\s+(?:de\s+)?(.+)$/)
      if (m) {
        const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMS[m[1]]
        if (n && m[1] !== 'media') {
          qty = n
          p = m[2]
        }
      }
    }
    p = p.replace(/^(un|una|unos|unas|el|la|los|las)\s+/, '').replace(/^(paquete|bote|bolsa|brick|bricks|caja|botella|botellas|paquetes|bolsas|cajas|kilo|kilos)\s+de\s+/, '').trim()
    if (p.length >= 2) out.push(qty > 1 ? `${Math.min(qty, 99)} ${p}` : p)
  }
  return out
}

export const voiceSupported = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)

export function listen({ onResult, onEnd, onError }) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition
  const rec = new R()
  rec.lang = 'es-ES'
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1
  let final = ''
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) final += r[0].transcript
      else interim += r[0].transcript
    }
    onResult?.(final || interim, !!final)
  }
  rec.onerror = (e) => onError?.(e.error)
  rec.onend = () => onEnd?.(final)
  rec.start()
  return () => rec.stop()
}
