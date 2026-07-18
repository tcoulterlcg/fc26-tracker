// Load national-team squads into player_reference (additive, never destructive).
//
// Why this is separate from load-fc-sofifa.mjs: that loader either wipes the
// whole table or deletes by active_club. Neither works here — national squads
// key on country, not club, so a club-scoped delete matches nothing and the
// 770 internationals who already play in an imported league would be inserted
// a second time under their country.
//
// This script inserts ONLY players whose sofifa_id is absent from the table, so
// a player already carried under his club stays there once. Players from
// leagues we don't import (Primeira Liga, Saudi Pro League, J1, Brasileirão…)
// come in with active_club = country and league = 'International'.
//
// Rollback is a single delete:
//   delete from player_reference where league = 'International'
//
//   node scripts/load-fc-national.mjs scripts/data/fc/fc_sofifa_national_<date>.txt [--dry-run]
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

let envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').replace(/^﻿/, '')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  const m = line.replace(/^﻿/, '').trim().match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const file = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
if (!file) { console.error('Usage: node scripts/load-fc-national.mjs <file> [--dry-run]'); process.exit(1) }

const num = (x) => { const n = parseInt(x, 10); return isNaN(n) ? null : n }
const rows = []
for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
  const t = line.trim(); if (!t) continue
  const p = t.split('|')
  if (p.length < 15) { console.error('bad line:', t.slice(0, 60)); continue }
  rows.push({
    active_club: p[0].trim(), name: p[1].trim(), nationality: p[2].trim(), position: p[3].trim(),
    overall_rating: num(p[4]), potential_rating: num(p[5]), age: num(p[6]),
    pace: num(p[7]), shooting: num(p[8]), passing: num(p[9]),
    dribbling: num(p[10]), defending: num(p[11]), physical: num(p[12]),
    sofifa_id: num(p[13]), league: p[14].trim()
  })
}
const squads = new Set(rows.map(r => r.active_club))
console.log(`parsed ${rows.length} players across ${squads.size} national squads`)

// Pull every existing sofifa_id so the insert can skip players we already carry.
const existing = new Set()
let from = 0
for (;;) {
  const { data, error } = await sb.from('player_reference').select('sofifa_id').range(from, from + 999)
  if (error) { console.error('read err:', error.message); process.exit(1) }
  if (!data.length) break
  data.forEach(r => existing.add(Number(r.sofifa_id)))
  from += 1000
  if (data.length < 1000) break
}

const fresh = rows.filter(r => !existing.has(r.sofifa_id))
const skipped = rows.length - fresh.length
console.log(`already in player_reference : ${skipped} (left untouched under their clubs)`)
console.log(`new, will insert            : ${fresh.length}`)

const byCountry = {}
fresh.forEach(r => { byCountry[r.active_club] = (byCountry[r.active_club] || 0) + 1 })
console.log('\nnew players per squad:')
Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`))

if (dryRun) { console.log('\n--dry-run: nothing written'); process.exit(0) }

let inserted = 0
for (let i = 0; i < fresh.length; i += 500) {
  const chunk = fresh.slice(i, i + 500)
  const { error } = await sb.from('player_reference').insert(chunk)
  if (error) { console.error('insert err:', error.message); process.exit(1) }
  inserted += chunk.length
}
const { count: after } = await sb.from('player_reference').select('id', { count: 'exact', head: true })
console.log(`\nload-fc-national -> inserted ${inserted}, skipped ${skipped} dupes, table now ${after}`)
