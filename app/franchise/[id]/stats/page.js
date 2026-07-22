'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// The season stats FC 26 tracks per player in Career Mode. Keys are stored in
// the player_season_stats.stats JSON; labels are derived by un-underscoring.
const SOCCER_PLAYER_STATS = [
  'appearances', 'goals', 'assists', 'shots', 'shots_on_target', 'pass_accuracy',
  'chances_created', 'tackles', 'interceptions', 'clean_sheets',
  'yellow_cards', 'red_cards', 'avg_rating', 'man_of_the_match'
]

// Team record fields map to the season_team_stats columns (ties = draws,
// points_for/against = goals for/against) so soccer reuses the same table.
const SOCCER_TEAM_FIELDS = [
  ['wins', 'Wins'], ['ties', 'Draws'], ['losses', 'Losses'],
  ['points_for', 'Goals For'], ['points_against', 'Goals Against']
]
const GENERIC_TEAM_FIELDS = [
  ['wins', 'Wins'], ['losses', 'Losses'], ['ties', 'Ties'],
  ['points_for', 'Points For'], ['points_against', 'Points Against']
]
const TEAM_COLS = ['wins', 'losses', 'ties', 'points_for', 'points_against']

// Only FC gets a pre-seeded zero roster. Other games keep the upload-only flow
// until their own stat sets are defined, rather than showing soccer stats.
const playerStatKeys = (game) => (game === 'EA FC 26' ? SOCCER_PLAYER_STATS : null)
const teamFields = (game) => (game === 'EA FC 26' ? SOCCER_TEAM_FIELDS : GENERIC_TEAM_FIELDS)
const zeroStats = (keys) => keys.reduce((o, k) => { o[k] = 0; return o }, {})

function buildBlank(players, keys) {
  return {
    team_summary: { wins: 0, losses: 0, ties: 0, points_for: 0, points_against: 0 },
    player_stats: (players || []).map((p) => ({ name: p.name, position: p.position || '', stats: zeroStats(keys) }))
  }
}

// Start from the current roster (so everyone shows at zero) and overlay whatever
// was already saved for the season. Players who've since left the club but have
// saved stats are appended so their season isn't lost.
function buildFromSaved(teamRow, playerRows, players, keys) {
  const base = buildBlank(players, keys)
  if (teamRow) TEAM_COLS.forEach((f) => { base.team_summary[f] = teamRow[f] != null ? teamRow[f] : 0 })
  const byName = {}
  ;(playerRows || []).forEach((r) => { byName[(r.player_name || '').toLowerCase()] = r.stats || {} })
  base.player_stats = base.player_stats.map((p) => {
    const s = byName[p.name.toLowerCase()]
    return s ? Object.assign({}, p, { stats: Object.assign({}, p.stats, s) }) : p
  })
  const rosterNames = new Set((players || []).map((p) => (p.name || '').toLowerCase()))
  ;(playerRows || []).forEach((r) => {
    const n = (r.player_name || '').toLowerCase()
    if (n && !rosterNames.has(n)) base.player_stats.push({ name: r.player_name, position: '', stats: Object.assign({}, zeroStats(keys), r.stats || {}) })
  })
  return base
}

// Overlay an uploaded screenshot's values onto the editable table: match players
// by name, append any the roster didn't have, and only touch fields the photo
// actually reported (leaving the rest at their current value).
function mergeExtraction(base, result, keys) {
  const next = base
    ? { team_summary: Object.assign({}, base.team_summary), player_stats: base.player_stats.map((p) => Object.assign({}, p, { stats: Object.assign({}, p.stats) })) }
    : buildBlank([], keys)
  if (result.team_summary) {
    TEAM_COLS.forEach((f) => {
      const v = result.team_summary[f]
      if (v !== null && v !== undefined) next.team_summary[f] = v
    })
  }
  const idxByName = {}
  next.player_stats.forEach((p, i) => { idxByName[p.name.toLowerCase()] = i })
  ;(result.player_stats || []).forEach((rp) => {
    if (!rp.name) return
    const i = idxByName[rp.name.toLowerCase()]
    if (i !== undefined) {
      next.player_stats[i].stats = Object.assign({}, next.player_stats[i].stats, rp.stats || {})
    } else {
      next.player_stats.push({ name: rp.name, position: '', stats: Object.assign({}, zeroStats(keys), rp.stats || {}) })
      idxByName[rp.name.toLowerCase()] = next.player_stats.length - 1
    }
  })
  return next
}

