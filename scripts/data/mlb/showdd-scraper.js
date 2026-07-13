// MLB The Show 26 Live Series ratings scraper — paste into the browser console
// on any showdd.io page (same-origin), then load with:
//   node scripts/db.mjs load-mlb scripts/data/mlb/mlb_<version>.txt <version>
//
// showdd.io/play-now/players server-renders a clean <table> (hidden until the
// "Table View" toggle, but present in the HTML) with columns:
//   Player, OVR, TR, Pos, Secondary, Team, Level, Pot, Age, Bats, Throws
// paginated 20/page (~140 pages for ~2,790 Live Series players). We fetch each
// page same-origin and parse the table. Output is pipe-delimited:
//   team|name|pos|secondary|overall|tr|level|pot|age|bats|throws|slug
//
// The "version" is the site's "Player ratings last updated: <date>" (ISO), which
// is the Friday roster-update snapshot the app lets users select by week.
function parsePage(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const clean = s => (s || '').replace(/\s+/g, ' ').trim()
  const out = []
  for (const tr of doc.querySelectorAll('table tbody tr')) {
    const c = [...tr.children]; if (c.length < 11) continue
    const a = c[0].querySelector('a[href*="/player"]')
    const team = clean(c[5].textContent)
    let name = clean(a ? a.textContent : c[0].textContent)
    if (team && name.includes(team)) name = name.split(team)[0]
    name = name.replace(/[•\s]+$/, '').trim()
    const slug = (a ? a.getAttribute('href') : '').replace('/play-now/player/', '')
    const num = i => clean(c[i].textContent).replace(/[^0-9.]/g, '')
    const t = i => clean(c[i].textContent)
    out.push([team, name, t(3), t(4) === '—' ? '' : t(4), num(1), num(2), t(6), t(7), num(8), t(9), t(10), slug].join('|'))
  }
  return out
}

async function scrapeShowdd(conc = 6) {
  const first = await (await fetch('/play-now/players?page=1', { credentials: 'same-origin' })).text()
  const fdoc = new DOMParser().parseFromString(first, 'text/html')
  const version = (() => {
    const m = fdoc.body.innerText.match(/last updated:?\s*([A-Za-z]+ \d+,? \d{4})/i)
    if (!m) return 'unknown'
    const d = new Date(m[1]); return isNaN(d) ? m[1] : d.toISOString().slice(0, 10)
  })()
  const total = parseInt((fdoc.body.innerText.match(/of\s*([\d,]+)\s*total/i) || [])[1]?.replace(/,/g, '') || '2790', 10)
  const pages = Math.ceil(total / 20)
  const lines = []; let p = 1
  await Promise.all(Array.from({ length: conc }, async () => {
    while (true) { const page = p++; if (page > pages) break
      lines.push(...parsePage(await (await fetch('/play-now/players?page=' + page, { credentials: 'same-origin' })).text())) }
  }))
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mlb_' + version + '.txt'; a.click()
  console.log('version', version, 'pages', pages, 'players', lines.length)
}
scrapeShowdd()
