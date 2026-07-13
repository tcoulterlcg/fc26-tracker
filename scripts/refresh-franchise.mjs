// Refresh any franchise's roster (FC or CFB) from reference data, replacing the
// existing players. Mirrors the app's exact-match-first resolution.
//   node scripts/refresh-franchise.mjs                         # dry-run list
//   node scripts/refresh-franchise.mjs "Tennessee"            # exact club match
//   node scripts/refresh-franchise.mjs "Miami::Miami (FL)"    # explicit ref team
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

const args = process.argv.slice(2)
const { data: all } = await sb.from('franchises').select('id, club_name, game, league')
if (!args.length) {
  console.log('Dry run — franchises:')
  for (const f of all) console.log(`  [${f.game}] ${f.club_name} (league=${f.league})`)
  process.exit(0)
}

for (const arg of args) {
  const [clubName, exactTeam] = arg.split('::')
  const matches = all.filter(f => f.club_name === clubName)
  if (matches.length !== 1) { console.log(`SKIP "${clubName}": ${matches.length} franchises match`); continue }
  const f = matches[0]
  const isCfb = f.game === 'EA CFB 27'
  const table = isCfb ? 'cfb_player_reference' : 'player_reference'
  const col = isCfb ? 'team' : 'active_club'

  let ref
  if (exactTeam) ref = await sb.from(table).select('*').eq(col, exactTeam)
  else {
    ref = await sb.from(table).select('*').ilike(col, clubName) // exact (case-insensitive)
    if (!ref.error && ref.data.length === 0) ref = await sb.from(table).select('*').ilike(col, '%' + clubName + '%')
  }
  const teams = [...new Set((ref.data || []).map(r => r[col]))]
  if (teams.length !== 1) { console.log(`SKIP "${clubName}": reference matched ${teams.length} teams (${teams.join(', ')}) — use ClubName::ExactTeam`); continue }

  const del = await sb.from('players').delete().eq('franchise_id', f.id)
  if (del.error) { console.log(`ERR ${clubName} delete: ${del.error.message}`); continue }
  const rows = ref.data.map(p => isCfb ? {
    franchise_id: f.id, name: p.player_name, position: p.position, overall_rating: p.overall_rating,
    jersey_number: p.jersey_number, cfb_class: p.class, archetype: p.archetype, dev_trait: p.dev_trait,
    speed: p.speed, strength: p.strength, agility: p.agility, acceleration: p.acceleration,
    change_of_direction: p.change_of_direction, injury: p.injury, stamina: p.stamina,
    awareness: p.awareness, nil_value: p.nil_value,
  } : {
    franchise_id: f.id, name: p.name, position: p.position, age: p.age, overall_rating: p.overall_rating,
    potential_rating: p.potential_rating, pace: p.pace, shooting: p.shooting, passing: p.passing,
    dribbling: p.dribbling, defending: p.defending, physical: p.physical, nationality: p.nationality,
    active_club: p.active_club, contract_years_remaining: null,
  })
  const ins = await sb.from('players').insert(rows)
  if (ins.error) { console.log(`ERR ${clubName} insert: ${ins.error.message}`); continue }
  console.log(`REFRESHED "${clubName}" [${f.game}] from "${teams[0]}": ${rows.length} players`)
}
