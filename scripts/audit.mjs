// Site-wide data audit: per-franchise attribute coverage + reference coverage.
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

console.log('=== FRANCHISES: attribute coverage ===')
const { data: fr } = await sb.from('franchises').select('id, club_name, game')
for (const f of (fr || [])) {
  const attrCol = f.game === 'EA CFB 27' ? 'speed' : 'pace'
  const { count: total } = await sb.from('players').select('id', { count: 'exact', head: true }).eq('franchise_id', f.id)
  const { count: withAttr } = await sb.from('players').select('id', { count: 'exact', head: true }).eq('franchise_id', f.id).not(attrCol, 'is', null)
  const { count: withPot } = await sb.from('players').select('id', { count: 'exact', head: true }).eq('franchise_id', f.id).not('potential_rating', 'is', null)
  const flag = total > 0 && withAttr < total * 0.7 ? '  <-- MISSING ATTRIBUTES' : ''
  console.log(`  [${f.game}] ${f.club_name.padEnd(22)} players=${String(total).padEnd(4)} withAttr=${String(withAttr).padEnd(4)} withPot=${withPot}${flag}`)
}

console.log('\n=== FC REFERENCE: clubs with attribute gaps ===')
let all = [], from = 0
while (true) {
  const { data } = await sb.from('player_reference').select('active_club, pace, potential_rating').range(from, from + 999)
  all = all.concat(data); if (data.length < 1000) break; from += 1000
}
const clubs = {}
for (const r of all) {
  const c = r.active_club || '(null)'
  clubs[c] = clubs[c] || { n: 0, pace: 0, pot: 0 }
  clubs[c].n++; if (r.pace != null) clubs[c].pace++; if (r.potential_rating != null) clubs[c].pot++
}
let gaps = 0
for (const c of Object.keys(clubs).sort()) {
  const x = clubs[c]
  // GKs legitimately lack pace, so flag only if <60% have attributes
  if (x.pace < x.n * 0.6 || x.pot < x.n * 0.6) { console.log(`  GAP: ${c} n=${x.n} pace=${x.pace} pot=${x.pot}`); gaps++ }
}
console.log(gaps === 0 ? '  (no reference clubs below 60% coverage)' : `  ${gaps} clubs flagged`)
console.log('total FC reference rows:', all.length, 'clubs:', Object.keys(clubs).length)
