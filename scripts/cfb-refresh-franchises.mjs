// Refresh a CFB franchise's roster from the current cfb_player_reference data
// (e.g. after a new roster drop, or to backfill newly added columns like NIL).
// Replicates the app's handleImportRoster mapping, but deletes the franchise's
// existing players first for a true replace.
//
// SAFE BY DEFAULT: with no args it lists CFB franchises (dry run) and exits.
// Otherwise pass one or more targets:
//   "<franchiseClubName>"                     -> map via team ILIKE %club_name%
//   "<franchiseClubName>::<exactReferenceTeam>" -> map to an exact team
// The exact form is needed for ambiguous names (e.g. "Miami" would otherwise
// match both "Miami (FL)" and "Miami (OH)"). Each club_name must resolve to
// exactly one EA CFB 27 franchise, else it is skipped.
//   node scripts/cfb-refresh-franchises.mjs "Miami::Miami (FL)" "Miami (OH)::Miami (OH)"
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
const { data: all } = await sb.from('franchises').select('id, club_name, game').eq('game', 'EA CFB 27')

if (args.length === 0) {
  console.log('Dry run — current EA CFB 27 franchises (pass "ClubName" or "ClubName::ExactTeam" to refresh):')
  for (const f of all) console.log(`  ${f.club_name}  (${f.id})`)
  process.exit(0)
}

for (const arg of args) {
  const [clubName, exactTeam] = arg.split('::')
  const matches = all.filter(f => f.club_name === clubName)
  if (matches.length !== 1) { console.log(`SKIP "${clubName}": ${matches.length} franchises match that club_name`); continue }
  const f = matches[0]

  const ref = exactTeam
    ? await sb.from('cfb_player_reference').select('*').eq('team', exactTeam)
    : await sb.from('cfb_player_reference').select('*').ilike('team', '%' + clubName + '%')
  const teamsMatched = [...new Set((ref.data || []).map(r => r.team))]
  if (teamsMatched.length !== 1) { console.log(`SKIP "${clubName}": reference matched ${teamsMatched.length} teams (${teamsMatched.join(', ')}) — use ClubName::ExactTeam`); continue }

  const del = await sb.from('players').delete().eq('franchise_id', f.id)
  if (del.error) { console.log(`ERR ${clubName} delete: ${del.error.message}`); continue }
  const rows = ref.data.map(p => ({
    franchise_id: f.id, name: p.player_name, position: p.position, overall_rating: p.overall_rating,
    jersey_number: p.jersey_number, cfb_class: p.class, archetype: p.archetype, dev_trait: p.dev_trait,
    speed: p.speed, strength: p.strength, agility: p.agility, acceleration: p.acceleration,
    change_of_direction: p.change_of_direction, injury: p.injury, stamina: p.stamina,
    awareness: p.awareness, nil_value: p.nil_value,
  }))
  const ins = await sb.from('players').insert(rows)
  if (ins.error) { console.log(`ERR ${clubName} insert: ${ins.error.message}`); continue }
  console.log(`REFRESHED "${clubName}" from team "${teamsMatched[0]}": ${rows.length} players (all with NIL)`)
}
