// Ticket de papel de Mercadona, en castellano o en catalán: fotos -> texto -> líneas -> productos del catálogo
// El texto se lee con tesseract.js (se descarga solo al usarlo) después de limpiar la foto (sombras y contraste).
import { norm } from './format.js'

const money = (s) => Number(String(s).replace(/\s/g, '').replace(',', '.'))

// Lo que no son productos: cabecera, pie, impuestos y pago (castellano y catalán)
const SKIP = /^(IVA|BASE IMPO|TARJ|TARG|CAMBIO|CANVI|ENTREGAD|LLIURAT|EFECTIV|EFECTIU|IMPORTE|IMPORT\b|SUBTOTAL|DESCRIPCI|FACTURA|OP\b|OP:|TEL|C\.?I\.?F|N\.?I\.?F|MERCADONA|S\.A|AVDA|AVINGUDA|CALLE|CARRER|C\/|SE ADMITEN|S'ADMETEN|DEVOLUC|GRACIES|GRÀCIES|GRACIAS|PARKING|APARCAMENT|VISA|MASTERCARD|AUT\b|N\.C|COMERC|TRANS|LEIDA|LLEGIDA|CONTACTLESS|COPIA|CUOTA|QUOTA|P\. ?UNIT)/i

/** Arregla lo que el lector suele confundir en los importes: '4, 18' -> '4,18', '2.80' -> '2,80' */
function fixRow(r) {
  return r
    .replace(/[|€]/g, ' ')
    // Restos de la cabecera de columnas pegados a la primera línea ('P. Unit', 'Imp. (€)')
    .replace(/\b(P\.?\s*)?Unit\b|\bImp\.\s*\(?[e€]?\)?|\bImp\s*\([e€]\)/gi, ' ')
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
  let paid = null
  let ended = false
  const lines = []
  for (const r of rows) {
    // Lo pagado (tarjeta o 'Import: 215,34 €') es el total más fiable: la tabla de IVA también tiene una línea TOTAL
    const pay = r.match(/^(TARGETA|TARJETA|TARG\.?|IMPORT|IMPORTE|EFECTIU|EFECTIVO)\b[^\d]*?(\d{1,4},\d{2})/i)
    if (pay) {
      paid ??= money(pay[2])
      continue
    }
    const t = r.match(/^T[O0]TAL\b(.*)$/i)
    if (t) {
      // El primer TOTAL es el de la compra: después viene el pie (IVA, pago…), que no son productos
      const nums = t[1].match(/\d{1,4},\d{2}/g)
      if (!ended && nums) total = money(nums[nums.length - 1])
      ended = true
      continue
    }
    if (ended) continue
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
    let q = r.match(/^(\d{1,2}|[Il|i!t\],.])(?:\s+|(?=[A-ZÀ-ÚÇ]{2}))(.+)$/)
    // Sin cantidad leída pero con importe al final, o en mayúsculas ya dentro de los productos: se da por 1
    // (el lector se ha comido el número)
    if (!q && (/\p{L}{3}.*\s\d{1,3},\d{2}$/u.test(r) || (lines.length && /^[^\p{Ll}]*\p{Lu}{3}[^\p{Ll}]*$/u.test(r) && !/\d{5,}/.test(r)))) q = [r, '1', r.replace(/^[^\p{L}]+/u, '')]
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
  const ticketTotal = paid ?? total
  return { total: ticketTotal ?? (sum || null), ticketTotal, lines, sum, date: ticketDate(text) }
}

const letters = (l) => norm(l.desc).replace(/[^a-z]/g, '')
// Dos líneas son la misma (leída en dos fotos) si coinciden el importe (cuando lo hay) y el principio del nombre
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
// Dos líneas son la misma (leída en dos fotos) si el nombre se parece mucho (el lector cambia alguna letra)
// o se parece bastante y el importe coincide
function same(a, b) {
  const x = letters(a).slice(0, 16)
  const y = letters(b).slice(0, 16)
  if (x.length < 3 || y.length < 3) return false
  const sim = 1 - lev(x, y) / Math.max(x.length, y.length)
  const priceOk = a.total != null && b.total != null && Math.abs(a.total - b.total) < 0.005
  return sim >= 0.75 || (priceOk && sim >= 0.5)
}

/**
 * Une el texto de varias fotos de un ticket largo. La foto siguiente suele empezar repitiendo las últimas líneas
 * de la anterior (las fotos se solapan): esas líneas se cuentan una vez y, si una de las dos lecturas no tiene
 * importe o cantidad, se completa con la otra.
 */
export function parsePages(texts) {
  const out = { lines: [], total: null, date: null }
  for (const text of texts) {
    const p = parseTicket(text)
    if (p.ticketTotal != null) out.total = p.ticketTotal
    out.date ??= p.date
    const next = p.lines
    // El mejor solape: las últimas k líneas ya guardadas con las primeras de esta foto (saltando hasta 2 líneas cortadas arriba)
    let bestK = 0
    let bestSkip = 0
    for (let skip = 0; skip <= Math.min(2, next.length); skip++) {
      for (let k = Math.min(out.lines.length, next.length - skip); k > bestK; k--) {
        const tail = out.lines.slice(-k)
        const head = next.slice(skip, skip + k)
        const ok = tail.filter((l, i) => same(l, head[i])).length
        if (ok >= Math.max(2, Math.ceil(k * 0.6))) {
          bestK = k
          bestSkip = skip
          break
        }
      }
    }
    if (bestK) {
      const tail = out.lines.slice(-bestK)
      next.slice(bestSkip, bestSkip + bestK).forEach((l, i) => {
        const o = tail[i]
        if (o.total == null && l.total != null) Object.assign(o, { total: l.total, unit: l.unit, qty: l.qty })
      })
    }
    out.lines.push(...next.slice(bestK ? bestSkip + bestK : 0))
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
  alvocat: 'aguacate', maquinetes: 'maquinillas', form: 'queso', fondre: 'fundir', cong: 'congelada', maionesa: 'mayonesa',
  bolet: 'setas', safata: 'bandeja', castanya: 'castaña', castanyes: 'castañas', condiment: 'condimento', mortadella: 'mortadela',
  olives: 'aceitunas', molt: 'molida', tortilles: 'tortillas', mexicanes: 'mexicanas', nova: '', tendra: 'tierna', sec: 'seco',
  extrafi: 'extrafino', carregada: 'rellena', os: 'hueso', salat: 'salado', carcasses: 'carcasa', espinade: 'espinazo', mans: 'manitas',
  gira: 'girasol', sol: '', tendres: 'tiernos', triturat: 'triturado', clas: 'classic', fresh: 'fresh',
  escombraries: 'basura', tovalloletes: 'toallitas', compreses: 'compresas', bolquers: 'pañales', gos: 'perro', gat: 'gato'
}
// Abreviaturas de dos letras o con barra que van antes de partir en palabras
const PHRASES = [
  [/\bs\/\s*lact\w*/g, ' sin lactosa '],
  [/\bs\/\s*/g, ' sin '],
  [/\bc\/\s*/g, ' con '],
  [/\bm\.\s*cuit/g, ' cocido '],
  [/\bf[.,]\s*semi\b/g, ' queso semicurado '],
  [/\bf[.,]\s*/g, ' queso '],
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

// ¿Dos precios iguales salvo una cifra? (mismo número de cifras)
function oneDigitOff(a, b) {
  const x = a.toFixed(2)
  const y = b.toFixed(2)
  if (x.length !== y.length || x === y) return false
  const pairs = ['17', '56', '08', '38', '68', '09', '39', '14', '06']
  let d = 0
  let likely = false
  for (let i = 0; i < x.length; i++)
    if (x[i] !== y[i]) {
      d++
      likely = pairs.includes(x[i] + y[i]) || pairs.includes(y[i] + x[i])
    }
  return d === 1 && likely
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
      // Mismo precio y el nombre algo parecido (un precio redondo como 1,00 € lo comparten muchos productos)
      const byPrice = l.unit != null ? found.find((r) => Math.abs(r.p.p - l.unit) < 0.006 && overlap(r.p.n, q) >= 0.5) : null
      if (byPrice) {
        usedPrice.add(i)
        return { ...l, q, p: byPrice.p, sure: true }
      }
      // '2 SPRITE 0,69': con cantidad y un solo número, ese número es el precio por unidad
      if (l.qty > 1 && l.total != null) {
        const u = found.find((r) => Math.abs(r.p.p - l.total) < 0.006 && overlap(r.p.n, q) >= 0.5)
        if (u) return { ...l, q, p: u.p, unit: u.p.p, total: Math.round(u.p.p * l.qty * 100) / 100, sure: true }
      }
      // Una cifra mal leída ('2,16' por '2,76'): mismo producto con el precio a una cifra de distancia
      const v = l.total != null && l.qty === 1 ? l.total : null
      if (v != null && overlap(found[0]?.p.n || '', q) >= 0.8) {
        const fix = found.slice(0, 8).find((r) => oneDigitOff(r.p.p, v))
        if (fix) return { ...l, q, p: fix.p, unit: fix.p.p, total: fix.p.p, sure: true, fixedPrice: true }
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
    // Con todas las palabras del ticket en el nombre (carne y pescado al peso, precios que cambian): es ese, con el precio del ticket
    if (top && l.total != null && overlap(top.n, q) === 1 && q.split(' ').filter((w) => w.length > 2).length >= 2) return { ...l, q, p: top, sure: true }
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

// ---------- Columnas ----------

const PRICE_RE = /\d+\s*[,.]\s*\d{2}/

/**
 * En los tickets de Mercadona el importe va en su columna, medio renglón por debajo del nombre.
 * Se leen las dos columnas por separado ({ t, y } con la altura del centro de cada línea) y se une cada importe
 * con su nombre: primero se calcula el desfase que mejor encaja en esa foto y luego cada importe va a la línea más cercana.
 */
export function alignColumns(left, right) {
  const L = left.filter((l) => l.t && /\p{L}{2}/u.test(l.t)).sort((a, b) => a.y - b.y)
  const R = right.filter((r) => PRICE_RE.test(r.t)).sort((a, b) => a.y - b.y)
  if (!L.length) return ''
  const gaps = L.slice(1).map((l, i) => l.y - L[i].y).filter((g) => g > 0).sort((a, b) => a - b)
  const row = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 60
  const nums = (r) => (r.t.match(/\d+\s*[,.]\s*\d{2}/g) || []).map((n) => n.replace(/\s/g, '').replace('.', ','))
  const isHead = (l) => /^(descripci|mercadona|factura|tel|ct |c\/|\d{5} )/i.test(l.t)

  // Emparejado en orden: cada importe a una línea distinta, de arriba abajo, con la posición del importe pasada a la
  // de los nombres con y' = a·y + b (la foto suele estar algo inclinada y el desfase cambia de arriba abajo)
  const run = (a, b) => {
    const n = L.length
    const m = R.length
    const DROP = row * 0.6
    const cost = (i, j) => {
      const d = Math.abs(a * R[j].y + b - L[i].y)
      return (d > row * 0.75 ? row * 3 : d) + (isHead(L[i]) ? row : 0)
    }
    const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity))
    const back = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1))
    dp[0][0] = 0
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= m; j++) {
        if (i === 0 && j === 0) continue
        let best = Infinity
        let how = 0
        if (i > 0 && dp[i - 1][j] < best) (best = dp[i - 1][j]), (how = 1) // línea sin importe
        if (j > 0 && dp[i][j - 1] + DROP < best) (best = dp[i][j - 1] + DROP), (how = 2) // importe que no es de ninguna
        if (i > 0 && j > 0 && dp[i - 1][j - 1] + cost(i - 1, j - 1) < best) (best = dp[i - 1][j - 1] + cost(i - 1, j - 1)), (how = 3)
        dp[i][j] = best
        back[i][j] = how
      }
    }
    const pairs = []
    let i = n
    let j = m
    while (i > 0 || j > 0) {
      const h = back[i][j]
      if (h === 3) pairs.push([i - 1, j - 1]), i--, j--
      else if (h === 2) j--
      else i--
    }
    pairs.reverse()
    // Lo que cuadra: 'cantidad × unitario = importe'
    let fit = 0
    for (const [li, rj] of pairs) {
      const q = L[li].t.match(/^(\d{1,2})\s/)
      const v = nums(R[rj]).map((x) => Number(x.replace(',', '.')))
      if (q && Number(q[1]) > 1 && v.length >= 2 && Math.abs(Number(q[1]) * v[v.length - 2] - v[v.length - 1]) < 0.03) fit++
    }
    return { total: dp[n][m] - fit * row * 0.5, pairs }
  }
  // 1) Desfase de partida: el que mejor encaja (con a = 1)
  let best = null
  for (let o = -row * 1.2; o <= row * 1.2; o += Math.max(1, row / 24)) {
    const r = run(1, -o)
    if (!best || r.total < best.total) best = { ...r, a: 1, b: -o }
  }
  // 2) Afinar con una recta ajustada a lo emparejado (dos vueltas)
  for (let k = 0; k < 2 && best.pairs.length >= 4; k++) {
    const xs = best.pairs.map(([, j]) => R[j].y)
    const ys = best.pairs.map(([i]) => L[i].y)
    const mx = xs.reduce((s, v) => s + v, 0) / xs.length
    const my = ys.reduce((s, v) => s + v, 0) / ys.length
    const sxx = xs.reduce((s, v) => s + (v - mx) ** 2, 0)
    if (!sxx) break
    const a = Math.min(1.1, Math.max(0.9, xs.reduce((s, v, t) => s + (v - mx) * (ys[t] - my), 0) / sxx))
    const b = my - a * mx
    const r = run(a, b)
    if (r.total <= best.total) best = { ...r, a, b }
    else break
  }
  const prices = new Map(best.pairs.map(([i, j]) => [i, nums(R[j])]))
  return L.map((l, i) => [l.t.replace(/\s+\d+\s*[,.]\s*\d{2}\S*\s*$/, ''), ...(prices.get(i) || [])].join(' ')).join('\n')
}