export default function StatsPage() {
  const [franchise, setFranchise] = useState(null)
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [extracted, setExtracted] = useState(null)
  const [justUploaded, setJustUploaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const [teamHistory, setTeamHistory] = useState([])
  const [playerHistory, setPlayerHistory] = useState([])

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: franchiseData, error: franchiseError } = await supabase
      .from('franchises')
      .select('*')
      .eq('id', franchiseId)
      .single()

    if (franchiseError || !franchiseData) {
      router.push('/')
      return
    }

    setFranchise(franchiseData)
    const players = await loadRoster()
    const history = await loadHistory()
    initEditable(franchiseData, players, history.team, history.players)
    setLoading(false)
  }

  const loadRoster = async () => {
    const { data } = await supabase
      .from('players')
      .select('name, position, overall_rating')
      .eq('franchise_id', franchiseId)
      .or('status.is.null,status.neq.youth')
      .order('overall_rating', { ascending: false })
    const r = data || []
    setRoster(r)
    return r
  }

  const loadHistory = async () => {
    const teamResult = await supabase
      .from('season_team_stats')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('season', { ascending: true })
    const team = teamResult.error ? [] : teamResult.data
    setTeamHistory(team)

    const playerResult = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('season', { ascending: true })
    const players = playerResult.error ? [] : playerResult.data
    setPlayerHistory(players)

    return { team: team, players: players }
  }

  // Seed the editable table: saved data for the current season if present,
  // otherwise the roster at zero. Non-FC games stay upload-only for now.
  const initEditable = (fr, players, teamRows, playerRows) => {
    const keys = playerStatKeys(fr.game)
    if (!keys) { setExtracted(null); return }
    const season = fr.current_season
    const teamRow = (teamRows || []).find((t) => t.season === season) || null
    const seasonPlayers = (playerRows || []).filter((p) => p.season === season)
    setJustUploaded(false)
    if (teamRow || seasonPlayers.length) setExtracted(buildFromSaved(teamRow, seasonPlayers, players, keys))
    else setExtracted(buildBlank(players, keys))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setError('')
    setSaveMessage('')
    setAnalyzing(true)

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result
      const base64 = dataUrl.split(',')[1]
      const mediaType = file.type || 'image/jpeg'

      try {
        const response = await fetch('/api/analyze-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mediaType: mediaType })
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Something went wrong analyzing the image.')
        } else {
          const keys = playerStatKeys(franchise.game)
          setExtracted((prev) => (keys ? mergeExtraction(prev, result, keys) : result))
          setJustUploaded(true)
        }
      } catch (err) {
        setError('Failed to analyze image. Please try again.')
      }

      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  const updateTeamField = (field, value) => {
    setExtracted(function(prev) {
      const next = Object.assign({}, prev)
      next.team_summary = Object.assign({}, next.team_summary)
      next.team_summary[field] = value === '' ? null : parseInt(value)
      return next
    })
  }

  const updatePlayerName = (idx, value) => {
    setExtracted(function(prev) {
      const next = Object.assign({}, prev)
      next.player_stats = prev.player_stats.slice()
      next.player_stats[idx] = Object.assign({}, next.player_stats[idx], { name: value })
      return next
    })
  }

  const updatePlayerStat = (idx, statKey, value) => {
    setExtracted(function(prev) {
      const next = Object.assign({}, prev)
      next.player_stats = prev.player_stats.slice()
      const player = Object.assign({}, next.player_stats[idx])
      player.stats = Object.assign({}, player.stats)
      player.stats[statKey] = value === '' ? null : parseFloat(value)
      next.player_stats[idx] = player
      return next
    })
  }

  const removePlayerRow = (idx) => {
    setExtracted(function(prev) {
      const next = Object.assign({}, prev)
      next.player_stats = prev.player_stats.filter(function(_, i) { return i !== idx })
      return next
    })
  }

  const handleSave = async () => {
    if (!extracted) return
    setSaving(true)
    setSaveMessage('')

    const season = franchise.current_season

    await supabase.from('season_team_stats').delete().eq('franchise_id', franchiseId).eq('season', season)
    await supabase.from('player_season_stats').delete().eq('franchise_id', franchiseId).eq('season', season)

    if (extracted.team_summary) {
      const teamPayload = Object.assign({ franchise_id: franchiseId, season: season }, extracted.team_summary)
      await supabase.from('season_team_stats').insert(teamPayload)
    }

    if (extracted.player_stats && extracted.player_stats.length > 0) {
      const playerRows = extracted.player_stats
        .filter(function(p) { return p.name })
        .map(function(p) {
          return { franchise_id: franchiseId, season: season, player_name: p.name, stats: p.stats || {} }
        })
      if (playerRows.length > 0) {
        await supabase.from('player_season_stats').insert(playerRows)
      }
    }

    setSaving(false)
    setSaveMessage('Saved to Season ' + season + '.')
    const history = await loadHistory()
    initEditable(franchise, roster, history.team, history.players)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading...
      </div>
    )
  }

  const isFc = franchise.game === 'EA FC 26'
  const pastTeamHistory = teamHistory.filter(function(r) { return r.season !== franchise.current_season })
  const pastPlayerHistory = playerHistory.filter(function(r) { return r.season !== franchise.current_season })

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-10">

        <a href={'/franchise/' + franchiseId} className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors">
          &larr; Back to {franchise.club_name}
        </a>

        <h1 className="text-4xl font-bold uppercase tracking-tight mt-5 mb-1.5">Stats Import</h1>
        <p className="text-neutral-400 text-sm mb-8">
          {isFc
            ? 'Enter your season stats below, or upload a photo of your in-game stats screen to fill them in. Season ' + franchise.current_season + '.'
            : 'Upload a photo of your in-game stats screen. Season ' + franchise.current_season + '.'}
        </p>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
          <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Upload Stats Screenshot</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 file:cursor-pointer file:transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg"
          />
          <p className="text-neutral-500 text-xs mt-3">
            On an iPhone, this opens your camera or photo library. Works best with a clear, well-lit photo of the whole screen.
          </p>

          {analyzing && (
            <p className="text-violet-400 text-sm mt-4 animate-pulse">Analyzing photo, this can take a few seconds...</p>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-4">{error}</p>
          )}

          {saveMessage && (
            <p className="text-violet-400 text-sm mt-4">{saveMessage}</p>
          )}
        </div>

        {extracted && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wide text-neutral-100 mb-1">Season {franchise.current_season} Stats</h2>
            <p className="text-neutral-400 text-sm mb-6">
              {justUploaded
                ? 'Filled in from your screenshot — double-check everything, AI extraction can make mistakes.'
                : 'Everyone starts at zero. Fill these in as the season goes, or upload a screenshot to auto-fill.'}
            </p>

            <h3 className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Team Record</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
              {teamFields(franchise.game).map(function(field) {
                const key = field[0]
                const label = field[1]
                const raw = extracted.team_summary ? extracted.team_summary[key] : null
                return (
                  <div key={key}>
                    <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">{label}</label>
                    <input
                      type="number"
                      value={raw !== null && raw !== undefined ? raw : ''}
                      onChange={(e) => updateTeamField(key, e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                )
              })}
            </div>

            {extracted.player_stats && extracted.player_stats.length > 0 && (
              <>
                <h3 className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">
                  Player Stats <span className="text-neutral-600">{extracted.player_stats.length}</span>
                </h3>
                <div className="space-y-3 mb-6">
                  {extracted.player_stats.map(function(p, idx) {
                    return (
                      <div key={idx} className="bg-neutral-950/50 border border-neutral-800 rounded-lg p-4">
                        <div className="flex justify-between items-center gap-3 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="text"
                              value={p.name || ''}
                              onChange={(e) => updatePlayerName(idx, e.target.value)}
                              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold w-48 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                            {p.position && <span className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em]">{p.position}</span>}
                          </div>
                          <button
                            onClick={() => removePlayerRow(idx)}
                            className="text-red-400 hover:text-red-300 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {Object.keys(p.stats || {}).map(function(statKey) {
                            return (
                              <div key={statKey}>
                                <label className="block text-[10px] text-neutral-500 font-semibold uppercase tracking-[0.14em] mb-1">{statKey.replace(/_/g, ' ')}</label>
                                <input
                                  type="number"
                                  value={p.stats[statKey] !== null && p.stats[statKey] !== undefined ? p.stats[statKey] : ''}
                                  onChange={(e) => updatePlayerStat(idx, statKey, e.target.value)}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-colors rounded-lg px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
            >
              {saving ? 'Saving...' : 'Save to Season ' + franchise.current_season}
            </button>
          </div>
        )}

        {pastTeamHistory.length > 0 && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wide text-neutral-100 mb-4">Past Seasons</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-[11px] uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Season</th>
                    <th className="text-left py-2 px-3">W</th>
                    <th className="text-left py-2 px-3">{isFc ? 'D' : 'L'}</th>
                    <th className="text-left py-2 px-3">{isFc ? 'L' : 'T'}</th>
                    <th className="text-left py-2 px-3">{isFc ? 'GF' : 'PF'}</th>
                    <th className="text-left py-2 px-3">{isFc ? 'GA' : 'PA'}</th>
                  </tr>
                </thead>
                <tbody>
                  {pastTeamHistory.map(function(row) {
                    return (
                      <tr key={row.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold">Season {row.season}</td>
                        <td className="py-2.5 px-3 text-violet-400 tabular-nums">{row.wins !== null ? row.wins : '-'}</td>
                        <td className="py-2.5 px-3 tabular-nums">{(isFc ? row.ties : row.losses) != null ? (isFc ? row.ties : row.losses) : '-'}</td>
                        <td className="py-2.5 px-3 tabular-nums">{(isFc ? row.losses : row.ties) != null ? (isFc ? row.losses : row.ties) : '-'}</td>
                        <td className="py-2.5 px-3 text-neutral-300 tabular-nums">{row.points_for !== null ? row.points_for : '-'}</td>
                        <td className="py-2.5 px-3 text-neutral-300 tabular-nums">{row.points_against !== null ? row.points_against : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pastPlayerHistory.length > 0 && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold uppercase tracking-wide text-neutral-100 mb-4">Player Stats History</h2>
            <div className="space-y-6">
              {Array.from(new Set(pastPlayerHistory.map(function(p) { return p.season }))).sort(function(a, b) { return a - b }).map(function(season) {
                const seasonPlayers = pastPlayerHistory.filter(function(p) { return p.season === season })
                return (
                  <div key={season}>
                    <h3 className="text-violet-400 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Season {season}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {seasonPlayers.map(function(p) {
                        return (
                          <div key={p.id} className="bg-neutral-950/50 border border-neutral-800 rounded-lg p-3.5 hover:bg-neutral-800/40 transition-colors">
                            <p className="font-semibold text-neutral-100 text-sm mb-1.5">{p.player_name}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              {Object.keys(p.stats || {}).map(function(k) {
                                return (
                                  <span key={k} className="text-xs text-neutral-400">
                                    {k.replace(/_/g, ' ')}: <span className="text-neutral-200 tabular-nums">{p.stats[k]}</span>
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
