// TeamCrafters CFB roster scraper — paste into the browser console while on any
// teamcrafters.net page (same-origin), then download the buffer and load with:
//   node scripts/db.mjs load-cfb scripts/data/cfb/cfb27_all.txt
//
// Each roster page server-renders a <table> of the full team (name in
// .font-semibold, a .text-xs meta row of spans for pos/#jersey/size/class/
// archetype, then 11 numeric cells: OVR, Dev, NIL, SPD, STR, AGI, ACC, COD,
// INJ, STA, AWR). We fetch every team's HTML same-origin and parse in-page —
// no navigation needed. Output is pipe-delimited to match load-cfb:
//   team|name|pos|jersey|height|weight|class|archetype|ovr|dev|spd|str|agi|acc|cod|inj|sta|awr
//
// Update ROSTER_PATH for each new drop (find it via the "View CFB 27 Ratings"
// link on the homepage, e.g. /rosters/CFB27/launch-6-30-26).
const ROSTER_PATH = '/rosters/CFB27/launch-6-30-26'

function parseTeam(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const team = (doc.querySelector('title')?.textContent || '').split(/ CFB 27/)[0].trim()
  const rows = [...doc.querySelectorAll('table tr')].slice(1)
  const out = []
  for (const tr of rows) {
    const c = [...tr.children]
    if (c.length < 12) continue
    const cell = c[0]
    const name = (cell.querySelector('.font-semibold')?.textContent || '').trim().replace(/[*†#]+$/, '').trim()
    if (!name) continue
    const meta = cell.querySelector('.text-xs')
    let pos = '', jersey = '', height = '', weight = '', cls = '', arch = ''
    if (meta) {
      pos = (meta.querySelector('.bg-surface-hover')?.textContent || '').trim()
      const spans = [...meta.querySelectorAll(':scope > span')].map(s => s.textContent.trim()).filter(t => t && t !== '•')
      const rest = spans.filter(t => t !== pos)
      const js = rest.find(t => /^#\d/.test(t)); if (js) jersey = js.replace(/^#/, '')
      const sz = rest.find(t => /lbs/i.test(t)); if (sz) { const m = sz.match(/(\d+'\d+\"?)\s*(\d+)\s*lbs/i); if (m) { height = m[1].replace(/"?$/, '"'); weight = m[2] } }
      const leftovers = rest.filter(t => !/^#\d/.test(t) && !/lbs/i.test(t))
      const clsRaw = leftovers.find(t => /^(FR|SO|JR|SR|GR)(RS)?$/i.test(t)) || ''
      cls = (clsRaw.match(/^(FR|SO|JR|SR|GR)/i) || [''])[0].toUpperCase()
      arch = leftovers.filter(t => t !== clsRaw).join(' ').trim()
    }
    const num = i => (c[i]?.textContent || '').trim().replace(/[^0-9]/g, '')
    out.push([team, name, pos, jersey, height, weight, cls, arch, num(1), (c[2]?.textContent || '').trim(),
      num(4), num(5), num(6), num(7), num(8), num(9), num(10), num(11)].join('|'))
  }
  return out
}

async function scrapeAll(conc = 6) {
  const idoc = new DOMParser().parseFromString(await (await fetch(ROSTER_PATH)).text(), 'text/html')
  const seen = new Set(), teams = []
  for (const a of idoc.querySelectorAll(`a[href*="${ROSTER_PATH}/"]`)) {
    const m = a.getAttribute('href').match(/\/(\d+)$/); if (m && !seen.has(m[1])) { seen.add(m[1]); teams.push(m[1]) }
  }
  const lines = []; let i = 0
  await Promise.all(Array.from({ length: conc }, async () => {
    while (i < teams.length) { const id = teams[i++]; lines.push(...parseTeam(await (await fetch(ROSTER_PATH + '/' + id)).text())) }
  }))
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cfb27_all.txt'; a.click()
  console.log('teams', teams.length, 'players', lines.length)
}
scrapeAll()