/** Junta dos lecturas de la columna de importes: lo que está en las dos vale una vez y se añade lo que solo vio una */
export function mergeReads(a, b) {
  const has = (l) => PRICE_RE.test(l.t)
  const A = a.filter(has)
  const B = b.filter(has)
  const ys = A.map((l) => l.y).sort((p, q) => p - q)
  const gaps = ys.slice(1).map((y, i) => y - ys[i]).filter((g) => g > 5).sort((p, q) => p - q)
  const row = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 60
  const out = [...A]
  for (const l of B) if (!A.some((x) => Math.abs(x.y - l.y) < row * 0.45)) out.push(l)
  return out.sort((p, q) => p.y - q.y)
}

// ---------- Foto ----------

/**
 * Limpia la foto para leerla mejor: gris, quita sombras (divide por el fondo difuminado) y sube el contraste.
 * Devuelve un canvas (tesseract lo acepta tal cual).
 */
export async function prepareImage(file) {
  const bmp = await createImageBitmap(file)
  // Por ancho: en un ticket largo la letra no puede quedar diminuta (hasta 7000 px de alto)
  const scale = Math.min(1, 1800 / bmp.width, 7000 / bmp.height)
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
  // Dónde está el texto a lo ancho (para partir nombres e importes aunque el ticket no ocupe toda la foto)
  const cols = new Uint32Array(W)
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4] < 110) cols[x]++
  const total = cols.reduce((a, b) => a + b, 0)
  let acc = 0
  let x0 = 0
  let x1 = W - 1
  for (let x = 0; x < W; x++) if ((acc += cols[x]) > total * 0.02) { x0 = x; break }
  acc = 0
  for (let x = W - 1; x >= 0; x--) if ((acc += cols[x]) > total * 0.02) { x1 = x; break }
  c.textX0 = x0
  c.textX1 = x1
  return c
}

