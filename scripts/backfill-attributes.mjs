// Non-destructive attribute backfill: for every FC franchise player missing
// attributes, copy pace..physical (+potential/age/nationality when absent)
// from player_reference matched by exact name — any club, so manually signed
// players (transfers) are covered too. Never deletes or replaces rows.
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
  if (f.game !== 'EA FC 26') continue
  const { data: all } = await sb.from('players')
    .select('id, name, overall_rating, pace, value_eur')
    .eq('franchise_id', f.id)
  const missing = (all || []).filter(p => p.pace == null || p.value_eur == null)
  if (!missing || !missing.length) { console.log(`OK        ${f.club_name}: no players missing attributes`); continue }

  let fixed = 0, unmatched = []
  for (const p of missing) {
    const { data: refs } = await sb.from('player_reference').select('*').ilike('name', p.name)
    if (!refs || !refs.length) { unmatched.push(p.name); continue }
    // Prefer the reference row closest in overall (same-name collisions).
    let ref = refs[0]
    if (p.overall_rating != null && refs.length > 1) {
      ref = refs.reduce((a, b) => Math.abs((b.overall_rating || 0) - p.overall_rating) < Math.abs((a.overall_rating || 0) - p.overall_rating) ? b : a)
    }
    const { error } = await sb.from('players').update({
      pace: ref.pace, shooting: ref.shooting, passing: ref.passing,
      dribbling: ref.dribbling, defending: ref.defending, physical: ref.physical,
      potential_rating: ref.potential_rating, age: ref.age, nationality: ref.nationality,
      value_eur: ref.value_eur, wage_eur_wk: ref.wage_eur_wk, wage: ref.wage_eur_wk,
    }).eq('id', p.id)
    if (!error) fixed++
  }
  console.log(`BACKFILL  ${f.club_name}: ${fixed}/${missing.length} players filled${unmatched.length ? ' — unmatched: ' + unmatched.join(', ') : ''}`)
}
