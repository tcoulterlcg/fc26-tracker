// EA FC 26 live-roster scraper — paste into the browser console on any
// sofifa.com page (same-origin), then load with:
//   node scripts/load-fc-sofifa.mjs scripts/data/fc/fc_sofifa_<date>.txt
//
// SoFIFA tracks every official FC 26 roster update (page title shows the
// version date, e.g. "FC 26 - Jul 8, 2026"). /players supports league filters
// (lg[]) and column selection (showCol[]) and offset pagination (60/page).
// NOTE: the defending column code is `def` — `de` is silently ignored.
// Output: team|name|nat|pos|ovr|pot|age|pac|sho|pas|dri|def|phy|sofifaId|league
const LEAGUES = [
  [13, 'Premier League'], [14, 'EFL Championship'], [19, 'Bundesliga'],
  [31, 'Serie A'], [32, 'Serie B'], [16, 'Ligue 1'], [53, 'La Liga'], [39, 'MLS'],
]
const COLS = '&showCol%5B%5D=ae&showCol%5B%5D=oa&showCol%5B%5D=pt&showCol%5B%5D=pac&showCol%5B%5D=sho&showCol%5B%5D=pas&showCol%5B%5D=dri&showCol%5B%5D=def&showCol%5B%5D=phy'

function parseRows(html, league) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out = []
  for (const tr of doc.querySelectorAll('table tbody tr')) {
    const c = [...tr.children]; if (c.length < 12) continue
    const a = c[1].querySelector('a[href*="/player/"]'); if (!a) continue
    const name = (a.getAttribute('data-tippy-content') || a.textContent).trim()
    const sofifaId = (a.getAttribute('href').match(/\/player\/(\d+)/) || [])[1] || ''
    const nat = (c[1].querySelector('img.flag')?.getAttribute('title') || '').trim()
    const pos = (c[1].querySelector('a[href*="pn%5B"], .pos')?.textContent || '').trim()
    const team = (c[5].querySelector('a[href*="/team/"]')?.textContent || c[5].textContent).trim().replace(/\s+\d{4} ~.*$/, '')
    const n = i => { const v = parseInt(c[i].textContent.trim(), 10); return isNaN(v) ? '' : v }
    out.push([team, name, nat, pos, n(3), n(4), n(2), n(6), n(7), n(8), n(9), n(10), n(11), sofifaId, league].join('|'))
  }
  return out
}

async function scrapeAll() {
  const lines = []
  let version = 'unknown'
  for (const [lg, label] of LEAGUES) {
    for (let p = 0; p < 20; p++) {
      const r = await fetch('/players?lg%5B%5D=' + lg + '&offset=' + (p * 60) + COLS, { credentials: 'same-origin' })
      const html = await r.text()
      if (p === 0 && version === 'unknown') {
        const m = html.match(/FC 26 - ([A-Za-z]+ \d+, \d{4})/)
        if (m) { const d = new Date(m[1]); version = isNaN(d) ? m[1] : d.toISOString().slice(0, 10) }
      }
      const rows = parseRows(html, label)
      if (!rows.length) break
      lines.push(...rows)
      if (rows.length < 60) break
      await new Promise(res => setTimeout(res, 250))
    }
    console.log(label, 'done — total', lines.length)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fc_sofifa_' + version + '.txt'; a.click()
  console.log('version', version, 'players', lines.length)
}
scrapeAll()
