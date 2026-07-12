'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function StatsPage() {
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [extracted, setExtracted] = useState(null)
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
    await loadHistory()
    setLoading(false)
  }

  const loadHistory = async () => {
    const teamResult = await supabase
      .from('season_team_stats')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('season', { ascending: true })

    if (!teamResult.error) {
      setTeamHistory(teamResult.data)
    }

    const playerResult = await supabase
      .from('player_season_stats')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('season', { ascending: true })

    if (!playerResult.error) {
      setPlayerHistory(playerResult.data)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setError('')
    setExtracted(null)
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
          setExtracted(result)
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
    setExtracted(null)
    await loadHistory()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-10">

        <a href={'/franchise/' + franchiseId} className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
          &larr; Back to {franchise.club_name}
        </a>

        <h1 className="text-4xl font-bold uppercase tracking-tight mt-5 mb-1.5">Stats Import</h1>
        <p className="text-neutral-400 text-sm mb-8">
          Upload a photo of your in-game stats screen. Season {franchise.current_season}.
        </p>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
          <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Upload Stats Screenshot</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 file:cursor-pointer file:transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg"
          />
          <p className="text-neutral-500 text-xs mt-3">
            On an iPhone, this opens your camera or photo library. Works best with a clear, well-lit photo of the whole screen.
          </p>

          {analyzing && (
            <p className="text-emerald-400 text-sm mt-4 animate-pulse">Analyzing photo, this can take a few seconds...</p>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-4">{error}</p>
          )}

          {saveMessage && (
            <p className="text-emerald-400 text-sm mt-4">{saveMessage}</p>
          )}
        </div>

        {extracted && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wide text-neutral-100 mb-1">Review Before Saving</h2>
            <p className="text-neutral-400 text-sm mb-6">
              Double-check everything below — AI extraction can make mistakes. Edit any field before saving.
            </p>

            <h3 className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Season Record</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
              <div>
                <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Wins</label>
                <input
                  type="number"
                  value={extracted.team_summary && extracted.team_summary.wins !== null && extracted.team_summary.wins !== undefined ? extracted.team_summary.wins : ''}
                  onChange={(e) => updateTeamField('wins', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Losses</label>
                <input
                  type="number"
                  value={extracted.team_summary && extracted.team_summary.losses !== null && extracted.team_summary.losses !== undefined ? extracted.team_summary.losses : ''}
                  onChange={(e) => updateTeamField('losses', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Ties</label>
                <input
                  type="number"
                  value={extracted.team_summary && extracted.team_summary.ties !== null && extracted.team_summary.ties !== undefined ? extracted.team_summary.ties : ''}
                  onChange={(e) => updateTeamField('ties', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Points For</label>
                <input
                  type="number"
                  value={extracted.team_summary && extracted.team_summary.points_for !== null && extracted.team_summary.points_for !== undefined ? extracted.team_summary.points_for : ''}
                  onChange={(e) => updateTeamField('points_for', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Points Against</label>
                <input
                  type="number"
                  value={extracted.team_summary && extracted.team_summary.points_against !== null && extracted.team_summary.points_against !== undefined ? extracted.team_summary.points_against : ''}
                  onChange={(e) => updateTeamField('points_against', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {extracted.player_stats && extracted.player_stats.length > 0 && (
              <>
                <h3 className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Player Stats</h3>
                <div className="space-y-3 mb-6">
                  {extracted.player_stats.map(function(p, idx) {
                    return (
                      <div key={idx} className="bg-neutral-950/50 border border-neutral-800 rounded-lg p-4">
                        <div className="flex justify-between items-center gap-3 mb-3">
                          <input
                            type="text"
                            value={p.name || ''}
                            onChange={(e) => updatePlayerName(idx, e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
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
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors rounded-lg px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
            >
              {saving ? 'Saving...' : 'Save to Season ' + franchise.current_season}
            </button>
          </div>
        )}

        {teamHistory.length > 0 && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wide text-neutral-100 mb-4">Season Records</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-[11px] uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Season</th>
                    <th className="text-left py-2 px-3">W</th>
                    <th className="text-left py-2 px-3">L</th>
                    <th className="text-left py-2 px-3">T</th>
                    <th className="text-left py-2 px-3">PF</th>
                    <th className="text-left py-2 px-3">PA</th>
                  </tr>
                </thead>
                <tbody>
                  {teamHistory.map(function(row, idx) {
                    return (
                      <tr key={row.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold">Season {row.season}</td>
                        <td className="py-2.5 px-3 text-emerald-400 tabular-nums">{row.wins !== null ? row.wins : '-'}</td>
                        <td className="py-2.5 px-3 text-red-400 tabular-nums">{row.losses !== null ? row.losses : '-'}</td>
                        <td className="py-2.5 px-3 text-neutral-400 tabular-nums">{row.ties !== null ? row.ties : '-'}</td>
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

        {playerHistory.length > 0 && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold uppercase tracking-wide text-neutral-100 mb-4">Player Stats History</h2>
            <div className="space-y-6">
              {Array.from(new Set(playerHistory.map(function(p) { return p.season }))).sort(function(a, b) { return a - b }).map(function(season) {
                const seasonPlayers = playerHistory.filter(function(p) { return p.season === season })
                return (
                  <div key={season}>
                    <h3 className="text-emerald-400 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Season {season}</h3>
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