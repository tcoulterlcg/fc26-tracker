'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const GAMES = [
  { id: 'EA FC 26', label: 'EA FC 26', sub: 'Soccer', status: 'live' },
  { id: 'EA CFB 27', label: 'EA College Football 27', sub: 'College Football', status: 'live' },
  { id: 'EA NHL 26', label: 'EA NHL 26', sub: 'Hockey', status: 'soon' },
  { id: 'EA Madden 26', label: 'EA Madden 26', sub: 'Football', status: 'soon' },
  { id: 'MLB The Show 26', label: 'MLB The Show 26', sub: 'Baseball', status: 'soon' }
]

const LEAGUES = [
  'Premier League',
  'EFL Championship',
  'EFL League One',
  'EFL League Two',
  'La Liga',
  'La Liga 2',
  'Bundesliga',
  'Bundesliga 2',
  'Serie A',
  'Serie B',
  'Ligue 1',
  'Ligue 2',
  'Eredivisie',
  'Primeira Liga',
  'Belgian Pro League',
  'Scottish Premiership',
  'MLS',
  'Liga MX',
  'Brasileirão',
  'Saudi Pro League',
  'Süper Lig',
  'A-League',
  'Other / International'
]

const CFB_CONFERENCES = [
  'SEC',
  'Big Ten',
  'Big 12',
  'ACC',
  'American Athletic',
  'Mountain West',
  'Conference USA',
  'Sun Belt',
  'MAC',
  'Independent',
  'Other'
]

const CLUB_LEAGUE_MAP = {
  'Arsenal': 'Premier League',
  'Aston Villa': 'Premier League',
  'Bournemouth': 'Premier League',
  'Brentford': 'Premier League',
  'Brighton & Hove Albion': 'Premier League',
  'Chelsea': 'Premier League',
  'Crystal Palace': 'Premier League',
  'Everton': 'Premier League',
  'Fulham': 'Premier League',
  'Ipswich Town': 'Premier League',
  'Leicester City': 'Premier League',
  'Liverpool': 'Premier League',
  'Manchester City': 'Premier League',
  'Manchester United': 'Premier League',
  'Newcastle United': 'Premier League',
  'Nottingham Forest': 'Premier League',
  'Southampton': 'Premier League',
  'Tottenham Hotspur': 'Premier League',
  'West Ham United': 'Premier League',
  'Wolverhampton Wanderers': 'Premier League',

  'Queens Park Rangers': 'EFL Championship',
  'Leeds United': 'EFL Championship',
  'Burnley': 'EFL Championship',
  'Sheffield United': 'EFL Championship',
  'West Bromwich Albion': 'EFL Championship',
  'Norwich City': 'EFL Championship',
  'Middlesbrough': 'EFL Championship',
  'Coventry City': 'EFL Championship',
  'Sunderland': 'EFL Championship',
  'Watford': 'EFL Championship',
  'Stoke City': 'EFL Championship',
  'Hull City': 'EFL Championship',
  'Preston North End': 'EFL Championship',
  'Bristol City': 'EFL Championship',
  'Cardiff City': 'EFL Championship',
  'Swansea City': 'EFL Championship',
  'Millwall': 'EFL Championship',
  'Blackburn Rovers': 'EFL Championship',
  'Plymouth Argyle': 'EFL Championship',
  'Luton Town': 'EFL Championship',
  'Derby County': 'EFL Championship',
  'Portsmouth': 'EFL Championship',
  'Oxford United': 'EFL Championship',

  'Real Madrid': 'La Liga',
  'Barcelona': 'La Liga',
  'Atlético Madrid': 'La Liga',
  'Athletic Club': 'La Liga',
  'Real Sociedad': 'La Liga',
  'Real Betis': 'La Liga',
  'Villarreal': 'La Liga',
  'Valencia': 'La Liga',
  'Sevilla': 'La Liga',
  'Girona': 'La Liga',

  'Bayern Munich': 'Bundesliga',
  'Borussia Dortmund': 'Bundesliga',
  'RB Leipzig': 'Bundesliga',
  'Bayer Leverkusen': 'Bundesliga',
  'Eintracht Frankfurt': 'Bundesliga',
  'VfB Stuttgart': 'Bundesliga',
  'Borussia Mönchengladbach': 'Bundesliga',
  'Wolfsburg': 'Bundesliga',

  'Juventus': 'Serie A',
  'Inter Milan': 'Serie A',
  'AC Milan': 'Serie A',
  'Napoli': 'Serie A',
  'AS Roma': 'Serie A',
  'Lazio': 'Serie A',
  'Atalanta': 'Serie A',
  'Fiorentina': 'Serie A',

  'Paris Saint-Germain': 'Ligue 1',
  'Marseille': 'Ligue 1',
  'Monaco': 'Ligue 1',
  'Lyon': 'Ligue 1',
  'Lille': 'Ligue 1',
  'Nice': 'Ligue 1',
  'Lens': 'Ligue 1',

  'Ajax': 'Eredivisie',
  'PSV Eindhoven': 'Eredivisie',
  'Feyenoord': 'Eredivisie',

  'Benfica': 'Primeira Liga',
  'Porto': 'Primeira Liga',
  'Sporting CP': 'Primeira Liga',

  'Celtic': 'Scottish Premiership',
  'Rangers': 'Scottish Premiership',

  'Inter Miami': 'MLS',
  'LA Galaxy': 'MLS',
  'LAFC': 'MLS',
  'Seattle Sounders': 'MLS',
  'Atlanta United': 'MLS'
}

