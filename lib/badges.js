export const TIERS = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Master']

export const TIER_COLORS = {
  Bronze: { from: '#f59e0b', to: '#d97706', text: '#78350f' },
  Silver: { from: '#22d3ee', to: '#0891b2', text: '#164e63' },
  Gold: { from: '#facc15', to: '#ca8a04', text: '#713f12' },
  Diamond: { from: '#60a5fa', to: '#4f46e5', text: '#1e1b4b' },
  Master: { from: '#34d399', to: '#059669', text: '#064e3b' }
}

export function getTier(value, thresholds) {
  if (value === null || value === undefined) return null
  let earned = null
  for (let i = 0; i < TIERS.length; i++) {
    if (value >= thresholds[i]) {
      earned = TIERS[i]
    }
  }
  return earned
}

export const ACCOUNT_BADGES = [
  { key: 'veteran', label: 'Veteran', icon: 'clock', thresholds: [7, 30, 90, 365, 730], unit: 'days active' },
  { key: 'builder', label: 'Builder', icon: 'flag', thresholds: [1, 3, 5, 10, 20], unit: 'franchises created' },
  { key: 'roster_master', label: 'Roster Master', icon: 'team', thresholds: [25, 100, 250, 500, 1000], unit: 'players rostered' },
  { key: 'season_champion', label: 'Season Champion', icon: 'trophy', thresholds: [1, 5, 10, 20, 40], unit: 'seasons completed' }
]

export const FRANCHISE_BADGES = [
  { key: 'contender', label: 'Contender', icon: 'star', thresholds: [60, 70, 80, 85, 90], unit: 'team overall' },
  { key: 'dynasty', label: 'Dynasty', icon: 'trophy', thresholds: [1, 3, 5, 10, 20], unit: 'seasons completed' },
  { key: 'deep_roster', label: 'Deep Roster', icon: 'team', thresholds: [15, 25, 40, 60, 85], unit: 'players on roster' },
  { key: 'rising_program', label: 'Rising Program', icon: 'chart', thresholds: [2, 5, 8, 12, 18], unit: 'OVR gained' }
]

export function BadgeIcon({ type, size }) {
  const s = size || 22
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

  if (type === 'trophy') {
    return (
      <svg {...common}>
        <path d="M8 21h8" /><path d="M12 17v4" />
        <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
        <path d="M7 5H4a2 2 0 0 0 2 4h1" /><path d="M17 5h3a2 2 0 0 1-2 4h-1" />
      </svg>
    )
  }
  if (type === 'star') {
    return (
      <svg {...common} fill="white">
        <path d="M12 2l2.9 6.3 6.9.7-5.2 4.7 1.6 6.8L12 17.1 5.8 20.5l1.6-6.8L2.2 9l6.9-.7L12 2z" />
      </svg>
    )
  }
  if (type === 'team') {
    return (
      <svg {...common}>
        <circle cx="9" cy="7" r="3" /><circle cx="17" cy="8" r="2.5" />
        <path d="M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
        <path d="M16 15.5a4 4 0 0 1 4 4v1.5" />
      </svg>
    )
  }
  if (type === 'flag') {
    return (
      <svg {...common}>
        <path d="M5 21V4" /><path d="M5 4h13l-3 4 3 4H5" />
      </svg>
    )
  }
  if (type === 'chart') {
    return (
      <svg {...common}>
        <path d="M4 19h16" /><path d="M6 15l4-5 3 3 5-7" />
      </svg>
    )
  }
  if (type === 'clock') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    )
  }
  return null
}

export function BadgeCrest({ icon, tier, size, showLabel, label }) {
  const dim = size || 64
  if (!tier) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-30">
        <div className="relative" style={{ width: dim, height: dim }}>
          <div className="absolute inset-2 rotate-45 rounded-xl bg-neutral-700" />
          <div className="absolute inset-0 flex items-center justify-center">
            <BadgeIcon type={icon} size={dim * 0.32} />
          </div>
        </div>
        {showLabel && <span className="text-[10px] text-neutral-500 text-center">{label}</span>}
      </div>
    )
  }

  const colors = TIER_COLORS[tier]
  const gradientId = 'grad-' + icon + '-' + tier

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox="0 0 100 100" className="absolute inset-0">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.from} />
              <stop offset="100%" stopColor={colors.to} />
            </linearGradient>
          </defs>
          <rect x="18" y="18" width="64" height="64" rx="10" transform="rotate(45 50 50)" fill={'url(#' + gradientId + ')'} stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <BadgeIcon type={icon} size={dim * 0.34} />
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <p className="text-[10px] font-semibold text-neutral-200">{label}</p>
          <p className="text-[9px] font-medium" style={{ color: colors.from }}>{tier}</p>
        </div>
      )}
    </div>
  )
}