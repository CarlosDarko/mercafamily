// Pequeños efectos: confeti al completar el carro o terminar la compra, y una vibración corta al marcar.
// Nada se mueve si el móvil pide menos movimiento.

const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const COLORS = ['--c-tomate', '--c-limon', '--c-huerta', '--c-mar', '--c-dulce', '--c-uva', '--c-horno']

export function confetti({ count = 90, from = null } = {}) {
  if (still() || typeof document === 'undefined') return
  const box = document.createElement('div')
  box.className = 'confetti'
  box.setAttribute('aria-hidden', 'true')
  const css = getComputedStyle(document.documentElement)
  const W = innerWidth
  const H = innerHeight
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i')
    p.style.background = css.getPropertyValue(COLORS[i % COLORS.length]).trim() || '#f3cd4b'
    const x0 = from ? from.x : Math.random() * W
    const y0 = from ? from.y : -20
    p.style.left = `${x0}px`
    p.style.top = `${y0}px`
    if (i % 3 === 0) p.style.borderRadius = '50%'
    box.append(p)
    const dx = from ? (Math.random() - 0.5) * W * 0.9 : (Math.random() - 0.5) * 160
    const up = from ? -(H * 0.25 + Math.random() * H * 0.3) : 0
    const fall = H * (0.7 + Math.random() * 0.5)
    const rot = (Math.random() - 0.5) * 1080
    const dur = 1400 + Math.random() * 1300
    p.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.6}px, ${up}px) rotate(${rot * 0.4}deg)`, opacity: 1, offset: from ? 0.3 : 0.1 },
        { transform: `translate(${dx}px, ${fall}px) rotate(${rot}deg)`, opacity: 0 }
      ],
      { duration: dur, delay: Math.random() * 200, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards' }
    )
  }
  document.body.append(box)
  setTimeout(() => box.remove(), 3200)
}

export function tick() {
  try {
    navigator.vibrate?.(12)
  } catch {
    /* sin vibración */
  }
}
