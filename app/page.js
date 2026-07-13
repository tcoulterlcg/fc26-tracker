'use client'

import React from 'react'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CFB_CONFERENCES as CFB_CONFERENCE_SCHOOLS, CFB_CONFERENCE_NAMES } from '@/lib/cfbConferences'
import { CFB_LOGOS } from '@/lib/cfbLogos'
import { aliasCanonicalNames } from '@/lib/teamAliases'

const GAMES = [
  { id: 'EA FC 26', label: 'EA FC 26', sub: 'Soccer', status: 'live' },
  { id: 'EA CFB 27', label: 'EA College Football 27', sub: 'College Football', status: 'live' },
  { id: 'EA NHL 26', label: 'EA NHL 26', sub: 'Hockey', status: 'soon' },
  { id: 'EA Madden 26', label: 'EA Madden 26', sub: 'Football', status: 'soon' },
  { id: 'MLB The Show 26', label: 'MLB The Show 26', sub: 'Baseball', status: 'soon' }
]

const LEAGUES = [
  'Premier League', 'EFL Championship', 'EFL League One', 'EFL League Two',
  'La Liga', 'La Liga 2', 'Bundesliga', 'Bundesliga 2', 'Serie A', 'Serie B',
  'Ligue 1', 'Ligue 2', 'Eredivisie', 'Primeira Liga', 'Belgian Pro League',
  'Scottish Premiership', 'MLS', 'Liga MX', 'Brasileirão', 'Saudi Pro League',
  'Süper Lig', 'A-League', 'Other / International'
]

// Every CFB team -> its conference, derived from the full conferences map.
const CFB_TEAM_TO_CONFERENCE = {}
for (const _conf of Object.keys(CFB_CONFERENCE_SCHOOLS)) {
  for (const _school of CFB_CONFERENCE_SCHOOLS[_conf]) CFB_TEAM_TO_CONFERENCE[_school] = _conf
}

const CLUB_LEAGUE_MAP = {
  'Arsenal': 'Premier League', 'Aston Villa': 'Premier League', 'Bournemouth': 'Premier League',
  'Brentford': 'Premier League', 'Brighton & Hove Albion': 'Premier League', 'Burnley': 'Premier League',
  'Chelsea': 'Premier League', 'Crystal Palace': 'Premier League', 'Everton': 'Premier League',
  'Fulham': 'Premier League', 'Leeds United': 'Premier League', 'Liverpool': 'Premier League',
  'Manchester City': 'Premier League', 'Manchester United': 'Premier League', 'Newcastle United': 'Premier League',
  'Nottingham Forest': 'Premier League', 'Sunderland': 'Premier League', 'Tottenham Hotspur': 'Premier League',
  'West Ham United': 'Premier League', 'Wolverhampton Wanderers': 'Premier League',
  'Birmingham City': 'EFL Championship', 'Blackburn Rovers': 'EFL Championship', 'Bristol City': 'EFL Championship',
  'Charlton Athletic': 'EFL Championship', 'Coventry City': 'EFL Championship', 'Derby County': 'EFL Championship',
  'Hull City': 'EFL Championship', 'Ipswich Town': 'EFL Championship', 'Leicester City': 'EFL Championship',
  'Middlesbrough': 'EFL Championship', 'Millwall': 'EFL Championship', 'Norwich City': 'EFL Championship',
  'Oxford United': 'EFL Championship', 'Portsmouth': 'EFL Championship', 'Preston North End': 'EFL Championship',
  'Queens Park Rangers': 'EFL Championship', 'Sheffield United': 'EFL Championship', 'Sheffield Wednesday': 'EFL Championship',
  'Southampton': 'EFL Championship', 'Stoke City': 'EFL Championship', 'Swansea City': 'EFL Championship',
  'Watford': 'EFL Championship', 'West Bromwich Albion': 'EFL Championship', 'Wrexham': 'EFL Championship',
  'Real Madrid': 'La Liga', 'Barcelona': 'La Liga', 'Atlético Madrid': 'La Liga', 'Athletic Club': 'La Liga',
  'Real Sociedad': 'La Liga', 'Real Betis': 'La Liga', 'Villarreal': 'La Liga', 'Valencia': 'La Liga',
  'Sevilla': 'La Liga', 'Girona': 'La Liga',
  'Bayern Munich': 'Bundesliga', 'Borussia Dortmund': 'Bundesliga', 'RB Leipzig': 'Bundesliga',
  'Bayer Leverkusen': 'Bundesliga', 'Eintracht Frankfurt': 'Bundesliga', 'VfB Stuttgart': 'Bundesliga',
  'Borussia Mönchengladbach': 'Bundesliga', 'Wolfsburg': 'Bundesliga',
  'Inter Milan': 'Serie A', 'Napoli': 'Serie A', 'AS Roma': 'Serie A', 'Como': 'Serie A',
  'AC Milan': 'Serie A', 'Juventus': 'Serie A', 'Atalanta': 'Serie A', 'Bologna': 'Serie A',
  'Lazio': 'Serie A', 'Udinese': 'Serie A', 'Sassuolo': 'Serie A', 'Torino': 'Serie A',
  'Parma': 'Serie A', 'Cagliari': 'Serie A', 'Fiorentina': 'Serie A', 'Genoa': 'Serie A',
  'Lecce': 'Serie A', 'Cremonese': 'Serie A', 'Hellas Verona': 'Serie A', 'Pisa': 'Serie A',
  'Venezia': 'Serie B', 'Frosinone': 'Serie B', 'Monza': 'Serie B', 'Palermo': 'Serie B',
  'Catanzaro': 'Serie B', 'Modena': 'Serie B', 'Juve Stabia': 'Serie B', 'Avellino': 'Serie B',
  'Mantova': 'Serie B', 'Padova': 'Serie B', 'Cesena': 'Serie B', 'Carrarese': 'Serie B',
  'Sampdoria': 'Serie B', 'Virtus Entella': 'Serie B', 'Empoli': 'Serie B', 'Südtirol': 'Serie B',
  'Bari': 'Serie B', 'Reggiana': 'Serie B', 'Spezia': 'Serie B', 'Pescara': 'Serie B',
  'Paris Saint-Germain': 'Ligue 1', 'Marseille': 'Ligue 1', 'Monaco': 'Ligue 1', 'Lyon': 'Ligue 1',
  'Lille': 'Ligue 1', 'Nice': 'Ligue 1', 'Lens': 'Ligue 1',
  'Ajax': 'Eredivisie', 'PSV Eindhoven': 'Eredivisie', 'Feyenoord': 'Eredivisie',
  'Benfica': 'Primeira Liga', 'Porto': 'Primeira Liga', 'Sporting CP': 'Primeira Liga',
  'Celtic': 'Scottish Premiership', 'Rangers': 'Scottish Premiership',
  'Inter Miami': 'MLS', 'LA Galaxy': 'MLS', 'LAFC': 'MLS', 'Seattle Sounders': 'MLS', 'Atlanta United': 'MLS'
}

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

