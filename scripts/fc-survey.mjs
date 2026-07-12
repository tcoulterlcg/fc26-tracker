// One-off: check FC player_reference club coverage for the requested leagues.
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

async function fetchAll(table, columns) {
  let all = [], from = 0
  const size = 1000
  while (true) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + size - 1)
    if (error) { console.error(error); process.exit(1) }
    all = all.concat(data)
    if (data.length < size) break
    from += size
  }
  return all
}

const rows = await fetchAll('player_reference', 'active_club, potential_rating, pace')
const clubs = {}
for (const r of rows) {
  const c = r.active_club || '(null)'
  if (!clubs[c]) clubs[c] = { n: 0, withPot: 0, withPace: 0 }
  clubs[c].n++
  if (r.potential_rating != null) clubs[c].withPot++
  if (r.pace != null) clubs[c].withPace++
}
const names = Object.keys(clubs).sort()
console.log('TOTAL FC rows:', rows.length, ' distinct clubs:', names.length)
for (const c of names) {
  const x = clubs[c]
  console.log(`${String(x.n).padStart(3)}  pot:${String(x.withPot).padStart(3)}  pace:${String(x.withPace).padStart(3)}  ${c}`)
}
