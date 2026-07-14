// Team overall + position breakdown, per game.
//
// Team overall matches how each game actually derives its team rating: the
// average of the best STARTING lineup at each position — NOT a naive mean of the
// entire roster. A flat roster mean is dragged down by deep bench, minor-league
// and prospect players (e.g. an MLB club shows 93 players incl. A-ball, so the
// mean read ~65 while the real 26-man active roster is ~78), which is why the
// headline overalls looked off across every sport.
//
//   FC (soccer)      -> best XI (1 GK, 4 DEF, 3 MID, 3 ATT)
//   MLB The Show     -> best lineup (C,1B,2B,3B,SS,3xOF,DH) + 5 SP + 8 RP,
//                       restricted to the MLB-level (26-man) roster when tagged
//   Madden / CFB     -> best starter at each offensive/defensive/ST position
//   NHL              -> 12 F, 6 D, 1 G
//
// The average is taken over the game's active-lineup size, backfilled from the
// best remaining players when position data is sparse or non-standard.

const up = (s) => String(s || '').toUpperCase().trim()
const ovrOf = (p) => (typeof p.overall_rating === 'number' && !isNaN(p.overall_rating) ? p.overall_rating : null)

export function gameKey(game) {
  if (game === 'EA CFB 27') return 'cfb'
  if (game === 'MLB The Show 26') return 'mlb'
  if (game === 'EA NHL 26') return 'nhl'
  if (game === 'EA Madden 26') return 'nfl'
  return 'fc'
}

// Starting-lineup templates: [positions[], starterCount]. `total` = active
// lineup size the average is taken over.
const LINEUPS = {
  fc: { total: 11, spec: [
    [['GK'], 1],
    [['CB', 'LB', 'RB', 'LWB', 'RWB', 'LCB', 'RCB', 'SW'], 4],
    [['CDM', 'CM', 'CAM', 'LM', 'RM', 'DM', 'AM', 'LCM', 'RCM'], 3],
    [['ST', 'CF', 'LW', 'RW', 'LF', 'RF', 'SS'], 3],
  ] },
  mlb: { total: 23, spec: [
    [['C'], 1], [['1B'], 1], [['2B'], 1], [['3B'], 1], [['SS'], 1],
    [['LF', 'CF', 'RF', 'OF'], 3], [['DH'], 1],
    [['SP', 'P'], 5], [['RP', 'CP', 'CL'], 8],
  ] },
  nfl: { total: 24, spec: [
    [['QB'], 1], [['HB', 'RB', 'FB'], 2], [['WR'], 3], [['TE'], 1],
    [['LT', 'LG', 'C', 'RG', 'RT', 'OL', 'T', 'G', 'OT', 'OG'], 5],
    [['LE', 'RE', 'DT', 'DE', 'DL', 'EDGE', 'NT'], 4],
    [['LOLB', 'MLB', 'ROLB', 'LB', 'OLB', 'ILB'], 3],
    [['CB', 'FS', 'SS', 'DB', 'S'], 4], [['K'], 1], [['P'], 1],
  ] },
  cfb: { total: 24, spec: [
    [['QB'], 1], [['HB', 'RB', 'FB'], 2], [['WR'], 3], [['TE'], 1],
    [['LT', 'LG', 'C', 'RG', 'RT', 'OL'], 5],
    [['LE', 'RE', 'DT', 'DL', 'EDGE'], 4],
    [['LOLB', 'MLB', 'ROLB', 'LB', 'OLB'], 3],
    [['CB', 'FS', 'SS', 'DB'], 4], [['K'], 1], [['P'], 1],
  ] },
  nhl: { total: 19, spec: [
    [['C', 'LW', 'RW', 'F', 'W'], 12], [['D', 'LD', 'RD', 'DEF'], 6], [['G', 'GK'], 1],
  ] },
}

// For MLB, prefer the tagged MLB-level (26-man) roster — that is the rated club
// the game displays, not the full farm system.
function activeRoster(players, key) {
  const rated = (players || []).filter((p) => ovrOf(p) !== null)
  if (key === 'mlb') {
    const mlb = rated.filter((p) => up(p.notes) === 'MLB')
    if (mlb.length >= 9) return mlb
  }
  return rated
}

