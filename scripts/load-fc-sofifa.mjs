// Load FC player_reference from a sofifa scrape (live roster update).
// File lines: team|name|nat|pos|ovr|pot|age|pac|sho|pas|dri|def|phy|sofifaId|league
// Default: FULL REPLACE (wipes player_reference and reloads — use when the
// scrape covers every league we carry).
// --append: only replaces the clubs present in the file (use when adding new
// leagues without touching the rest).
//   node scripts/load-fc-sofifa.mjs scripts/data/fc/fc_sofifa_<date>.txt [--append]
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

const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/load-fc-sofifa.mjs <file>'); process.exit(1) }
const text = readFileSync(file, 'utf8')
const num = (x) => { const n = parseInt(x, 10); return isNaN(n) ? null : n }
const rows = []
for (const line of text.split(/\r?\n/)) {
  const t = line.trim(); if (!t) continue
  const p = t.split('|'); if (p.length < 15) { console.error('bad line:', t.slice(0, 60)); continue }
  rows.push({
    active_club: p[0].trim(), name: p[1].trim(), nationality: p[2].trim(), position: p[3].trim(),
    overall_rating: num(p[4]), potential_rating: num(p[5]), age: num(p[6]),
    pace: num(p[7]), shooting: num(p[8]), passing: num(p[9]),
    dribbling: num(p[10]), defending: num(p[11]), physical: num(p[12]),
    sofifa_id: num(p[13]), league: p[14].trim()
  })
}
console.log('parsed', rows.length, 'rows across', new Set(rows.map(r => r.active_club)).size, 'clubs,', new Set(rows.map(r => r.league)).size, 'leagues')

const append = process.argv.includes('--append')
const { count: before } = await sb.from('player_reference').select('id', { count: 'exact', head: true })
if (append) {
  const clubs = [...new Set(rows.map(r => r.active_club))]
  for (const club of clubs) {
    const { error } = await sb.from('player_reference').delete().eq('active_club', club)
    if (error) { console.error('club delete err:', club, error.message); process.exit(1) }
  }
  console.log('append mode: replaced', clubs.length, 'clubs only')
} else {
  const { error: delErr } = await sb.from('player_reference').delete().neq('name', '___never___')
  if (delErr) { console.error('wipe err:', delErr.message); process.exit(1) }
}
let inserted = 0
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500)
  const { error } = await sb.from('player_reference').insert(chunk)
  if (error) { console.error('insert err:', error.message); process.exit(1) }
  inserted += chunk.length
}
console.log(`load-fc-sofifa -> wiped ${before}, inserted ${inserted}`)
