// Self-review enforcement: every franchise roster must (a) come from exactly
// its own team, (b) have <100 players (CFB=85, FC squad sizes ~25-35), and
// (c) carry full attributes. Any franchise failing a check is rebuilt from its
// reference team via exact match. Works by franchise ID so duplicates and
// other-account franchises get fixed too.
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

const { data: franchises } = await sb.from('franchises').select('id, club_name, game')
for (const f of (franchises || [])) {
  if (f.game !== 'EA CFB 27' && f.game !== 'EA FC 26') continue
  const isCfb = f.game === 'EA CFB 27'
  const table = isCfb ? 'cfb_player_reference' : 'player_reference'
  const col = isCfb ? 'team' : 'active_club'
  const attrCol = isCfb ? 'speed' : 'pace'

  const { count: total } = await sb.from('players').select('id', { count: 'exact', head: true }).eq('franchise_id', f.id)
  const { count: withAttr } = await sb.from('players').select('id', { count: 'exact', head: true }).eq('franchise_id', f.id).not(attrCol, 'is', null)
  const broken = total > 100 || (total > 0 && withAttr < total * 0.6)
  if (!broken) { console.log(`OK      ${f.club_name} (${total} players)`); continue }

  // exact team match only
  const ref = await sb.from(table).select('*').ilike(col, f.club_name)
  if (ref.error || !ref.data.length) { console.log(`SKIP    ${f.club_name}: no exact reference team`); continue }
  const del = await sb.from('players').delete().eq('franchise_id', f.id)
  if (del.error) { console.log(`ERR     ${f.club_name} delete: ${del.error.message}`); continue }
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
  if (ins.error) { console.log(`ERR     ${f.club_name} insert: ${ins.error.message}`); continue }
  console.log(`FIXED   ${f.club_name}: ${total} -> ${rows.length} players (exact team, full attributes)`)
}
