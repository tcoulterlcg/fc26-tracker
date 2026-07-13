'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { aliasCanonicalNames } from '@/lib/teamAliases'
import { fuzzyPlayerSearch } from '@/lib/fuzzySearch'

const FC_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'position', label: 'Pos' },
  { key: 'age', label: 'Age' },
  { key: 'nationality', label: 'Nation' },
  { key: 'base_overall', label: 'Beg OVR' },
  { key: 'overall_rating', label: 'Curr OVR' },
  { key: 'ovr_diff', label: '± OVR' },
  { key: 'potential_rating', label: 'POT' },
  { key: 'pace', label: 'PAC' },
  { key: 'shooting', label: 'SHO' },
  { key: 'passing', label: 'PAS' },
  { key: 'dribbling', label: 'DRI' },
  { key: 'defending', label: 'DEF' },
  { key: 'physical', label: 'PHY' },
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
  { key: 'base_overall', label: 'Beg OVR' },
  { key: 'overall_rating', label: 'Curr OVR' },
  { key: 'ovr_diff', label: '± OVR' },
  { key: 'dev_trait', label: 'Dev Trait' },
  { key: 'nil_value', label: 'NIL' },
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

const FC_GK_POSITIONS = ['GK']
const FC_DEF_POSITIONS = ['CB', 'RB', 'LB', 'LWB', 'RWB']
const FC_FWD_POSITIONS = ['ST', 'LW', 'RW', 'CF']

function fcPositionGroup(position) {
  if (FC_GK_POSITIONS.indexOf(position) !== -1) return 'GK'
  if (FC_DEF_POSITIONS.indexOf(position) !== -1) return 'DEF'
  if (FC_FWD_POSITIONS.indexOf(position) !== -1) return 'FWD'
  return 'MID'
}

const FC_POSITION_ORDER = ['GK', 'DEF', 'MID', 'FWD']

const DEPTH_GROUPS = [
  { label: 'Backfield', side: 'Offense', positions: ['QB', 'HB', 'FB'] },
  { label: 'Receivers', side: 'Offense', positions: ['WR', 'TE'] },
  { label: 'O-Line', side: 'Offense', positions: ['LT', 'LG', 'C', 'RG', 'RT'] },
  { label: 'D-Line', side: 'Defense', positions: ['LE', 'RE', 'DT'] },
  { label: 'Linebackers', side: 'Defense', positions: ['LOLB', 'MLB', 'ROLB'] },
  { label: 'Secondary', side: 'Defense', positions: ['CB', 'FS', 'SS'] },
  { label: 'Specialists', side: 'Special Teams', positions: ['K', 'P', 'LS'] }
]

const LEAGUES = [
  'Premier League', 'EFL Championship', 'EFL League One', 'EFL League Two',
  'La Liga', 'La Liga 2', 'Bundesliga', 'Bundesliga 2', 'Serie A', 'Serie B',
  'Ligue 1', 'Ligue 2', 'Eredivisie', 'Primeira Liga', 'Belgian Pro League',
  'Scottish Premiership', 'MLS', 'Liga MX', 'Brasileirão', 'Saudi Pro League',
  'Süper Lig', 'A-League', 'Other / International'
]

const CFB_CONFERENCES = [
  'SEC', 'Big Ten', 'Big 12', 'ACC', 'American Athletic', 'Mountain West',
  'Conference USA', 'Sun Belt', 'MAC', 'Independent', 'Other'
]

const CFB_TEAM_CONFERENCE_MAP = {
  'Alabama': 'SEC', 'Arkansas': 'SEC', 'Auburn': 'SEC', 'Florida': 'SEC', 'Georgia': 'SEC',
  'Kentucky': 'SEC', 'LSU': 'SEC', 'Mississippi State': 'SEC', 'Missouri': 'SEC', 'Oklahoma': 'SEC',
  'Ole Miss': 'SEC', 'South Carolina': 'SEC', 'Tennessee': 'SEC', 'Texas': 'SEC', 'Texas A&M': 'SEC', 'Vanderbilt': 'SEC',
  'Illinois': 'Big Ten', 'Indiana': 'Big Ten', 'Iowa': 'Big Ten', 'Maryland': 'Big Ten',
  'Michigan': 'Big Ten', 'Michigan State': 'Big Ten', 'Minnesota': 'Big Ten', 'Nebraska': 'Big Ten',
  'Northwestern': 'Big Ten', 'Ohio State': 'Big Ten', 'Oregon': 'Big Ten', 'Penn State': 'Big Ten',
  'Purdue': 'Big Ten', 'Rutgers': 'Big Ten', 'UCLA': 'Big Ten', 'USC': 'Big Ten', 'Washington': 'Big Ten', 'Wisconsin': 'Big Ten',
  'Boston College': 'ACC', 'California': 'ACC', 'Clemson': 'ACC', 'Duke': 'ACC',
  'Florida State': 'ACC', 'Georgia Tech': 'ACC', 'Louisville': 'ACC', 'Miami': 'ACC',
  'NC State': 'ACC', 'North Carolina': 'ACC', 'Pittsburgh': 'ACC', 'SMU': 'ACC',
  'Stanford': 'ACC', 'Syracuse': 'ACC', 'Virginia': 'ACC', 'Virginia Tech': 'ACC', 'Wake Forest': 'ACC',
  'Arizona': 'Big 12', 'Arizona State': 'Big 12', 'Baylor': 'Big 12', 'BYU': 'Big 12',
  'Cincinnati': 'Big 12', 'Colorado': 'Big 12', 'Houston': 'Big 12', 'Iowa State': 'Big 12',
  'Kansas': 'Big 12', 'Kansas State': 'Big 12', 'Oklahoma State': 'Big 12', 'TCU': 'Big 12',
  'Texas Tech': 'Big 12', 'UCF': 'Big 12', 'Utah': 'Big 12', 'West Virginia': 'Big 12',
  'Army': 'American Athletic', 'Charlotte': 'American Athletic', 'East Carolina': 'American Athletic',
  'Florida Atlantic': 'American Athletic', 'Memphis': 'American Athletic', 'Navy': 'American Athletic',
  'North Texas': 'American Athletic', 'Rice': 'American Athletic', 'South Florida': 'American Athletic',
  'Temple': 'American Athletic', 'Tulane': 'American Athletic', 'Tulsa': 'American Athletic',
  'UAB': 'American Athletic', 'UTSA': 'American Athletic',
  'Air Force': 'Mountain West', 'Boise State': 'Mountain West', 'Colorado State': 'Mountain West',
  'Fresno State': 'Mountain West', 'Hawaii': 'Mountain West', 'Nevada': 'Mountain West',
  'New Mexico': 'Mountain West', 'San Diego State': 'Mountain West', 'San Jose State': 'Mountain West',
  'UNLV': 'Mountain West', 'Utah State': 'Mountain West', 'Wyoming': 'Mountain West',
  'Delaware': 'Conference USA', 'FIU': 'Conference USA', 'Jacksonville State': 'Conference USA',
  'Kennesaw State': 'Conference USA', 'Liberty': 'Conference USA', 'Louisiana Tech': 'Conference USA',
  'Middle Tennessee': 'Conference USA', 'Missouri State': 'Conference USA', 'New Mexico State': 'Conference USA',
  'Sam Houston': 'Conference USA', 'UTEP': 'Conference USA', 'Western Kentucky': 'Conference USA',
  'Appalachian State': 'Sun Belt', 'Arkansas State': 'Sun Belt', 'Coastal Carolina': 'Sun Belt',
  'Georgia Southern': 'Sun Belt', 'Georgia State': 'Sun Belt', 'James Madison': 'Sun Belt',
  'Louisiana': 'Sun Belt', 'Louisiana Monroe': 'Sun Belt', 'Marshall': 'Sun Belt',
  'Old Dominion': 'Sun Belt', 'South Alabama': 'Sun Belt', 'Southern Miss': 'Sun Belt',
  'Texas State': 'Sun Belt', 'Troy': 'Sun Belt',
  'Akron': 'MAC', 'Ball State': 'MAC', 'Bowling Green': 'MAC', 'Buffalo': 'MAC',
  'Central Michigan': 'MAC', 'Eastern Michigan': 'MAC', 'Kent State': 'MAC', 'Miami (OH)': 'MAC',
  'Northern Illinois': 'MAC', 'Ohio': 'MAC', 'Toledo': 'MAC', 'Western Michigan': 'MAC',
  'Notre Dame': 'Independent', 'UConn': 'Independent', 'UMass': 'Independent',
  'North Dakota State': 'Other'
}

const CLASS_ORDER = ['FR', 'SO', 'JR', 'SR', 'FR (RS)', 'SO (RS)', 'JR (RS)', 'SR (RS)']

