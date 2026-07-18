// Start-of-franchise baseline: what the squad looked like on day one, so the
// cards can show how far a save has come.
//
// Nothing was ever written to season_snapshots, so there is no recorded day-one
// squad to read. Rather than invent one, the baseline is reconstructed from
// evidence already in the database:
//
//   start = current roster
//           - players signed since (transfer_history 'In')
//           + players who left  (transfer_history 'Out', whose ratings survive
//                                in the player_snapshot column)
//
// A franchise with no transfers has not changed hands at all, so its baseline
// is simply its current roster and every delta reads 0.0 — which is the honest
// answer, not a missing one.
//
// Departed players are only counted when their snapshot actually carries a
// rating; an 'Out' row with no usable snapshot is dropped rather than guessed
// at, and `partial` is set so the UI can mark the number as approximate.

import { computeTeamOverall } from '@/lib/rosterMetrics'

const norm = (s) => String(s || '').trim().toLowerCase()
const numOr = (v, fallback = null) => (typeof v === 'number' && !isNaN(v) ? v : fallback)

function snapshotToPlayer(row) {
  const s = row && row.player_snapshot
  if (!s || typeof s !== 'object') return null
  const ovr = numOr(s.overall_rating)
  if (ovr === null) return null
  return {
    name: s.name || row.player_name,
    position: s.position || '',
    age: numOr(s.age),
    overall_rating: ovr,
    potential_rating: numOr(s.potential_rating, ovr),
    notes: s.notes || null
  }
}

// Rebuild the day-one roster for one franchise.
export function startingRoster(players, transfers) {
  const roster = players || []
  const moves = transfers || []
  if (moves.length === 0) return { players: roster, changed: false, partial: false }

  const signed = new Set(
    moves.filter((t) => norm(t.transfer_type) === 'in').map((t) => norm(t.player_name))
  )
  const outRows = moves.filter((t) => norm(t.transfer_type) === 'out')
  const departed = outRows.map(snapshotToPlayer).filter(Boolean)

  // Anyone signed since day one is not part of the baseline.
  const kept = roster.filter((p) => !signed.has(norm(p.name)))

  return {
    players: kept.concat(departed),
    changed: true,
    // Some leavers' ratings could not be recovered, so the baseline is a floor.
    partial: departed.length < outRows.length
  }
}

const avg = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null)

// Baseline vs current for the two headline numbers on a franchise card.
export function franchiseProgress(players, transfers, game) {
  const current = players || []
  if (current.length === 0) return null

  const start = startingRoster(current, transfers)

  const curOverall = computeTeamOverall(current, game)
  const startOverall = computeTeamOverall(start.players, game)

  const pot = (list) => avg(list.map((p) => numOr(p.potential_rating)).filter((v) => v !== null))
  const curPotential = pot(current)
  const startPotential = pot(start.players)

  const delta = (now, was) => (now !== null && was !== null ? now - was : null)

  return {
    changed: start.changed,
    partial: start.partial,
    startSquadSize: start.players.length,
    overall: { current: curOverall, start: startOverall, delta: delta(curOverall, startOverall) },
    potential: { current: curPotential, start: startPotential, delta: delta(curPotential, startPotential) }
  }
}