const CFB_MASCOTS = {
  'Alabama': 'Crimson Tide', 'Arkansas': 'Razorbacks', 'Auburn': 'Tigers', 'Florida': 'Gators', 'Georgia': 'Bulldogs',
  'Kentucky': 'Wildcats', 'LSU': 'Tigers', 'Mississippi State': 'Bulldogs', 'Missouri': 'Tigers', 'Oklahoma': 'Sooners',
  'Ole Miss': 'Rebels', 'South Carolina': 'Gamecocks', 'Tennessee': 'Volunteers', 'Texas': 'Longhorns', 'Texas A&M': 'Aggies', 'Vanderbilt': 'Commodores',
  'Illinois': 'Fighting Illini', 'Indiana': 'Hoosiers', 'Iowa': 'Hawkeyes', 'Maryland': 'Terrapins',
  'Michigan': 'Wolverines', 'Michigan State': 'Spartans', 'Minnesota': 'Golden Gophers', 'Nebraska': 'Cornhuskers',
  'Northwestern': 'Wildcats', 'Ohio State': 'Buckeyes', 'Oregon': 'Ducks', 'Penn State': 'Nittany Lions',
  'Purdue': 'Boilermakers', 'Rutgers': 'Scarlet Knights', 'UCLA': 'Bruins', 'USC': 'Trojans', 'Washington': 'Huskies', 'Wisconsin': 'Badgers',
  'Boston College': 'Eagles', 'California': 'Golden Bears', 'Clemson': 'Tigers', 'Duke': 'Blue Devils',
  'Florida State': 'Seminoles', 'Georgia Tech': 'Yellow Jackets', 'Louisville': 'Cardinals', 'Miami': 'Hurricanes',
  'NC State': 'Wolfpack', 'North Carolina': 'Tar Heels', 'Pittsburgh': 'Panthers', 'SMU': 'Mustangs',
  'Stanford': 'Cardinal', 'Syracuse': 'Orange', 'Virginia': 'Cavaliers', 'Virginia Tech': 'Hokies', 'Wake Forest': 'Demon Deacons',
  'Arizona': 'Wildcats', 'Arizona State': 'Sun Devils', 'Baylor': 'Bears', 'BYU': 'Cougars',
  'Cincinnati': 'Bearcats', 'Colorado': 'Buffaloes', 'Houston': 'Cougars', 'Iowa State': 'Cyclones',
  'Kansas': 'Jayhawks', 'Kansas State': 'Wildcats', 'Oklahoma State': 'Cowboys', 'TCU': 'Horned Frogs',
  'Texas Tech': 'Red Raiders', 'UCF': 'Knights', 'Utah': 'Utes', 'West Virginia': 'Mountaineers',
  'Army': 'Black Knights', 'Charlotte': '49ers', 'East Carolina': 'Pirates',
  'Florida Atlantic': 'Owls', 'Memphis': 'Tigers', 'Navy': 'Midshipmen',
  'North Texas': 'Mean Green', 'Rice': 'Owls', 'South Florida': 'Bulls',
  'Temple': 'Owls', 'Tulane': 'Green Wave', 'Tulsa': 'Golden Hurricane',
  'UAB': 'Blazers', 'UTSA': 'Roadrunners',
  'Air Force': 'Falcons', 'Boise State': 'Broncos', 'Colorado State': 'Rams',
  'Fresno State': 'Bulldogs', 'Hawaii': 'Rainbow Warriors', 'Nevada': 'Wolf Pack',
  'New Mexico': 'Lobos', 'San Diego State': 'Aztecs', 'San Jose State': 'Spartans',
  'UNLV': 'Rebels', 'Utah State': 'Aggies', 'Wyoming': 'Cowboys',
  'Delaware': 'Blue Hens', 'FIU': 'Panthers', 'Jacksonville State': 'Gamecocks',
  'Kennesaw State': 'Owls', 'Liberty': 'Flames', 'Louisiana Tech': 'Bulldogs',
  'Middle Tennessee': 'Blue Raiders', 'Missouri State': 'Bears', 'New Mexico State': 'Aggies',
  'Sam Houston': 'Bearkats', 'UTEP': 'Miners', 'Western Kentucky': 'Hilltoppers',
  'Appalachian State': 'Mountaineers', 'Arkansas State': 'Red Wolves', 'Coastal Carolina': 'Chanticleers',
  'Georgia Southern': 'Eagles', 'Georgia State': 'Panthers', 'James Madison': 'Dukes',
  'Louisiana': "Ragin' Cajuns", 'Louisiana Monroe': 'Warhawks', 'Marshall': 'Thundering Herd',
  'Old Dominion': 'Monarchs', 'South Alabama': 'Jaguars', 'Southern Miss': 'Golden Eagles',
  'Texas State': 'Bobcats', 'Troy': 'Trojans',
  'Akron': 'Zips', 'Ball State': 'Cardinals', 'Bowling Green': 'Falcons', 'Buffalo': 'Bulls',
  'Central Michigan': 'Chippewas', 'Eastern Michigan': 'Eagles', 'Kent State': 'Golden Flashes', 'Miami (OH)': 'RedHawks',
  'Northern Illinois': 'Huskies', 'Ohio': 'Bobcats', 'Toledo': 'Rockets', 'Western Michigan': 'Broncos',
  'Notre Dame': 'Fighting Irish', 'UConn': 'Huskies', 'UMass': 'Minutemen',
  'North Dakota State': 'Bison'
}

