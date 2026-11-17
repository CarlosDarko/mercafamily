// Avisos push en este móvil: permiso, suscripción y preferencias (se guardan en Supabase, tabla push_subs)

export const DEFAULT_PUSH_PREFS = {
  added: true, // alguien apunta algo
  trips: true, // alguien termina la compra
  budget: true, // os pasáis del presupuesto
  summary: true, // resumen del domingo
  summaryTime: '19:00',
  work: { on: false, time: '18:30', days: [1, 2, 3, 4, 5], list_id: null }
}

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

function keyToBytes(key) {
  const pad = '='.repeat((4 - (key.length % 4)) % 4)
  const raw = atob((key + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  return reg ? reg.pushManager.getSubscription() : null
}

export async function subscribe(functionUrl) {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('permiso')
  const reg = (await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)) || (await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }))
  await navigator.serviceWorker.ready
  const { publicKey } = await (await fetch(functionUrl)).json()
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) })
}
