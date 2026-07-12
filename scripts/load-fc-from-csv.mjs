// Load FC player_reference rows for whole leagues from eafc26.csv (sofifa-style
// FC 26 export). The CSV already carries overall, potential, positions, age,
// nationality and the 6 summary attributes, so no separate enrichment is needed.
//
//   node scripts/load-fc-from-csv.mjs --leagues "Ligue 1,La Liga" --preview
//   node scripts/load-fc-from-csv.mjs --leagues "Ligue 1,La Liga,Bundesliga" [--replace]
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

function parseCsvLine(line) {
  const out = []; let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false } else cur += c }
    else { if (c === '"') inQ = true; else if (c === ',') { out.push(cur); cur = '' } else cur += c }
  }
  out.push(cur); return out
}
// Build EA's common display name. short_name is EA's display form but often
// abbreviates the first name ("O. Dembélé", "A. Hakimi"); long_name has the full
// (sometimes messy / native-script) legal name. So: take the surname from
// short_name and expand the leading initial using the long_name token that
// starts with the same letter (handles cases where long_name's first token is
// a different/garbled given name). Fall back sensibly when there is no initial.
const stripLatin = s => (s || '').normalize('NFC').replace(/[^A-Za-zÀ-ɏḀ-ỿ .'\-]/g, '').replace(/\s+/g, ' ').trim()
function cleanName(long, short) {
  const s = stripLatin(short), l = stripLatin(long)
  const m = s.match(/^([A-Za-z])\.\s*(.+)$/)
  if (m) {
    const initial = m[1].toUpperCase(), rest = m[2].trim()
    const first = l.split(' ').filter(Boolean).find(t => t[0] && t[0].toUpperCase() === initial)
    return first ? (first + ' ' + rest).trim() : (rest || s)
  }
  return s || l
}
const numI = x => { const n = parseFloat(x); return isNaN(n) ? null : Math.round(n) }

const flagVal = name => (process.argv.find(a => a.startsWith(name + '='))?.split('=')[1])
  || (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : '')
const leagues = new Set(flagVal('--leagues').split(',').map(s => s.trim()).filter(Boolean))
// --league-ids disambiguates names shared across countries (e.g. "Bundesliga"
// is both German id 19 and Austrian id 80).
const leagueIds = new Set(flagVal('--league-ids').split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n)))
const preview = process.argv.includes('--preview')
const replace = process.argv.includes('--replace')
if (!leagues.size && !leagueIds.size) { console.error('Pass --leagues "Ligue 1,La Liga" and/or --league-ids "19"'); process.exit(1) }

const text = readFileSync(new URL('../scripts/data/eafc26.csv', import.meta.url), 'utf8')
const lines = text.split(/\r?\n/)
const H = {}; parseCsvLine(lines[0]).forEach((h, i) => { H[h.trim()] = i })
const col = (f, name) => f[H[name]]

const rows = []
for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue
  const f = parseCsvLine(lines[i])
  const lname = (col(f, 'league_name') || '').trim()
  const lid = parseInt(col(f, 'league_id'), 10)
  if (!leagues.has(lname) && !leagueIds.has(lid)) continue
  rows.push({
    name: cleanName(col(f, 'long_name'), col(f, 'short_name')),
    position: (col(f, 'player_positions') || '').split(',')[0].trim() || null,
    age: numI(col(f, 'age')),
    overall_rating: numI(col(f, 'overall')),
    potential_rating: numI(col(f, 'potential')),
    nationality: (col(f, 'nationality_name') || '').trim() || null,
    active_club: (col(f, 'club_name') || '').trim(),
    pace: numI(col(f, 'pace')), shooting: numI(col(f, 'shooting')), passing: numI(col(f, 'passing')),
    dribbling: numI(col(f, 'dribbling')), defending: numI(col(f, 'defending')), physical: numI(col(f, 'physic')),
  })
}
const clubs = [...new Set(rows.map(r => r.active_club))]
console.log(`Parsed ${rows.length} players across ${clubs.length} clubs in leagues: ${[...leagues].join(', ')}`)

if (preview) {
  const psg = rows.filter(r => /paris saint/i.test(r.active_club)).slice(0, 8)
  console.log('Clubs:', clubs.sort().join(', '))
  console.log('PSG sample:')
  for (const p of psg) console.log(`  ${p.name} | ${p.position} | OVR ${p.overall_rating} POT ${p.potential_rating} | ${p.nationality} | pac${p.pace} sho${p.shooting} pas${p.passing} dri${p.dribbling} def${p.defending} phy${p.physical}`)
  process.exit(0)
}

if (replace) {
  for (const club of clubs) {
    const { error } = await sb.from('player_reference').delete().eq('active_club', club)
    if (error) { console.error('delete err', club, error.message); process.exit(1) }
  }
}
// De-dupe against existing (active_club+name) so re-runs are safe.
const existing = new Set()
for (const club of clubs) {
  const { data, error } = await sb.from('player_reference').select('name').eq('active_club', club)
  if (error) { console.error('existing err', club, error.message); process.exit(1) }
  for (const d of data) existing.add(club + '||' + d.name)
}
const fresh = rows.filter(r => !existing.has(r.active_club + '||' + r.name))
let inserted = 0
for (let i = 0; i < fresh.length; i += 200) {
  const chunk = fresh.slice(i, i + 200)
  const { error } = await sb.from('player_reference').insert(chunk)
  if (error) { console.error('insert err', error.message); process.exit(1) }
  inserted += chunk.length
}
console.log(`load-fc-from-csv -> inserted ${inserted}, skipped-existing ${rows.length - fresh.length}, of ${rows.length} across ${clubs.length} clubs`)
