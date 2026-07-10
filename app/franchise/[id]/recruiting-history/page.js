'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function starDisplay(n) {
  if (!n) return '-'
  return '\u2605'.repeat(n) + '\u2606'.repeat(5 - n)
}

export default function RecruitingHistoryPage() {
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recruits, setRecruits] = useState([])

  const [playerName, setPlayerName] = useState('')
  const [position, setPosition] = useState('')
  const [starRating, setStarRating] = useState('3')
  const [homeState, setHomeState] = useState('')
  const [status, setStatus] = useState('Committed')
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

    if (franchiseData.game !== 'EA CFB 27') {
      router.push('/franchise/' + franchiseId)
      return
    }

    setFranchise(franchiseData)
    await loadRecruits()
    setLoading(false)
  }

  const loadRecruits = async () => {
    const { data, error } = await supabase
      .from('recruiting_history')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('season', { ascending: false })
      .order('star_rating', { ascending: false })

    if (!error) setRecruits(data)
  }

  const handleAddRecruit = async () => {
    if (!playerName.trim()) return
    setSaving(true)

    const payload = {
      franchise_id: franchiseId,
      season: franchise.current_season,
      player_name: playerName.trim(),
      position: position.trim() || null,
      star_rating: parseInt(starRating),
      home_state: homeState.trim() || null,
      status: status
    }

    const { error } = await supabase.from('recruiting_history').insert(payload)

    setSaving(false)
    if (!error) {
      setPlayerName('')
      setPosition('')
      setHomeState('')
      setStarRating('3')
      setStatus('Committed')
      await loadRecruits()
    } else {
      alert(error.message)
    }
  }

  const handleRemove = async (id) => {
    const { error } = await supabase.from('recruiting_history').delete().eq('id', id)
    if (!error) await loadRecruits()
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
        <a href={'/franchise/' + franchiseId} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          &larr; Back to {franchise.club_name}
        </a>

        <h1 className="text-3xl font-bold tracking-tight mt-4 mb-1">Recruiting History</h1>
        <p className="text-neutral-400 text-sm mb-6">Track your recruiting classes. Season {franchise.current_season}.</p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Player Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Position</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Star Rating</label>
              <select
                value={starRating}
                onChange={(e) => setStarRating(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="2">2 Star</option>
                <option value="3">3 Star</option>
                <option value="4">4 Star</option>
                <option value="5">5 Star</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Home State</label>
              <input
                type="text"
                value={homeState}
                onChange={(e) => setHomeState(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Committed">Committed</option>
                <option value="Signed">Signed</option>
                <option value="Decommitted">Decommitted</option>
                <option value="Enrolled">Enrolled</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAddRecruit}
            disabled={saving || !playerName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {saving ? 'Saving...' : 'Add Recruit'}
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-neutral-200 mb-4">Recruiting Classes ({recruits.length})</h2>
          {recruits.length === 0 ? (
            <p className="text-neutral-500 text-sm">No recruits logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-xs uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Season</th>
                    <th className="text-left py-2 px-3">Player</th>
                    <th className="text-left py-2 px-3">Pos</th>
                    <th className="text-left py-2 px-3">Stars</th>
                    <th className="text-left py-2 px-3">Home State</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {recruits.map(function(r) {
                    return (
                      <tr key={r.id} className="border-b border-neutral-800/60">
                        <td className="py-2 px-3">Season {r.season}</td>
                        <td className="py-2 px-3 font-medium">{r.player_name}</td>
                        <td className="py-2 px-3 text-neutral-300">{r.position || '-'}</td>
                        <td className="py-2 px-3 text-yellow-400">{starDisplay(r.star_rating)}</td>
                        <td className="py-2 px-3 text-neutral-300">{r.home_state || '-'}</td>
                        <td className="py-2 px-3 text-neutral-300">{r.status}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => handleRemove(r.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Remove</button>
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
