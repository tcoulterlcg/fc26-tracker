// Server-side proxy for EA's official ratings.
//   Madden -> drop-api.ea.com (JSON feed, same as EA FC).
//   NHL 26 -> the EA ratings site itself (drop-api has no NHL data). Its
//   Next.js data endpoint (/_next/data/<buildId>/games/nhl/ratings.json) is
//   fetchable server-side and returns the full published ratings, 50/page. We
//   discover the current buildId from the ratings page (it changes on EA
//   redeploys), then paginate. Both feeds send no CORS headers, so the browser
//   can't call them directly — this route fetches server-side and maps rows to
//   our players schema.
//   GET /api/ea-ratings?game=EA%20NHL%2026&team=Tampa%20Bay%20Lightning
import { NextResponse } from 'next/server'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const GAME_SLUGS = { 'EA Madden 26': 'madden-nfl' }

// Our canonical team name -> EA's label, where they differ.
const TEAM_LABEL_OVERRIDES = {
  'New York Giants': 'NY Giants',
  'New York Jets': 'NY Jets'
}

// Cache each game's full pull for a day (EA updates ratings roughly weekly).
export const revalidate = 86400

function stat(p, key) {
  const v = p.stats && p.stats[key] && typeof p.stats[key].value === 'number' ? p.stats[key].value : null
  return v && v > 0 ? v : null // EA sends 0 for attributes that don't apply (e.g. goalie strength)
}

// --- Madden (drop-api) ---
async function fetchDropApi(slug) {
  const all = []
  for (let offset = 0; offset < 3000; offset += 100) {
    const url = 'https://drop-api.ea.com/rating/' + slug + '?locale=en&limit=100&offset=' + offset
    const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': UA }, next: { revalidate: 86400 } })
    if (!res.ok) break
    const json = await res.json()
    if (!json.items || json.items.length === 0) break
    all.push(...json.items)
    if (json.items.length < 100) break
  }
  return all
}
function mapDropApi(p) {
  return {
    name: [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
    position: p.position ? (p.position.shortLabel || p.position.id) : null,
    overall_rating: typeof p.overallRating === 'number' ? p.overallRating : null,
    age: typeof p.age === 'number' ? p.age : null,
    jersey_number: typeof p.jerseyNum === 'number' ? p.jerseyNum : null,
    archetype: p.archetype ? p.archetype.label : null,
    active_club: p.team ? p.team.label : null,
    speed: stat(p, 'speed'), strength: stat(p, 'strength'), agility: stat(p, 'agility'),
    acceleration: stat(p, 'acceleration'), change_of_direction: stat(p, 'changeOfDirection'),
    injury: stat(p, 'injury'), stamina: stat(p, 'stamina'), awareness: stat(p, 'awareness')
  }
}

// --- NHL (ea.com ratings site, via its Next.js data endpoint) ---
const NHL_BUILDID_FALLBACK = 'vAlnFXx8pmZDXuUmkpTXE'
async function nhlBuildId() {
  try {
    const r = await fetch('https://www.ea.com/games/nhl/ratings', { headers: { 'user-agent': UA, accept: 'text/html' }, next: { revalidate: 86400 } })
    if (!r.ok) return NHL_BUILDID_FALLBACK
    const m = (await r.text()).match(/"buildId":"([^"]+)"/)
    return m ? m[1] : NHL_BUILDID_FALLBACK
  } catch { return NHL_BUILDID_FALLBACK }
}
async function fetchNhl() {
  const bid = await nhlBuildId()
  const all = []
  for (let page = 1; page <= 12; page++) {
    const url = 'https://www.ea.com/_next/data/' + bid + '/games/nhl/ratings.json?franchiseSlug=nhl&page=' + page
    const r = await fetch(url, { headers: { accept: 'application/json', 'x-nextjs-data': '1', 'user-agent': UA }, next: { revalidate: 86400 } })
    if (!r.ok) break
    const j = await r.json()
    const items = (j && j.pageProps && j.pageProps.ratingDetails && j.pageProps.ratingDetails.items) || []
    all.push(...items)
    if (items.length < 50) break
  }
  return all
}
function mapNhl(p) {
  return {
    name: [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
    position: p.position ? (p.position.shortLabel || p.position.id) : null,
    overall_rating: typeof p.overallRating === 'number' ? p.overallRating : null,
    jersey_number: typeof p.jerseyNum === 'number' ? p.jerseyNum : null,
    archetype: p.playerStyle ? (p.playerStyle.label || null) : null,
    active_club: p.team ? p.team.label : null,
    // NHL attribute names mapped onto our existing rating columns.
    speed: stat(p, 'skatingSpeed') ?? stat(p, 'speed'),
    acceleration: stat(p, 'acceleration'), agility: stat(p, 'agility'),
    strength: stat(p, 'strength'), stamina: stat(p, 'stamina'),
    awareness: stat(p, 'defensiveAwareness') ?? stat(p, 'offensiveAwareness')
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const game = searchParams.get('game') || 'EA Madden 26'
  const team = searchParams.get('team')

  let players
  if (game === 'EA NHL 26') {
    players = (await fetchNhl()).map(mapNhl).filter((p) => p.name && p.overall_rating != null)
    if (team) players = players.filter((p) => p.active_club === team)
  } else {
    const slug = GAME_SLUGS[game]
    if (!slug) return NextResponse.json({ error: 'unknown game', players: [] }, { status: 400 })
    players = (await fetchDropApi(slug)).map(mapDropApi).filter((p) => p.name && p.overall_rating != null)
    if (team) {
      const wanted = TEAM_LABEL_OVERRIDES[team] || team
      players = players.filter((p) => p.active_club === wanted).map((p) => Object.assign({}, p, { active_club: team }))
    }
  }

  players.sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0))
  return NextResponse.json({ game, team: team || null, count: players.length, players })
}
