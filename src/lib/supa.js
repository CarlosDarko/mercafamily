// Supabase: base de datos en la nube con tiempo real. Solo se carga si hay configuración.
import { createClient } from '@supabase/supabase-js'

export function createSupabaseBackend({ url, key }) {
  const sb = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  })
  let hid = null
  let channel = null
  const ok = ({ data, error }) => {
    if (error) throw error
    return data
  }

  async function selectAll(t) {
    const out = []
    for (let from = 0; ; from += 1000) {
      let q = sb.from(t).select('*').range(from, from + 999)
      q = t === 'households' ? q.eq('id', hid) : q.eq('household_id', hid)
      const rows = ok(await q)
      out.push(...rows)
      if (rows.length < 1000) return out
    }
  }

  return {
    kind: 'supabase',
    sb,
    get householdId() {
      return hid
    },
    async user() {
      const { data } = await sb.auth.getSession()
      return data.session?.user ?? null
    },
    onAuth(cb) {
      sb.auth.onAuthStateChange((event) => cb(event))
    },
    async signIn(email, password) {
      ok(await sb.auth.signInWithPassword({ email, password }))
    },
    async signUp(email, password) {
      const data = ok(await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }))
      if (data.session) return
      // Sin sesión: o Supabase pide confirmar el email, o ese email ya existía. Probamos a entrar directamente.
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(/not confirmed/i.test(error.message) ? 'needs-confirm' : error.message)
    },
    async sendCode(email) {
      ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }))
    },
    async verifyCode(email, token) {
      ok(await sb.auth.verifyOtp({ email, token, type: 'email' }))
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async myHousehold() {
      const rows = ok(await sb.from('members').select('household_id, display_name').limit(1))
      if (!rows.length) return null
      hid = rows[0].household_id
      return { id: hid, display_name: rows[0].display_name }
    },
    async createHousehold(name, displayName) {
      const h = ok(await sb.rpc('create_household', { p_name: name, p_display_name: displayName }))
      hid = h.id
    },
    async joinHousehold(code, displayName) {
      const h = ok(await sb.rpc('join_household', { p_code: code.trim().toUpperCase(), p_display_name: displayName }))
      hid = h.id
    },
    async members() {
      return ok(await sb.from('members').select('user_id, display_name').eq('household_id', hid))
    },
    async household() {
      return ok(await sb.from('households').select('*').eq('id', hid).single())
    },
    select: selectAll,
    async upsert(t, rows) {
      const list = [].concat(rows).map((r) => (t === 'households' ? r : { ...r, household_id: hid }))
      for (let i = 0; i < list.length; i += 500) ok(await sb.from(t).upsert(list.slice(i, i + 500)))
    },
    async update(t, id, patch) {
      ok(await sb.from(t).update(patch).eq('id', id))
    },
    async remove(t, ids) {
      ok(await sb.from(t).delete().in('id', [].concat(ids)))
    },
    subscribe(cb) {
      if (channel) sb.removeChannel(channel)
      channel = sb.channel(`hogar-${hid}`)
      for (const t of ['lists', 'items', 'trips', 'trip_items', 'households']) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => cb(t))
      }
      channel.subscribe((status) => cb('status:' + status))
    }
  }
}