const CLUB_LEAGUE_MAP = {
  'Arsenal': 'Premier League', 'Aston Villa': 'Premier League', 'Bournemouth': 'Premier League',
  'Brentford': 'Premier League', 'Brighton & Hove Albion': 'Premier League', 'Chelsea': 'Premier League',
  'Crystal Palace': 'Premier League', 'Everton': 'Premier League', 'Fulham': 'Premier League',
  'Ipswich Town': 'Premier League', 'Leicester City': 'Premier League', 'Liverpool': 'Premier League',
  'Manchester City': 'Premier League', 'Manchester United': 'Premier League', 'Newcastle United': 'Premier League',
  'Nottingham Forest': 'Premier League', 'Southampton': 'Premier League', 'Tottenham Hotspur': 'Premier League',
  'West Ham United': 'Premier League', 'Wolverhampton Wanderers': 'Premier League',
  'Queens Park Rangers': 'EFL Championship', 'Leeds United': 'EFL Championship', 'Burnley': 'EFL Championship',
  'Sheffield United': 'EFL Championship', 'West Bromwich Albion': 'EFL Championship', 'Norwich City': 'EFL Championship',
  'Middlesbrough': 'EFL Championship', 'Coventry City': 'EFL Championship', 'Sunderland': 'EFL Championship',
  'Watford': 'EFL Championship', 'Stoke City': 'EFL Championship', 'Hull City': 'EFL Championship',
  'Preston North End': 'EFL Championship', 'Bristol City': 'EFL Championship', 'Cardiff City': 'EFL Championship',
  'Swansea City': 'EFL Championship', 'Millwall': 'EFL Championship', 'Blackburn Rovers': 'EFL Championship',
  'Plymouth Argyle': 'EFL Championship', 'Luton Town': 'EFL Championship', 'Derby County': 'EFL Championship',
  'Portsmouth': 'EFL Championship', 'Oxford United': 'EFL Championship',
  'Real Madrid': 'La Liga', 'Barcelona': 'La Liga', 'Atlético Madrid': 'La Liga', 'Athletic Club': 'La Liga',
  'Real Sociedad': 'La Liga', 'Real Betis': 'La Liga', 'Villarreal': 'La Liga', 'Valencia': 'La Liga',
  'Sevilla': 'La Liga', 'Girona': 'La Liga',
  'Bayern Munich': 'Bundesliga', 'Borussia Dortmund': 'Bundesliga', 'RB Leipzig': 'Bundesliga',
  'Bayer Leverkusen': 'Bundesliga', 'Eintracht Frankfurt': 'Bundesliga', 'VfB Stuttgart': 'Bundesliga',
  'Borussia Mönchengladbach': 'Bundesliga', 'Wolfsburg': 'Bundesliga',
  'Juventus': 'Serie A', 'Inter Milan': 'Serie A', 'AC Milan': 'Serie A', 'Napoli': 'Serie A',
  'AS Roma': 'Serie A', 'Lazio': 'Serie A', 'Atalanta': 'Serie A', 'Fiorentina': 'Serie A',
  'Paris Saint-Germain': 'Ligue 1', 'Marseille': 'Ligue 1', 'Monaco': 'Ligue 1', 'Lyon': 'Ligue 1',
  'Lille': 'Ligue 1', 'Nice': 'Ligue 1', 'Lens': 'Ligue 1',
  'Ajax': 'Eredivisie', 'PSV Eindhoven': 'Eredivisie', 'Feyenoord': 'Eredivisie',
  'Benfica': 'Primeira Liga', 'Porto': 'Primeira Liga', 'Sporting CP': 'Primeira Liga',
  'Celtic': 'Scottish Premiership', 'Rangers': 'Scottish Premiership',
  'Inter Miami': 'MLS', 'LA Galaxy': 'MLS', 'LAFC': 'MLS', 'Seattle Sounders': 'MLS', 'Atlanta United': 'MLS'
}

const COLUMN_ORDER_STORAGE_PREFIX = 'roster_column_order_v2_'

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

function formatUsd(num) {
  if (num === null || num === undefined || isNaN(num)) return '$0'
  if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K'
  return '$' + num.toFixed(0)
}

function formatStatSummary(statsObj) {
  if (!statsObj) return null
  const keys = Object.keys(statsObj).filter(function(k) { return statsObj[k] !== null && statsObj[k] !== undefined })
  if (keys.length === 0) return null
  return keys.slice(0, 2).map(function(k) {
    return statsObj[k] + ' ' + k.replace(/_/g, ' ')
  }).join(' \u00b7 ')
}

function ovrBadgeColor(ovr) {
  if (ovr === null || ovr === undefined) return 'bg-neutral-700'
  if (ovr >= 85) return 'bg-green-600'
  if (ovr >= 80) return 'bg-green-600'
  if (ovr >= 72) return 'bg-amber-500'
  if (ovr >= 64) return 'bg-orange-600'
  return 'bg-red-600'
}

const RATING_COLUMN_KEYS = {
  potential_rating: true, pace: true, shooting: true, passing: true,
  dribbling: true, defending: true, physical: true,
  speed: true, strength: true, agility: true, acceleration: true,
  change_of_direction: true, injury: true, stamina: true, awareness: true
}

function statTextColor(v) {
  if (v === null || v === undefined) return 'text-neutral-500'
  if (v >= 85) return 'text-green-400'
  if (v >= 80) return 'text-green-400'
  if (v >= 72) return 'text-amber-400'
  if (v >= 64) return 'text-orange-400'
  return 'text-red-400'
}

function OvrBadge({ value, small }) {
  if (value === null || value === undefined) return <span className="text-neutral-500">-</span>
  return (
    <span className={'inline-block text-white font-bold rounded-full text-center ' + ovrBadgeColor(value) + (small ? ' text-xs px-2 py-0.5 min-w-[28px]' : ' text-xs px-2.5 py-1 min-w-[32px]')}>
      {value}
    </span>
  )
}

function median(nums) {
  const valid = nums.filter(function(n) { return typeof n === 'number' && !isNaN(n) }).slice().sort(function(a, b) { return a - b })
  if (valid.length === 0) return null
  const mid = Math.floor(valid.length / 2)
  return valid.length % 2 === 0 ? (valid[mid - 1] + valid[mid]) / 2 : valid[mid]
}

