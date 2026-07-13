// Retroactively reconstruct missing Transfer Out entries: any player on the
// club's reference roster who is absent from the franchise roster (and has no
// existing transfer row) is assumed removed before logging existed. Inserts an
// Out row with a players-shaped snapshot so Add Back works.
//   node scripts/retro-transfers.mjs "Queens Park Rangers"
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

const clubName = process.argv[2]
if (!clubName) { console.error('Usage: node scripts/retro-transfers.mjs "<club name>"'); process.exit(1) }

const { data: frs } = await sb.from('franchises').select('id, club_name, current_season, game').eq('club_name', clubName).eq('game', 'EA FC 26')
if (!frs || frs.length !== 1) { console.error('Need exactly one FC franchise named', clubName, '- found', frs ? frs.length : 0); process.exit(1) }
const fr = frs[0]

const { data: refRoster } = await sb.from('player_reference').select('*').eq('active_club', clubName)
const { data: current } = await sb.from('players').select('name').eq('franchise_id', fr.id)
const { data: existing } = await sb.from('transfer_history').select('player_name').eq('franchise_id', fr.id)
const have = new Set((current || []).map(p => p.name.toLowerCase()))
const logged = new Set((existing || []).map(t => t.player_name.toLowerCase()))

let added = 0
for (const p of (refRoster || [])) {
  if (have.has(p.name.toLowerCase()) || logged.has(p.name.toLowerCase())) continue
  const snapshot = {
    name: p.name, position: p.position, age: p.age, overall_rating: p.overall_rating,
    potential_rating: p.potential_rating, pace: p.pace, shooting: p.shooting, passing: p.passing,
    dribbling: p.dribbling, defending: p.defending, physical: p.physical,
    nationality: p.nationality, active_club: p.active_club,
  }
  const { error } = await sb.from('transfer_history').insert({
    franchise_id: fr.id, season: fr.current_season, player_name: p.name,
    transfer_type: 'Out', from_club: clubName, to_club: null,
    player_snapshot: snapshot,
  })
  if (error) { console.error('insert err', p.name, error.message); continue }
  console.log('LOGGED Out (reconstructed):', p.name, p.overall_rating)
  added++
}
console.log('retro-transfers ->', added, 'reconstructed Out entries for', clubName)
