'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { aliasCanonicalNames } from '@/lib/teamAliases'

function mlbVersionLabel(v) {
  const d = new Date(v + 'T00:00:00')
  if (isNaN(d.getTime())) return v
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PlayerDatabasesPage() {
  const [game, setGame] = useState('EA FC 26')
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [mlbVersion, setMlbVersion] = useState('')
  const [mlbVersions, setMlbVersions] = useState([])

  const supabase = createClient()

  useEffect(() => {
    setResults([])
    setHasSearched(false)
    setSearchTerm('')
  }, [game])

  useEffect(() => {
    if (game !== 'MLB The Show 26') return
    supabase.from('mlb_player_reference').select('version').then(({ data }) => {
      const vs = [...new Set((data || []).map((r) => r.version))].sort().reverse()
      setMlbVersions(vs)
      setMlbVersion(vs[0] || '')
    })
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
  }, [searchTerm, game, mlbVersion])

  const search = async () => {
    setLoading(true)
    setHasSearched(true)

    if (game === 'MLB The Show 26') {
      if (!mlbVersion) { setResults([]); setLoading(false); return }
      const { data, error } = await supabase
        .from('mlb_player_reference')
        .select('*')
        .eq('version', mlbVersion)
        .or('player_name.ilike.%' + searchTerm + '%,team.ilike.%' + searchTerm + '%')
        .order('overall_rating', { ascending: false })
        .limit(50)
      if (!error) setResults(data)
      setLoading(false)
      return
    }

    const isCfb = game === 'EA CFB 27'
    const table = isCfb ? 'cfb_player_reference' : 'player_reference'
    const nameCol = isCfb ? 'player_name' : 'name'
    const clubCol = isCfb ? 'team' : 'active_club'

    const primary = await supabase
      .from(table)
      .select('*')
      .or(nameCol + '.ilike.%' + searchTerm + '%,' + clubCol + '.ilike.%' + searchTerm + '%')
      .order('overall_rating', { ascending: false })
      .limit(50)

    let rows = primary.error ? [] : (primary.data || [])

    // Nickname / acronym expansion: "PSG" -> Paris Saint-Germain, "OSU" -> Ohio State, etc.
    const aliases = aliasCanonicalNames(searchTerm)
    if (aliases.length > 0) {
      const alias = await supabase
        .from(table)
        .select('*')
        .in(clubCol, aliases)
        .order('overall_rating', { ascending: false })
        .limit(50)
      if (!alias.error && alias.data) {
        const seen = new Set(rows.map((r) => r.id))
        rows = rows.concat(alias.data.filter((r) => !seen.has(r.id)))
      }
    }

    rows.sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0))
    setResults(rows.slice(0, 50))
    setLoading(false)
  }

  const ovrColor = (ovr) => {
    if (ovr === null || ovr === undefined) return 'text-neutral-500'
    if (ovr >= 85) return 'text-green-400'
    if (ovr >= 80) return 'text-green-400'
    if (ovr >= 72) return 'text-amber-400'
    if (ovr >= 64) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <a href="/" className="inline-flex items-center text-violet-400 hover:text-violet-300 text-sm font-semibold transition-colors">
          &larr; Back to Franchises
        </a>

        <header className="mt-5 mb-8">
          <h1 className="text-4xl font-bold uppercase tracking-tight leading-none">Player Databases</h1>
          <p className="text-neutral-400 text-sm mt-2">
            Search the shared player reference data used to auto-populate rosters.
          </p>
        </header>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setGame('EA FC 26')}
            className={
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ' +
              (game === 'EA FC 26' ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200')
            }
          >
            EA FC 26
          </button>
          <button
            type="button"
            onClick={() => setGame('EA CFB 27')}
            className={
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ' +
              (game === 'EA CFB 27' ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200')
            }
          >
            EA CFB 27
          </button>
          <button
            type="button"
            onClick={() => setGame('MLB The Show 26')}
            className={
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ' +
              (game === 'MLB The Show 26' ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200')
            }
          >
            MLB The Show 26
          </button>
        </div>

        {game === 'MLB The Show 26' && mlbVersions.length > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <label className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em]">Roster update</label>
            <select
              value={mlbVersion}
              onChange={(e) => setMlbVersion(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {mlbVersions.map((v) => (<option key={v} value={v}>{mlbVersionLabel(v)}</option>))}
            </select>
          </div>
        )}

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={game === 'EA FC 26' ? 'Search by player name or club...' : 'Search by player name or team...'}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm placeholder:text-neutral-500 mb-5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />

          {loading && (
            <div className="py-10 text-center">
              <p className="text-neutral-500 text-sm animate-pulse">Searching...</p>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="py-10 text-center border border-dashed border-neutral-800 rounded-lg">
              <p className="text-neutral-500 text-sm">No players found matching "{searchTerm}".</p>
            </div>
          )}

          {!loading && !hasSearched && (
            <div className="py-10 text-center border border-dashed border-neutral-800 rounded-lg">
              <p className="text-neutral-500 text-sm">Type at least 2 characters to search.</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-[11px] uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Pos</th>
                    {game === 'EA CFB 27' ? (
                      <>
                        <th className="text-left py-2 px-3">Team</th>
                        <th className="text-left py-2 px-3">Class</th>
                        <th className="text-left py-2 px-3">OVR</th>
                        <th className="text-left py-2 px-3">Dev Trait</th>
                        <th className="text-left py-2 px-3">NIL</th>
                      </>
                    ) : game === 'MLB The Show 26' ? (
                      <>
                        <th className="text-left py-2 px-3">Team</th>
                        <th className="text-left py-2 px-3">OVR</th>
                        <th className="text-left py-2 px-3">Level</th>
                        <th className="text-left py-2 px-3">Age</th>
                        <th className="text-left py-2 px-3">B/T</th>
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
                      <tr key={idx} className="border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-neutral-100">{game === 'EA FC 26' ? p.name : p.player_name}</td>
                        <td className="py-2.5 px-3 text-neutral-400">{p.position}</td>
                        {game === 'EA CFB 27' ? (
                          <>
                            <td className="py-2.5 px-3 text-neutral-300">{p.team}</td>
                            <td className="py-2.5 px-3 text-neutral-400">{p.class}</td>
                            <td className={'py-2.5 px-3 font-bold tabular-nums ' + ovrColor(p.overall_rating)}>{p.overall_rating}</td>
                            <td className="py-2.5 px-3 text-neutral-400">{p.dev_trait}</td>
                            <td className="py-2.5 px-3 text-neutral-300 tabular-nums">{p.nil_value != null ? p.nil_value.toLocaleString() : '-'}</td>
                          </>
                        ) : game === 'MLB The Show 26' ? (
                          <>
                            <td className="py-2.5 px-3 text-neutral-300">{p.team}</td>
                            <td className={'py-2.5 px-3 font-bold tabular-nums ' + ovrColor(p.overall_rating)}>{p.overall_rating}</td>
                            <td className="py-2.5 px-3 text-neutral-400">{p.level}</td>
                            <td className="py-2.5 px-3 text-neutral-400 tabular-nums">{p.age}</td>
                            <td className="py-2.5 px-3 text-neutral-400">{p.bats}/{p.throws}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 text-neutral-300">{p.active_club}</td>
                            <td className="py-2.5 px-3 text-neutral-400 tabular-nums">{p.age}</td>
                            <td className={'py-2.5 px-3 font-bold tabular-nums ' + ovrColor(p.overall_rating)}>{p.overall_rating}</td>
                            <td className={'py-2.5 px-3 font-bold tabular-nums ' + ovrColor(p.potential_rating)}>{p.potential_rating}</td>
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