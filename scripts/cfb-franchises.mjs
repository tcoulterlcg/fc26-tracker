// Diagnostic: CFB franchises with owner + player count + NIL coverage.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

let envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
envText = envText.replace(/^﻿/, '')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const m = line.replace(/^﻿/, '').trim().match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data: fr, error } = await sb.from('franchises').select('id, club_name, game, user_id')
if (error) { console.error('franchises err:', error.message); process.exit(1) }
for (const f of fr.filter(x => x.game === 'EA CFB 27')) {
  const { count: total } = await sb.from('players').select('id', { count: 'exact', head: true }).eq('franchise_id', f.id)
  const { count: withNil } = await sb.from('players').select('id', { count: 'exact', head: true }).eq('franchise_id', f.id).not('nil_value', 'is', null)
  console.log(`${f.club_name.padEnd(14)} user=${f.user_id.slice(0, 8)} players=${total} withNIL=${withNil}`)
}