const CFB_TEAM_CONFERENCE_MAP = {
  'Alabama': 'SEC', 'Arkansas': 'SEC', 'Auburn': 'SEC', 'Florida': 'SEC', 'Georgia': 'SEC',
  'Kentucky': 'SEC', 'LSU': 'SEC', 'Mississippi State': 'SEC', 'Missouri': 'SEC', 'Oklahoma': 'SEC',
  'Ole Miss': 'SEC', 'South Carolina': 'SEC', 'Tennessee': 'SEC', 'Texas': 'SEC', 'Texas A&M': 'SEC',
  'Vanderbilt': 'SEC',

  'Illinois': 'Big Ten', 'Indiana': 'Big Ten', 'Iowa': 'Big Ten', 'Maryland': 'Big Ten',
  'Michigan': 'Big Ten', 'Michigan State': 'Big Ten', 'Minnesota': 'Big Ten', 'Nebraska': 'Big Ten',
  'Northwestern': 'Big Ten', 'Ohio State': 'Big Ten', 'Oregon': 'Big Ten', 'Penn State': 'Big Ten',
  'Purdue': 'Big Ten', 'Rutgers': 'Big Ten', 'UCLA': 'Big Ten', 'USC': 'Big Ten',
  'Washington': 'Big Ten', 'Wisconsin': 'Big Ten',

  'Boston College': 'ACC', 'California': 'ACC', 'Clemson': 'ACC', 'Duke': 'ACC',
  'Florida State': 'ACC', 'Georgia Tech': 'ACC', 'Louisville': 'ACC', 'Miami': 'ACC',
  'NC State': 'ACC', 'North Carolina': 'ACC', 'Pittsburgh': 'ACC', 'SMU': 'ACC',
  'Stanford': 'ACC', 'Syracuse': 'ACC', 'Virginia': 'ACC', 'Virginia Tech': 'ACC',
  'Wake Forest': 'ACC',

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

  'Notre Dame': 'Independent', 'UConn': 'Independent', 'UMass': 'Independent'
}

