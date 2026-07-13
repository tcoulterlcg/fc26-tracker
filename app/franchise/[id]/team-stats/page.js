'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function TeamStatsPage() {
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [teamHistory, setTeamHistory] = useState([])

  const [season, setSeason] = useState('')
  const [wins, setWins] = useState('')
  const [losses, setLosses] = useState('')
  const [ties, setTies] = useState('')
  const [pointsFor, setPointsFor] = useState('')
  const [pointsAgainst, setPointsAgainst] = useState('')
  const [saving, setSaving] = useState(false)

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
    setSeason(String(franchiseData.current_season))
    await loadHistory()
    setLoading(false)
  }

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('season_team_stats')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('season', { ascending: true })

    if (!error) setTeamHistory(data)
  }

  const handleSave = async () => {
    if (!season.trim()) return
    setSaving(true)

    const payload = {
      franchise_id: franchiseId,
      season: parseInt(season),
      wins: wins.trim() === '' ? null : parseInt(wins),
      losses: losses.trim() === '' ? null : parseInt(losses),
      ties: ties.trim() === '' ? null : parseInt(ties),
      points_for: pointsFor.trim() === '' ? null : parseInt(pointsFor),
      points_against: pointsAgainst.trim() === '' ? null : parseInt(pointsAgainst)
    }

    await supabase.from('season_team_stats').delete().eq('franchise_id', franchiseId).eq('season', payload.season)
    const { error } = await supabase.from('season_team_stats').insert(payload)

    setSaving(false)
    if (!error) {
      setWins('')
      setLosses('')
      setTies('')
      setPointsFor('')
      setPointsAgainst('')
      await loadHistory()
    } else {
      alert(error.message)
    }
  }

  const handleRemove = async (id) => {
    const { error } = await supabase.from('season_team_stats').delete().eq('id', id)
    if (!error) await loadHistory()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500 text-sm uppercase tracking-[0.14em]">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold uppercase tracking-tight mb-1">Team Stats</h1>
        <p className="text-neutral-400 text-sm mb-8">Season-by-season win/loss record. Editing Season <span className="text-violet-400 font-semibold">{season}</span>.</p>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Season</label>
              <input
                type="number"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Wins</label>
              <input
                type="number"
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Losses</label>
              <input
                type="number"
                value={losses}
                onChange={(e) => setLosses(e.target.value)}
                className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Ties</label>
              <input
                type="number"
                value={ties}
                onChange={(e) => setTies(e.target.value)}
                className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Points For / Against</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={pointsFor}
                  onChange={(e) => setPointsFor(e.target.value)}
                  placeholder="PF"
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-2 py-2 text-sm text-neutral-100 tabular-nums placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <input
                  type="number"
                  value={pointsAgainst}
                  onChange={(e) => setPointsAgainst(e.target.value)}
                  placeholder="PA"
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-2 py-2 text-sm text-neutral-100 tabular-nums placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !season.trim()}
            className="bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
          >
            {saving ? 'Saving...' : 'Save Season ' + season}
          </button>
          <p className="text-neutral-500 text-xs mt-3">
            Saving overwrites any existing record for that season number.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-4">Season Records</h2>
          {teamHistory.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-800 px-4 py-10 text-center">
              <p className="text-neutral-500 text-sm">No seasons recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-[11px] uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3 font-semibold">Season</th>
                    <th className="text-right py-2 px-3 font-semibold">W</th>
                    <th className="text-right py-2 px-3 font-semibold">L</th>
                    <th className="text-right py-2 px-3 font-semibold">T</th>
                    <th className="text-right py-2 px-3 font-semibold">PF</th>
                    <th className="text-right py-2 px-3 font-semibold">PA</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {teamHistory.map(function(row) {
                    return (
                      <tr key={row.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-neutral-100">Season {row.season}</td>
                        <td className={'py-2.5 px-3 text-right font-bold tabular-nums ' + (row.wins !== null ? 'text-violet-400' : 'text-neutral-500')}>{row.wins !== null ? row.wins : '-'}</td>
                        <td className={'py-2.5 px-3 text-right font-bold tabular-nums ' + (row.losses !== null ? 'text-red-400' : 'text-neutral-500')}>{row.losses !== null ? row.losses : '-'}</td>
                        <td className={'py-2.5 px-3 text-right tabular-nums ' + (row.ties !== null ? 'text-neutral-300' : 'text-neutral-500')}>{row.ties !== null ? row.ties : '-'}</td>
                        <td className={'py-2.5 px-3 text-right tabular-nums ' + (row.points_for !== null ? 'text-neutral-300' : 'text-neutral-500')}>{row.points_for !== null ? row.points_for : '-'}</td>
                        <td className={'py-2.5 px-3 text-right tabular-nums ' + (row.points_against !== null ? 'text-neutral-300' : 'text-neutral-500')}>{row.points_against !== null ? row.points_against : '-'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button onClick={() => handleRemove(row.id)} className="text-neutral-500 hover:text-red-400 transition-colors text-xs font-medium">Remove</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
