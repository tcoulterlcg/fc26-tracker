// One-off: refresh specific CFB franchises' rosters from the reloaded CFB 27
// reference data. Replicates app handleImportRoster mapping, but deletes the
// franchise's existing (stale CFB 26) players first for a true replace.
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

const targets = [
  { id: 'b0a98fd0-e3d9-4a23-ab87-53c283f476e4', club: 'Clemson' },
  { id: '9933d3b0-8de4-43bf-90e5-5299fc246493', club: 'Florida State' },
]

for (const t of targets) {
  const { count: before } = await sb.from('players').select('id', { count: 'exact', head: true }).eq('franchise_id', t.id)
  const ref = await sb.from('cfb_player_reference').select('*').ilike('team', '%' + t.club + '%')
  if (ref.error || !ref.data.length) { console.log(`SKIP ${t.club}: reference lookup empty (${ref.error?.message||'0 rows'})`); continue }
  // guard: make sure the ILIKE matched exactly one team
  const matchedTeams = [...new Set(ref.data.map(r => r.team))]
  if (matchedTeams.length !== 1) { console.log(`SKIP ${t.club}: matched ${matchedTeams.length} teams (${matchedTeams.join(', ')})`); continue }

  const del = await sb.from('players').delete().eq('franchise_id', t.id)
  if (del.error) { console.log(`ERR ${t.club} delete: ${del.error.message}`); continue }

  const rows = ref.data.map(p => ({
    franchise_id: t.id,
    name: p.player_name,
    position: p.position,
    overall_rating: p.overall_rating,
    jersey_number: p.jersey_number,
    cfb_class: p.class,
    archetype: p.archetype,
    dev_trait: p.dev_trait,
    speed: p.speed,
    strength: p.strength,
    agility: p.agility,
    acceleration: p.acceleration,
    change_of_direction: p.change_of_direction,
    injury: p.injury,
    stamina: p.stamina,
    awareness: p.awareness,
  }))
  const ins = await sb.from('players').insert(rows)
  if (ins.error) { console.log(`ERR ${t.club} insert: ${ins.error.message}`); continue }
  const { count: after } = await sb.from('players').select('id', { count: 'exact', head: true }).eq('franchise_id', t.id)
  console.log(`REFRESHED ${t.club} (team=${matchedTeams[0]}): ${before} -> ${after} players`)
}
