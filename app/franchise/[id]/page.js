'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function FranchisePage() {
  const [franchise, setFranchise] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  const [showAddPanel, setShowAddPanel] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [age, setAge] = useState('')
  const [overall, setOverall] = useState('')
  const [potential, setPotential] = useState('')
  const [wage, setWage] = useState('')
  const [contractYears, setContractYears] = useState('')

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchPlayers()
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchTerm])

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
    await loadPlayers()
    setLoading(false)
  }

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('overall_rating', { ascending: false })

    if (!error) {
      setPlayers(data)
    }
  }

  const searchPlayers = async () => {
    const { data, error } = await supabase
      .from('player_reference')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(5)

    if (!error) {
      setSearchResults(data)
      setShowResults(true)
    }
  }

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player)
    setName(player.name)
    setPosition(player.position || '')
    setAge(player.age || '')
    setOverall(player.overall_rating || '')
    setPotential(player.potential_rating || '')
    setSearchTerm(player.name)
    setShowResults(false)
  }

  const resetAddPanel = () => {
    setShowAddPanel(false)
    setSelectedPlayer(null)
    setSearchTerm('')
    setName('')
    setPosition('')
    setAge('')
    setOverall('')
    setPotential('')
    setWage('')
    setContractYears('')
  }

  const handleAddPlayer = async () => {
    const { error } = await supabase
      .from('players')
      .insert({
        franchise_id: franchiseId,
        name: name,
        position: position,
        age: age ? parseInt(age) : null,
        overall_rating: overall ? parseInt(overall) : null,
        potential_rating: potential ? parseInt(potential) : null,
        wage: wage ? parseFloat(wage) : null,
        contract_years_remaining: contractYears ? parseInt(contractYears) : null
      })

    if (!error) {
      resetAddPanel()
      await loadPlayers()
    } else {
      alert(error.message)
    }
  }

  const handleDeletePlayer = async (playerId) => {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (!error) {
      await loadPlayers()
    }
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

        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          &larr; Back to Franchises
        </a>

        <div className="mt-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{franchise.club_name}</h1>
            <p className="text-neutral-400 mt-1">{franchise.league} &middot; Season {franchise.current_season}</p>
          </div>

          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap"
          >
            {showAddPanel ? 'Cancel' : '+ Add Player'}
          </button>
        </div>

        {/* Add Player Panel — only shows when toggled */}
        {showAddPanel && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search player database, e.g. Saka..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setSelectedPlayer(null)
                }}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoFocus
              />
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg overflow-hidden">
                  {searchResults.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => handleSelectPlayer(p)}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-700 flex justify-between items-center text-sm"
                    >
                      <span>{p.name} <span className="text-neutral-400">&middot; {p.position}</span></span>
                      <span className="text-emerald-400 font-semibold">{p.overall_rating}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Only show these once a player is picked (or being entered manually) */}
            {(selectedPlayer || name) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Weekly Wage</label>
                  <input
                    type="number"
                    value={wage}
                    onChange={(e) => setWage(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Contract Years</label>
                  <input
                    type="number"
                    value={contractYears}
                    onChange={(e) => setContractYears(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={resetAddPanel}
                className="text-neutral-400 hover:text-neutral-200 text-sm px-3 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!name}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Add to Roster
              </button>
            </div>
          </div>
        )}

        {/* Roster Table — always visible, the main focus of the page */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Roster ({players.length})</h2>

          {players.length === 0 ? (
            <p className="text-neutral-500 text-sm">No players yet. Click "+ Add Player" above to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-xs uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Pos</th>
                    <th className="text-left py-2 px-3">Age</th>
                    <th className="text-left py-2 px-3">OVR</th>
                    <th className="text-left py-2 px-3">POT</th>
                    <th className="text-left py-2 px-3">Wage</th>
                    <th className="text-left py-2 px-3">Contract</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/40">
                      <td className="py-2.5 px-3 font-medium">{p.name}</td>
                      <td className="py-2.5 px-3 text-neutral-300">{p.position}</td>
                      <td className="py-2.5 px-3 text-neutral-300">{p.age}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-400 font-semibold">{p.overall_rating}</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">{p.potential_rating}</td>
                      <td className="py-2.5 px-3 text-neutral-300">{p.wage ? `£${p.wage}` : '-'}</td>
                      <td className="py-2.5 px-3 text-neutral-300">{p.contract_years_remaining ? `${p.contract_years_remaining} yrs` : '-'}</td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleDeletePlayer(p.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}