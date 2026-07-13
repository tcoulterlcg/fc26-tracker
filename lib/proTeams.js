// Pro-league team -> division maps for the new-franchise creation flow.
// MLB team names MUST exactly match the `team` values in mlb_player_reference
// (verified against the live table: standard full names, incl. "Oakland Athletics").

export const MLB_TEAMS = {
  // AL East
  'Baltimore Orioles': 'AL East',
  'Boston Red Sox': 'AL East',
  'New York Yankees': 'AL East',
  'Tampa Bay Rays': 'AL East',
  'Toronto Blue Jays': 'AL East',
  // AL Central
  'Chicago White Sox': 'AL Central',
  'Cleveland Guardians': 'AL Central',
  'Detroit Tigers': 'AL Central',
  'Kansas City Royals': 'AL Central',
  'Minnesota Twins': 'AL Central',
  // AL West
  'Houston Astros': 'AL West',
  'Los Angeles Angels': 'AL West',
  'Oakland Athletics': 'AL West',
  'Seattle Mariners': 'AL West',
  'Texas Rangers': 'AL West',
  // NL East
  'Atlanta Braves': 'NL East',
  'Miami Marlins': 'NL East',
  'New York Mets': 'NL East',
  'Philadelphia Phillies': 'NL East',
  'Washington Nationals': 'NL East',
  // NL Central
  'Chicago Cubs': 'NL Central',
  'Cincinnati Reds': 'NL Central',
  'Milwaukee Brewers': 'NL Central',
  'Pittsburgh Pirates': 'NL Central',
  'St. Louis Cardinals': 'NL Central',
  // NL West
  'Arizona Diamondbacks': 'NL West',
  'Colorado Rockies': 'NL West',
  'Los Angeles Dodgers': 'NL West',
  'San Diego Padres': 'NL West',
  'San Francisco Giants': 'NL West'
}

export const NHL_TEAMS = {
  // Atlantic
  'Boston Bruins': 'Atlantic',
  'Buffalo Sabres': 'Atlantic',
  'Detroit Red Wings': 'Atlantic',
  'Florida Panthers': 'Atlantic',
  'Montreal Canadiens': 'Atlantic',
  'Ottawa Senators': 'Atlantic',
  'Tampa Bay Lightning': 'Atlantic',
  'Toronto Maple Leafs': 'Atlantic',
  // Metropolitan
  'Carolina Hurricanes': 'Metropolitan',
  'Columbus Blue Jackets': 'Metropolitan',
  'New Jersey Devils': 'Metropolitan',
  'New York Islanders': 'Metropolitan',
  'New York Rangers': 'Metropolitan',
  'Philadelphia Flyers': 'Metropolitan',
  'Pittsburgh Penguins': 'Metropolitan',
  'Washington Capitals': 'Metropolitan',
  // Central
  'Chicago Blackhawks': 'Central',
  'Colorado Avalanche': 'Central',
  'Dallas Stars': 'Central',
  'Minnesota Wild': 'Central',
  'Nashville Predators': 'Central',
  'St. Louis Blues': 'Central',
  'Utah Mammoth': 'Central',
  'Winnipeg Jets': 'Central',
  // Pacific
  'Anaheim Ducks': 'Pacific',
  'Calgary Flames': 'Pacific',
  'Edmonton Oilers': 'Pacific',
  'Los Angeles Kings': 'Pacific',
  'San Jose Sharks': 'Pacific',
  'Seattle Kraken': 'Pacific',
  'Vancouver Canucks': 'Pacific',
  'Vegas Golden Knights': 'Pacific'
}

export const NFL_TEAMS = {
  // AFC East
  'Buffalo Bills': 'AFC East',
  'Miami Dolphins': 'AFC East',
  'New England Patriots': 'AFC East',
  'New York Jets': 'AFC East',
  // AFC North
  'Baltimore Ravens': 'AFC North',
  'Cincinnati Bengals': 'AFC North',
  'Cleveland Browns': 'AFC North',
  'Pittsburgh Steelers': 'AFC North',
  // AFC South
  'Houston Texans': 'AFC South',
  'Indianapolis Colts': 'AFC South',
  'Jacksonville Jaguars': 'AFC South',
  'Tennessee Titans': 'AFC South',
  // AFC West
  'Denver Broncos': 'AFC West',
  'Kansas City Chiefs': 'AFC West',
  'Las Vegas Raiders': 'AFC West',
  'Los Angeles Chargers': 'AFC West',
  // NFC East
  'Dallas Cowboys': 'NFC East',
  'New York Giants': 'NFC East',
  'Philadelphia Eagles': 'NFC East',
  'Washington Commanders': 'NFC East',
  // NFC North
  'Chicago Bears': 'NFC North',
  'Detroit Lions': 'NFC North',
  'Green Bay Packers': 'NFC North',
  'Minnesota Vikings': 'NFC North',
  // NFC South
  'Atlanta Falcons': 'NFC South',
  'Carolina Panthers': 'NFC South',
  'New Orleans Saints': 'NFC South',
  'Tampa Bay Buccaneers': 'NFC South',
  // NFC West
  'Arizona Cardinals': 'NFC West',
  'Los Angeles Rams': 'NFC West',
  'San Francisco 49ers': 'NFC West',
  'Seattle Seahawks': 'NFC West'
}

export const MLB_DIVISIONS = ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West']
export const NHL_DIVISIONS = ['Atlantic', 'Metropolitan', 'Central', 'Pacific']
export const NFL_DIVISIONS = ['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West']
