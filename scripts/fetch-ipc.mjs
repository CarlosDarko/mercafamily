// IPC de 'Alimentos y bebidas no alcohólicas' (INE, índice nacional ECOICOP ver.2), últimos 36 meses.
// Uso: node scripts/fetch-ipc.mjs  -> public/data/ipc.json
import { writeFile } from 'node:fs/promises'

const SERIE = 'IPC290755' // Nacional. Alimentos y bebidas no alcohólicas. Índice
const ANUAL = 'IPC290754' // Nacional. Alimentos y bebidas no alcohólicas. Variación anual
const get = async (code) => {
  const r = await fetch(`https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/${code}?nult=36`)
  if (!r.ok) throw new Error(`INE ${r.status}`)
  return r.json()
}
const [idx, anual] = await Promise.all([get(SERIE), get(ANUAL)])
const month = (x) => `${x.Anyo}-${String(x.FK_Periodo).padStart(2, '0')}`
const data = {
  source: 'INE, Índice de Precios de Consumo (ECOICOP ver.2)',
  serie: idx.Nombre?.trim(),
  updated: new Date().toISOString().slice(0, 10),
  index: idx.Data.map((x) => [month(x), x.Valor]).sort(),
  annual: anual.Data.map((x) => [month(x), x.Valor]).sort()
}
if (data.index.length < 6) throw new Error('Pocos datos del INE, no se sobrescribe')
await writeFile(new URL('../public/data/ipc.json', import.meta.url), JSON.stringify(data))
console.log(`IPC alimentos: ${data.index.length} meses, último ${data.index[data.index.length - 1].join(' = ')}, anual ${data.annual[data.annual.length - 1][1]} %`)
