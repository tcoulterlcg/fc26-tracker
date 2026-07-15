'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { aliasCanonicalNames } from '@/lib/teamAliases'
import { fuzzyPlayerSearch, similarity } from '@/lib/fuzzySearch'

function mlbVersionLabel(v) {
  const d = new Date(v + 'T00:00:00')
  if (isNaN(d.getTime())) return v
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Position options per game (for the position filter dropdown).
const POSITIONS = {
  'EA FC 26': ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'],
  'EA CFB 27': ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT', 'LE', 'RE', 'DT', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS', 'K', 'P'],
  'MLB The Show 26': ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CP'],
}
// Which games expose age / numeric potential (drives the max-age + potential sort).
const HAS_AGE = { 'EA FC 26': true, 'MLB The Show 26': true, 'EA CFB 27': false }
const HAS_POTENTIAL = { 'EA FC 26': true, 'MLB The Show 26': false, 'EA CFB 27': false }

export default function PlayerDatabasesPage() {
  const [game, setGame] = useState('EA FC 26')
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [mlbVersion, setMlbVersion] = useState('')
  const [mlbVersions, setMlbVersions] = useState([])
  // Filters / sort — let you browse (e.g. highest-potential GKs under 22).
  const [position, setPosition] = useState('All')
  const [maxAge, setMaxAge] = useState('')
  const [sortBy, setSortBy] = useState('overall')

  const supabase = createClient()

  useEffect(() => {
    setResults([])
    setHasSearched(false)
    setSearchTerm('')
    setPosition('All')
    setMaxAge('')
    setSortBy('overall')
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
    const active = searchTerm.length >= 2 || position !== 'All' || maxAge !== ''
    const delayDebounce = setTimeout(() => {
      if (active) search()
      else { setResults([]); setHasSearched(false) }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchTerm, game, mlbVersion, position, maxAge, sortBy])

  const search = async () => {
    setLoading(true)
    setHasSearched(true)

    const isCfb = game === 'EA CFB 27'
    const isMlb = game === 'MLB The Show 26'
    const table = isCfb ? 'cfb_player_reference' : isMlb ? 'mlb_player_reference' : 'player_reference'
    const nameCol = (isCfb || isMlb) ? 'player_name' : 'name'
    const clubCol = (isCfb || isMlb) ? 'team' : 'active_club'
    const term = searchTerm.trim()
    const filtering = position !== 'All' || maxAge !== ''

    if (isMlb && !mlbVersion) { setResults([]); setLoading(false); return }

    // Structured query: name/club text + position + max age + sort. Also powers
    // pure browse (e.g. GK, age <= 21, sort by potential — no name needed).
    let q = supabase.from(table).select('*')
    if (isMlb) q = q.eq('version', mlbVersion)
    if (term.length >= 2) q = q.or(nameCol + '.ilike.%' + term + '%,' + clubCol + '.ilike.%' + term + '%')
    if (position !== 'All') q = q.eq('position', position)
    if (maxAge !== '' && HAS_AGE[game]) { const a = parseInt(maxAge, 10); if (!isNaN(a)) q = q.lte('age', a) }

    const upside = sortBy === 'upside' && HAS_POTENTIAL[game]
    if (sortBy === 'potential' && HAS_POTENTIAL[game]) {
      q = q.order('potential_rating', { ascending: false, nullsFirst: false }).order('overall_rating', { ascending: false, nullsFirst: false })
    } else if (sortBy === 'age' && HAS_AGE[game]) {
      q = q.order('age', { ascending: true, nullsFirst: false }).order('overall_rating', { ascending: false, nullsFirst: false })
    } else {
      q = q.order('overall_rating', { ascending: false, nullsFirst: false })
    }
    q = q.limit(upside ? 300 : 50)

    const { data, error } = await q
    let rows = error ? [] : (data || [])

    // Pure name search (no structural filters): keep nickname + typo tolerance.
    if (term.length >= 2 && !filtering) {
      const aliases = aliasCanonicalNames(term)
      if (aliases.length > 0) {
        const alias = await supabase.from(table).select('*').in(clubCol, aliases).order('overall_rating', { ascending: false }).limit(50)
        if (!alias.error && alias.data) { const seen = new Set(rows.map((r) => r.id)); rows = rows.concat(alias.data.filter((r) => !seen.has(r.id))) }
      }
      if (rows.length < 3) {
        const fuzzy = await fuzzyPlayerSearch(supabase, table, nameCol, term, 50, isMlb ? (qq) => qq.eq('version', mlbVersion) : undefined)
        const seen = new Set(rows.map((r) => r.id))
        rows = rows.concat(fuzzy.filter((r) => !seen.has(r.id)))
        rows.sort((a, b) => similarity(term, b[nameCol]) - similarity(term, a[nameCol]))
      }
    } else if (upside) {
      rows.sort((a, b) => ((b.potential_rating || 0) - (b.overall_rating || 0)) - ((a.potential_rating || 0) - (a.overall_rating || 0)) || (b.potential_rating || 0) - (a.potential_rating || 0))
    }

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
          {/* Filters + sort — browse without a name (e.g. GK · age <= 21 · sort by potential) */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Position</label>
              <select value={position} onChange={(e) => setPosition(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="All">All positions</option>
                {(POSITIONS[game] || []).map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            {HAS_AGE[game] && (
              <div>
                <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Max age</label>
                <input type="number" min="15" max="50" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="Any"
                  className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            )}
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Sort by</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="overall">Overall (high → low)</option>
                {HAS_POTENTIAL[game] && <option value="potential">Potential (high → low)</option>}
                {HAS_POTENTIAL[game] && <option value="upside">Upside (POT − OVR)</option>}
                {HAS_AGE[game] && <option value="age">Age (young → old)</option>}
              </select>
            </div>
            {(position !== 'All' || maxAge !== '') && (
              <button type="button" onClick={() => { setPosition('All'); setMaxAge('') }}
                className="text-violet-400 hover:text-violet-300 text-xs font-semibold pb-2.5">Clear filters</button>
            )}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={game === 'EA CFB 27' ? 'Search by player name or team… (optional)' : 'Search by player name or club… (optional)'}
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
              <p className="text-neutral-500 text-sm">Pick a position / max age above, or type a name (2+ characters), to browse.</p>
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
                            <td className="py-2.5 px-3 text-neutral-300 tabular-nums">{p.nil_value != null ? '$' + p.nil_value.toLocaleString() : '-'}</td>
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