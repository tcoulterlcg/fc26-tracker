// Refresh a CFB franchise's roster from the current cfb_player_reference data
// (e.g. after a new roster drop, or to backfill newly added columns like NIL).
// Replicates the app's handleImportRoster mapping, but deletes the franchise's
// existing players first for a true replace.
//
// SAFE BY DEFAULT: pass explicit franchise ids as args. With no args it just
// lists CFB franchises (dry run) and exits without writing anything.
//   node scripts/cfb-refresh-franchises.mjs                      # list only
//   node scripts/cfb-refresh-franchises.mjs <franchiseId> [...]  # refresh those
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

const ids = process.argv.slice(2)
const { data: all } = await sb.from('franchises').select('id, club_name, game').eq('game', 'EA CFB 27')

if (ids.length === 0) {
  console.log('Dry run — CFB franchises (pass ids to refresh):')
  for (const f of all) console.log(`  ${f.id}  ${f.club_name}`)
  process.exit(0)
}

for (const id of ids) {
  const f = all.find(x => x.id === id)
  if (!f) { console.log(`SKIP ${id}: not a current EA CFB 27 franchise`); continue }
  const ref = await sb.from('cfb_player_reference').select('*').ilike('team', '%' + f.club_name + '%')
  const matched = [...new Set((ref.data || []).map(r => r.team))]
  if (matched.length !== 1) { console.log(`SKIP ${f.club_name}: matched ${matched.length} teams (${matched.join(', ')})`); continue }

  const del = await sb.from('players').delete().eq('franchise_id', id)
  if (del.error) { console.log(`ERR ${f.club_name} delete: ${del.error.message}`); continue }
  const rows = ref.data.map(p => ({
    franchise_id: id, name: p.player_name, position: p.position, overall_rating: p.overall_rating,
    jersey_number: p.jersey_number, cfb_class: p.class, archetype: p.archetype, dev_trait: p.dev_trait,
    speed: p.speed, strength: p.strength, agility: p.agility, acceleration: p.acceleration,
    change_of_direction: p.change_of_direction, injury: p.injury, stamina: p.stamina,
    awareness: p.awareness, nil_value: p.nil_value,
  }))
  const ins = await sb.from('players').insert(rows)
  if (ins.error) { console.log(`ERR ${f.club_name} insert: ${ins.error.message}`); continue }
  console.log(`REFRESHED ${f.club_name} (team=${matched[0]}): ${rows.length} players`)
}
