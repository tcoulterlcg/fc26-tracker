'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const ALL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'position', label: 'Pos' },
  { key: 'age', label: 'Age' },
  { key: 'nationality', label: 'Nation' },
  { key: 'overall_rating', label: 'OVR' },
  { key: 'potential_rating', label: 'POT' },
  { key: 'active_club', label: 'Club' },
  { key: 'status', label: 'Status' },
  { key: 'owned_by', label: 'Owned By' },
  { key: 'squad_number', label: 'Squad #' },
  { key: 'contract', label: 'Contract' },
  { key: 'value_eur', label: 'Value' },
  { key: 'wage_eur_wk', label: 'Wage' },
  { key: 'gro', label: 'GRO' },
  { key: 'skill_moves', label: 'SM' },
  { key: 'weak_foot', label: 'WF' },
  { key: 'work_rate', label: 'WR' },
  { key: 'height_cm', label: 'Height' },
  { key: 'weight_kg', label: 'Weight' },
  { key: 'build', label: 'Build' },
  { key: 'igs', label: 'IGS' }
]

const COLUMN_ORDER_STORAGE_KEY = 'fc26_roster_column_order'

function average(nums) {
  const valid = nums.filter(function(n) { return typeof n === 'number' && !isNaN(n) })
  if (valid.length === 0) return null
  const sum = valid.reduce(function(a, b) { return a + b }, 0)
  return sum / valid.length
}