const CFB_POSITION_GROUP = {
  'QB': 'Offense', 'HB': 'Offense', 'FB': 'Offense', 'WR': 'Offense', 'TE': 'Offense',
  'LT': 'Offense', 'LG': 'Offense', 'C': 'Offense', 'RG': 'Offense', 'RT': 'Offense',
  'LE': 'Defense', 'RE': 'Defense', 'DT': 'Defense', 'LOLB': 'Defense', 'MLB': 'Defense',
  'ROLB': 'Defense', 'CB': 'Defense', 'FS': 'Defense', 'SS': 'Defense',
  'K': 'Special Teams', 'P': 'Special Teams', 'LS': 'Special Teams'
}

const CLASS_ORDER = ['FR', 'SO', 'JR', 'SR', 'FR (RS)', 'SO (RS)', 'JR (RS)', 'SR (RS)']

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

const FC_STAT_DEFS = {
  overall: { label: 'Overall', isCurrency: false, decimals: 1, get: function(s) { return s.avgOverall } },
  potential: { label: 'Potential', isCurrency: false, decimals: 0, get: function(s) { return s.avgPotential } },
  value: { label: 'Club Value', isCurrency: true, get: function(s) { return s.totalValue } },
  wages: { label: 'Weekly Wages', isCurrency: true, get: function(s) { return s.totalWage } }
}
const FC_DEFAULT_ORDER = [
  { key: 'overall', enabled: true },
  { key: 'potential', enabled: true },
  { key: 'value', enabled: true },
  { key: 'wages', enabled: true }
]

const CFB_STAT_DEFS = {
  overall: { label: 'Overall', isCurrency: false, decimals: 1, get: function(s) { return s.avgOverall } },
  offense: { label: 'Offense', isCurrency: false, decimals: 0, get: function(s) { return s.offenseAvg } },
  defense: { label: 'Defense', isCurrency: false, decimals: 0, get: function(s) { return s.defenseAvg } }
}
const CFB_DEFAULT_ORDER = [
  { key: 'overall', enabled: true },
  { key: 'offense', enabled: true },
  { key: 'defense', enabled: true }
]

const FC_STAT_STORAGE_KEY = 'roster_hq_card_stats_fc'
const CFB_STAT_STORAGE_KEY = 'roster_hq_card_stats_cfb'
const LOGO_CACHE_KEY = 'roster_hq_logo_cache_v2'

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

function tierChipColor(avg) {
  if (avg === null || avg === undefined) return 'bg-neutral-800 text-neutral-400'
  if (avg >= 80) return 'bg-green-900/40 text-green-400'
  if (avg >= 70) return 'bg-yellow-900/40 text-yellow-400'
  if (avg >= 60) return 'bg-orange-900/40 text-orange-400'
  return 'bg-red-900/40 text-red-400'
}

function tierLabel(avg) {
  if (avg === null || avg === undefined) return 'No Roster'
  if (avg >= 85) return 'Elite'
  if (avg >= 75) return 'Contender'
  if (avg >= 65) return 'Building'
  return 'Rebuilding'
}

function valueColorForTier(avg) {
  if (avg === null || avg === undefined) return 'text-neutral-500'
  if (avg >= 85) return 'text-green-400'
  if (avg >= 80) return 'text-green-400'
  if (avg >= 72) return 'text-amber-400'
  if (avg >= 64) return 'text-orange-400'
  return 'text-red-400'
}

function starRating(avg) {
  if (avg === null || avg === undefined) return 0
  if (avg >= 88) return 5
  if (avg >= 78) return 4
  if (avg >= 68) return 3
  if (avg >= 58) return 2
  return 1
}

function StarDisplay({ count }) {
  return (
    <span className="text-yellow-400 text-xs">
      {'\u2605'.repeat(count)}{'\u2606'.repeat(5 - count)}
    </span>
  )
}

function StackedStat({ label, value, isCurrency, decimals }) {
  const displayVal = isCurrency
    ? formatEuro(value)
    : (value !== null && value !== undefined ? value.toFixed(decimals) : '-')
  const valueColor = isCurrency ? 'text-neutral-100' : valueColorForTier(value)
  return (
    <div className="rounded-lg px-4 py-2 text-center bg-neutral-900/70 border border-neutral-800 min-w-[92px]">
      <p className="text-neutral-500 text-[9px] font-semibold uppercase tracking-[0.14em] mb-0.5">{label}</p>
      <p className={'font-bold text-2xl leading-none ' + valueColor}>{displayVal}</p>
    </div>
  )
}

