'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function PlayerDatabasesPage() {
  const [game, setGame] = useState('EA FC 26')
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setResults([])
    setHasSearched(false)
    setSearchTerm('')
  }, [game])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.length >= 2) {
        search()
      } else {
        setResults([])
        setHasSearched(false)
      }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchTerm, game])

  const search = async () => {
    setLoading(true)
    setHasSearched(true)

    if (game === 'EA CFB 27') {
      const { data, error } = await supabase
        .from('cfb_player_reference')
        .select('*')
        .or('player_name.ilike.%' + searchTerm + '%,team.ilike.%' + searchTerm + '%')
        .order('overall_rating', { ascending: false })
        .limit(50)

      if (!error) setResults(data)
    } else {
      const { data, error } = await supabase
        .from('player_reference')
        .select('*')
        .or('name.ilike.%' + searchTerm + '%,active_club.ilike.%' + searchTerm + '%')
        .order('overall_rating', { ascending: false })
        .limit(50)

      if (!error) setResults(data)
    }

    setLoading(false)
  }

  const ovrColor = (ovr) => {
    if (ovr === null || ovr === undefined) return 'text-neutral-500'
    if (ovr >= 80) return 'text-green-400'
    if (ovr >= 70) return 'text-yellow-400'
    if (ovr >= 60) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          &larr; Back to Franchises
        </a>

        <h1 className="text-3xl font-bold tracking-tight mt-4 mb-1">Player Databases</h1>
        <p className="text-neutral-400 text-sm mb-6">
          Search the shared player reference data used to auto-populate rosters.
        </p>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setGame('EA FC 26')}
            className={
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' +
              (game === 'EA FC 26' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200')
            }
          >
            EA FC 26
          </button>
          <button
            type="button"
            onClick={() => setGame('EA CFB 27')}
            className={
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' +
              (game === 'EA CFB 27' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200')
            }
          >
            EA CFB 27
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={game === 'EA CFB 27' ? 'Search by player name or team...' : 'Search by player name or club...'}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {loading && <p className="text-neutral-500 text-sm">Searching...</p>}

          {!loading && hasSearched && results.length === 0 && (
            <p className="text-neutral-500 text-sm">No players found matching "{searchTerm}".</p>
          )}

          {!loading && !hasSearched && (
            <p className="text-neutral-500 text-sm">Type at least 2 characters to search.</p>
          )}

          {results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-xs uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Pos</th>
                    {game === 'EA CFB 27' ? (
                      <>
                        <th className="text-left py-2 px-3">Team</th>
                        <th className="text-left py-2 px-3">Class</th>
                        <th className="text-left py-2 px-3">OVR</th>
                        <th className="text-left py-2 px-3">Dev Trait</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left py-2 px-3">Club</th>
                        <th className="text-left py-2 px-3">Age</th>
                        <th className="text-left py-2 px-3">OVR</th>
                        <th className="text-left py-2 px-3">POT</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {results.map(function(p, idx) {
                    return (
                      <tr key={idx} className="border-b border-neutral-800/60">
                        <td className="py-2 px-3 font-medium">{game === 'EA CFB 27' ? p.player_name : p.name}</td>
                        <td className="py-2 px-3 text-neutral-300">{p.position}</td>
                        {game === 'EA CFB 27' ? (
                          <>
                            <td className="py-2 px-3 text-neutral-300">{p.team}</td>
                            <td className="py-2 px-3 text-neutral-300">{p.class}</td>
                            <td className={'py-2 px-3 font-semibold ' + ovrColor(p.overall_rating)}>{p.overall_rating}</td>
                            <td className="py-2 px-3 text-neutral-300">{p.dev_trait}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 text-neutral-300">{p.active_club}</td>
                            <td className="py-2 px-3 text-neutral-300">{p.age}</td>
                            <td className={'py-2 px-3 font-semibold ' + ovrColor(p.overall_rating)}>{p.overall_rating}</td>
                            <td className="py-2 px-3 text-neutral-300">{p.potential_rating}</td>
                          </>
                        )}
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