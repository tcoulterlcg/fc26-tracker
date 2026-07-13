// Server-side proxy for EA's official ratings API (drop-api.ea.com).
// The upstream sends no CORS headers, so the browser can't call it directly —
// this route fetches server-side and returns roster rows mapped to our
// players schema. Used by franchise creation for Madden (and NHL once EA
// publishes NHL 26 ratings; today that feed is still empty).
//   GET /api/ea-ratings?game=madden-nfl&team=Cincinnati%20Bengals
import { NextResponse } from 'next/server'

const GAME_SLUGS = {
  'EA Madden 26': 'madden-nfl',
  'EA NHL 26': 'nhl'
}

// Our canonical team name -> EA's label, where they differ.
const TEAM_LABEL_OVERRIDES = {
  'New York Giants': 'NY Giants',
  'New York Jets': 'NY Jets'
}

// Cache each game's full pull for a day (EA updates ratings roughly weekly).
export const revalidate = 86400

async function fetchAllPlayers(slug) {
  const all = []
  for (let offset = 0; offset < 3000; offset += 100) {
    const url = 'https://drop-api.ea.com/rating/' + slug + '?locale=en&limit=100&offset=' + offset
    const res = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
      next: { revalidate: 86400 }
    })
    if (!res.ok) break
    const json = await res.json()
    if (!json.items || json.items.length === 0) break
    all.push(...json.items)
    if (json.items.length < 100) break
  }
  return all
}

function stat(p, key) {
  return p.stats && p.stats[key] && typeof p.stats[key].value === 'number' ? p.stats[key].value : null
}

function mapPlayer(p) {
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim()
  return {
    name: name,
    position: p.position ? (p.position.shortLabel || p.position.id) : null,
    overall_rating: typeof p.overallRating === 'number' ? p.overallRating : null,
    age: typeof p.age === 'number' ? p.age : null,
    jersey_number: typeof p.jerseyNum === 'number' ? p.jerseyNum : null,
    archetype: p.archetype ? p.archetype.label : null,
    active_club: p.team ? p.team.label : null,
    // EA attribute names map onto our existing rating columns.
    speed: stat(p, 'speed'),
    strength: stat(p, 'strength'),
    agility: stat(p, 'agility'),
    acceleration: stat(p, 'acceleration'),
    change_of_direction: stat(p, 'changeOfDirection'),
    injury: stat(p, 'injury'),
    stamina: stat(p, 'stamina'),
    awareness: stat(p, 'awareness')
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const game = searchParams.get('game') || 'EA Madden 26'
  const team = searchParams.get('team')
  const slug = GAME_SLUGS[game]
  if (!slug) return NextResponse.json({ error: 'unknown game', players: [] }, { status: 400 })

  const items = await fetchAllPlayers(slug)
  let players = items.map(mapPlayer).filter(function(p) { return p.name && p.overall_rating != null })

  if (team) {
    const wanted = TEAM_LABEL_OVERRIDES[team] || team
    players = players.filter(function(p) { return p.active_club === wanted })
    // Store rows under our canonical club name for logo/display consistency.
    players = players.map(function(p) { return Object.assign({}, p, { active_club: team }) })
  }

  players.sort(function(a, b) { return (b.overall_rating || 0) - (a.overall_rating || 0) })
  return NextResponse.json({ game: game, team: team || null, count: players.length, players: players })
}
