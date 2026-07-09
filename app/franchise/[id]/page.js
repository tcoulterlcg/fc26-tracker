'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FC_COLUMNS = [
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

const CFB_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'position', label: 'Pos' },
  { key: 'jersey_number', label: 'No.' },
  { key: 'cfb_class', label: 'Class' },
  { key: 'archetype', label: 'Archetype' },
  { key: 'overall_rating', label: 'OVR' },
  { key: 'dev_trait', label: 'Dev Trait' },
  { key: 'speed', label: 'Speed' },
  { key: 'strength', label: 'Strength' },
  { key: 'agility', label: 'Agility' },
  { key: 'acceleration', label: 'Accel' },
  { key: 'change_of_direction', label: 'COD' },
  { key: 'injury', label: 'Injury' },
  { key: 'stamina', label: 'Stamina' },
  { key: 'awareness', label: 'Awareness' }
]

const CFB_POSITION_GROUP = {
  'QB': 'Offense', 'HB': 'Offense', 'FB': 'Offense', 'WR': 'Offense', 'TE': 'Offense',
  'LT': 'Offense', 'LG': 'Offense', 'C': 'Offense', 'RG': 'Offense', 'RT': 'Offense',
  'LE': 'Defense', 'RE': 'Defense', 'DT': 'Defense', 'LOLB': 'Defense', 'MLB': 'Defense',
  'ROLB': 'Defense', 'CB': 'Defense', 'FS': 'Defense', 'SS': 'Defense',
  'K': 'Special Teams', 'P': 'Special Teams', 'LS': 'Special Teams'
}

const CFB_POSITION_ORDER = ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT', 'LE', 'RE', 'DT', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS', 'K', 'P', 'LS']

const CFB_GROUPS = [
  { key: 'qb', label: 'Quarterbacks', side: 'Offense', positions: ['QB'] },
  { key: 'rb', label: 'Running Backs', side: 'Offense', positions: ['HB', 'FB'] },
  { key: 'wr', label: 'Wide Receivers', side: 'Offense', positions: ['WR'] },
  { key: 'te', label: 'Tight Ends', side: 'Offense', positions: ['TE'] },
  { key: 'ol', label: 'Offensive Line', side: 'Offense', positions: ['LT', 'LG', 'C', 'RG', 'RT'] },
  { key: 'dl', label: 'Defensive Line', side: 'Defense', positions: ['LE', 'RE', 'DT'] },
  { key: 'lb', label: 'Linebackers', side: 'Defense', positions: ['LOLB', 'MLB', 'ROLB'] },
  { key: 'db', label: 'Secondary', side: 'Defense', positions: ['CB', 'FS', 'SS'] },
  { key: 'st', label: 'Kickers/Punters', side: 'Special Teams', positions: ['K', 'P', 'LS'] }
]

const DEPTH_GROUPS = [
  { label: 'Backfield', side: 'Offense', positions: ['QB', 'HB', 'FB'] },
  { label: 'Receivers', side: 'Offense', positions: ['WR', 'TE'] },
  { label: 'O-Line', side: 'Offense', positions: ['LT', 'LG', 'C', 'RG', 'RT'] },
  { label: 'D-Line', side: 'Defense', positions: ['LE', 'RE', 'DT'] },
  { label: 'Linebackers', side: 'Defense', positions: ['LOLB', 'MLB', 'ROLB'] },
  { label: 'Secondary', side: 'Defense', positions: ['CB', 'FS', 'SS'] },
  { label: 'Specialists', side: 'Special Teams', positions: ['K', 'P', 'LS'] }
]

const COLUMN_ORDER_STORAGE_PREFIX = 'roster_column_order_'

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

function ovrBadgeColor(ovr) {
  if (ovr === null || ovr === undefined) return 'bg-neutral-700'
  if (ovr >= 90) return 'bg-emerald-600'
  if (ovr >= 80) return 'bg-emerald-800'
  if (ovr >= 70) return 'bg-amber-700'
  return 'bg-neutral-700'
}

function OvrBadge({ value, small }) {
  if (value === null || value === undefined) return <span className="text-neutral-500">-</span>
  return (
    <span className={'inline-block text-white font-bold rounded-full text-center ' + ovrBadgeColor(value) + (small ? ' text-xs px-2 py-0.5 min-w-[28px]' : ' text-xs px-2.5 py-1 min-w-[32px]')}>
      {value}
    </span>
  )
}