function formatEuro(num) {
  if (num === null || num === undefined || isNaN(num)) return '\u20ac0'
  if (num >= 1000000) return '\u20ac' + (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return '\u20ac' + (num / 1000).toFixed(0) + 'K'
  return '\u20ac' + num.toFixed(0)
}

export default function FranchisePage() {
  const [franchise, setFranchise] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [importingRoster, setImportingRoster] = useState(false)

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

  const [filters, setFilters] = useState({})
  const [activeFilterColumn, setActiveFilterColumn] = useState(null)
  const [sortField, setSortField] = useState('overall_rating')
  const [sortDirection, setSortDirection] = useState('desc')

  const [columnOrder, setColumnOrder] = useState(ALL_COLUMNS.map(function(c) { return c.key }))
  const [dragKey, setDragKey] = useState(null)
  const [dragOverKey, setDragOverKey] = useState(null)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id

  useEffect(() => {
    loadData()
    loadColumnOrder()
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

  const loadColumnOrder = () => {
    try {
      const saved = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const validKeys = ALL_COLUMNS.map(function(c) { return c.key })
        const filtered = parsed.filter(function(k) { return validKeys.indexOf(k) !== -1 })
        const missing = validKeys.filter(function(k) { return filtered.indexOf(k) === -1 })
        setColumnOrder(filtered.concat(missing))
      }
    } catch (e) {
      // ignore, fall back to default order
    }
  }

  const saveColumnOrder = (order) => {
    try {
      window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(order))
    } catch (e) {
      // ignore
    }
  }

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

  const handleImportRoster = async () => {
    setImportingRoster(true)

    const referenceResult = await supabase
      .from('player_reference')
      .select('*')
      .ilike('active_club', franchise.club_name)

    if (!referenceResult.error && referenceResult.data.length > 0) {
      const playersToInsert = referenceResult.data.map(function(p) {
        return {
          franchise_id: franchiseId,
          name: p.name,
          position: p.position,
          age: p.age,
          overall_rating: p.overall_rating,
          potential_rating: p.potential_rating,
          nationality: p.nationality,
          active_club: p.active_club,
          status: p.status,
          owned_by: p.owned_by,
          squad_number: p.squad_number,
          contract: p.contract,
          value_eur: p.value_eur,
          wage_eur_wk: p.wage_eur_wk,
          wage: p.wage_eur_wk,
          gro: p.gro,
          skill_moves: p.skill_moves,
          weak_foot: p.weak_foot,
          work_rate: p.work_rate,
          height_cm: p.height_cm,
          weight_kg: p.weight_kg,
          build: p.build,
          igs: p.igs,
          contract_years_remaining: null
        }
      })

      await supabase.from('players').insert(playersToInsert)
      await loadPlayers()
    } else {
      alert('No players found in the database for "' + franchise.club_name + '". Try importing player data first.')
    }

    setImportingRoster(false)
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

  const uniqueValuesForColumn = function(key) {
    const seen = {}
    const list = []
    for (let i = 0; i < players.length; i++) {
      const val = players[i][key]
      if (val !== null && val !== undefined && val !== '' && !seen[val]) {
        seen[val] = true
        list.push(val)
      }
    }
    return list.sort(function(a, b) {
      return String(a).localeCompare(String(b))
    })
  }

  const handleFilterChange = (key, value) => {
    setFilters(function(prev) {
      const next = Object.assign({}, prev)
      if (value) {
        next[key] = value
      } else {
        delete next[key]
      }
      return next
    })
  }

  const clearFilter = (key) => {
    setFilters(function(prev) {
      const next = Object.assign({}, prev)
      delete next[key]
      return next
    })
  }

  const clearAllFilters = () => {
    setFilters({})
  }

  const displayedPlayers = useMemo(function() {
    let result = players.slice()

    const filterKeys = Object.keys(filters)
    for (let k = 0; k < filterKeys.length; k++) {
      const key = filterKeys[k]
      const filterVal = String(filters[key]).toLowerCase()
      result = result.filter(function(p) {
        const cellVal = p[key]
        if (cellVal === null || cellVal === undefined) return false
        return String(cellVal).toLowerCase().indexOf(filterVal) !== -1
      })
    }

    result.sort(function(a, b) {
      let valA = a[sortField]
      let valB = b[sortField]

      if (valA === null || valA === undefined) valA = sortDirection === 'asc' ? Infinity : -Infinity
      if (valB === null || valB === undefined) valB = sortDirection === 'asc' ? Infinity : -Infinity

      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [players, filters, sortField, sortDirection])

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortIndicator = (field) => {
    if (sortField !== field) return '\u2195'
    return sortDirection === 'asc' ? '\u25B2' : '\u25BC'
  }

  const activeFilterCount = Object.keys(filters).length

  const orderedColumns = useMemo(function() {
    const byKey = {}
    for (let i = 0; i < ALL_COLUMNS.length; i++) {
      byKey[ALL_COLUMNS[i].key] = ALL_COLUMNS[i]
    }
    return columnOrder.map(function(k) { return byKey[k] }).filter(Boolean)
  }, [columnOrder])

  const handleDragStart = (key) => {
    setDragKey(key)
  }

  const handleDragOver = (e, key) => {
    e.preventDefault()
    if (key !== dragOverKey) {
      setDragOverKey(key)
    }
  }

  const handleDrop = (e, targetKey) => {
    e.preventDefault()
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null)
      setDragOverKey(null)
      return
    }

    setColumnOrder(function(prev) {
      const next = prev.slice()
      const fromIdx = next.indexOf(dragKey)
      const toIdx = next.indexOf(targetKey)
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, dragKey)
      saveColumnOrder(next)
      return next
    })

    setDragKey(null)
    setDragOverKey(null)
  }

  const handleDragEnd = () => {
    setDragKey(null)
    setDragOverKey(null)
  }

  const resetColumnOrder = () => {
    const defaultOrder = ALL_COLUMNS.map(function(c) { return c.key })
    setColumnOrder(defaultOrder)
    saveColumnOrder(defaultOrder)
  }

  const teamStats = useMemo(function() {
    const ages = players.map(function(p) { return p.age })
    const overalls = players.map(function(p) { return p.overall_rating })
    const potentials = players.map(function(p) { return p.potential_rating })
    const values = players.map(function(p) { return p.value_eur })
    const wages = players.map(function(p) { return p.wage_eur_wk })

    const totalValue = values.reduce(function(sum, v) {
      return sum + (typeof v === 'number' && !isNaN(v) ? v : 0)
    }, 0)

    const totalWage = wages.reduce(function(sum, w) {
      return sum + (typeof w === 'number' && !isNaN(w) ? w : 0)
    }, 0)

    let topPlayer = null
    for (let i = 0; i < players.length; i++) {
      if (typeof players[i].overall_rating === 'number') {
        if (!topPlayer || players[i].overall_rating > topPlayer.overall_rating) {
          topPlayer = players[i]
        }
      }
    }

    return {
      squadSize: players.length,
      avgAge: average(ages),
      avgOverall: average(overalls),
      avgPotential: average(potentials),
      totalValue: totalValue,
      totalWage: totalWage,
      topPlayer: topPlayer
    }
  }, [players])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          &larr; Back to Franchises
        </a>

        <div className="mt-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{franchise.club_name}</h1>
            <p className="text-neutral-400 mt-1">{franchise.league} &middot; Season {franchise.current_season}</p>
          </div>

          <div className="flex gap-2">
            {players.length === 0 && (
              <button
                onClick={handleImportRoster}
                disabled={importingRoster}
                className="border border-emerald-600 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap disabled:opacity-40"
              >
                {importingRoster ? 'Importing...' : 'Import Roster from Database'}
              </button>
            )}
            <button
              onClick={() => setShowAddPanel(!showAddPanel)}
              className="bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap"
            >
              {showAddPanel ? 'Cancel' : '+ Add Player'}
            </button>
          </div>
        </div>

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
                <div className="absolute z-20 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg overflow-hidden">
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

        {players.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Squad Size</p>
              <p className="text-2xl font-semibold text-neutral-100">{teamStats.squadSize}</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Avg Age</p>
              <p className="text-2xl font-semibold text-neutral-100">
                {teamStats.avgAge !== null ? teamStats.avgAge.toFixed(1) : '-'}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Avg Overall</p>
              <p className="text-2xl font-semibold text-emerald-400">
                {teamStats.avgOverall !== null ? teamStats.avgOverall.toFixed(1) : '-'}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Avg Potential</p>
              <p className="text-2xl font-semibold text-neutral-100">
                {teamStats.avgPotential !== null ? teamStats.avgPotential.toFixed(1) : '-'}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Team Value</p>
              <p className="text-2xl font-semibold text-neutral-100">{formatEuro(teamStats.totalValue)}</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Weekly Wages</p>
              <p className="text-2xl font-semibold text-neutral-100">{formatEuro(teamStats.totalWage)}</p>
            </div>
          </div>
        )}

        {players.length > 0 && teamStats.topPlayer && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-0.5">Best Player</p>
              <p className="font-semibold text-neutral-100">
                {teamStats.topPlayer.name}
                <span className="text-neutral-400 font-normal"> &middot; {teamStats.topPlayer.position}</span>
              </p>
            </div>
            <span className="text-emerald-400 font-bold text-xl">{teamStats.topPlayer.overall_rating}</span>
          </div>
        )}

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex justify-end items-center mb-4">
            <div className="flex items-center gap-4">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-neutral-400 hover:text-neutral-200 text-xs font-medium"
                >
                  Clear all filters ({activeFilterCount})
                </button>
              )}
              <button
                onClick={resetColumnOrder}
                className="text-neutral-400 hover:text-neutral-200 text-xs font-medium"
              >
                Reset column order
              </button>
            </div>
          </div>

          {players.length > 0 && (
            <p className="text-neutral-500 text-xs mb-3">
              Drag a column header to reorder it. Click a header's name to filter, click the arrow to sort.
            </p>
          )}

          {players.length === 0 ? (
            <p className="text-neutral-500 text-sm">No players yet. Click "Import Roster from Database" if your players are already in the database, or "+ Add Player" to add them individually.</p>
          ) : displayedPlayers.length === 0 ? (
            <p className="text-neutral-500 text-sm">No players match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-xs uppercase tracking-wide border-b border-neutral-800">
                    {orderedColumns.map(function(col) {
                      const hasFilter = filters[col.key] !== undefined
                      const isDragOver = dragOverKey === col.key && dragKey !== col.key
                      return (
                        <th
                          key={col.key}
                          draggable
                          onDragStart={() => handleDragStart(col.key)}
                          onDragOver={(e) => handleDragOver(e, col.key)}
                          onDrop={(e) => handleDrop(e, col.key)}
                          onDragEnd={handleDragEnd}
                          className={
                            'relative text-left py-2 px-3 whitespace-nowrap cursor-move select-none' +
                            (isDragOver ? ' bg-emerald-900/30 border-l-2 border-emerald-500' : '')
                          }
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveFilterColumn(activeFilterColumn === col.key ? null : col.key)
                              }}
                              className={'cursor-pointer hover:text-emerald-400' + (hasFilter ? ' text-emerald-400' : '')}
                            >
                              {col.label}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSort(col.key)
                              }}
                              className={'text-xs ' + (sortField === col.key ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300')}
                              title="Sort"
                            >
                              {sortIndicator(col.key)}
                            </button>
                          </div>

                          {activeFilterColumn === col.key && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActiveFilterColumn(null)}
                              />
                              <div className="absolute z-40 mt-2 left-0 w-56 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl p-2 normal-case font-normal text-neutral-200">
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder={'Type to filter ' + col.label + '...'}
                                  value={filters[col.key] || ''}
                                  onChange={(e) => handleFilterChange(col.key, e.target.value)}
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <div className="max-h-48 overflow-y-auto">
                                  {uniqueValuesForColumn(col.key)
                                    .filter(function(v) {
                                      const f = filters[col.key]
                                      if (!f) return true
                                      return String(v).toLowerCase().indexOf(String(f).toLowerCase()) !== -1
                                    })
                                    .map(function(v, idx) {
                                      return (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => {
                                            handleFilterChange(col.key, String(v))
                                            setActiveFilterColumn(null)
                                          }}
                                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-neutral-700"
                                        >
                                          {v}
                                        </button>
                                      )
                                    })}
                                </div>
                                {hasFilter && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      clearFilter(col.key)
                                      setActiveFilterColumn(null)
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded text-red-400 hover:bg-neutral-700 mt-1 border-t border-neutral-700"
                                  >
                                    Clear filter
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </th>
                      )
                    })}
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPlayers.map((p, rowIdx) => (
                    <tr
                      key={p.id}
                      className={
                        (rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-neutral-800/40') +
                        ' border-b border-neutral-800/60 hover:bg-neutral-700/40'
                      }
                    >
                      {orderedColumns.map(function(col) {
                        let displayValue = p[col.key]

                        if (col.key === 'overall_rating') {
                          return (
                            <td key={col.key} className="py-2.5 px-3 whitespace-nowrap">
                              <span className="text-emerald-400 font-semibold">{displayValue}</span>
                            </td>
                          )
                        }

                        if (col.key === 'value_eur' || col.key === 'wage_eur_wk') {
                          displayValue = displayValue ? '\u20ac' + displayValue.toLocaleString() : '-'
                        }

                        return (
                          <td key={col.key} className="py-2.5 px-3 text-neutral-300 whitespace-nowrap">
                            {displayValue}
                          </td>
                        )
                      })}
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleDeletePlayer(p.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-medium whitespace-nowrap"
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