/**
 * Lee el texto de una o varias fotos (catalán y castellano). onProgress(0..1) del conjunto.
 * Cada foto se lee en dos pasadas: la columna de nombres y la de importes, y luego se unen por altura.
 */
export async function readTicketPages(files, onProgress) {
  const { createWorker } = await import('tesseract.js')
  let done = 0
  const steps = files.length * 2
  const worker = await createWorker(['cat', 'spa'], 1, {
    logger: (m) => m.status === 'recognizing text' && onProgress?.((done + m.progress) / steps)
  })
  const linesOf = (data) => (data.blocks || []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines)).map((l) => ({ t: l.text.trim(), y: (l.bbox.y0 + l.bbox.y1) / 2 }))
  try {
    const texts = []
    for (const f of files) {
      let c = null
      try {
        c = await prepareImage(f)
      } catch {
        /* sin canvas: la foto tal cual, en una pasada */
      }
      if (!c) {
        const { data } = await worker.recognize(f)
        texts.push(data.text)
        done += 2
        continue
      }
      const W = c.width
      const H = c.height
      const split = Math.round(c.textX0 + (c.textX1 - c.textX0) * 0.64)
      await worker.setParameters({ tessedit_pageseg_mode: '4' })
      const left = await worker.recognize(c, { rectangle: { left: 0, top: 0, width: split, height: H } }, { blocks: true })
      done++
      // Importes: dos lecturas (texto disperso y bloque) que ven cifras distintas, combinadas por altura
      const rect = { rectangle: { left: split, top: 0, width: W - split, height: H } }
      await worker.setParameters({ tessedit_pageseg_mode: '11' })
      const r11 = linesOf((await worker.recognize(c, rect, { blocks: true })).data)
      await worker.setParameters({ tessedit_pageseg_mode: '6' })
      const r6 = linesOf((await worker.recognize(c, rect, { blocks: true })).data)
      done++
      texts.push(alignColumns(linesOf(left.data), mergeReads(r11, r6)))
      globalThis.__mfTicketText = texts
    }
    return texts
  } finally {
    await worker.terminate()
  }
}

export async function readTicket(file, onProgress) {
  return (await readTicketPages([file], onProgress))[0]
}
