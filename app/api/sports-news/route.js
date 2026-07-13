// Real-life sports headlines from ESPN's public news feeds, aggregated
// server-side (avoids CORS and keeps one cache). Refreshes every 30 minutes.
import { NextResponse } from 'next/server'

const FEEDS = [
  ['NFL', 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=5'],
  ['MLB', 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news?limit=5'],
  ['NHL', 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news?limit=5'],
  ['CFB', 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/news?limit=5'],
  ['SOCCER', 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=5']
]

export const revalidate = 1800

export async function GET() {
  const items = []
  await Promise.all(FEEDS.map(async function(feed) {
    const league = feed[0], url = feed[1]
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
        next: { revalidate: 1800 }
      })
      if (!res.ok) return
      const json = await res.json()
      for (const a of (json.articles || [])) {
        if (!a.headline) continue
        items.push({
          league: league,
          headline: a.headline,
          published: a.published || null,
          url: a.links && a.links.web ? a.links.web.href : null
        })
      }
    } catch (e) {
      // feed down — skip silently, the others still populate
    }
  }))
  // Interleave leagues so the ticker rotates sports instead of clumping.
  const byLeague = {}
  for (const it of items) (byLeague[it.league] = byLeague[it.league] || []).push(it)
  const mixed = []
  for (let i = 0; i < 5; i++) {
    for (const feed of FEEDS) {
      const list = byLeague[feed[0]] || []
      if (list[i]) mixed.push(list[i])
    }
  }
  return NextResponse.json({ count: mixed.length, items: mixed })
}
