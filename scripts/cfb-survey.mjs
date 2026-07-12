// One-off: survey cfb_player_reference team names + counts to find legacy dupes.
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

const rows = await fetchAll('cfb_player_reference', 'team')
const counts = {}
for (const r of rows) counts[r.team] = (counts[r.team] || 0) + 1
const teams = Object.keys(counts).sort()
console.log('TOTAL rows:', rows.length, ' distinct teams:', teams.length)
for (const t of teams) console.log(String(counts[t]).padStart(4), t)
