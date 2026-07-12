// One-off: wipe all cfb_player_reference rows before a full CFB 27 reload.
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

const { count: before } = await sb.from('cfb_player_reference').select('id', { count: 'exact', head: true })
const { error } = await sb.from('cfb_player_reference').delete().neq('team', '___never___')
if (error) { console.error('wipe error:', error.message); process.exit(1) }
const { count: after } = await sb.from('cfb_player_reference').select('id', { count: 'exact', head: true })
console.log(`wiped cfb_player_reference: before=${before} after=${after}`)