function pickLineup(rated, key) {
  const cfg = LINEUPS[key] || LINEUPS.fc
  const used = new Set()
  const picked = []
  for (const [positions, n] of cfg.spec) {
    const pool = rated
      .filter((p) => !used.has(p) && positions.indexOf(up(p.position)) !== -1)
      .sort((a, b) => ovrOf(b) - ovrOf(a))
      .slice(0, n)
    pool.forEach((p) => { used.add(p); picked.push(p) })
  }
  if (picked.length < cfg.total) {
    const rest = rated.filter((p) => !used.has(p)).sort((a, b) => ovrOf(b) - ovrOf(a))
    for (const p of rest) { if (picked.length >= cfg.total) break; picked.push(p) }
  }
  return picked
}

export function computeTeamOverall(players, game) {
  const key = gameKey(game)
  const rated = activeRoster(players, key)
  if (rated.length === 0) return null
  const lineup = pickLineup(rated, key)
  const pool = lineup.length ? lineup : rated
  return pool.reduce((s, p) => s + ovrOf(p), 0) / pool.length
}

// --- position breakdown (game-aware groups) ---
export function starRating(avg) {
  if (avg === null || avg === undefined) return 0
  if (avg >= 88) return 5
  if (avg >= 78) return 4
  if (avg >= 68) return 3
  if (avg >= 58) return 2
  return 1
}