function MiniBenchmarkBar({ ownValue, benchmark, isCurrency, decimals }) {
  if (!benchmark || ownValue === null || ownValue === undefined) {
    return <p className="text-neutral-600 text-[10px] mt-2">No benchmark data</p>
  }

  const fmt = function(v) { return isCurrency ? formatEuro(v) : v.toFixed(decimals) }
  const range = benchmark.max - benchmark.min
  const pct = function(v) {
    if (range <= 0) return 50
    return Math.min(100, Math.max(0, ((v - benchmark.min) / range) * 100))
  }

  return (
    <div className="mt-2">
      <div className="relative w-full h-1.5 bg-neutral-800 rounded-full">
        <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-neutral-500" style={{ left: pct(benchmark.median) + '%' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-violet-400 border border-violet-200" style={{ left: 'calc(' + pct(ownValue) + '% - 5px)' }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-neutral-600 text-[9px]">{fmt(benchmark.min)}</span>
        <span className="text-neutral-500 text-[9px]">Med {fmt(benchmark.median)}</span>
        <span className="text-neutral-600 text-[9px]">{fmt(benchmark.max)}</span>
      </div>
    </div>
  )
}

export default function FranchisePage() {
  const [franchise, setFranchise] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [importingRoster, setImportingRoster] = useState(false)

  const [activeTab, setActiveTab] = useState('roster')

  const [tabOrder, setTabOrder] = useState(null)
  const [dragTabKey, setDragTabKey] = useState(null)
  const [dragOverTabKey, setDragOverTabKey] = useState(null)

  const [editingLeague, setEditingLeague] = useState(false)
  const [leagueDraft, setLeagueDraft] = useState('')
  const [savingLeague, setSavingLeague] = useState(false)

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

  const [seasonSnapshots, setSeasonSnapshots] = useState([])
  const [recordingSnapshot, setRecordingSnapshot] = useState(false)

  const [fcReferenceRows, setFcReferenceRows] = useState(null)
  const [benchmarkLeague, setBenchmarkLeague] = useState(null)

  const [trajectory, setTrajectory] = useState(null)
  const [transferModal, setTransferModal] = useState(null)
  const [tFee, setTFee] = useState('')
  const [tClub, setTClub] = useState('')
  const [tSellOn, setTSellOn] = useState('')
  const [tSwap, setTSwap] = useState('')
  const [editingNil, setEditingNil] = useState(false)
  const [nilDraft, setNilDraft] = useState('')
  const [savingNil, setSavingNil] = useState(false)
  const [recruitingSummary, setRecruitingSummary] = useState({ count: 0, avgStars: null })
  const [recruitingStarsByName, setRecruitingStarsByName] = useState({})
  const [seasonStatsByName, setSeasonStatsByName] = useState({})

  const [cfbReferenceRows, setCfbReferenceRows] = useState(null)
  const [benchmarkConference, setBenchmarkConference] = useState(null)

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
      loadSnapshots()
    }
  }, [franchise])

  useEffect(() => {
    if (!franchise) return
    const tabStorageKey = 'roster_hq_tab_order_' + (isCfb ? 'cfb' : 'fc')
    const defaultOrder = isCfb
      ? ['dashboard', 'roster', 'depth', 'progression', 'teamstats', 'playerstats', 'teamneeds', 'history']
      : ['dashboard', 'roster', 'squad', 'progression', 'teamstats', 'playerstats', 'teamneeds', 'history']
    try {
      const saved = window.localStorage.getItem(tabStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        const valid = parsed.filter(function(k) { return defaultOrder.indexOf(k) !== -1 })
        const missing = defaultOrder.filter(function(k) { return valid.indexOf(k) === -1 })
        setTabOrder(valid.concat(missing))
        return
      }
    } catch (e) {
      // ignore
    }
    setTabOrder(defaultOrder)
  }, [franchise, isCfb])

  const saveTabOrder = (order) => {
    setTabOrder(order)
    try {
      window.localStorage.setItem('roster_hq_tab_order_' + (isCfb ? 'cfb' : 'fc'), JSON.stringify(order))
    } catch (e) {
      // ignore
    }
  }

  const handleTabDragStart = (key) => {
    setDragTabKey(key)
  }

  const handleTabDragOver = (e, key) => {
    e.preventDefault()
    if (key !== dragOverTabKey) {
      setDragOverTabKey(key)
    }
  }

  const handleTabDrop = (e, targetKey) => {
    e.preventDefault()
    if (!dragTabKey || dragTabKey === targetKey) {
      setDragTabKey(null)
      setDragOverTabKey(null)
      return
    }
    const order = tabOrder.slice()
    const fromIdx = order.indexOf(dragTabKey)
    const toIdx = order.indexOf(targetKey)
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, dragTabKey)
    saveTabOrder(order)
    setDragTabKey(null)
    setDragOverTabKey(null)
  }

  const handleTabDragEnd = () => {
    setDragTabKey(null)
    setDragOverTabKey(null)
  }

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

  useEffect(() => {
    if (!franchise || isCfb || fcReferenceRows !== null) return

    const loadReference = async () => {
      const { data, error } = await supabase
        .from('player_reference')
        .select('active_club, age, overall_rating, potential_rating, value_eur, wage_eur_wk')

      if (!error) {
        setFcReferenceRows(data)
      }
    }

    loadReference()
  }, [franchise, isCfb, fcReferenceRows])

  const fcClubAggregates = useMemo(function() {
    if (!fcReferenceRows) return []

    const byClub = {}
    for (let i = 0; i < fcReferenceRows.length; i++) {
      const p = fcReferenceRows[i]
      if (!p.active_club) continue
      if (!byClub[p.active_club]) byClub[p.active_club] = []
      byClub[p.active_club].push(p)
    }

    return Object.keys(byClub).map(function(club) {
      const rows = byClub[club]
      return {
        club: club,
        league: CLUB_LEAGUE_MAP[club] || null,
        squadSize: rows.length,
        avgAge: average(rows.map(function(r) { return r.age })),
        avgOverall: average(rows.map(function(r) { return r.overall_rating })),
        avgPotential: average(rows.map(function(r) { return r.potential_rating })),
        totalValue: rows.reduce(function(sum, r) { return sum + (typeof r.value_eur === 'number' ? r.value_eur : 0) }, 0),
        totalWage: rows.reduce(function(sum, r) { return sum + (typeof r.wage_eur_wk === 'number' ? r.wage_eur_wk : 0) }, 0)
      }
    })
  }, [fcReferenceRows])

  const getBenchmark = (statKey) => {
    let pool = fcClubAggregates
    if (benchmarkLeague && benchmarkLeague !== 'ALL') {
      pool = pool.filter(function(c) { return c.league === benchmarkLeague })
    }
    const values = pool.map(function(c) { return c[statKey] }).filter(function(v) { return typeof v === 'number' && !isNaN(v) })
    if (values.length === 0) return null
    return {
      min: Math.min.apply(null, values),
      max: Math.max.apply(null, values),
      median: median(values),
      count: values.length
    }
  }

  useEffect(() => {
    if (!franchise || !isCfb || cfbReferenceRows !== null) return

    const loadCfbReference = async () => {
      const { data, error } = await supabase
        .from('cfb_player_reference')
        .select('team, position, overall_rating')

      if (!error) {
        setCfbReferenceRows(data)
      }
    }

    loadCfbReference()
  }, [franchise, isCfb, cfbReferenceRows])

  const cfbTeamAggregates = useMemo(function() {
    if (!cfbReferenceRows) return []

    const byTeam = {}
    for (let i = 0; i < cfbReferenceRows.length; i++) {
      const p = cfbReferenceRows[i]
      if (!p.team) continue
      if (!byTeam[p.team]) byTeam[p.team] = []
      byTeam[p.team].push(p)
    }

    return Object.keys(byTeam).map(function(team) {
      const rows = byTeam[team]
      const offenseRatings = rows.filter(function(r) { return CFB_POSITION_GROUP[r.position] === 'Offense' }).map(function(r) { return r.overall_rating })
      const defenseRatings = rows.filter(function(r) { return CFB_POSITION_GROUP[r.position] === 'Defense' }).map(function(r) { return r.overall_rating })
      return {
        team: team,
        conference: CFB_TEAM_CONFERENCE_MAP[team] || null,
        squadSize: rows.length,
        avgOverall: average(rows.map(function(r) { return r.overall_rating })),
        offenseAvg: average(offenseRatings),
        defenseAvg: average(defenseRatings)
      }
    })
  }, [cfbReferenceRows])

  const getCfbBenchmark = (statKey) => {
    let pool = cfbTeamAggregates
    if (benchmarkConference && benchmarkConference !== 'ALL') {
      pool = pool.filter(function(c) { return c.conference === benchmarkConference })
    }
    const values = pool.map(function(c) { return c[statKey] }).filter(function(v) { return typeof v === 'number' && !isNaN(v) })
    if (values.length === 0) return null
    return {
      min: Math.min.apply(null, values),
      max: Math.max.apply(null, values),
      median: median(values),
      count: values.length
    }
  }

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
    setLeagueDraft(franchiseData.league || '')
    setBenchmarkLeague(franchiseData.league || 'ALL')
    setBenchmarkConference(franchiseData.league || 'ALL')
    setNilDraft(franchiseData.nil_funds !== null && franchiseData.nil_funds !== undefined ? String(franchiseData.nil_funds) : '')
    if (franchiseData.game === 'EA CFB 27') {
      await loadRecruitingSummary(franchiseData.current_season)
      await loadRecruitingStarsByName()
    }
    await loadSeasonStatsByName(franchiseData.current_season)
    await loadPlayers()
    setLoading(false)
  }

  const loadRecruitingSummary = async (season) => {
    const { data, error } = await supabase
      .from('recruiting_history')
      .select('star_rating')
      .eq('franchise_id', franchiseId)
      .eq('season', season)

    if (!error && data) {
      const stars = data.map(function(r) { return r.star_rating }).filter(function(n) { return typeof n === 'number' })
      setRecruitingSummary({
        count: data.length,
        avgStars: stars.length > 0 ? average(stars) : null
      })
    }
  }

  const loadRecruitingStarsByName = async () => {
    const { data, error } = await supabase
      .from('recruiting_history')
      .select('player_name, star_rating, created_at')
      .eq('franchise_id', franchiseId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      const byName = {}
      for (let i = 0; i < data.length; i++) {
        byName[data[i].player_name] = data[i].star_rating
      }
      setRecruitingStarsByName(byName)
    }
  }

  const loadSeasonStatsByName = async (season) => {
    const { data, error } = await supabase
      .from('player_season_stats')
      .select('player_name, stats')
      .eq('franchise_id', franchiseId)
      .eq('season', season)

    if (!error && data) {
      const byName = {}
      for (let i = 0; i < data.length; i++) {
        byName[data[i].player_name] = data[i].stats
      }
      setSeasonStatsByName(byName)
    }
  }

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('overall_rating', { ascending: false })

    if (!error) {
      // Beg OVR = the player's base rating in the reference ratings database
      // (their starting point before in-franchise progression); Curr OVR is the
      // live roster value; ± OVR is the delta. Derived at load time so no
      // schema change is needed — matched by name against the game's ref table.
      const names = data.map(function(p) { return p.name }).filter(Boolean)
      const refBase = {}
      if (names.length > 0) {
        let refTable = 'player_reference', refNameCol = 'name'
        if (isCfb) { refTable = 'cfb_player_reference'; refNameCol = 'player_name' }
        else if (franchise && franchise.game === 'MLB The Show 26') { refTable = 'mlb_player_reference' }
        const { data: refs } = await supabase.from(refTable).select(refNameCol + ', overall_rating').in(refNameCol, names)
        for (const r of (refs || [])) {
          const key = (r[refNameCol] || '').toLowerCase()
          if (!(key in refBase)) refBase[key] = r.overall_rating
        }
      }
      const enriched = data.map(function(p) {
        const ref = p.name ? refBase[p.name.toLowerCase()] : undefined
        const beg = ref != null ? ref : p.overall_rating
        const diff = (p.overall_rating != null && beg != null) ? p.overall_rating - beg : null
        return Object.assign({}, p, { base_overall: beg, ovr_diff: diff })
      })
      setPlayers(enriched)
    }
  }

  const loadSnapshots = async () => {
    const { data, error } = await supabase
      .from('season_snapshots')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('season', { ascending: true })
      .order('created_at', { ascending: true })

    if (!error) {
      setSeasonSnapshots(data)
    }
  }

  const handleSaveLeague = async () => {
    setSavingLeague(true)
    const { error } = await supabase
      .from('franchises')
      .update({ league: leagueDraft })
      .eq('id', franchiseId)

    setSavingLeague(false)

    if (!error) {
      setFranchise(function(prev) { return Object.assign({}, prev, { league: leagueDraft }) })
      setEditingLeague(false)
    } else {
      alert(error.message)
    }
  }

  const handleSaveNil = async () => {
    setSavingNil(true)
    const parsed = nilDraft.trim() === '' ? null : parseFloat(nilDraft)
    const { error } = await supabase
      .from('franchises')
      .update({ nil_funds: parsed })
      .eq('id', franchiseId)

    setSavingNil(false)

    if (!error) {
      setFranchise(function(prev) { return Object.assign({}, prev, { nil_funds: parsed }) })
      setEditingNil(false)
    } else {
      alert(error.message)
    }
  }

  // Resolve which reference rows to import for this franchise. Prefer an exact
  // (case-insensitive) club match; only fall back to a substring match when it
  // resolves to a single team — so a name like "Miami" never silently pulls
  // both "Miami (FL)" and "Miami (OH)".
  const resolveRosterRows = async (table, col) => {
    // 1. exact (case-insensitive) club match
    let res = await supabase.from(table).select('*').ilike(col, franchise.club_name)
    if (res.error) return { error: res.error.message }
    if (res.data.length > 0) return { rows: res.data }
    // 2. nickname / acronym alias (e.g. "PSG" -> Paris Saint-Germain, "OSU" -> Ohio State)
    const aliases = aliasCanonicalNames(franchise.club_name)
    if (aliases.length === 1) {
      res = await supabase.from(table).select('*').eq(col, aliases[0])
      if (res.error) return { error: res.error.message }
      if (res.data.length > 0) return { rows: res.data }
    } else if (aliases.length > 1) {
      return { ambiguous: aliases }
    }
    // 3. substring fallback, only if it resolves to a single team
    res = await supabase.from(table).select('*').ilike(col, '%' + franchise.club_name + '%')
    if (res.error) return { error: res.error.message }
    const teams = Array.from(new Set(res.data.map(function(r) { return r[col] })))
    if (teams.length > 1) return { ambiguous: teams }
    return { rows: res.data }
  }

  const handleImportRoster = async () => {
    setImportingRoster(true)

    const table = isCfb ? 'cfb_player_reference' : 'player_reference'
    const col = isCfb ? 'team' : 'active_club'
    const resolved = await resolveRosterRows(table, col)

    if (resolved.ambiguous) {
      alert('"' + franchise.club_name + '" matches multiple teams in the database: ' + resolved.ambiguous.join(', ') + '. Rename the franchise to match one exactly, then import.')
      setImportingRoster(false)
      return
    }
    if (resolved.error || !resolved.rows || resolved.rows.length === 0) {
      alert('No players found in the database for "' + franchise.club_name + '". Try importing player data first.')
      setImportingRoster(false)
      return
    }

    const playersToInsert = resolved.rows.map(function(p) {
      if (isCfb) {
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
          awareness: p.awareness,
          nil_value: p.nil_value
        }
      }
      return {
        franchise_id: franchiseId,
        name: p.name,
        position: p.position,
        age: p.age,
        overall_rating: p.overall_rating,
        potential_rating: p.potential_rating,
        pace: p.pace,
        shooting: p.shooting,
        passing: p.passing,
        dribbling: p.dribbling,
        defending: p.defending,
        physical: p.physical,
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
    setImportingRoster(false)
  }

  const searchPlayers = async () => {
    if (!franchise) return
    const table = isCfb ? 'cfb_player_reference' : 'player_reference'
    const nameCol = isCfb ? 'player_name' : 'name'
    // Typo-tolerant: word-level fallback + similarity ranking, so
    // "Matias Albert" still surfaces "Mathis Albert".
    const rows = await fuzzyPlayerSearch(supabase, table, nameCol, searchTerm, 6)
    setSearchResults(rows)
    setShowResults(true)
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
        payload.nil_value = selectedPlayer.nil_value
      }
    } else {
      payload.age = age ? parseInt(age) : null
      payload.potential_rating = potential ? parseInt(potential) : null
      payload.wage = wage ? parseFloat(wage) : null
      payload.contract_years_remaining = contractYears ? parseInt(contractYears) : null
      if (selectedPlayer) {
        // Carry the full attribute profile from the reference database.
        payload.pace = selectedPlayer.pace
        payload.shooting = selectedPlayer.shooting
        payload.passing = selectedPlayer.passing
        payload.dribbling = selectedPlayer.dribbling
        payload.defending = selectedPlayer.defending
        payload.physical = selectedPlayer.physical
        payload.nationality = selectedPlayer.nationality
        payload.active_club = franchise.club_name
      }
    }

    const { error } = await supabase.from('players').insert(payload)

    if (!error) {
      resetAddPanel()
      await loadPlayers()
      if (!isCfb) {
        // Auto-log the incoming transfer; the modal collects deal details.
        openTransferModal('in', {
          name: payload.name,
          active_club: selectedPlayer ? selectedPlayer.active_club : null
        })
      }
    } else {
      alert(error.message)
    }
  }

  // ---- Squad trajectory analytics ---------------------------------------
  // Splits squad-quality change into (a) roster moves, computed by rebuilding
  // the pre-transfer squad from transfer_history (Outs restored via snapshot,
  // Ins removed), and (b) in-game progression, measured as each retained
  // player's current rating vs their base rating in the reference database.
  useEffect(() => {
    if (!franchise || isCfb || players.length === 0) { setTrajectory(null); return }
    let cancelled = false
    const run = async () => {
      const avg = (list, key) => {
        const vals = list.map((p) => p[key]).filter((v) => v != null)
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
      }
      const { data: th } = await supabase.from('transfer_history').select('*').eq('franchise_id', franchiseId)
      const transfers = th || []
      const inNames = new Set(transfers.filter((t) => t.transfer_type.includes('In')).map((t) => t.player_name.toLowerCase()))
      const outSnaps = transfers.filter((t) => t.transfer_type.includes('Out') && t.player_snapshot).map((t) => t.player_snapshot)
      const baseline = players.filter((p) => !inNames.has(p.name.toLowerCase())).concat(outSnaps)

      const curOvr = avg(players, 'overall_rating'), curPot = avg(players, 'potential_rating')
      const baseOvr = avg(baseline, 'overall_rating'), basePot = avg(baseline, 'potential_rating')

      // Progression vs reference base ratings, name-matched.
      const names = players.map((p) => p.name)
      const { data: refs } = await supabase.from('player_reference').select('name, overall_rating, potential_rating').in('name', names)
      const refByName = {}
      for (const r of (refs || [])) refByName[r.name.toLowerCase()] = r
      let dOvr = 0, dPot = 0, nOvr = 0, nPot = 0
      for (const p of players) {
        const r = refByName[p.name.toLowerCase()]
        if (!r) continue
        if (p.overall_rating != null && r.overall_rating != null) { dOvr += p.overall_rating - r.overall_rating; nOvr++ }
        if (p.potential_rating != null && r.potential_rating != null) { dPot += p.potential_rating - r.potential_rating; nPot++ }
      }
      if (cancelled) return
      setTrajectory({
        baseOvr: baseOvr, basePot: basePot,
        moves: {
          ovr: curOvr != null && baseOvr != null ? curOvr - baseOvr : null,
          pot: curPot != null && basePot != null ? curPot - basePot : null
        },
        progression: {
          ovr: nOvr ? dOvr / nOvr : null,
          pot: nPot ? dPot / nPot : null
        },
        combined: {
          ovr: curOvr != null && baseOvr != null ? (curOvr - baseOvr) + (nOvr ? dOvr / nOvr : 0) : null,
          pot: curPot != null && basePot != null ? (curPot - basePot) + (nPot ? dPot / nPot : 0) : null
        },
        movesCount: transfers.length,
        progressionCount: nOvr
      })
    }
    run()
    return () => { cancelled = true }
  }, [players, franchise, isCfb])

  // ---- Transfer tracking -------------------------------------------------
  // Every add/removal is auto-logged to transfer_history; the modal just lets
  // the user enrich the entry with deal details (fee, club, sell-on %, swap).
  const logTransfer = async (direction, player, details) => {
    const d = details || {}
    await supabase.from('transfer_history').insert({
      franchise_id: franchiseId,
      season: franchise.current_season,
      player_name: player.name,
      transfer_type: direction === 'out' ? 'Out' : 'In',
      from_club: direction === 'out' ? franchise.club_name : (d.club || player.active_club || null),
      to_club: direction === 'out' ? (d.club || null) : franchise.club_name,
      fee_eur: d.fee ? parseFloat(d.fee) : null,
      sell_on_pct: d.sellOn ? parseFloat(d.sellOn) : null,
      swap_player: d.swap || null,
      player_snapshot: direction === 'out' ? player : null
    })
  }

  const openTransferModal = (direction, player) => {
    setTransferModal({ direction, player })
    setTFee('')
    setTSellOn('')
    setTSwap('')
    setTClub(direction === 'in' ? (player.active_club && player.active_club !== franchise.club_name ? player.active_club : '') : '')
  }

  const completeTransferModal = async (withDetails) => {
    const { direction, player } = transferModal
    const details = withDetails ? { fee: tFee, club: tClub, sellOn: tSellOn, swap: tSwap } : {}
    await logTransfer(direction, player, details)
    if (direction === 'out') {
      await supabase.from('players').delete().eq('id', player.id)
      await loadPlayers()
    }
    setTransferModal(null)
  }

  const handleDeletePlayer = async (playerId) => {
    if (!isCfb) {
      const player = players.find(function(p) { return p.id === playerId })
      if (player) {
        openTransferModal('out', player)
        return
      }
    }
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
    const ordered = columnOrder.map(function(k) { return byKey[k] }).filter(Boolean)
    // Append any columns missing from a saved order (e.g. newly added NIL column).
    const inOrder = new Set(columnOrder)
    for (let i = 0; i < gameColumns.length; i++) {
      if (!inOrder.has(gameColumns[i].key)) ordered.push(gameColumns[i])
    }
    return ordered
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

    if (isCfb) {
      const offenseRatings = []
      const defenseRatings = []

      for (let i = 0; i < players.length; i++) {
        const p = players[i]
        const group = CFB_POSITION_GROUP[p.position]
        if (group === 'Offense' && typeof p.overall_rating === 'number') offenseRatings.push(p.overall_rating)
        if (group === 'Defense' && typeof p.overall_rating === 'number') defenseRatings.push(p.overall_rating)
      }

      const classCounts = {}
      const classOveralls = {}
      const classDevCounts = {}
      const classRecruitStars = {}
      for (let i = 0; i < players.length; i++) {
        const p = players[i]
        const cls = p.cfb_class || 'Unknown'
        classCounts[cls] = (classCounts[cls] || 0) + 1
        if (!classOveralls[cls]) classOveralls[cls] = []
        if (typeof p.overall_rating === 'number') classOveralls[cls].push(p.overall_rating)
        if (!classDevCounts[cls]) classDevCounts[cls] = {}
        const d = p.dev_trait || 'Normal'
        classDevCounts[cls][d] = (classDevCounts[cls][d] || 0) + 1
        const starRating = recruitingStarsByName[p.name]
        if (typeof starRating === 'number') {
          if (!classRecruitStars[cls]) classRecruitStars[cls] = []
          classRecruitStars[cls].push(starRating)
        }
      }
      const knownClasses = CLASS_ORDER.filter(function(c) { return classCounts[c] })
      const unknownClasses = Object.keys(classCounts).filter(function(c) { return CLASS_ORDER.indexOf(c) === -1 })
      const classBreakdown = knownClasses.concat(unknownClasses).map(function(c) {
        return {
          label: c,
          count: classCounts[c],
          avgOverall: average(classOveralls[c] || []),
          devCounts: Object.keys(classDevCounts[c] || {}).map(function(d) { return { label: d, count: classDevCounts[c][d] } }),
          avgRecruitStars: classRecruitStars[c] && classRecruitStars[c].length > 0 ? average(classRecruitStars[c]) : null
        }
      })

      const sideBreakdown = ['Offense', 'Defense', 'Special Teams'].map(function(side) {
        const sidePlayers = players.filter(function(p) { return CFB_POSITION_GROUP[p.position] === side })
        if (sidePlayers.length === 0) return null

        const depthGroupsForSide = DEPTH_GROUPS.filter(function(g) { return g.side === side })

        const groups = depthGroupsForSide
          .map(function(depthGroup) {
            const groupPlayers = sidePlayers.filter(function(p) { return depthGroup.positions.indexOf(p.position) !== -1 })
            if (groupPlayers.length === 0) return null

            const positions = depthGroup.positions
              .map(function(pos) {
                const posPlayers = groupPlayers.filter(function(p) { return p.position === pos })
                if (posPlayers.length === 0) return null
                const posDevCounts = {}
                for (let i = 0; i < posPlayers.length; i++) {
                  const d = posPlayers[i].dev_trait || 'Normal'
                  posDevCounts[d] = (posDevCounts[d] || 0) + 1
                }
                return {
                  position: pos,
                  count: posPlayers.length,
                  devCounts: Object.keys(posDevCounts).map(function(d) { return { label: d, count: posDevCounts[d] } })
                }
              })
              .filter(function(p) { return p !== null })

            const topPlayers = groupPlayers
              .filter(function(p) { return typeof p.overall_rating === 'number' })
              .slice()
              .sort(function(a, b) { return b.overall_rating - a.overall_rating })
              .slice(0, 3)

            return {
              label: depthGroup.label,
              count: groupPlayers.length,
              avgOverall: average(groupPlayers.map(function(p) { return p.overall_rating })),
              positions: positions,
              topPlayers: topPlayers
            }
          })
          .filter(function(g) { return g !== null })

        return {
          side: side,
          count: sidePlayers.length,
          groups: groups
        }
      }).filter(function(s) { return s !== null })

      return {
        squadSize: players.length,
        avgOverall: average(overalls),
        offenseAvg: average(offenseRatings),
        defenseAvg: average(defenseRatings),
        classBreakdown: classBreakdown,
        sideBreakdown: sideBreakdown
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

    const topPlayers = players
      .filter(function(p) { return typeof p.overall_rating === 'number' })
      .slice()
      .sort(function(a, b) { return b.overall_rating - a.overall_rating })
      .slice(0, 5)

    const fcPosBuckets = {}
    for (let i = 0; i < players.length; i++) {
      const p = players[i]
      const group = fcPositionGroup(p.position)
      if (!fcPosBuckets[group]) fcPosBuckets[group] = []
      fcPosBuckets[group].push(p)
    }
    const fcGroupAverages = FC_POSITION_ORDER
      .filter(function(g) { return fcPosBuckets[g] && fcPosBuckets[g].length > 0 })
      .map(function(g) {
        const rows = fcPosBuckets[g]
        return {
          key: g,
          label: g,
          count: rows.length,
          avgOverall: average(rows.map(function(r) { return r.overall_rating })),
          avgPotential: average(rows.map(function(r) { return r.potential_rating }))
        }
      })

    return {
      squadSize: players.length,
      avgAge: average(ages),
      avgOverall: average(overalls),
      avgPotential: average(potentials),
      totalValue: totalValue,
      totalWage: totalWage,
      topPlayers: topPlayers,
      fcGroupAverages: fcGroupAverages
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

  const currentSeasonSnapshots = useMemo(function() {
    return seasonSnapshots.filter(function(s) { return s.season === franchise.current_season })
  }, [seasonSnapshots, franchise])

  const hasStartSnapshot = currentSeasonSnapshots.some(function(s) { return s.label === 'Start' })
  const hasEndSnapshot = currentSeasonSnapshots.some(function(s) { return s.label === 'End' })

  const recordSnapshot = async (label) => {
    setRecordingSnapshot(true)

    const payload = {
      franchise_id: franchiseId,
      season: franchise.current_season,
      label: label,
      squad_size: teamStats.squadSize,
      avg_overall: teamStats.avgOverall
    }

    if (isCfb) {
      payload.offense_avg = teamStats.offenseAvg
      payload.defense_avg = teamStats.defenseAvg
    } else {
      payload.avg_potential = teamStats.avgPotential
    }

    const { error } = await supabase.from('season_snapshots').insert(payload)

    if (error) {
      alert(error.message)
      setRecordingSnapshot(false)
      return
    }

    if (label === 'End') {
      const nextSeason = franchise.current_season + 1
      await supabase.from('franchises').update({ current_season: nextSeason }).eq('id', franchiseId)
      setFranchise(function(prev) { return Object.assign({}, prev, { current_season: nextSeason }) })
    }

    await loadSnapshots()
    setRecordingSnapshot(false)
  }

  const groupedBySeason = useMemo(function() {
    const seasons = Array.from(new Set(seasonSnapshots.map(function(s) { return s.season }))).sort(function(a, b) { return a - b })
    return seasons.map(function(season) {
      const start = seasonSnapshots.find(function(s) { return s.season === season && s.label === 'Start' })
      const end = seasonSnapshots.find(function(s) { return s.season === season && s.label === 'End' })
      return { season: season, start: start, end: end }
    })
  }, [seasonSnapshots])

  const deltaDisplay = (startVal, endVal, decimals) => {
    if (startVal === null || startVal === undefined || endVal === null || endVal === undefined) return null
    const diff = endVal - startVal
    const sign = diff > 0 ? '+' : ''
    const color = diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-neutral-400'
    return <span className={color}>{sign}{diff.toFixed(decimals)}</span>
  }

  const TAB_DEFS = {
    dashboard: { type: 'tab', label: 'Dashboard' },
    roster: { type: 'tab', label: 'Roster' },
    depth: { type: 'tab', label: 'Depth Chart', cfbOnly: true },
    squad: { type: 'tab', label: 'Squad / Tactics', fcOnly: true },
    progression: { type: 'tab', label: 'Progression' },
    teamstats: { type: 'link', label: 'Team Stats', href: '/franchise/' + franchiseId + '/team-stats' },
    playerstats: { type: 'link', label: 'Player Stats', href: '/franchise/' + franchiseId + '/stats' },
    teamneeds: { type: 'link', label: 'Team Needs', href: '/franchise/' + franchiseId + '/team-needs' },
    history: {
      type: 'link',
      label: isCfb ? 'Recruiting History' : 'Transfer History',
      href: '/franchise/' + franchiseId + (isCfb ? '/recruiting-history' : '/transfer-history')
    }
  }

  if (loading || !columnOrder || !tabOrder) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading...
      </div>
    )
  }

  // Broadcast-style ticker items computed from the real roster.
  const rated = players.filter(function(p) { return p.overall_rating != null })
  const squadOvr = rated.length ? rated.reduce(function(s, p) { return s + p.overall_rating }, 0) / rated.length : null
  const topPlayer = rated.length ? rated.reduce(function(a, b) { return b.overall_rating > a.overall_rating ? b : a }) : null
  const tickerItems = []
  if (topPlayer) tickerItems.push(['TOP RATED', topPlayer.name + ' ' + topPlayer.overall_rating])
  if (squadOvr !== null) tickerItems.push(['SQUAD OVR', squadOvr.toFixed(1)])
  tickerItems.push(['SQUAD SIZE', players.length + ' players'])
  if (isCfb) {
    const elite = players.filter(function(p) { return p.dev_trait === 'Elite' }).length
    if (elite) tickerItems.push(['ELITE DEV', elite + ' players'])
    const nilLeader = players.filter(function(p) { return p.nil_value != null }).sort(function(a, b) { return b.nil_value - a.nil_value })[0]
    if (nilLeader && nilLeader.nil_value > 0) tickerItems.push(['TOP NIL', nilLeader.name + ' ' + nilLeader.nil_value.toLocaleString()])
    const fr = players.filter(function(p) { return p.cfb_class === 'FR' }).length
    if (fr) tickerItems.push(['FRESHMEN', fr])
  } else {
    const withPot = players.filter(function(p) { return p.potential_rating != null && p.overall_rating != null })
    const riser = withPot.sort(function(a, b) { return (b.potential_rating - b.overall_rating) - (a.potential_rating - a.overall_rating) })[0]
    if (riser && riser.potential_rating > riser.overall_rating) tickerItems.push(['BIGGEST UPSIDE', riser.name + ' ' + riser.overall_rating + ' → ' + riser.potential_rating])
    const aged = players.filter(function(p) { return p.age != null })
    if (aged.length) tickerItems.push(['AVG AGE', (aged.reduce(function(s, p) { return s + p.age }, 0) / aged.length).toFixed(1)])
    const speedster = players.filter(function(p) { return p.pace != null }).sort(function(a, b) { return b.pace - a.pace })[0]
    if (speedster) tickerItems.push(['FASTEST', speedster.name + ' ' + speedster.pace + ' PAC'])
  }
  const eightyPlus = rated.filter(function(p) { return p.overall_rating >= 80 }).length
  if (eightyPlus) tickerItems.push(['80+ CLUB', eightyPlus + ' players'])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <style>{'@keyframes rhqTicker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}'}</style>
      <div className="max-w-7xl mx-auto px-6 py-8">

        <a href="/" className="text-violet-400 hover:text-violet-300 text-sm font-medium">
          &larr; Back to Franchises
        </a>

        <div className="mt-4 mb-0 bg-gradient-to-br from-violet-600/40 via-violet-900/20 to-neutral-900 border border-violet-500/40 rounded-2xl p-6 flex justify-between items-start gap-6 flex-wrap">
          <div>
            <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em] mb-1">
              {(franchise.game || 'EA FC 26') + ' · ' + (isCfb ? 'Dynasty Center' : (franchise.game === 'EA FC 26' || !franchise.game) ? 'Career Center' : 'Franchise Center')}
            </p>
            <h1 className="text-4xl font-black uppercase tracking-tight leading-none">{franchise.club_name}</h1>
            <div className="flex items-center gap-2 mt-2">
              {editingLeague ? (
                <>
                  <select
                    value={leagueDraft}
                    onChange={(e) => setLeagueDraft(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">
                      {isCfb ? 'Select a conference...' : 'Select a league...'}
                    </option>
                    {(isCfb ? CFB_CONFERENCES : LEAGUES).map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveLeague}
                    disabled={savingLeague}
                    className="text-violet-400 hover:text-violet-300 text-xs font-semibold"
                  >
                    {savingLeague ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingLeague(false); setLeagueDraft(franchise.league || '') }}
                    className="text-neutral-500 hover:text-neutral-300 text-xs"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="text-neutral-400">{franchise.league || 'No ' + (isCfb ? 'conference' : 'league') + ' set'} &middot; Season {franchise.current_season}</p>
                  <button
                    onClick={() => setEditingLeague(true)}
                    className="text-neutral-500 hover:text-violet-400 text-xs font-medium"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {squadOvr !== null && (
              <div className="text-center">
                <p className="text-neutral-400 text-[10px] uppercase tracking-wide mb-0.5">Overall</p>
                <p className={'text-4xl font-bold tabular-nums leading-none ' + statTextColor(squadOvr)}>{squadOvr.toFixed(1)}</p>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {players.length === 0 && (
                <button
                  onClick={handleImportRoster}
                  disabled={importingRoster}
                  className="border border-violet-500/60 text-violet-300 hover:bg-violet-600 hover:text-white transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap disabled:opacity-40"
                >
                  {importingRoster ? 'Importing...' : 'Import Roster from Database'}
                </button>
              )}
              <a
                href={'/franchise/' + franchiseId + '/roster-photo'}
                className="border border-violet-500/60 text-violet-300 hover:bg-violet-600 hover:text-white transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap"
              >
                Import from Photo
              </a>
              <button
                onClick={() => setShowAddPanel(!showAddPanel)}
                className="bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap"
              >
                {showAddPanel ? 'Cancel' : '+ Add Player'}
              </button>
            </div>
          </div>
        </div>

        {tickerItems.length > 0 && (
          <div className="mb-6 mt-2 overflow-hidden border border-neutral-800 rounded-lg bg-neutral-900/80">
            <div className="flex whitespace-nowrap w-max" style={{ animation: 'rhqTicker 40s linear infinite' }}>
              {[0, 1].map(function(dup) {
                return (
                  <div key={dup} className="flex">
                    {tickerItems.map(function(item, i) {
                      return (
                        <span key={dup + '-' + i} className="inline-flex items-center gap-2 px-5 py-2 text-[13px] border-r border-neutral-800">
                          <span className="text-violet-400 font-bold uppercase tracking-wide">{item[0]}</span>
                          <span className="text-neutral-200 font-semibold">{item[1]}</span>
                        </span>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {transferModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-gradient-to-br from-violet-600/25 via-neutral-900 to-neutral-950 border border-violet-500/40 rounded-2xl p-6 shadow-2xl">
              <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em]">
                Transfer {transferModal.direction === 'out' ? 'Out' : 'In'}
              </p>
              <h3 className="text-2xl font-black uppercase tracking-tight mt-1">{transferModal.player.name}</h3>
              <p className="text-neutral-400 text-xs mt-1 mb-5">
                This move is logged to Transfer History automatically — add deal details for tracking, or skip.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">
                    {transferModal.direction === 'out' ? 'Sale Price (€)' : 'Purchase Price (€)'}
                  </label>
                  <input type="number" value={tFee} onChange={(e) => setTFee(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">
                    {transferModal.direction === 'out' ? 'Sold To' : 'Signed From'}
                  </label>
                  <input type="text" value={tClub} onChange={(e) => setTClub(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Sell-On Clause (%)</label>
                  <input type="number" value={tSellOn} onChange={(e) => setTSellOn(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Player Swap (name)</label>
                  <input type="text" value={tSwap} onChange={(e) => setTSwap(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div className="flex justify-between items-center gap-2 flex-wrap">
                {transferModal.direction === 'out' ? (
                  <button onClick={() => setTransferModal(null)} className="text-neutral-400 hover:text-neutral-200 text-sm px-2 py-2">Cancel</button>
                ) : <span />}
                <div className="flex gap-2">
                  <button onClick={() => completeTransferModal(false)} className="border border-neutral-700 hover:bg-neutral-800 transition-colors rounded-lg px-4 py-2 text-sm font-medium text-neutral-300">
                    Skip details{transferModal.direction === 'out' ? ' & remove' : ''}
                  </button>
                  <button onClick={() => completeTransferModal(true)} className="bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg px-4 py-2 text-sm font-semibold">
                    {transferModal.direction === 'out' ? 'Log & Remove' : 'Log Transfer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddPanel && (
          <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
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
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                autoFocus
              />
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg overflow-hidden">
                  {searchResults.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => handleSelectPlayer(p)}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-700 flex justify-between items-start text-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-100">{isCfb ? p.player_name : p.name}</span>
                          <span className="text-neutral-400 text-xs">{p.position}</span>
                        </div>
                        <p className="text-neutral-500 text-xs mt-0.5">
                          {isCfb ? (
                            <>
                              {p.team || 'Unknown team'} &middot; {p.class || '-'} &middot; {p.dev_trait || 'Normal'}
                            </>
                          ) : (
                            <>
                              {p.active_club || 'Unknown club'} &middot; Age {p.age || '-'} &middot; POT {p.potential_rating !== null && p.potential_rating !== undefined ? p.potential_rating : '-'} &middot; {p.nationality || '-'}
                            </>
                          )}
                        </p>
                      </div>
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
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Weekly Wage</label>
                  <input
                    type="number"
                    value={wage}
                    onChange={(e) => setWage(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Contract Years</label>
                  <input
                    type="number"
                    value={contractYears}
                    onChange={(e) => setContractYears(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Add to Roster
              </button>
            </div>
          </div>
        )}


        <div className="flex gap-1 mb-6 border-b border-neutral-800 flex-wrap">
          {tabOrder.map(function(key) {
            const def = TAB_DEFS[key]
            if (!def) return null
            if (def.cfbOnly && !isCfb) return null
            if (def.fcOnly && isCfb) return null
            const isDragOver = dragOverTabKey === key && dragTabKey !== key
            const sharedClassName =
              'px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.08em] border-b-2 -mb-px transition-colors cursor-move select-none ' +
              (isDragOver ? 'border-violet-300 bg-violet-900/20 ' : '') +
              (def.type === 'tab' && activeTab === key
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-neutral-500 hover:text-neutral-200')

            if (def.type === 'tab') {
              return (
                <button
                  key={key}
                  draggable
                  onDragStart={() => handleTabDragStart(key)}
                  onDragOver={(e) => handleTabDragOver(e, key)}
                  onDrop={(e) => handleTabDrop(e, key)}
                  onDragEnd={handleTabDragEnd}
                  onClick={() => setActiveTab(key)}
                  className={sharedClassName}
                >
                  {def.label}
                </button>
              )
            }

            return (
              <a
                key={key}
                draggable
                onDragStart={() => handleTabDragStart(key)}
                onDragOver={(e) => handleTabDragOver(e, key)}
                onDrop={(e) => handleTabDrop(e, key)}
                onDragEnd={handleTabDragEnd}
                href={def.href}
                className={sharedClassName}
              >
                {def.label}
              </a>
            )
          })}
        </div>

        {activeTab === 'dashboard' && (
          <>
          {isCfb && players.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-end mb-2">
                <select
                  value={benchmarkConference || 'ALL'}
                  onChange={(e) => setBenchmarkConference(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ALL">All Conferences</option>
                  {CFB_CONFERENCES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 mb-3">
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Squad Size</p>
                  <p className="text-2xl font-semibold text-neutral-100">{teamStats.squadSize}</p>
                  <MiniBenchmarkBar ownValue={teamStats.squadSize} benchmark={getCfbBenchmark('squadSize')} isCurrency={false} decimals={0} />
                </div>
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Avg Overall</p>
                  <p className="text-2xl font-semibold text-violet-400">
                    {teamStats.avgOverall !== null ? teamStats.avgOverall.toFixed(1) : '-'}
                  </p>
                  <MiniBenchmarkBar ownValue={teamStats.avgOverall} benchmark={getCfbBenchmark('avgOverall')} isCurrency={false} decimals={1} />
                </div>
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Offense</p>
                  <p className="text-2xl font-semibold text-neutral-100">
                    {teamStats.offenseAvg !== null ? teamStats.offenseAvg.toFixed(0) : '-'}
                  </p>
                  <MiniBenchmarkBar ownValue={teamStats.offenseAvg} benchmark={getCfbBenchmark('offenseAvg')} isCurrency={false} decimals={0} />
                </div>
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Defense</p>
                  <p className="text-2xl font-semibold text-neutral-100">
                    {teamStats.defenseAvg !== null ? teamStats.defenseAvg.toFixed(0) : '-'}
                  </p>
                  <MiniBenchmarkBar ownValue={teamStats.defenseAvg} benchmark={getCfbBenchmark('defenseAvg')} isCurrency={false} decimals={0} />
                </div>
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">NIL Funds</p>
                  {editingNil ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={nilDraft}
                        onChange={(e) => setNilDraft(e.target.value)}
                        placeholder="0"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        autoFocus
                      />
                      <button onClick={handleSaveNil} disabled={savingNil} className="text-violet-400 hover:text-violet-300 text-xs font-semibold whitespace-nowrap">
                        {savingNil ? '...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-semibold text-neutral-100">{formatUsd(franchise.nil_funds || 0)}</p>
                      <button onClick={() => setEditingNil(true)} className="text-neutral-500 hover:text-violet-400 text-xs font-medium">Edit</button>
                    </div>
                  )}
                </div>
                <a href={'/franchise/' + franchiseId + '/recruiting-history'} className="bg-neutral-900 border border-neutral-800 hover:border-violet-600 rounded-xl p-4 transition-colors">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Recruiting Class</p>
                  <p className="text-2xl font-semibold text-neutral-100">
                    {recruitingSummary.count}
                    {recruitingSummary.avgStars !== null && (
                      <span className="text-yellow-400 text-sm font-normal ml-1">{recruitingSummary.avgStars.toFixed(1)}&#9733;</span>
                    )}
                  </p>
                </a>
              </div>

              <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3">
                <p className="text-neutral-500 text-xs uppercase tracking-wide mb-2">Class Breakdown &middot; {teamStats.squadSize} players</p>
                {teamStats.classBreakdown && teamStats.classBreakdown.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {teamStats.classBreakdown.map(function(c) {
                      return (
                        <div key={c.label} className="bg-neutral-800/50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-neutral-200 text-sm font-semibold">{c.label}</span>
                            <span className="text-neutral-400 text-xs">{c.count} players</span>
                            {c.avgOverall !== null && (
                              <span className={'text-xs font-semibold ' + statTextColor(c.avgOverall)}>{c.avgOverall.toFixed(1)} OVR</span>
                            )}
                            {c.avgRecruitStars !== null && (
                              <span className="text-yellow-400 text-xs">{c.avgRecruitStars.toFixed(1)}&#9733;</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {c.devCounts.map(function(d) {
                              return (
                                <span key={d.label} className="text-neutral-500 text-xs">
                                  {d.label} <span className="text-neutral-300 font-medium">{d.count}</span>
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-sm">-</p>
                )}
              </div>

              <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                <p className="text-neutral-500 text-xs uppercase tracking-wide mb-3">Positional Breakdown</p>
                {teamStats.sideBreakdown && teamStats.sideBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {teamStats.sideBreakdown.map(function(s) {
                      return (
                        <div key={s.side}>
                          <p className="text-neutral-200 text-sm font-semibold mb-2">
                            {s.side} <span className="text-neutral-400 font-normal">{s.count} players</span>
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {s.groups.map(function(g) {
                              return (
                                <div key={g.label} className="bg-neutral-800/50 rounded-lg p-2">
                                  <p className="text-neutral-300 text-[11px] font-semibold uppercase tracking-wide mb-1 truncate">
                                    {g.label} <span className="text-neutral-500 font-normal normal-case">&middot; {g.count}</span>
                                    {g.avgOverall !== null && (
                                      <span className={'font-normal normal-case ml-1 ' + statTextColor(g.avgOverall)}>{g.avgOverall.toFixed(1)}</span>
                                    )}
                                  </p>
                                  <div className="flex gap-2">
                                    <div className="flex-1 min-w-0 flex flex-wrap content-start gap-1">
                                      {g.positions.map(function(p) {
                                        return (
                                          <div key={p.position} className="bg-neutral-900 rounded px-1.5 py-0.5">
                                            <div className="flex items-center gap-1">
                                              <span className="text-neutral-200 text-[11px] font-semibold">{p.position}</span>
                                              <span className="text-neutral-500 text-[9px]">{p.count}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-1">
                                              {p.devCounts.map(function(d) {
                                                return (
                                                  <span key={d.label} className="text-neutral-500 text-[9px]">
                                                    {d.label} <span className="text-neutral-300 font-medium">{d.count}</span>
                                                  </span>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                    {g.topPlayers && g.topPlayers.length > 0 && (
                                      <div className="w-20 flex-shrink-0 space-y-0.5 border-l border-neutral-700/50 pl-2">
                                        {g.topPlayers.map(function(p) {
                                          return (
                                            <div key={p.id} className="flex items-center justify-between gap-0.5">
                                              <span className="text-neutral-300 text-[9px] truncate">{p.name}</span>
                                              <OvrBadge value={p.overall_rating} small />
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-sm">-</p>
                )}
              </div>
            </div>
          )}

          {!isCfb && players.length > 0 && (
            <>
              <div className="flex justify-end mb-2">
                <select
                  value={benchmarkLeague || 'ALL'}
                  onChange={(e) => setBenchmarkLeague(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ALL">All Leagues</option>
                  {LEAGUES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-3 lg:grid-cols-6">
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Squad Size</p>
                  <p className="text-2xl font-semibold text-neutral-100">{teamStats.squadSize}</p>
                  <MiniBenchmarkBar ownValue={teamStats.squadSize} benchmark={getBenchmark('squadSize')} isCurrency={false} decimals={0} />
                </div>
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Avg Age</p>
                  <p className="text-2xl font-semibold text-neutral-100">
                    {teamStats.avgAge !== null ? teamStats.avgAge.toFixed(1) : '-'}
                  </p>
                  <MiniBenchmarkBar ownValue={teamStats.avgAge} benchmark={getBenchmark('avgAge')} isCurrency={false} decimals={1} />
                </div>
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Avg Overall</p>
                  <p className="text-2xl font-semibold text-violet-400">
                    {teamStats.avgOverall !== null ? teamStats.avgOverall.toFixed(1) : '-'}
                  </p>
                  <MiniBenchmarkBar ownValue={teamStats.avgOverall} benchmark={getBenchmark('avgOverall')} isCurrency={false} decimals={1} />
                </div>
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Avg Potential</p>
                  <p className="text-2xl font-semibold text-neutral-100">
                    {teamStats.avgPotential !== null ? teamStats.avgPotential.toFixed(1) : '-'}
                  </p>
                  <MiniBenchmarkBar ownValue={teamStats.avgPotential} benchmark={getBenchmark('avgPotential')} isCurrency={false} decimals={1} />
                </div>
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Team Value</p>
                  <p className="text-2xl font-semibold text-neutral-100">{formatEuro(teamStats.totalValue)}</p>
                  <MiniBenchmarkBar ownValue={teamStats.totalValue} benchmark={getBenchmark('totalValue')} isCurrency={true} decimals={0} />
                </div>
                <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Weekly Wages</p>
                  <p className="text-2xl font-semibold text-neutral-100">{formatEuro(teamStats.totalWage)}</p>
                  <MiniBenchmarkBar ownValue={teamStats.totalWage} benchmark={getBenchmark('totalWage')} isCurrency={true} decimals={0} />
                </div>
              </div>
            </>
          )}
          </>
        )}

        {activeTab === 'squad' && !isCfb && (() => {
          const LINE_OF = { GK: 'GK', RB: 'DEF', RWB: 'DEF', CB: 'DEF', LB: 'DEF', LWB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'ATT', RW: 'ATT', ST: 'ATT', CF: 'ATT' }
          const byOvr = players.slice().sort(function(a, b) { return (b.overall_rating || 0) - (a.overall_rating || 0) })
          const lines = { GK: [], DEF: [], MID: [], ATT: [] }
          for (const p of byOvr) {
            const line = LINE_OF[(p.position || '').toUpperCase()] || 'MID'
            lines[line].push(p)
          }
          const xi = [].concat(lines.ATT.slice(0, 3), lines.MID.slice(0, 3), lines.DEF.slice(0, 4), lines.GK.slice(0, 1))
          const xiIds = new Set(xi.map(function(p) { return p.id }))
          const bench = byOvr.filter(function(p) { return !xiIds.has(p.id) }).slice(0, 7)
          const POS_ORDER = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST']
          const depthGroups = POS_ORDER.map(function(pos) {
            return { pos: pos, list: byOvr.filter(function(p) { return (p.position || '').toUpperCase() === pos }) }
          }).filter(function(g) { return g.list.length > 0 })

          const Chip = function(props) {
            const p = props.p
            return (
              <div className="flex flex-col items-center gap-1 w-24">
                <span className={'text-lg font-bold tabular-nums leading-none ' + statTextColor(p.overall_rating)}>{p.overall_rating != null ? p.overall_rating : '-'}</span>
                <span className="text-[11px] font-semibold text-neutral-100 text-center leading-tight">{p.name}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide text-violet-300">{p.position}</span>
              </div>
            )
          }

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gradient-to-b from-violet-950/40 via-neutral-900 to-neutral-950 border border-violet-500/25 rounded-2xl p-6">
                <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em] mb-5">Best XI &middot; 4-3-3 by rating</p>
                <div className="space-y-7">
                  <div className="flex justify-center gap-6 flex-wrap">{lines.ATT.slice(0, 3).map(function(p) { return <Chip key={p.id} p={p} /> })}</div>
                  <div className="flex justify-center gap-6 flex-wrap">{lines.MID.slice(0, 3).map(function(p) { return <Chip key={p.id} p={p} /> })}</div>
                  <div className="flex justify-center gap-4 flex-wrap">{lines.DEF.slice(0, 4).map(function(p) { return <Chip key={p.id} p={p} /> })}</div>
                  <div className="flex justify-center">{lines.GK.slice(0, 1).map(function(p) { return <Chip key={p.id} p={p} /> })}</div>
                </div>
                <div className="mt-7 pt-5 border-t border-neutral-800">
                  <p className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Bench</p>
                  <div className="flex gap-4 flex-wrap">{bench.map(function(p) { return <Chip key={p.id} p={p} /> })}</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em] mb-4">Positional Depth</p>
                <div className="space-y-3">
                  {depthGroups.map(function(g) {
                    return (
                      <div key={g.pos} className="flex items-start gap-3">
                        <span className="w-10 shrink-0 text-neutral-400 text-xs font-bold uppercase pt-0.5">{g.pos}</span>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {g.list.map(function(p, i) {
                            return (
                              <span key={p.id} className="text-xs whitespace-nowrap">
                                <span className={i === 0 ? 'text-neutral-100 font-semibold' : 'text-neutral-400'}>{p.name}</span>
                                <span className={'ml-1 font-bold tabular-nums ' + statTextColor(p.overall_rating)}>{p.overall_rating != null ? p.overall_rating : '-'}</span>
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  {depthGroups.length === 0 && <p className="text-neutral-500 text-sm">No players yet.</p>}
                </div>
              </div>
            </div>
          )
        })()}

        {activeTab === 'progression' && (
          <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">Season Progression</h2>
                <p className="text-neutral-500 text-xs mt-1">Track where your team started vs. ended each season.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => recordSnapshot('Start')}
                  disabled={hasStartSnapshot || recordingSnapshot || players.length === 0}
                  className="border border-violet-600 text-violet-400 hover:bg-violet-600 hover:text-white transition-colors rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Record Season {franchise.current_season} Start
                </button>
                <button
                  onClick={() => recordSnapshot('End')}
                  disabled={!hasStartSnapshot || hasEndSnapshot || recordingSnapshot || players.length === 0}
                  className="bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Record Season {franchise.current_season} End &amp; Advance
                </button>
              </div>
            </div>

            {players.length === 0 && (
              <p className="text-neutral-500 text-sm">Add players to your roster before recording a snapshot.</p>
            )}

            {groupedBySeason.length === 0 ? (
              <p className="text-neutral-500 text-sm mt-2">No snapshots recorded yet. Click "Record Season {franchise.current_season} Start" to begin tracking.</p>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-neutral-400 text-xs uppercase tracking-wide border-b border-neutral-800">
                      <th className="text-left py-2 px-3">Season</th>
                      <th className="text-left py-2 px-3">Start OVR</th>
                      <th className="text-left py-2 px-3">End OVR</th>
                      <th className="text-left py-2 px-3">OVR &Delta;</th>
                      {isCfb ? (
                        <>
                          <th className="text-left py-2 px-3">Start Off/Def</th>
                          <th className="text-left py-2 px-3">End Off/Def</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-2 px-3">Start POT</th>
                          <th className="text-left py-2 px-3">End POT</th>
                        </>
                      )}
                      <th className="text-left py-2 px-3">Squad Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedBySeason.map(function(row, idx) {
                      const startOvr = row.start ? row.start.avg_overall : null
                      const endOvr = row.end ? row.end.avg_overall : null
                      return (
                        <tr key={row.season} className={(idx % 2 === 0 ? 'bg-transparent' : 'bg-neutral-800/40') + ' border-b border-neutral-800/60'}>
                          <td className="py-2.5 px-3 font-medium text-neutral-100">Season {row.season}</td>
                          <td className={'py-2.5 px-3 ' + statTextColor(startOvr)}>{startOvr !== null ? startOvr.toFixed(1) : '-'}</td>
                          <td className={'py-2.5 px-3 ' + statTextColor(endOvr)}>{endOvr !== null ? endOvr.toFixed(1) : 'In progress'}</td>
                          <td className="py-2.5 px-3">{deltaDisplay(startOvr, endOvr, 1) || '-'}</td>
                          {isCfb ? (
                            <>
                              <td className="py-2.5 px-3 text-neutral-300">
                                {row.start ? (row.start.offense_avg !== null ? row.start.offense_avg.toFixed(0) : '-') + ' / ' + (row.start.defense_avg !== null ? row.start.defense_avg.toFixed(0) : '-') : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-300">
                                {row.end ? (row.end.offense_avg !== null ? row.end.offense_avg.toFixed(0) : '-') + ' / ' + (row.end.defense_avg !== null ? row.end.defense_avg.toFixed(0) : '-') : '-'}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 px-3 text-neutral-300">{row.start && row.start.avg_potential !== null ? row.start.avg_potential.toFixed(1) : '-'}</td>
                              <td className="py-2.5 px-3 text-neutral-300">{row.end && row.end.avg_potential !== null ? row.end.avg_potential.toFixed(1) : '-'}</td>
                            </>
                          )}
                          <td className="py-2.5 px-3 text-neutral-300">
                            {row.start ? row.start.squad_size : '-'} &rarr; {row.end ? row.end.squad_size : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!isCfb && activeTab === 'dashboard' && players.length > 0 && trajectory && (
          <div className="bg-gradient-to-br from-violet-600/25 via-violet-900/10 to-neutral-900 border border-violet-500/30 rounded-xl p-5 mb-6">
            <h2 className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em] mb-1">Squad Trajectory</h2>
            <p className="text-neutral-500 text-xs mb-4">How this season&rsquo;s roster moves and in-game progression have shifted squad quality.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ['Roster Moves', trajectory.moves, trajectory.movesCount + ' transfers logged'],
                ['In-Game Progression', trajectory.progression, trajectory.progressionCount + ' players tracked vs base ratings'],
                ['Combined', trajectory.combined, 'moves + progression']
              ].map(function(row) {
                const label = row[0], d = row[1], sub = row[2]
                const fmt = function(v, base) {
                  if (v === null) return <span className="text-neutral-600">-</span>
                  const pct = base ? ' (' + (v >= 0 ? '+' : '') + (v / base * 100).toFixed(1) + '%)' : ''
                  return <span className={v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-neutral-400'}>{(v >= 0 ? '+' : '') + v.toFixed(1) + pct}</span>
                }
                return (
                  <div key={label} className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
                    <p className="text-neutral-400 text-[10px] font-semibold uppercase tracking-[0.14em] mb-2">{label}</p>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-neutral-500 text-[10px] uppercase">OVR</p>
                        <p className="text-xl font-bold tabular-nums">{fmt(d.ovr, trajectory.baseOvr)}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 text-[10px] uppercase">Potential</p>
                        <p className="text-xl font-bold tabular-nums">{fmt(d.pot, trajectory.basePot)}</p>
                      </div>
                    </div>
                    <p className="text-neutral-600 text-[11px] mt-2">{sub}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!isCfb && activeTab === 'dashboard' && players.length > 0 && (
          <>
            <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold mb-3 text-neutral-200">Top Players</h2>
              <div className="space-y-2">
                {teamStats.topPlayers && teamStats.topPlayers.length > 0 ? (
                  teamStats.topPlayers.map(function(p) {
                    return (
                      <div key={p.id} className="flex items-center justify-between bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium text-neutral-100">{p.name}</span>
                          <span className="text-neutral-500 text-xs ml-2">
                            {p.position}{p.active_club ? ' \u00b7 ' + p.active_club : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-400 text-xs">POT {p.potential_rating !== null && p.potential_rating !== undefined ? p.potential_rating : '-'}</span>
                          <OvrBadge value={p.overall_rating} small />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-neutral-500 text-sm">No players yet.</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-neutral-200">Position Group Averages</h2>
              <p className="text-neutral-500 text-xs mb-3">Average overall and potential by position group.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {teamStats.fcGroupAverages && teamStats.fcGroupAverages.map(function(g) {
                  return (
                    <div key={g.key} className="bg-neutral-800/50 border border-neutral-800 rounded-lg px-3 py-2.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-neutral-200 font-medium">{g.label}</span>
                        <span className="text-neutral-500 text-xs">({g.count})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <OvrBadge value={g.avgOverall !== null ? Math.round(g.avgOverall) : null} small />
                        <span className="text-neutral-500 text-xs">
                          POT {g.avgPotential !== null ? Math.round(g.avgPotential) : '-'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {isCfb && activeTab === 'depth' && (
          <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
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
                      <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-3">{depthGroup.label}</h3>
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
                                        (isDragOver ? 'bg-violet-900/40 border border-violet-600' : 'bg-neutral-900 border border-neutral-800 hover:border-neutral-700')
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

        {activeTab === 'roster' && (
          <div className="bg-gradient-to-br from-violet-600/40 via-violet-900/20 to-neutral-900 border border-violet-500/40 rounded-xl p-6">
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
                              (col.key === 'name' ? ' sticky left-0 z-20 bg-neutral-900' : '') +
                              (isDragOver ? ' bg-violet-900/30 border-l-2 border-violet-500' : '')
                            }
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveFilterColumn(activeFilterColumn === col.key ? null : col.key)
                                }}
                                className={'cursor-pointer hover:text-violet-400' + (hasFilter ? ' text-violet-400' : '')}
                              >
                                {col.label}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSort(col.key)
                                }}
                                className={'text-xs ' + (sortField === col.key ? 'text-violet-400' : 'text-neutral-500 hover:text-neutral-300')}
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
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
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

                          // Beginning overall — the rating when this player
                          // joined the roster; muted so the current pill reads
                          // as the live value.
                          if (col.key === 'base_overall') {
                            return (
                              <td key={col.key} className="py-2.5 px-3 whitespace-nowrap tabular-nums">
                                {typeof displayValue === 'number'
                                  ? <span className={'font-semibold opacity-70 ' + statTextColor(displayValue)}>{displayValue}</span>
                                  : <span className="text-neutral-600">-</span>}
                              </td>
                            )
                          }

                          // Progression since joining: +N green, -N red.
                          if (col.key === 'ovr_diff') {
                            return (
                              <td key={col.key} className="py-2.5 px-3 whitespace-nowrap tabular-nums font-bold">
                                {displayValue == null
                                  ? <span className="text-neutral-600">-</span>
                                  : displayValue > 0
                                    ? <span className="text-green-400">+{displayValue}</span>
                                    : displayValue < 0
                                      ? <span className="text-red-400">{displayValue}</span>
                                      : <span className="text-neutral-500">0</span>}
                              </td>
                            )
                          }

                          if (col.key === 'value_eur' || col.key === 'wage_eur_wk') {
                            displayValue = displayValue ? '\u20ac' + displayValue.toLocaleString() : '-'
                          }

                          if (col.key === 'nil_value') {
                            return (
                              <td key={col.key} className="py-2.5 px-3 whitespace-nowrap tabular-nums text-neutral-300">
                                {typeof displayValue === 'number' ? '$' + displayValue.toLocaleString() : '-'}
                              </td>
                            )
                          }

                          if (RATING_COLUMN_KEYS[col.key]) {
                            return (
                              <td key={col.key} className="py-2.5 px-3 whitespace-nowrap">
                                {typeof displayValue === 'number'
                                  ? <span className={'font-bold ' + statTextColor(displayValue)}>{displayValue}</span>
                                  : <span className="text-neutral-600">-</span>}
                              </td>
                            )
                          }

                          // Frozen pane: the name column stays pinned while
                          // the rest of the table scrolls horizontally.
                          // Names link to the player's profile page.
                          if (col.key === 'name') {
                            return (
                              <td key={col.key} className="py-2.5 px-3 whitespace-nowrap sticky left-0 z-10 bg-neutral-900">
                                <a href={'/franchise/' + franchiseId + '/player/' + p.id} className="font-semibold text-neutral-100 hover:text-violet-300 transition-colors">
                                  {displayValue}
                                </a>
                              </td>
                            )
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
