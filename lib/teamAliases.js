// Common nicknames / acronyms -> the canonical club or school names as stored
// in player_reference (active_club) and cfb_player_reference (team). Used so a
// search for "PSG", "OSU", "UT" etc. surfaces the right team, and so importing
// a franchise named by a nickname still finds its roster. Some nicknames map to
// several teams on purpose (UT = Tennessee or Texas) — search shows all; import
// treats multiple matches as ambiguous and asks the user to be specific.
//
// Keys are normalized (lowercase, punctuation/space stripped). Extend freely.
export const TEAM_ALIASES = {
  // --- CFB ---
  osu: ['Ohio State', 'Oklahoma State', 'Oregon State'],
  ut: ['Tennessee', 'Texas'],
  uf: ['Florida'],
  uga: ['Georgia'],
  bama: ['Alabama'],
  rolltide: ['Alabama'],
  um: ['Michigan', 'Miami (FL)'],
  miami: ['Miami (FL)'],
  themu: ['Miami (FL)'],
  psu: ['Penn State'],
  ou: ['Oklahoma'],
  fsu: ['Florida State'],
  nd: ['Notre Dame'],
  wvu: ['West Virginia'],
  vt: ['Virginia Tech'],
  hokies: ['Virginia Tech'],
  gt: ['Georgia Tech'],
  unc: ['North Carolina'],
  ncstate: ['NC State'],
  ncst: ['NC State'],
  pitt: ['Pittsburgh'],
  cuse: ['Syracuse'],
  wazzu: ['Washington State'],
  uw: ['Washington'],
  msu: ['Michigan State', 'Mississippi State'],
  mizzou: ['Missouri'],
  mizz: ['Missouri'],
  zona: ['Arizona'],
  asu: ['Arizona State'],
  cal: ['California'],
  colorado: ['Colorado'],
  buffs: ['Colorado'],
  ku: ['Kansas'],
  ksu: ['Kansas State'],
  isu: ['Iowa State'],
  osubuckeyes: ['Ohio State'],
  ttu: ['Texas Tech'],
  tamu: ['Texas A&M'],
  aggies: ['Texas A&M'],
  uk: ['Kentucky'],
  scar: ['South Carolina'],
  gamecocks: ['South Carolina'],
  vandy: ['Vanderbilt'],
  usf: ['South Florida'],
  ucf: ['UCF'],
  fau: ['Florida Atlantic'],
  // --- FC ---
  psg: ['Paris Saint-Germain'],
  parissg: ['Paris Saint-Germain'],
  barca: ['FC Barcelona'],
  barça: ['FC Barcelona'],
  fcb: ['FC Barcelona', 'FC Bayern München'],
  real: ['Real Madrid'],
  madrid: ['Real Madrid'],
  rmcf: ['Real Madrid'],
  atleti: ['Atlético Madrid'],
  atletico: ['Atlético Madrid'],
  manutd: ['Manchester United'],
  manu: ['Manchester United'],
  mufc: ['Manchester United'],
  utd: ['Manchester United'],
  mancity: ['Manchester City'],
  mcfc: ['Manchester City'],
  spurs: ['Tottenham Hotspur'],
  thfc: ['Tottenham Hotspur'],
  bayern: ['FC Bayern München'],
  fcbayern: ['FC Bayern München'],
  bvb: ['Borussia Dortmund'],
  dortmund: ['Borussia Dortmund'],
  gladbach: ['Borussia Mönchengladbach'],
  juve: ['Juventus'],
  inter: ['Inter Milan'],
  milan: ['AC Milan'],
  acmilan: ['AC Milan'],
  napoli: ['Napoli'],
  gunners: ['Arsenal'],
  afc: ['Arsenal'],
  lfc: ['Liverpool'],
  cfc: ['Chelsea'],
}

const norm = s => (s || '').trim().toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '')

// Canonical reference names to also search for a nickname query. Returns [] if
// the query isn't a known alias.
export function aliasCanonicalNames(term) {
  return TEAM_ALIASES[norm(term)] || []
}