// order = display order of groups; map = position codes per group; fallback =
// group for anything unmatched (FC lumps unmatched into MID); labels override.
const GROUPS = {
  fc: {
    order: ['GK', 'DEF', 'MID', 'FWD'],
    map: { GK: ['GK'], DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB', 'LCB', 'RCB', 'SW'], FWD: ['ST', 'LW', 'RW', 'CF', 'LF', 'RF', 'SS'] },
    fallback: 'MID',
  },
  mlb: {
    order: ['C', 'IF', 'OF', 'DH', 'SP', 'RP'],
    map: { C: ['C'], IF: ['1B', '2B', '3B', 'SS'], OF: ['LF', 'CF', 'RF', 'OF'], DH: ['DH'], SP: ['SP', 'P'], RP: ['RP', 'CP', 'CL'] },
    labels: { IF: 'INF' },
    fallback: null,
  },
  nfl: {
    order: ['QB', 'SKILL', 'OL', 'DL', 'LB', 'DB', 'ST'],
    map: {
      QB: ['QB'], SKILL: ['HB', 'RB', 'FB', 'WR', 'TE'],
      OL: ['LT', 'LG', 'C', 'RG', 'RT', 'OL', 'T', 'G', 'OT', 'OG'],
      DL: ['LE', 'RE', 'DT', 'DE', 'DL', 'EDGE', 'NT'],
      LB: ['LOLB', 'MLB', 'ROLB', 'LB', 'OLB', 'ILB'],
      DB: ['CB', 'FS', 'SS', 'DB', 'S'], ST: ['K', 'P', 'LS'],
    },
    fallback: null,
  },
  nhl: {
    order: ['F', 'D', 'G'],
    map: { F: ['C', 'LW', 'RW', 'F', 'W'], D: ['D', 'LD', 'RD', 'DEF'], G: ['G', 'GK'] },
    fallback: null,
  },
}
GROUPS.cfb = GROUPS.nfl

function groupOf(cfg, position) {
  const pos = up(position)
  for (const g of cfg.order) if (cfg.map[g] && cfg.map[g].indexOf(pos) !== -1) return g
  return cfg.fallback
}

// --- MLB GM summary (replaces the generic breakdown for MLB The Show) ---
// What a baseball GM reads at a glance: unit strengths (best-lineup basis, not
// roster means), farm system by level, age curve, top prospect. All derived
// from the real roster — no game results are tracked or invented.
const GRADE_RANK = { 'A+': 7, A: 6, 'A-': 5, 'B+': 4, B: 3, 'B-': 2, 'C+': 1.5, C: 1 }

export function mlbGmSummary(players) {
  const rated = (players || []).filter((p) => ovrOf(p) !== null)
  if (rated.length === 0) return null
  const byOvr = (a, b) => ovrOf(b) - ovrOf(a)
  const lvl = (p) => up(p.notes)
  const mlbLevel = rated.filter((p) => lvl(p) === 'MLB')
  const active = mlbLevel.length >= 9 ? mlbLevel : rated
  const isSP = (p) => ['SP', 'P'].indexOf(up(p.position)) !== -1
  const isRP = (p) => ['RP', 'CP', 'CL'].indexOf(up(p.position)) !== -1
  const isPos = (p) => !isSP(p) && !isRP(p)
  const mean = (arr) => (arr.length ? arr.reduce((s, p) => s + ovrOf(p), 0) / arr.length : null)

  const used = new Set()
  const take = (positions, n) => active
    .filter((p) => !used.has(p) && positions.indexOf(up(p.position)) !== -1)
    .sort(byOvr).slice(0, n).map((p) => { used.add(p); return p })
  const lineup = []
  for (const [pos, n] of [[['C'], 1], [['1B'], 1], [['2B'], 1], [['3B'], 1], [['SS'], 1], [['LF', 'CF', 'RF', 'OF'], 3], [['DH'], 1]]) lineup.push(...take(pos, n))
  for (const p of active.filter((p) => !used.has(p) && isPos(p)).sort(byOvr)) {
    if (lineup.length >= 9) break
    used.add(p); lineup.push(p)
  }
  const rotation = active.filter(isSP).sort(byOvr).slice(0, 5)
  const bullpen = active.filter(isRP).sort(byOvr).slice(0, 8)
  const bench = active.filter((p) => !used.has(p) && isPos(p)).sort(byOvr).slice(0, 4)

  const farm = ['AAA', 'AA', 'A'].map((level) => {
    const g = rated.filter((p) => lvl(p) === level)
    return g.length ? { level, count: g.length, avg: mean(g) } : null
  }).filter(Boolean)

  const ages = rated.map((p) => p.age).filter((a) => typeof a === 'number' && a > 0)
  const prospects = rated.filter((p) => lvl(p) !== 'MLB')
  const topProspect = prospects.length
    ? [...prospects].sort((a, b) =>
        (GRADE_RANK[up(b.dev_trait)] || 0) - (GRADE_RANK[up(a.dev_trait)] || 0) ||
        (b.potential_rating || 0) - (a.potential_rating || 0) || byOvr(a, b))[0]
    : null

  const fortyMan = Math.min(40, mlbLevel.length + rated.filter((p) => lvl(p) === 'AAA').length)
  return {
    lineup: mean(lineup), rotation: mean(rotation), bullpen: mean(bullpen), bench: mean(bench),
    lineupCount: lineup.length, rotationCount: rotation.length, bullpenCount: bullpen.length,
    farm,
    avgAge: ages.length ? ages.reduce((s, a) => s + a, 0) / ages.length : null,
    under25: ages.filter((a) => a < 25).length,
    topProspect: topProspect ? { name: topProspect.name, grade: up(topProspect.dev_trait) || null, ovr: ovrOf(topProspect), level: lvl(topProspect) || null } : null,
    fortyMan,
    totalPlayers: rated.length,
  }
}

// [{ key, label, count, avg, avgOverall, avgPotential, stars }]
export function positionBreakdown(players, game) {
  const cfg = GROUPS[gameKey(game)] || GROUPS.fc
  const buckets = {}
  for (const p of players || []) {
    const g = groupOf(cfg, p.position)
    if (!g) continue
    if (!buckets[g]) buckets[g] = { count: 0, ovr: [], pot: [] }
    buckets[g].count++
    if (ovrOf(p) !== null) buckets[g].ovr.push(ovrOf(p))
    if (typeof p.potential_rating === 'number') buckets[g].pot.push(p.potential_rating)
  }
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)
  return cfg.order
    .filter((g) => buckets[g] && buckets[g].count > 0)
    .map((g) => {
      const b = buckets[g]
      const avg = mean(b.ovr)
      return { key: g, label: (cfg.labels && cfg.labels[g]) || g, count: b.count, avg, avgOverall: avg, avgPotential: mean(b.pot), stars: starRating(avg) }
    })
}