export default function FranchisePage() {
  const [franchise, setFranchise] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [importingRoster, setImportingRoster] = useState(false)

  const [activeTab, setActiveTab] = useState('roster')
  const [expandedGroup, setExpandedGroup] = useState(null)

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

  const [columnOrder, setColumnOrder] = useState(null)
  const [dragKey, setDragKey] = useState(null)
  const [dragOverKey, setDragOverKey] = useState(null)

  const [depthDragId, setDepthDragId] = useState(null)
  const [depthDragOverId, setDepthDragOverId] = useState(null)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id

  const isCfb = franchise && franchise.game === 'EA CFB 27'
  const gameColumns = isCfb ? CFB_COLUMNS : FC_COLUMNS

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (franchise) {
      loadColumnOrder()
    }
  }, [franchise])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchPlayers()
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchTerm, franchise])

  const storageKey = () => {
    return COLUMN_ORDER_STORAGE_PREFIX + (isCfb ? 'cfb' : 'fc')
  }

  const loadColumnOrder = () => {
    const cols = isCfb ? CFB_COLUMNS : FC_COLUMNS
    try {
      const saved = window.localStorage.getItem(storageKey())
      if (saved) {
        const parsed = JSON.parse(saved)
        const validKeys = cols.map(function(c) { return c.key })
        const filtered = parsed.filter(function(k) { return validKeys.indexOf(k) !== -1 })
        const missing = validKeys.filter(function(k) { return filtered.indexOf(k) === -1 })
        setColumnOrder(filtered.concat(missing))
        return
      }
    } catch (e) {
      // ignore
    }
    setColumnOrder(cols.map(function(c) { return c.key }))
  }

  const saveColumnOrder = (order) => {
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(order))
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

    if (isCfb) {
      const referenceResult = await supabase
        .from('cfb_player_reference')
        .select('*')
        .ilike('team', franchise.club_name)

      if (!referenceResult.error && referenceResult.data.length > 0) {
        const playersToInsert = referenceResult.data.map(function(p) {
          return {
            franchise_id: franchiseId,
            name: p.player_name,
            position: p.position,
            overall_rating: p.overall_rating,
            jersey_number: p.jersey_number,
            cfb_class: p.class,
            archetype: p.archetype,
            dev_trait: p.dev_trait,
            speed: p.speed,
            strength: p.strength,
            agility: p.agility,
            acceleration: p.acceleration,
            change_of_direction: p.change_of_direction,
            injury: p.injury,
            stamina: p.stamina,
            awareness: p.awareness
          }
        })

        await supabase.from('players').insert(playersToInsert)
        await loadPlayers()
      } else {
        alert('No players found in the database for "' + franchise.club_name + '". Try importing player data first.')
      }
    } else {
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
    }

    setImportingRoster(false)
  }

  const searchPlayers = async () => {
    if (!franchise) return

    if (isCfb) {
      const { data, error } = await supabase
        .from('cfb_player_reference')
        .select('*')
        .ilike('player_name', `%${searchTerm}%`)
        .limit(5)

      if (!error) {
        setSearchResults(data)
        setShowResults(true)
      }
    } else {
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
  }

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player)
    if (isCfb) {
      setName(player.player_name)
      setPosition(player.position || '')
      setOverall(player.overall_rating || '')
      setSearchTerm(player.player_name)
    } else {
      setName(player.name)
      setPosition(player.position || '')
      setAge(player.age || '')
      setOverall(player.overall_rating || '')
      setPotential(player.potential_rating || '')
      setSearchTerm(player.name)
    }
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
    const payload = {
      franchise_id: franchiseId,
      name: name,
      position: position,
      overall_rating: overall ? parseInt(overall) : null
    }

    if (isCfb) {
      if (selectedPlayer) {
        payload.jersey_number = selectedPlayer.jersey_number
        payload.cfb_class = selectedPlayer.class
        payload.archetype = selectedPlayer.archetype
        payload.dev_trait = selectedPlayer.dev_trait
        payload.speed = selectedPlayer.speed
        payload.strength = selectedPlayer.strength
        payload.agility = selectedPlayer.agility
        payload.acceleration = selectedPlayer.acceleration
        payload.change_of_direction = selectedPlayer.change_of_direction
        payload.injury = selectedPlayer.injury
        payload.stamina = selectedPlayer.stamina
        payload.awareness = selectedPlayer.awareness
      }
    } else {
      payload.age = age ? parseInt(age) : null
      payload.potential_rating = potential ? parseInt(potential) : null
      payload.wage = wage ? parseFloat(wage) : null
      payload.contract_years_remaining = contractYears ? parseInt(contractYears) : null
    }

    const { error } = await supabase.from('players').insert(payload)

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
    if (!columnOrder) return gameColumns
    const byKey = {}
    for (let i = 0; i < gameColumns.length; i++) {
      byKey[gameColumns[i].key] = gameColumns[i]
    }
    return columnOrder.map(function(k) { return byKey[k] }).filter(Boolean)
  }, [columnOrder, gameColumns])

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
    const defaultOrder = gameColumns.map(function(c) { return c.key })
    setColumnOrder(defaultOrder)
    saveColumnOrder(defaultOrder)
  }

  const teamStats = useMemo(function() {
    const overalls = players.map(function(p) { return p.overall_rating })

    let topPlayer = null
    for (let i = 0; i < players.length; i++) {
      if (typeof players[i].overall_rating === 'number') {
        if (!topPlayer || players[i].overall_rating > topPlayer.overall_rating) {
          topPlayer = players[i]
        }
      }
    }

    if (isCfb) {
      const offenseRatings = []
      const defenseRatings = []
      const positionBuckets = {}

      for (let i = 0; i < players.length; i++) {
        const p = players[i]
        const group = CFB_POSITION_GROUP[p.position]
        if (group === 'Offense' && typeof p.overall_rating === 'number') offenseRatings.push(p.overall_rating)
        if (group === 'Defense' && typeof p.overall_rating === 'number') defenseRatings.push(p.overall_rating)

        if (p.position) {
          if (!positionBuckets[p.position]) positionBuckets[p.position] = []
          if (typeof p.overall_rating === 'number') positionBuckets[p.position].push(p.overall_rating)
        }
      }

      const positionAverages = CFB_POSITION_ORDER
        .filter(function(pos) { return positionBuckets[pos] && positionBuckets[pos].length > 0 })
        .map(function(pos) {
          return {
            position: pos,
            group: CFB_POSITION_GROUP[pos],
            count: positionBuckets[pos].length,
            avg: average(positionBuckets[pos])
          }
        })

      const sortedOffense = players
        .filter(function(p) { return CFB_POSITION_GROUP[p.position] === 'Offense' && typeof p.overall_rating === 'number' })
        .slice()
        .sort(function(a, b) { return b.overall_rating - a.overall_rating })
        .slice(0, 3)

      const sortedDefense = players
        .filter(function(p) { return CFB_POSITION_GROUP[p.position] === 'Defense' && typeof p.overall_rating === 'number' })
        .slice()
        .sort(function(a, b) { return b.overall_rating - a.overall_rating })
        .slice(0, 3)

      const groupAverages = CFB_GROUPS.map(function(g) {
        const ratings = []
        for (let i = 0; i < players.length; i++) {
          if (g.positions.indexOf(players[i].position) !== -1 && typeof players[i].overall_rating === 'number') {
            ratings.push(players[i].overall_rating)
          }
        }
        return {
          key: g.key,
          label: g.label,
          side: g.side,
          positions: g.positions,
          avg: average(ratings),
          count: ratings.length
        }
      }).filter(function(g) { return g.count > 0 })

      return {
        squadSize: players.length,
        avgOverall: average(overalls),
        offenseAvg: average(offenseRatings),
        defenseAvg: average(defenseRatings),
        positionAverages: positionAverages,
        topPlayer: topPlayer,
        topOffense: sortedOffense,
        topDefense: sortedDefense,
        groupAverages: groupAverages
      }
    }

    const ages = players.map(function(p) { return p.age })
    const potentials = players.map(function(p) { return p.potential_rating })
    const values = players.map(function(p) { return p.value_eur })
    const wages = players.map(function(p) { return p.wage_eur_wk })

    const totalValue = values.reduce(function(sum, v) {
      return sum + (typeof v === 'number' && !isNaN(v) ? v : 0)
    }, 0)

    const totalWage = wages.reduce(function(sum, w) {
      return sum + (typeof w === 'number' && !isNaN(w) ? w : 0)
    }, 0)

    return {
      squadSize: players.length,
      avgAge: average(ages),
      avgOverall: average(overalls),
      avgPotential: average(potentials),
      totalValue: totalValue,
      totalWage: totalWage,
      topPlayer: topPlayer
    }
  }, [players, isCfb])

  const depthChartData = useMemo(function() {
    if (!isCfb) return []
    return CFB_POSITION_ORDER
      .filter(function(pos) { return players.some(function(p) { return p.position === pos }) })
      .map(function(pos) {
        const positionPlayers = players
          .filter(function(p) { return p.position === pos })
          .slice()
          .sort(function(a, b) {
            const aHas = a.depth_order !== null && a.depth_order !== undefined
            const bHas = b.depth_order !== null && b.depth_order !== undefined
            if (aHas && bHas) return a.depth_order - b.depth_order
            if (aHas && !bHas) return -1
            if (!aHas && bHas) return 1
            const av = typeof a.overall_rating === 'number' ? a.overall_rating : -1
            const bv = typeof b.overall_rating === 'number' ? b.overall_rating : -1
            return bv - av
          })
        return {
          position: pos,
          group: CFB_POSITION_GROUP[pos],
          players: positionPlayers
        }
      })
  }, [players, isCfb])

  const handleDepthDragStart = (playerId) => {
    setDepthDragId(playerId)
  }

  const handleDepthDragOver = (e, playerId) => {
    e.preventDefault()
    if (playerId !== depthDragOverId) {
      setDepthDragOverId(playerId)
    }
  }

  const handleDepthDrop = async (e, position, targetPlayerId) => {
    e.preventDefault()
    if (!depthDragId || depthDragId === targetPlayerId) {
      setDepthDragId(null)
      setDepthDragOverId(null)
      return
    }

    const positionData = depthChartData.find(function(d) { return d.position === position })
    if (!positionData) {
      setDepthDragId(null)
      setDepthDragOverId(null)
      return
    }

    const currentIds = positionData.players.map(function(p) { return p.id })
    const fromIdx = currentIds.indexOf(depthDragId)
    const toIdx = currentIds.indexOf(targetPlayerId)
    if (fromIdx === -1 || toIdx === -1) {
      setDepthDragId(null)
      setDepthDragOverId(null)
      return
    }

    const newOrderIds = currentIds.slice()
    newOrderIds.splice(fromIdx, 1)
    newOrderIds.splice(toIdx, 0, depthDragId)

    setPlayers(function(prev) {
      return prev.map(function(p) {
        const idx = newOrderIds.indexOf(p.id)
        if (idx !== -1) {
          return Object.assign({}, p, { depth_order: idx })
        }
        return p
      })
    })

    setDepthDragId(null)
    setDepthDragOverId(null)

    for (let i = 0; i < newOrderIds.length; i++) {
      await supabase.from('players').update({ depth_order: i }).eq('id', newOrderIds[i])
    }
  }

  const handleDepthDragEnd = () => {
    setDepthDragId(null)
    setDepthDragOverId(null)
  }

  if (loading || !columnOrder) {
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
            <p className="text-neutral-500 text-xs font-medium mb-1">{franchise.game || 'EA FC 26'}</p>
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
                placeholder={isCfb ? 'Search player database, e.g. a player name...' : 'Search player database, e.g. Saka...'}
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
                      <span>{isCfb ? p.player_name : p.name} <span className="text-neutral-400">&middot; {p.position}</span></span>
                      <OvrBadge value={p.overall_rating} small />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(selectedPlayer || name) && !isCfb && (
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

        {!isCfb && players.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-3 lg:grid-cols-6">
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
            <OvrBadge value={teamStats.topPlayer.overall_rating} />
          </div>
        )}

        {isCfb && (
          <div className="flex gap-1 mb-6 border-b border-neutral-800">
            <button
              onClick={() => setActiveTab('roster')}
              className={
                'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ' +
                (activeTab === 'roster' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-neutral-500 hover:text-neutral-300')
              }
            >
              Roster
            </button>
            <button
              onClick={() => setActiveTab('depth')}
              className={
                'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ' +
                (activeTab === 'depth' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-neutral-500 hover:text-neutral-300')
              }
            >
              Depth Chart
            </button>
          </div>
        )}

        {isCfb && activeTab === 'roster' && players.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold mb-3 text-neutral-200">Top Offensive Players</h2>
                <div className="space-y-2">
                  {teamStats.topOffense.length === 0 ? (
                    <p className="text-neutral-500 text-sm">No offensive players yet.</p>
                  ) : (
                    teamStats.topOffense.map(function(p) {
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2">
                          <div>
                            <span className="font-medium text-neutral-100">{p.name}</span>
                            <span className="text-neutral-500 text-xs ml-2">{p.position}{p.jersey_number ? ' #' + p.jersey_number : ''}</span>
                          </div>
                          <OvrBadge value={p.overall_rating} small />
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold mb-3 text-neutral-200">Top Defensive Players</h2>
                <div className="space-y-2">
                  {teamStats.topDefense.length === 0 ? (
                    <p className="text-neutral-500 text-sm">No defensive players yet.</p>
                  ) : (
                    teamStats.topDefense.map(function(p) {
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2">
                          <div>
                            <span className="font-medium text-neutral-100">{p.name}</span>
                            <span className="text-neutral-500 text-xs ml-2">{p.position}{p.jersey_number ? ' #' + p.jersey_number : ''}</span>
                          </div>
                          <OvrBadge value={p.overall_rating} small />
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-neutral-200">Position Group Averages</h2>
              <p className="text-neutral-500 text-xs mb-3">Tap a group to see individual position breakdowns.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {teamStats.groupAverages.map(function(g) {
                  const isExpanded = expandedGroup === g.key
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setExpandedGroup(isExpanded ? null : g.key)}
                      className={
                        'flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ' +
                        (isExpanded ? 'bg-emerald-900/30 border-emerald-600' : 'bg-neutral-800/50 border-neutral-800 hover:border-neutral-700')
                      }
                    >
                      <span className="text-sm text-neutral-200">{g.label}</span>
                      <OvrBadge value={Math.round(g.avg)} small />
                    </button>
                  )
                })}
              </div>

              {expandedGroup && (
                <div className="mt-4 bg-neutral-800/40 border border-neutral-800 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                    {CFB_GROUPS.find(function(g) { return g.key === expandedGroup }).label} &mdash; by position
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {teamStats.positionAverages
                      .filter(function(pa) {
                        const group = CFB_GROUPS.find(function(g) { return g.key === expandedGroup })
                        return group.positions.indexOf(pa.position) !== -1
                      })
                      .map(function(pa) {
                        return (
                          <div key={pa.position} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
                            <div>
                              <span className="text-sm text-neutral-200 font-medium">{pa.position}</span>
                              <span className="text-neutral-500 text-xs ml-1.5">({pa.count})</span>
                            </div>
                            <OvrBadge value={Math.round(pa.avg)} small />
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {isCfb && activeTab === 'depth' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-1">Depth Chart</h2>
            <p className="text-neutral-500 text-xs mb-5">Drag a player's bar up or down within their position to set your own depth order.</p>

            {depthChartData.length === 0 ? (
              <p className="text-neutral-500 text-sm">No players yet.</p>
            ) : (
              <div className="space-y-8">
                {DEPTH_GROUPS.map(function(depthGroup) {
                  const groupPositions = depthChartData.filter(function(d) { return depthGroup.positions.indexOf(d.position) !== -1 })
                  if (groupPositions.length === 0) return null
                  return (
                    <div key={depthGroup.label}>
                      <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">{depthGroup.label}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groupPositions.map(function(d) {
                          return (
                            <div key={d.position} className="bg-neutral-800/50 border border-neutral-800 rounded-lg p-3">
                              <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wide mb-2">{d.position}</p>
                              <div className="space-y-1.5">
                                {d.players.map(function(p, idx) {
                                  const isDragOver = depthDragOverId === p.id && depthDragId !== p.id
                                  return (
                                    <div
                                      key={p.id}
                                      draggable
                                      onDragStart={() => handleDepthDragStart(p.id)}
                                      onDragOver={(e) => handleDepthDragOver(e, p.id)}
                                      onDrop={(e) => handleDepthDrop(e, d.position, p.id)}
                                      onDragEnd={handleDepthDragEnd}
                                      className={
                                        'flex items-center justify-between text-sm rounded-md px-2 py-1.5 cursor-move select-none transition-colors ' +
                                        (isDragOver ? 'bg-emerald-900/40 border border-emerald-600' : 'bg-neutral-900 border border-neutral-800 hover:border-neutral-700')
                                      }
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-neutral-600 text-xs">&#8942;&#8942;</span>
                                        <span className="text-neutral-500 text-xs w-4">{idx + 1}</span>
                                        <span className="text-neutral-200">{p.name}</span>
                                        {p.jersey_number ? <span className="text-neutral-500 text-xs">#{p.jersey_number}</span> : null}
                                      </span>
                                      <OvrBadge value={p.overall_rating} small />
                                    </div>
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
            )}
          </div>
        )}

        {(!isCfb || activeTab === 'roster') && (
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
                                <OvrBadge value={displayValue} small />
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
        )}

      </div>
    </div>
  )
}