function RosterHQLogo({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="emeraldGradHeader" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
          <stop offset="100%" stopColor="#059669" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="#0a0a0a" />
      <rect x="120" y="120" width="272" height="80" rx="16" fill="url(#emeraldGradHeader)" />
      <rect x="120" y="216" width="180" height="80" rx="16" fill="#10b981" opacity="0.65" />
      <rect x="120" y="312" width="272" height="80" rx="16" fill="url(#emeraldGradHeader)" opacity="0.9" />
      <circle cx="356" cy="256" r="34" fill="#0a0a0a" stroke="#34d399" strokeWidth="8" />
      <circle cx="356" cy="256" r="10" fill="#34d399" />
    </svg>
  )
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [franchises, setFranchises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [clubName, setClubName] = useState('')
  const [league, setLeague] = useState('')
  const [creating, setCreating] = useState(false)

  const [clubResults, setClubResults] = useState([])
  const [showClubResults, setShowClubResults] = useState(false)

  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (selectedGame === 'EA FC 26' && clubName.length >= 2) {
        searchClubs()
      } else if (selectedGame === 'EA CFB 27' && clubName.length >= 1) {
        searchCfbTeams()
      } else {
        setClubResults([])
      }
    }, 200)
    return () => clearTimeout(delayDebounce)
  }, [clubName, selectedGame])

  const checkUser = async () => {
    const result = await supabase.auth.getUser()
    const user = result.data.user
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    await loadFranchises(user.id)
    setLoading(false)
  }

  const loadFranchises = async (userId) => {
    const result = await supabase
      .from('franchises')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (!result.error) {
      setFranchises(result.data)
    }
  }

  const searchClubs = async () => {
    const result = await supabase
      .from('player_reference')
      .select('active_club')
      .ilike('active_club', '%' + clubName + '%')
      .limit(50)

    if (!result.error) {
      const uniqueClubs = []
      const seen = {}
      for (let i = 0; i < result.data.length; i++) {
        const club = result.data[i].active_club
        if (club && !seen[club]) {
          seen[club] = true
          uniqueClubs.push(club)
        }
      }
      setClubResults(uniqueClubs.slice(0, 6))
      setShowClubResults(true)
    }
  }

  const searchCfbTeams = () => {
    const lower = clubName.toLowerCase()
    const matches = Object.keys(CFB_TEAM_CONFERENCE_MAP).filter(function(team) {
      return team.toLowerCase().indexOf(lower) !== -1
    })
    setClubResults(matches.slice(0, 6))
    setShowClubResults(true)
  }

  const applyLeagueForClub = (club) => {
    if (selectedGame === 'EA CFB 27' && CFB_TEAM_CONFERENCE_MAP[club]) {
      setLeague(CFB_TEAM_CONFERENCE_MAP[club])
    } else if (selectedGame === 'EA FC 26' && CLUB_LEAGUE_MAP[club]) {
      setLeague(CLUB_LEAGUE_MAP[club])
    }
  }

  const handleSelectClub = (club) => {
    setClubName(club)
    setShowClubResults(false)
    applyLeagueForClub(club)
  }

  const handleClubBlur = () => {
    setTimeout(() => {
      setShowClubResults(false)
      applyLeagueForClub(clubName)
    }, 150)
  }

  const handleSelectGame = (game) => {
    if (game.status !== 'live') return
    setSelectedGame(game.id)
    setClubName('')
    setLeague('')
    setClubResults([])
  }

  const resetCreatePanel = () => {
    setShowCreatePanel(false)
    setSelectedGame(null)
    setClubName('')
    setLeague('')
    setClubResults([])
  }

  const handleCreateFranchise = async () => {
    setCreating(true)

    const franchiseResult = await supabase
      .from('franchises')
      .insert({
        user_id: user.id,
        club_name: clubName,
        league: league,
        game: selectedGame,
        current_season: 1
      })
      .select()
      .single()

    if (franchiseResult.error) {
      alert(franchiseResult.error.message)
      setCreating(false)
      return
    }

    const newFranchise = franchiseResult.data

    if (selectedGame === 'EA FC 26') {
      const referenceResult = await supabase
        .from('player_reference')
        .select('*')
        .ilike('active_club', clubName)

      if (!referenceResult.error && referenceResult.data.length > 0) {
        const playersToInsert = referenceResult.data.map(function(p) {
          return {
            franchise_id: newFranchise.id,
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
      }
    }

    setCreating(false)
    resetCreatePanel()
    await loadFranchises(user.id)
  }

  const handleDeleteFranchise = async (franchiseId) => {
    setDeletingId(franchiseId)

    const result = await supabase
      .from('franchises')
      .delete()
      .eq('id', franchiseId)

    setDeletingId(null)
    setConfirmDeleteId(null)

    if (!result.error) {
      await loadFranchises(user.id)
    } else {
      alert(result.error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return React.createElement('div', { className: 'min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400' }, 'Loading...')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <RosterHQLogo size={62} />
            <div>
              <h1
                className="text-3xl text-neutral-100"
                style={{
                  fontFamily: "'Arial Black', 'Arial Bold', Impact, Haettenschweiler, sans-serif",
                  fontWeight: 900,
                  fontStyle: 'italic',
                  letterSpacing: '-0.5px',
                  transform: 'skewX(-6deg)',
                  display: 'inline-block'
                }}
              >
                ROSTER<span style={{ color: '#34d399' }}>HQ</span>
              </h1>
              <p className="text-neutral-400 mt-1 text-sm">Logged in as {user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreatePanel(!showCreatePanel)} className="bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap">
              {showCreatePanel ? 'Cancel' : '+ New Franchise'}
            </button>
            <a href="/import" className="border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-900 transition-colors rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 flex items-center">
              Import Players
            </a>
            <button onClick={handleLogout} className="border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-900 transition-colors rounded-lg px-4 py-2 text-sm font-medium text-neutral-300">
              Log Out
            </button>
          </div>
        </div>

        {showCreatePanel ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-8">
            <h2 className="text-sm font-semibold mb-4 text-neutral-200">
              {selectedGame ? 'New Franchise \u2014 ' + selectedGame : 'Choose a Game'}
            </h2>

            {!selectedGame ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {GAMES.map(function(game) {
                  const isLive = game.status === 'live'
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => handleSelectGame(game)}
                      disabled={!isLive}
                      className={
                        'text-left rounded-lg p-4 border transition-colors ' +
                        (isLive
                          ? 'bg-neutral-800/50 border-neutral-800 hover:border-emerald-600 cursor-pointer'
                          : 'bg-neutral-800/20 border-neutral-800 cursor-not-allowed opacity-60')
                      }
                    >
                      <p className="font-semibold text-neutral-100 text-sm">{game.label}</p>
                      <p className="text-neutral-500 text-xs mt-1">{game.sub}</p>
                      {isLive ? (
                        <p className="text-emerald-400 text-xs mt-3 font-medium">Available</p>
                      ) : (
                        <p className="text-neutral-500 text-xs mt-3 font-medium">Site in progress</p>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="relative">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      {selectedGame === 'EA CFB 27' ? 'Team Name' : 'Club Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={selectedGame === 'EA CFB 27' ? 'Start typing, e.g. Ohio...' : 'Start typing, e.g. Qu...'}
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      onFocus={() => clubResults.length > 0 && setShowClubResults(true)}
                      onBlur={handleClubBlur}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      autoFocus
                    />
                    {showClubResults && clubResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg overflow-hidden">
                        {clubResults.map((club, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => handleSelectClub(club)}
                            className="w-full text-left px-3 py-2 hover:bg-neutral-700 text-sm"
                          >
                            {club}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      {selectedGame === 'EA CFB 27' ? 'Conference' : 'League'}
                    </label>
                    <select
                      value={league}
                      onChange={(e) => setLeague(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">
                        {selectedGame === 'EA CFB 27' ? 'Select a conference...' : 'Select a league...'}
                      </option>
                      {(selectedGame === 'EA CFB 27' ? CFB_CONFERENCES : LEAGUES).map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-neutral-500 text-xs mb-4">
                  {selectedGame === 'EA FC 26'
                    ? 'Picking a recognized club auto-fills its league and imports its roster from your player database.'
                    : 'Picking a recognized team auto-fills its conference. Player import for CFB 27 rosters is coming soon \u2014 you can add players manually for now.'}
                </p>
                <div className="flex gap-2 justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedGame(null)}
                    className="text-neutral-400 hover:text-neutral-200 text-sm px-3 py-2"
                  >
                    &larr; Change Game
                  </button>
                  <div className="flex gap-2">
                    <button onClick={resetCreatePanel} className="text-neutral-400 hover:text-neutral-200 text-sm px-3 py-2">Cancel</button>
                    <button onClick={handleCreateFranchise} disabled={!clubName || creating} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2 text-sm font-semibold">
                      {creating ? 'Creating...' : 'Create Franchise'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Your Franchises</h2>
          {franchises.length === 0 ? (
            <p className="text-neutral-500 text-sm">No franchises yet. Click "+ New Franchise" above to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {franchises.map(function(f) {
                var franchiseUrl = "/franchise/" + f.id
                return (
                  <div key={f.id} className="relative bg-neutral-800/50 border border-neutral-800 hover:border-emerald-600 rounded-lg p-4 transition-colors">
                    <a href={franchiseUrl} className="block">
                      <p className="text-neutral-500 text-xs font-medium mb-1">{f.game || 'EA FC 26'}</p>
                      <h3 className="font-semibold text-neutral-100 pr-6">{f.club_name}</h3>
                      <p className="text-neutral-400 text-sm mt-1">{f.league ? f.league : 'No league set'}</p>
                      <p className="text-emerald-400 text-xs mt-2 font-medium">Season {f.current_season}</p>
                    </a>

                    {confirmDeleteId === f.id ? (
                      <div className="absolute top-3 right-3 flex gap-1 bg-neutral-900 border border-neutral-700 rounded-lg p-1">
                        <button
                          onClick={() => handleDeleteFranchise(f.id)}
                          disabled={deletingId === f.id}
                          className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1"
                        >
                          {deletingId === f.id ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-neutral-400 hover:text-neutral-200 text-xs px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(f.id)}
                        className="absolute top-3 right-3 text-neutral-500 hover:text-red-400 text-xs font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}