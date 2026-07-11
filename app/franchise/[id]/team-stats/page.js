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
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Team Stats</h1>
        <p className="text-neutral-400 text-sm mb-6">Season-by-season win/loss record. Editing Season {season}.</p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Season</label>
              <input
                type="number"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Wins</label>
              <input
                type="number"
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Losses</label>
              <input
                type="number"
                value={losses}
                onChange={(e) => setLosses(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Ties</label>
              <input
                type="number"
                value={ties}
                onChange={(e) => setTies(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Points For / Against</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={pointsFor}
                  onChange={(e) => setPointsFor(e.target.value)}
                  placeholder="PF"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  value={pointsAgainst}
                  onChange={(e) => setPointsAgainst(e.target.value)}
                  placeholder="PA"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !season.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {saving ? 'Saving...' : 'Save Season ' + season}
          </button>
          <p className="text-neutral-500 text-xs mt-2">
            Saving overwrites any existing record for that season number.
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-neutral-200 mb-4">Season Records</h2>
          {teamHistory.length === 0 ? (
            <p className="text-neutral-500 text-sm">No seasons recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-xs uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Season</th>
                    <th className="text-left py-2 px-3">W</th>
                    <th className="text-left py-2 px-3">L</th>
                    <th className="text-left py-2 px-3">T</th>
                    <th className="text-left py-2 px-3">PF</th>
                    <th className="text-left py-2 px-3">PA</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {teamHistory.map(function(row) {
                    return (
                      <tr key={row.id} className="border-b border-neutral-800/60">
                        <td className="py-2 px-3 font-medium">Season {row.season}</td>
                        <td className="py-2 px-3 text-green-400">{row.wins !== null ? row.wins : '-'}</td>
                        <td className="py-2 px-3 text-red-400">{row.losses !== null ? row.losses : '-'}</td>
                        <td className="py-2 px-3 text-neutral-400">{row.ties !== null ? row.ties : '-'}</td>
                        <td className="py-2 px-3 text-neutral-300">{row.points_for !== null ? row.points_for : '-'}</td>
                        <td className="py-2 px-3 text-neutral-300">{row.points_against !== null ? row.points_against : '-'}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => handleRemove(row.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Remove</button>
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
