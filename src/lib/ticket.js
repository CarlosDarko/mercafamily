// Ticket de papel de Mercadona, en castellano o en catalán: fotos -> texto -> líneas -> productos del catálogo
// El texto se lee con tesseract.js (se descarga solo al usarlo) después de limpiar la foto (sombras y contraste).
import { norm } from './format.js'

const money = (s) => Number(String(s).replace(/\s/g, '').replace(',', '.'))

// Lo que no son productos: cabecera, pie, impuestos y pago (castellano y catalán)
const SKIP = /^(IVA|BASE|TARJ|TARG|CAMBIO|CANVI|ENTREGAD|LLIURAT|EFECTIV|EFECTIU|IMPORTE|IMPORT\b|SUBTOTAL|DESCRIPCI|FACTURA|OP\b|OP:|TEL|C\.?I\.?F|N\.?I\.?F|MERCADONA|S\.A|AVDA|AVINGUDA|CALLE|CARRER|C\/|SE ADMITEN|S'ADMETEN|DEVOLUC|GRACIES|GRÀCIES|GRACIAS|PARKING|APARCAMENT|VISA|MASTERCARD|AUT\b|N\.C|COMERC|TRANS|LEIDA|LLEGIDA|CONTACTLESS|COPIA|CUOTA|QUOTA|P\. ?UNIT)/i

/** Arregla lo que el lector suele confundir en los importes: '4, 18' -> '4,18', '2.80' -> '2,80' */
function fixRow(r) {
  return r
    .replace(/[|€]/g, ' ')
    // Restos de la cabecera de columnas pegados a la primera línea ('P. Unit', 'Imp. (€)')
    .replace(/\b(P\.?\s*)?Unit\b|\bImp\.?\s*\(?[e€]?\)?/gi, ' ')
    .replace(/(\d)\s*[,.]\s*(\d{2})\b/g, '$1,$2')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Fecha del ticket (dd/mm/aaaa) en formato ISO, si aparece */
export function ticketDate(text) {
  const m = String(text || '').match(/\b(\d{2})[/-](\d{2})[/-](20\d{2})\b/)
  if (!m) return null
  const [, d, mo, y] = m
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return null
  return `${y}-${mo}-${d}`
}

/**
 * Lee el texto de un ticket. Líneas típicas:
 * '1 LECHE SEMI S/LACT 0,98', '5 BOSSA PLASTIC 0,15 0,75' (cantidad, unitario e importe)
 * y para peso '1 PLATANO' seguido de '0,950 kg 1,99 €/kg 1,89'.
 */
export function parseTicket(text) {
  const rows = String(text || '')
    .split(/\r?\n/)
    .map(fixRow)
    .filter(Boolean)
  let total = null
  const lines = []
  for (const r of rows) {
    const t = r.match(/^TOTAL\b.*?(\d+,\d{2})\s*\S?$/i)
    if (t) {
      total = money(t[1])
      continue
    }
    if (SKIP.test(r)) continue
    // Línea de peso: pertenece a la anterior
    const w = r.match(/^(\d+,\d{3})\s*kg\s+(\d+,\d{2})\s*\/?\s*kg\s+(\d+,\d{2})/i)
    if (w && lines.length) {
      const last = lines[lines.length - 1]
      last.qty = 1
      last.unit = money(w[3])
      last.total = money(w[3])
      last.weight = money(w[1])
      continue
    }
    // Cantidad al principio: el lector a veces la confunde con I, l, |, i, t o una coma
    // A veces va pegada al nombre: '1LLET SEMI'
    const q = r.match(/^(\d{1,2}|[Il|i!t\],.])(?:\s+|(?=[A-ZÀ-ÚÇ]{2}))(.+)$/)
    if (!q) continue
    const qty = /\d/.test(q[1]) ? Number(q[1]) : 1
    let rest = q[2]
    // Importes al final: uno (importe) o dos (unitario e importe). '403' sin coma al final se lee como 4,03
    const prices = []
    for (;;) {
      const m = rest.match(/\s(\d{1,3},\d{2})$/) || (prices.length === 0 && rest.match(/\s(\d{3,4})$/))
      if (!m || prices.length >= 2) break
      prices.unshift(m[1].includes(',') ? money(m[1]) : Number(m[1]) / 100)
      rest = rest.slice(0, m.index).trim()
    }
    // Restos del lector al final del nombre ('qu', 'a.', 'N'): fuera
    const desc = rest.replace(/(\s+[^\s]{1,2}[.,']?)+$/, (m) => (/\d/.test(m) ? m : '')).replace(/[^\p{L}\d)]+$/u, '').trim()
    if (!/\p{L}{2}/u.test(desc)) continue
    const lineTotal = prices.length ? prices[prices.length - 1] : null
    const unit = prices.length === 2 ? prices[0] : lineTotal != null ? lineTotal / qty : null
    lines.push({ qty, desc, unit: unit != null ? Math.round(unit * 100) / 100 : null, total: lineTotal })
  }
  const sum = Math.round(lines.reduce((s, l) => s + (l.total || 0), 0) * 100) / 100
  return { total: total ?? (sum || null), ticketTotal: total, lines, sum, date: ticketDate(text) }
}

const keyOf = (l) => norm(l.desc).replace(/[^a-z]/g, '').slice(0, 8)

/**
 * Une el texto de varias fotos de un ticket largo. Si la foto siguiente empieza repitiendo las últimas líneas
 * de la anterior (las fotos se solapan), esas líneas no se cuentan dos veces.
 */
export function parsePages(texts) {
  const out = { lines: [], total: null, date: null }
  for (const text of texts) {
    const p = parseTicket(text)
    // El total solo vale si se ha leído la línea TOTAL (si la foto no llega, se deja vacío)
    if (p.ticketTotal != null) out.total = p.ticketTotal
    out.date ??= p.date
    let k = Math.min(out.lines.length, p.lines.length)
    for (; k > 0; k--) {
      const tail = out.lines.slice(-k).map(keyOf).join('|')
      const head = p.lines.slice(0, k).map(keyOf).join('|')
      if (tail === head) break
    }
    out.lines.push(...p.lines.slice(k))
  }
  out.sum = Math.round(out.lines.reduce((s, l) => s + (l.total || 0), 0) * 100) / 100
  return out
}

// ---------- Del ticket al catálogo ----------

// Palabras y abreviaturas de los tickets en catalán (y algunas en castellano) a como se llaman en el catálogo
const WORDS = {
  llet: 'leche', semi: 'semidesnatada', desn: 'desnatada', sencera: 'entera', lact: 'lactosa',
  talls: 'lonchas', tall: 'lonchas', llom: 'lomo', adobat: 'adobado', adobada: 'adobada', filets: 'filetes', filet: 'filete',
  secret: 'secreto', burg: 'burger', bo: 'vacuno', por: 'cerdo', porc: 'cerdo', vedella: 'ternera', pollastre: 'pollo', gall: 'pavo', dindi: '',
  netejador: 'limpiador', potent: 'potente', mongeta: 'alubia', mongetes: 'alubias', cuita: 'cocida', cuit: 'cocido', cuits: 'cocidos',
  cigro: 'garbanzo', cigrons: 'garbanzos', llenties: 'lentejas', escudell: 'cocido', escudella: 'cocido', anet: 'eneldo',
  mocador: 'pañuelos', mocadors: 'pañuelos', capsa: 'caja', cacau: 'cacao', gust: '', ovella: 'oveja', formatge: 'queso',
  medallo: 'medallon', preparat: 'preparado', xampu: 'champu', desembussador: 'desatascador', raim: 'uva', blanc: 'blanca',
  sense: 'sin', pep: 'semillas', peps: 'semillas', raim: 'uva', xoco: 'chocolate', xocolata: 'chocolate', sucre: 'azucar',
  llimona: 'limon', espremuda: 'exprimido', salmo: 'salmon', pernil: 'jamon', dolc: 'cocido', ous: 'huevos', ou: 'huevo',
  pa: 'pan', aigua: 'agua', poma: 'manzana', pomes: 'manzanas', taronja: 'naranja', taronges: 'naranjas', platan: 'platano',
  tomaquet: 'tomate', tomaquets: 'tomates', ceba: 'cebolla', cebes: 'cebollas', all: 'ajo', alls: 'ajos', pastanaga: 'zanahoria',
  carbasso: 'calabacin', carbassa: 'calabaza', alberginia: 'berenjena', pebrot: 'pimiento', enciam: 'lechuga', cogombre: 'pepino',
  maduixa: 'fresa', maduixes: 'fresas', pressec: 'melocoton', sindria: 'sandia', melo: 'melon', iogurt: 'yogur', iogurts: 'yogures',
  mantega: 'mantequilla', oli: 'aceite', farina: 'harina', arros: 'arroz', macarrons: 'macarrones', galetes: 'galletas',
  galeta: 'galleta', cereals: 'cereales', cafe: 'cafe', sabo: 'jabon', rentavaixelles: 'lavavajillas', paper: 'papel',
  higienic: 'higienico', cuina: 'cocina', gelat: 'helado', gelats: 'helados', xai: 'cordero', peix: 'pescado', lluc: 'merluza',
  tonyina: 'atun', gambes: 'gambas', calamars: 'calamares', musclos: 'mejillones', fruita: 'fruta', suc: 'zumo',
  cervesa: 'cerveza', vi: 'vino', refresc: 'refresco', llauna: 'lata', llaunes: 'latas', ampolla: 'botella', paquet: 'paquete',
  bossa: 'bolsa', verdures: 'verduras', amanida: 'ensalada', patates: 'patatas', fregits: 'fritos', pebre: 'pimienta',
  nata: 'nata', bolets: 'setas', xampinyons: 'champiñones', espinacs: 'espinacas', brocoli: 'brocoli', col: 'col',
  porro: 'puerro', porros: 'puerros', mandarina: 'mandarina', mandarines: 'mandarinas', raïm: 'uva', pinya: 'piña', kiwi: 'kiwi',
  salsitxes: 'salchichas', botifarra: 'butifarra', fuet: 'fuet', llonganissa: 'longaniza', pizza: 'pizza', massa: 'masa',
  base: 'masa', topping: 'topping', reserva: 'jamon reserva', light: 'light', zero: 'zero', coca: 'coca', cola: 'cola',
  dutxa: 'ducha', gel: 'gel', dents: 'dientes', pasta: 'pasta', rentadora: 'lavadora', suavitzant: 'suavizante', lleixiu: 'lejia',
  llarg: 'largo', llarga: 'larga', rodo: 'redondo', clara: 'claro', clar: 'claro', negre: 'negro', vermell: 'rojo', vermella: 'roja',
  verd: 'verde', verds: 'verdes', groc: 'amarillo', petit: 'pequeño', petita: 'pequeña', fresc: 'fresco', fresca: 'fresca',
  congelat: 'congelado', congelada: 'congelada', ratllat: 'rallado', ratllada: 'rallado', tendre: 'tierno', curat: 'curado',
  escombraries: 'basura', tovalloletes: 'toallitas', compreses: 'compresas', bolquers: 'pañales', gos: 'perro', gat: 'gato'
}
// Abreviaturas de dos letras o con barra que van antes de partir en palabras
const PHRASES = [
  [/\bs\/\s*lact\w*/g, ' sin lactosa '],
  [/\bs\/\s*/g, ' sin '],
  [/\bc\/\s*/g, ' con '],
  [/\bm\.\s*cuit/g, ' cocido '],
  [/\bf\.\s*/g, ' queso '],
  [/\bbo\s*\/\s*por/g, ' vacuno cerdo '],
  [/\b\d+\s*(l|g|kg|ml|cl|u|ud|uds)\b/g, ' ']
]

/** Nombre del ticket a palabras del catálogo: 'LLET SEMI S/LACT' -> 'leche semidesnatada sin lactosa' */
export function translateLine(desc) {
  // Sin acentos pero con las barras y puntos (s/lact, m.cuit), que norm() quitaría
  let t = String(desc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const [re, to] of PHRASES) t = t.replace(re, to)
  return t
    .replace(/[^a-zñ ]/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1 || w === 'u')
    .map((w) => (w in WORDS ? WORDS[w] : w))
    .filter(Boolean)
    .join(' ')
}

/**
 * Empareja cada línea con un producto. Lo más fiable es el precio: si entre los parecidos hay uno que cuesta
 * exactamente lo mismo, es ese ('seguro'). Si no, el más parecido por nombre, para revisar.
 * search(query, n) devuelve [{ p, score }] como searchCatalog.
 */
// ¿Cuántas palabras de lo buscado lleva el nombre del producto? (por el principio: 'semidesnatada' vale por 'semi')
function overlap(name, q) {
  const nw = norm(name).replace(/[^a-zñ ]/g, ' ').split(' ').filter(Boolean)
  const qw = q.split(' ').filter((w) => w.length > 2 && !['sin', 'con', 'del', 'las', 'los'].includes(w))
  if (!qw.length) return 1
  return qw.filter((w) => nw.some((x) => x.startsWith(w.slice(0, 4)))).length / qw.length
}

export function matchToCatalog(lines, search) {
  const near = (i) => [i, i - 1, i + 1, i - 2, i + 2].filter((j) => j >= 0 && j < lines.length)
  const usedPrice = new Set()
  const out = lines.map((l, i) => {
    const q = translateLine(l.desc)
    if (/^bolsa\b/.test(q) || /\bbolsa (de )?plastic/.test(q)) return { ...l, q, p: null, sure: true, bag: true }
    // Se busca con todo y, si no aparece el precio, quitando una palabra cada vez (abreviaturas raras)
    const words = q.split(' ').filter(Boolean)
    const queries = [q, ...(words.length > 1 ? words.map((_, k) => words.filter((__, j) => j !== k).join(' ')) : [])]
    const pools = []
    for (const qq of queries) {
      // Al quitar palabras solo valen productos que sigan llevando casi todo lo buscado
      const found = (qq ? search(qq, 40) : []).filter((r) => qq === q || overlap(r.p.n, q) >= 0.6)
      pools.push(found)
      const byPrice = l.unit != null ? found.find((r) => Math.abs(r.p.p - l.unit) < 0.006) : null
      if (byPrice) {
        usedPrice.add(i)
        return { ...l, q, p: byPrice.p, sure: true }
      }
    }
    const found = pools[0] || []
    // Por peso (fruta, carne al corte): el precio por kilo del ticket frente al del catálogo
    if (l.weight && l.unit != null) {
      const perKg = l.unit / l.weight
      const w = found.find((r) => r.p.rf === 'kg' && Math.abs(r.p.r - perKg) < 0.02)
      if (w) return { ...l, q, p: w.p, sure: true }
    }
    const top = found[0]?.p || null
    // Sin precio leído pero con el nombre entero en el producto: se da por bueno con el precio del catálogo,
    // salvo lo que se vende a peso o en piezas caras (salmón, carne al corte), que queda sin precio para revisar
    const byName = top && overlap(top.n, q) === 1 && q.split(' ').filter((w) => w.length > 2).length >= 1
    const fixed = top && top.p <= 12 && !/granel|pieza|al corte/i.test(top.z || '')
    if (l.unit == null && byName && fixed) return { ...l, q, p: top, unit: top.p, total: Math.round(top.p * l.qty * 100) / 100, sure: true, priceFromCatalog: true }
    return { ...l, q, found: pools.flat(), p: top, sure: false }
  })
  // Los precios del ticket van medio renglón por debajo y a veces se leen pegados a la línea de al lado:
  // si un producto parecido cuesta justo lo que una línea vecina cuya cifra no se ha usado, es ese precio
  for (let i = 0; i < out.length; i++) {
    const l = out[i]
    if (l.sure || !l.found?.length) continue
    for (const j of near(i).slice(1)) {
      const u = lines[j].unit
      if (u == null || usedPrice.has(j)) continue
      const hit = l.found.find((r) => Math.abs(r.p.p - u) < 0.006 && overlap(r.p.n, l.q) >= 0.5)
      if (hit) {
        usedPrice.add(j)
        Object.assign(l, { p: hit.p, unit: u, total: Math.round(u * l.qty * 100) / 100, sure: false, shifted: true })
        break
      }
    }
  }
  return out.map(({ found, ...l }) => l)
}

// Une cada línea del ticket con el producto del carro que más se le parece (palabras en común)
export function matchLines(lines, cart) {
  const tok = (s) => norm(s).replace(/[^a-z0-9ñ ]/g, ' ').split(' ').filter((w) => w.length >= 3)
  const used = new Set()
  const out = []
  for (const l of lines) {
    if (l.unit == null) continue
    const lt = tok(translateLine(l.desc) + ' ' + l.desc)
    let best = null
    for (const it of cart) {
      if (used.has(it.id)) continue
      const it_t = tok(it.name)
      // Las abreviaturas del ticket coinciden por el principio de la palabra ('SEMI' con 'semidesnatada')
      const hits = lt.filter((w) => it_t.some((x) => x.startsWith(w) || w.startsWith(x))).length
      const score = hits / Math.max(tok(l.desc).length, 1)
      if (hits && (!best || score > best.score)) best = { it, score }
    }
    if (best && best.score >= 0.4) {
      used.add(best.it.id)
      out.push({ item: best.it, line: l })
    }
  }
  return out
}

// ---------- Foto ----------

/**
 * Limpia la foto para leerla mejor: gris, quita sombras (divide por el fondo difuminado) y sube el contraste.
 * Devuelve un canvas (tesseract lo acepta tal cual).
 */
export async function prepareImage(file) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
  const W = Math.round(bmp.width * scale)
  const H = Math.round(bmp.height * scale)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, W, H)
  // Fondo: la misma foto muy pequeña y vuelta a agrandar (difuminado barato)
  const s = document.createElement('canvas')
  s.width = Math.max(8, Math.round(W / 40))
  s.height = Math.max(8, Math.round(H / 40))
  const sctx = s.getContext('2d')
  sctx.imageSmoothingQuality = 'high'
  sctx.drawImage(c, 0, 0, s.width, s.height)
  const b = document.createElement('canvas')
  b.width = W
  b.height = H
  const bctx = b.getContext('2d', { willReadFrequently: true })
  bctx.imageSmoothingQuality = 'high'
  bctx.drawImage(s, 0, 0, W, H)
  const img = ctx.getImageData(0, 0, W, H)
  const bg = bctx.getImageData(0, 0, W, H).data
  const d = img.data
  const vals = new Uint8ClampedArray(W * H)
  const hist = new Uint32Array(256)
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const gb = 0.299 * bg[i] + 0.587 * bg[i + 1] + 0.114 * bg[i + 2] + 1
    const v = Math.min(255, (g / gb) * 255)
    vals[j] = v
    hist[vals[j]]++
  }
  // Estirar entre el 2 % y el 98 %
  const n = W * H
  let lo = 0
  let hi = 255
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < n * 0.02; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < n * 0.02; hi--);
  const span = Math.max(1, hi - lo)
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = Math.max(0, Math.min(255, ((vals[j] - lo) / span) * 255))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/** Lee el texto de una o varias fotos (catalán y castellano). onProgress(0..1) del conjunto. */
export async function readTicketPages(files, onProgress) {
  const { createWorker } = await import('tesseract.js')
  let done = 0
  const worker = await createWorker(['cat', 'spa'], 1, {
    logger: (m) => m.status === 'recognizing text' && onProgress?.((done + m.progress) / files.length)
  })
  try {
    const texts = []
    for (const f of files) {
      let src = f
      try {
        src = await prepareImage(f)
      } catch {
        /* sin canvas: la foto tal cual */
      }
      const { data } = await worker.recognize(src)
      texts.push(data.text)
      globalThis.__mfTicketText = texts
      done++
    }
    return texts
  } finally {
    await worker.terminate()
  }
}

export async function readTicket(file, onProgress) {
  return (await readTicketPages([file], onProgress))[0]
}