function TeamLogo({ url, size }) {
  if (url) {
    // Show the crest PNG on its own — no circular frame around it.
    return (
      <img
        src={url}
        alt=""
        className="object-contain"
        style={{ width: size, height: size }}
        onError={(e) => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div
      className="rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-600">
        <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" />
      </svg>
    </div>
  )
}

function RosterHQLogo({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="violetGradHeader" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="256" r="248" fill="url(#violetGradHeader)" />
      <rect x="150" y="214" width="94" height="30" rx="15" fill="#ddd6fe" />
      <rect x="150" y="272" width="58" height="30" rx="15" fill="#ddd6fe" opacity="0.6" />
      <text x="326" y="268" dominantBaseline="central" textAnchor="middle"
        fontFamily="'Arial Black', Impact, sans-serif" fontWeight="900" fontStyle="italic" fontSize="296"
        fill="#ffffff">R</text>
    </svg>
  )
}

async function importRosterForGame(supabase, game, franchiseId, teamName) {
  if (game === 'EA FC 26') {
    const referenceResult = await supabase.from('player_reference').select('*').ilike('active_club', '%' + teamName + '%')
    if (!referenceResult.error && referenceResult.data.length > 0) {
      const playersToInsert = referenceResult.data.map(function(p) {
        return {
          franchise_id: franchiseId, name: p.name, position: p.position, age: p.age,
          overall_rating: p.overall_rating, potential_rating: p.potential_rating, nationality: p.nationality,
          active_club: p.active_club, status: p.status, owned_by: p.owned_by, squad_number: p.squad_number,
          contract: p.contract, value_eur: p.value_eur, wage_eur_wk: p.wage_eur_wk, wage: p.wage_eur_wk,
          gro: p.gro, skill_moves: p.skill_moves, weak_foot: p.weak_foot, work_rate: p.work_rate,
          height_cm: p.height_cm, weight_kg: p.weight_kg, build: p.build, igs: p.igs, contract_years_remaining: null
        }
      })
      await supabase.from('players').insert(playersToInsert)
      return playersToInsert.length
    }
    return 0
  }
  if (game === 'EA CFB 27') {
    const referenceResult = await supabase.from('cfb_player_reference').select('*').ilike('team', '%' + teamName + '%')
    if (!referenceResult.error && referenceResult.data.length > 0) {
      const playersToInsert = referenceResult.data.map(function(p) {
        return {
          franchise_id: franchiseId, name: p.player_name, position: p.position, overall_rating: p.overall_rating,
          jersey_number: p.jersey_number, cfb_class: p.class, archetype: p.archetype, dev_trait: p.dev_trait,
          speed: p.speed, strength: p.strength, agility: p.agility, acceleration: p.acceleration,
          change_of_direction: p.change_of_direction, injury: p.injury, stamina: p.stamina, awareness: p.awareness
        }
      })
      await supabase.from('players').insert(playersToInsert)
      return playersToInsert.length
    }
    return 0
  }
  return 0
}

async function fetchWikipediaThumbnail(titles) {
  for (let i = 0; i < titles.length; i++) {
    try {
      const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titles[i]))
      if (res.ok) {
        const data = await res.json()
        if (data.thumbnail && data.thumbnail.source) {
          return data.thumbnail.source
        }
      }
    } catch (e) {
      // ignore, try next candidate
    }
  }
  return null
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [franchises, setFranchises] = useState([])
  const [playersByFranchise, setPlayersByFranchise] = useState({})
  const [loading, setLoading] = useState(true)
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [clubName, setClubName] = useState('')
  const [league, setLeague] = useState('')
  const [creating, setCreating] = useState(false)

  const [clubResults, setClubResults] = useState([])
  const [showClubResults, setShowClubResults] = useState(false)
  const [clubLeagueLookup, setClubLeagueLookup] = useState({})

  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const [showCustomizePanel, setShowCustomizePanel] = useState(false)
  const [fcStatOrder, setFcStatOrder] = useState(FC_DEFAULT_ORDER)
  const [cfbStatOrder, setCfbStatOrder] = useState(CFB_DEFAULT_ORDER)
  const [dragInfo, setDragInfo] = useState({ game: null, key: null })

  const [logoCache, setLogoCache] = useState({})
  const [todayString, setTodayString] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const isCfbSelected = selectedGame === 'EA CFB 27'
  const entityLabel = isCfbSelected ? 'Dynasty' : 'Franchise'

  useEffect(() => {
    checkUser()
    loadStatSettings()
    setTodayString(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
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

  useEffect(() => {
    if (franchises.length === 0) return
    let cancelled = false

    const loadLogos = async () => {
      // Crests are cached in localStorage so we only hit Wikipedia once per
      // franchise instead of on every homepage load.
      let stored = {}
      try { stored = JSON.parse(localStorage.getItem(LOGO_CACHE_KEY) || '{}') } catch (e) {}
      if (Object.keys(stored).length) {
        setLogoCache(function(prev) { return Object.assign({}, stored, prev) })
      }
      const next = Object.assign({}, stored)

      for (let i = 0; i < franchises.length; i++) {
        const f = franchises[i]
        if (next[f.id] !== undefined) continue

        const isCfb = f.game === 'EA CFB 27'
        let url = null
        if (isCfb && CFB_LOGOS[f.club_name]) {
          // Official ESPN mark — clean transparent PNG, no lookup needed.
          url = CFB_LOGOS[f.club_name]
        } else {
          const candidates = isCfb
            ? [f.club_name + ' ' + (CFB_MASCOTS[f.club_name] || '') + ' football', f.club_name + ' football team']
            : [f.club_name + ' F.C.', f.club_name + ' FC']
          url = await fetchWikipediaThumbnail(candidates)
        }
        if (cancelled) return
        next[f.id] = url
        setLogoCache(function(prev) { return Object.assign({}, prev, { [f.id]: url }) })
        try { localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(next)) } catch (e) {}
      }
    }

    loadLogos()
    return () => { cancelled = true }
  }, [franchises])

  const loadStatSettings = () => {
    try {
      const savedFc = window.localStorage.getItem(FC_STAT_STORAGE_KEY)
      if (savedFc) {
        const parsed = JSON.parse(savedFc)
        const validKeys = Object.keys(FC_STAT_DEFS)
        const filtered = parsed.filter(function(s) { return validKeys.indexOf(s.key) !== -1 })
        const missing = validKeys.filter(function(k) { return !filtered.some(function(s) { return s.key === k }) })
        setFcStatOrder(filtered.concat(missing.map(function(k) { return { key: k, enabled: true } })))
      }
    } catch (e) {
      // ignore
    }
    try {
      const savedCfb = window.localStorage.getItem(CFB_STAT_STORAGE_KEY)
      if (savedCfb) {
        const parsed = JSON.parse(savedCfb)
        const validKeys = Object.keys(CFB_STAT_DEFS)
        const filtered = parsed.filter(function(s) { return validKeys.indexOf(s.key) !== -1 })
        const missing = validKeys.filter(function(k) { return !filtered.some(function(s) { return s.key === k }) })
        setCfbStatOrder(filtered.concat(missing.map(function(k) { return { key: k, enabled: true } })))
      }
    } catch (e) {
      // ignore
    }
  }

  const saveFcStatOrder = (order) => {
    setFcStatOrder(order)
    try {
      window.localStorage.setItem(FC_STAT_STORAGE_KEY, JSON.stringify(order))
    } catch (e) {
      // ignore
    }
  }

  const saveCfbStatOrder = (order) => {
    setCfbStatOrder(order)
    try {
      window.localStorage.setItem(CFB_STAT_STORAGE_KEY, JSON.stringify(order))
    } catch (e) {
      // ignore
    }
  }

  const toggleStat = (game, key) => {
    if (game === 'fc') {
      const next = fcStatOrder.map(function(s) { return s.key === key ? Object.assign({}, s, { enabled: !s.enabled }) : s })
      saveFcStatOrder(next)
    } else {
      const next = cfbStatOrder.map(function(s) { return s.key === key ? Object.assign({}, s, { enabled: !s.enabled }) : s })
      saveCfbStatOrder(next)
    }
  }

  const handleStatDragStart = (game, key) => {
    setDragInfo({ game: game, key: key })
  }

  const handleStatDragOver = (e) => {
    e.preventDefault()
  }

  const handleStatDrop = (game, targetKey) => {
    if (dragInfo.game !== game || !dragInfo.key || dragInfo.key === targetKey) {
      setDragInfo({ game: null, key: null })
      return
    }
    const order = game === 'fc' ? fcStatOrder.slice() : cfbStatOrder.slice()
    const fromIdx = order.findIndex(function(s) { return s.key === dragInfo.key })
    const toIdx = order.findIndex(function(s) { return s.key === targetKey })
    const [moved] = order.splice(fromIdx, 1)
    order.splice(toIdx, 0, moved)
    if (game === 'fc') saveFcStatOrder(order)
    else saveCfbStatOrder(order)
    setDragInfo({ game: null, key: null })
  }

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
      await loadPlayersForFranchises(result.data.map(function(f) { return f.id }))
    }
  }

  const loadPlayersForFranchises = async (franchiseIds) => {
    if (!franchiseIds || franchiseIds.length === 0) {
      setPlayersByFranchise({})
      return
    }
    const result = await supabase
      .from('players')
      .select('*')
      .in('franchise_id', franchiseIds)

    if (!result.error) {
      const grouped = {}
      for (let i = 0; i < result.data.length; i++) {
        const p = result.data[i]
        if (!grouped[p.franchise_id]) grouped[p.franchise_id] = []
        grouped[p.franchise_id].push(p)
      }
      setPlayersByFranchise(grouped)
    }
  }

  // Search the live reference database (every imported club) and expand
  // nicknames — "QPR" surfaces Queens Park Rangers, "PSG" Paris Saint-Germain.
  const searchClubs = async () => {
    const term = clubName.trim()
    const found = {}
    const res = await supabase.from('player_reference').select('active_club, league').ilike('active_club', '%' + term + '%').limit(400)
    for (const r of (res.data || [])) found[r.active_club] = r.league
    const aliases = aliasCanonicalNames(term)
    if (aliases.length > 0) {
      const a = await supabase.from('player_reference').select('active_club, league').in('active_club', aliases)
      for (const r of (a.data || [])) found[r.active_club] = r.league
    }
    setClubLeagueLookup(function(prev) { return Object.assign({}, prev, found) })
    const names = Object.keys(found).sort()
    setClubResults(names.slice(0, 6))
    setShowClubResults(true)
  }

  const searchCfbTeams = () => {
    const lower = clubName.toLowerCase()
    const aliases = aliasCanonicalNames(clubName)
    const matches = Object.keys(CFB_TEAM_TO_CONFERENCE).filter(function(team) {
      return team.toLowerCase().indexOf(lower) !== -1 || aliases.indexOf(team) !== -1
    })
    setClubResults(matches.slice(0, 6))
    setShowClubResults(true)
  }

  const applyLeagueForClub = (club) => {
    if (selectedGame === 'EA CFB 27' && CFB_TEAM_TO_CONFERENCE[club]) {
      setLeague(CFB_TEAM_TO_CONFERENCE[club])
    } else if (selectedGame === 'EA FC 26' && (clubLeagueLookup[club] || CLUB_LEAGUE_MAP[club])) {
      setLeague(clubLeagueLookup[club] || CLUB_LEAGUE_MAP[club])
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

    await importRosterForGame(supabase, selectedGame, newFranchise.id, clubName)

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

  const goToFranchise = (id) => {
    router.push('/franchise/' + id)
  }

  const displayName = (f) => {
    if (f.game === 'EA CFB 27') {
      const mascot = CFB_MASCOTS[f.club_name]
      return mascot ? f.club_name + ' ' + mascot : f.club_name
    }
    return f.club_name
  }

  const franchiseStats = useMemo(function() {
    const stats = {}
    for (let i = 0; i < franchises.length; i++) {
      const f = franchises[i]
      const roster = playersByFranchise[f.id] || []
      const isCfb = f.game === 'EA CFB 27'
      const overalls = roster.map(function(p) { return p.overall_rating })
      const avgOverall = average(overalls)

      if (isCfb) {
        const offenseRatings = []
        const defenseRatings = []
        const classCounts = {}
        for (let j = 0; j < roster.length; j++) {
          const p = roster[j]
          const group = CFB_POSITION_GROUP[p.position]
          if (group === 'Offense' && typeof p.overall_rating === 'number') offenseRatings.push(p.overall_rating)
          if (group === 'Defense' && typeof p.overall_rating === 'number') defenseRatings.push(p.overall_rating)

          const cls = p.cfb_class || 'Unknown'
          classCounts[cls] = (classCounts[cls] || 0) + 1
        }

        const knownClasses = CLASS_ORDER.filter(function(c) { return classCounts[c] })
        const unknownClasses = Object.keys(classCounts).filter(function(c) { return CLASS_ORDER.indexOf(c) === -1 })
        const classBreakdown = knownClasses.concat(unknownClasses).map(function(c) {
          return { label: c, count: classCounts[c] }
        })

        stats[f.id] = {
          squadSize: roster.length,
          avgOverall: avgOverall,
          offenseAvg: average(offenseRatings),
          defenseAvg: average(defenseRatings),
          classBreakdown: classBreakdown
        }
      } else {
        const potentials = roster.map(function(p) { return p.potential_rating })
        const values = roster.map(function(p) { return p.value_eur })
        const wages = roster.map(function(p) { return p.wage_eur_wk })
        const totalValue = values.reduce(function(sum, v) {
          return sum + (typeof v === 'number' && !isNaN(v) ? v : 0)
        }, 0)
        const totalWage = wages.reduce(function(sum, w) {
          return sum + (typeof w === 'number' && !isNaN(w) ? w : 0)
        }, 0)

        const posBuckets = {}
        for (let j = 0; j < roster.length; j++) {
          const p = roster[j]
          const group = fcPositionGroup(p.position)
          if (!posBuckets[group]) posBuckets[group] = []
          if (typeof p.overall_rating === 'number') posBuckets[group].push(p.overall_rating)
        }

        const positionBreakdown = FC_POSITION_ORDER
          .filter(function(g) { return posBuckets[g] && posBuckets[g].length > 0 })
          .map(function(g) {
            const avg = average(posBuckets[g])
            return { label: g, count: posBuckets[g].length, avg: avg, stars: starRating(avg) }
          })

        stats[f.id] = {
          squadSize: roster.length,
          avgOverall: avgOverall,
          avgPotential: average(potentials),
          totalValue: totalValue,
          totalWage: totalWage,
          positionBreakdown: positionBreakdown
        }
      }
    }
    return stats
  }, [franchises, playersByFranchise])

  const featured = franchises[0]
  const featuredStats = featured ? (franchiseStats[featured.id] || { squadSize: 0, avgOverall: null }) : null

  if (loading) {
    return React.createElement('div', { className: 'min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400' }, 'Loading...')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 lg:flex">
      <aside className="lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col">
        <div className="p-5 flex items-center gap-3">
          <RosterHQLogo size={42} />
          <div>
            <div
              className="text-xl text-neutral-100 leading-none"
              style={{ fontFamily: "'Arial Black', 'Arial Bold', Impact, sans-serif", fontWeight: 900, letterSpacing: '-0.5px' }}
            >
              ROSTER<span style={{ color: '#8b5cf6' }}>HQ</span>
            </div>
            <p className="text-violet-500/90 text-[9px] font-semibold uppercase tracking-[0.2em] mt-1">Franchise Tracker</p>
          </div>
        </div>
        <nav className="px-3 pb-3 lg:flex-1 space-y-1">
          <span className="block rounded-lg px-3 py-2 text-sm font-semibold bg-violet-600/15 text-violet-300 border border-violet-600/30">Dashboard</span>
          <a href="/player-databases" className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors">Player Databases</a>
          <a href="/leaderboards" className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors">Leaderboards</a>
          <a href="/import" className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors">Import Players</a>
          <a href="/profile" className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors">Profile</a>
        </nav>
        <div className="p-4 border-t border-neutral-800 hidden lg:block">
          <p className="text-neutral-500 text-xs truncate mb-1">{user.email}</p>
          <button onClick={handleLogout} className="text-neutral-400 hover:text-violet-400 text-xs font-medium">Log Out</button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-6 py-8 lg:px-10">
        <div className="flex justify-between items-end gap-4 flex-wrap mb-6">
          <div>
            <p className="text-neutral-500 text-[11px] font-semibold uppercase tracking-[0.2em]">Roster HQ / Dashboard</p>
            <h1 className="text-4xl font-black uppercase tracking-tight leading-none mt-1">Franchise HQ</h1>
            <p className="text-neutral-500 text-[11px] font-semibold uppercase tracking-[0.18em] mt-2">{franchises.length} active save{franchises.length === 1 ? '' : 's'}{todayString ? ' · ' + todayString : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="lg:hidden border border-neutral-700 hover:bg-neutral-900 transition-colors rounded-lg px-3 py-2 text-sm font-medium text-neutral-300">Log Out</button>
            <button onClick={() => setShowCreatePanel(!showCreatePanel)} className="bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap">
              {showCreatePanel ? 'Cancel' : '+ New Save'}
            </button>
          </div>
        </div>

        {featured && !showCreatePanel ? (
          <div className="bg-gradient-to-br from-violet-600/40 via-violet-900/20 to-neutral-900 border border-violet-500/40 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between gap-5 flex-wrap">
              <div className="flex items-center gap-5 min-w-0">
                <TeamLogo url={logoCache[featured.id]} size={84} />
                <div className="min-w-0">
                  <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em]">Continue &middot; {featured.game}</p>
                  <h2 className="text-3xl font-bold text-neutral-100 truncate">{displayName(featured)}</h2>
                  <p className="text-neutral-400 text-sm mt-0.5">{featured.league || 'No league set'} &middot; Season {featured.current_season} &middot; {featuredStats.squadSize} players</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-neutral-500 text-[10px] uppercase tracking-wide mb-0.5">Overall</p>
                  <p className={'text-4xl font-bold tabular-nums leading-none ' + valueColorForTier(featuredStats.avgOverall)}>{featuredStats.avgOverall !== null && featuredStats.avgOverall !== undefined ? featuredStats.avgOverall.toFixed(1) : '-'}</p>
                </div>
                <button onClick={() => goToFranchise(featured.id)} className="bg-violet-600 hover:bg-violet-500 transition-colors rounded-xl px-6 py-3 text-sm font-semibold whitespace-nowrap">
                  Resume {featured.game === 'EA CFB 27' ? 'Dynasty' : 'Season'} &rsaquo;
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showCreatePanel ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-8">
            <h2 className="text-sm font-semibold mb-4 text-neutral-200">
              {selectedGame ? 'New ' + entityLabel + ' \u2014 ' + selectedGame : 'Choose a Game'}
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
                          ? 'bg-neutral-800/50 border-neutral-800 hover:border-violet-600 cursor-pointer'
                          : 'bg-neutral-800/20 border-neutral-800 cursor-not-allowed opacity-60')
                      }
                    >
                      <p className="font-semibold text-neutral-100 text-sm">{game.label}</p>
                      <p className="text-neutral-500 text-xs mt-1">{game.sub}</p>
                      {isLive ? (
                        <p className="text-violet-400 text-xs mt-3 font-medium">Available</p>
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
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                            {selectedGame === 'EA CFB 27' && CFB_MASCOTS[club] ? club + ' ' + CFB_MASCOTS[club] : club}
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
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="">
                        {selectedGame === 'EA CFB 27' ? 'Select a conference...' : 'Select a league...'}
                      </option>
                      {(selectedGame === 'EA CFB 27' ? CFB_CONFERENCE_NAMES : LEAGUES).map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedGame === 'EA CFB 27' && CFB_CONFERENCE_SCHOOLS[league] && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Schools in {league}
                    </label>
                    <select
                      value={CFB_CONFERENCE_SCHOOLS[league].includes(clubName) ? clubName : ''}
                      onChange={(e) => { if (e.target.value) setClubName(e.target.value) }}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="">Select a school...</option>
                      {CFB_CONFERENCE_SCHOOLS[league].map((s) => (
                        <option key={s} value={s}>{CFB_MASCOTS[s] ? s + ' ' + CFB_MASCOTS[s] : s}</option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="text-neutral-500 text-xs mb-4">
                  Picking a recognized team auto-fills its {selectedGame === 'EA CFB 27' ? 'conference' : 'league'} and automatically imports its roster from your player database, if available.
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
                    <button onClick={handleCreateFranchise} disabled={!clubName || creating} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2 text-sm font-semibold">
                      {creating ? 'Creating...' : 'Create ' + entityLabel}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Dashboard</h2>
            <button
              onClick={() => setShowCustomizePanel(!showCustomizePanel)}
              className="text-neutral-400 hover:text-neutral-200 text-xs font-medium border border-neutral-700 rounded-lg px-3 py-1.5"
            >
              {showCustomizePanel ? 'Close Customization' : 'Customize Cards'}
            </button>
          </div>

          {showCustomizePanel && (
            <div className="bg-neutral-800/50 border border-neutral-800 rounded-xl p-5 mb-6">
              <p className="text-neutral-500 text-xs mb-4">
                Check to show a stat, drag to reorder. Applies to all cards of that game type.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-2">EA FC 26 Stats</h3>
                  <div className="space-y-1.5">
                    {fcStatOrder.map(function(s) {
                      const def = FC_STAT_DEFS[s.key]
                      return (
                        <div
                          key={s.key}
                          draggable
                          onDragStart={() => handleStatDragStart('fc', s.key)}
                          onDragOver={handleStatDragOver}
                          onDrop={() => handleStatDrop('fc', s.key)}
                          className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 cursor-move select-none"
                        >
                          <span className="text-neutral-600 text-xs">&#8942;&#8942;</span>
                          <input
                            type="checkbox"
                            checked={s.enabled}
                            onChange={() => toggleStat('fc', s.key)}
                            className="accent-violet-600"
                          />
                          <span className="text-sm text-neutral-200">{def.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-2">EA CFB 27 Stats</h3>
                  <div className="space-y-1.5">
                    {cfbStatOrder.map(function(s) {
                      const def = CFB_STAT_DEFS[s.key]
                      return (
                        <div
                          key={s.key}
                          draggable
                          onDragStart={() => handleStatDragStart('cfb', s.key)}
                          onDragOver={handleStatDragOver}
                          onDrop={() => handleStatDrop('cfb', s.key)}
                          className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 cursor-move select-none"
                        >
                          <span className="text-neutral-600 text-xs">&#8942;&#8942;</span>
                          <input
                            type="checkbox"
                            checked={s.enabled}
                            onChange={() => toggleStat('cfb', s.key)}
                            className="accent-violet-600"
                          />
                          <span className="text-sm text-neutral-200">{def.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {franchises.length === 0 ? (
            <p className="text-neutral-500 text-sm">No saves yet. Click "+ New Save" above to get started.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {franchises.map(function(f) {
                var franchiseUrl = "/franchise/" + f.id
                const isCfb = f.game === 'EA CFB 27'
                const stats = franchiseStats[f.id] || { squadSize: 0, avgOverall: null }
                const statOrder = isCfb ? cfbStatOrder : fcStatOrder
                const statDefs = isCfb ? CFB_STAT_DEFS : FC_STAT_DEFS
                const enabledStats = statOrder.filter(function(s) { return s.enabled })
                const logoUrl = logoCache[f.id]

                return (
                  <div key={f.id} className="relative bg-gradient-to-br from-violet-600/15 via-neutral-900 to-neutral-900 border border-neutral-800 hover:border-violet-600 rounded-xl p-5 transition-colors">
                    <a href={franchiseUrl} onClick={(e) => { e.preventDefault(); goToFranchise(f.id) }} className="absolute inset-0 z-0" aria-label={'Open ' + f.club_name}></a>

                    <div className="relative z-10 pointer-events-none">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-neutral-500 text-xs font-medium mb-1">{f.game || 'EA FC 26'}</p>
                          <h3 className="font-bold text-neutral-100 text-xl">{displayName(f)}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-neutral-400 text-sm">
                              {f.league ? f.league : 'No league set'} &middot; Season {f.current_season}
                            </p>
                            <span className={'text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ' + tierChipColor(stats.avgOverall)}>
                              {tierLabel(stats.avgOverall)}
                            </span>
                          </div>
                          <div className="mt-4">
                            <TeamLogo url={logoUrl} size={72} />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {enabledStats.map(function(s) {
                            const def = statDefs[s.key]
                            const value = def.get(stats)
                            return (
                              <StackedStat
                                key={s.key}
                                label={def.label}
                                value={value}
                                isCurrency={!!def.isCurrency}
                                decimals={def.decimals}
                              />
                            )
                          })}
                        </div>
                      </div>

                      {isCfb ? (
                        <div className="bg-neutral-900/60 rounded-lg p-2.5 mt-2">
                          <p className="text-neutral-500 text-[10px] uppercase tracking-wide mb-1.5">
                            Class Breakdown &middot; {stats.squadSize} players
                          </p>
                          {stats.classBreakdown && stats.classBreakdown.length > 0 ? (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {stats.classBreakdown.map(function(c) {
                                return (
                                  <span key={c.label} className="text-neutral-200 text-xs font-medium whitespace-nowrap">
                                    {c.label} <span className="text-neutral-400">{c.count}</span>
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-neutral-500 text-xs">-</p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-neutral-900/60 rounded-lg p-2.5 mt-2">
                          <p className="text-neutral-500 text-[10px] uppercase tracking-wide mb-1.5">
                            Position Breakdown &middot; {stats.squadSize} players
                          </p>
                          {stats.positionBreakdown && stats.positionBreakdown.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {stats.positionBreakdown.map(function(p) {
                                return (
                                  <div key={p.label} className="flex items-center justify-between bg-neutral-800/60 rounded-md px-2 py-1">
                                    <span className="text-neutral-200 text-xs font-semibold">{p.label} <span className="text-neutral-400 font-normal">{p.count}</span></span>
                                    <StarDisplay count={p.stars} />
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-neutral-500 text-xs">-</p>
                          )}
                        </div>
                      )}
                    </div>

                    {confirmDeleteId === f.id ? (
                      <div className="absolute top-5 right-5 z-20 flex gap-1 bg-neutral-900 border border-neutral-700 rounded-lg p-1">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFranchise(f.id) }} disabled={deletingId === f.id} className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1">
                          {deletingId === f.id ? '...' : 'Confirm'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }} className="text-neutral-400 hover:text-neutral-200 text-xs px-2 py-1">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(f.id) }} className="absolute top-1 right-1 z-20 text-neutral-500 hover:text-red-400 text-xs font-medium">Delete</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 bg-neutral-900/60 border border-dashed border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-violet-400 text-[11px] font-semibold uppercase tracking-[0.16em]">Around the Leagues</span>
            <span className="text-neutral-600 text-[10px] font-semibold uppercase tracking-wide">Bonus &middot; coming soon</span>
          </div>
          <p className="text-neutral-500 text-sm mt-2">Real-world scores, ratings updates, and transfer news for the clubs and schools you play as will land here.</p>
        </div>
      </main>
    </div>
  )
}
