// One-off: post-load verification of CFB 27 data quality.
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

const { count } = await sb.from('cfb_player_reference').select('id', { count: 'exact', head: true })
const { data: teams } = await sb.from('cfb_player_reference').select('team')
const distinct = new Set(teams.map(t => t.team))
const woods = await sb.from('cfb_player_reference').select('player_name, team').ilike('player_name', '%peter woods%')
const clem = await sb.from('cfb_player_reference').select('player_name, position, overall_rating, dev_trait, speed, awareness').eq('team', 'Clemson').order('overall_rating', { ascending: false }).limit(3)
const attrNull = await sb.from('cfb_player_reference').select('id', { count: 'exact', head: true }).is('speed', null)
console.log('total rows:', count, ' distinct teams:', distinct.size)
console.log('Peter Woods rows (should be 0):', woods.data?.length ?? 'err', woods.error?.message || '')
console.log('rows missing speed:', attrNull.count)
console.log('Clemson top 3:', JSON.stringify(clem.data))
