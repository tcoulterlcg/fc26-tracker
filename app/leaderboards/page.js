'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function formatEuro(num) {
  if (num === null || num === undefined || isNaN(num)) return '-'
  if (num >= 1000000) return '\u20ac' + (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return '\u20ac' + (num / 1000).toFixed(0) + 'K'
  return '\u20ac' + num.toFixed(0)
}

function rankColor(rank) {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-neutral-300'
  if (rank === 3) return 'text-orange-400'
  return 'text-neutral-500'
}

export default function LeaderboardsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUserId(user.id)

    const { data, error } = await supabase.rpc('get_leaderboard')

    if (!error && data) {
      setRows(data)
    }
    setLoading(false)
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
        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          &larr; Franchise Dashboard
        </a>

        <h1 className="text-3xl font-bold tracking-tight mt-4 mb-1">Leaderboards</h1>
        <p className="text-neutral-400 text-sm mb-6">
          All Roster HQ users, ranked by total players rostered across their franchises.
        </p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          {rows.length === 0 ? (
            <p className="text-neutral-500 text-sm">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-xs uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Rank</th>
                    <th className="text-left py-2 px-3">Top Franchise</th>
                    <th className="text-left py-2 px-3">Game</th>
                    <th className="text-left py-2 px-3">Franchises</th>
                    <th className="text-left py-2 px-3">Total Players</th>
                    <th className="text-left py-2 px-3">Top Avg OVR</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(function(row, idx) {
                    const rank = idx + 1
                    const isMe = row.user_id === currentUserId
                    return (
                      <tr
                        key={row.user_id}
                        className={
                          'border-b border-neutral-800/60' +
                          (isMe ? ' bg-emerald-900/20' : '')
                        }
                      >
                        <td className={'py-2.5 px-3 font-bold ' + rankColor(rank)}>#{rank}</td>
                        <td className="py-2.5 px-3 font-medium text-neutral-100">
                          {row.top_club_name || 'Unnamed'}
                          {isMe && <span className="text-emerald-400 text-xs font-normal ml-2">(You)</span>}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-400">{row.top_game || '-'}</td>
                        <td className="py-2.5 px-3 text-neutral-300">{row.franchise_count}</td>
                        <td className="py-2.5 px-3 text-neutral-300">{row.total_players}</td>
                        <td className="py-2.5 px-3 text-neutral-300">{row.top_avg_overall !== null ? row.top_avg_overall : '-'}</td>
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
