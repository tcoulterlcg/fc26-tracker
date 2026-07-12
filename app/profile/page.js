'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const ACCOUNT_BADGES = [
  { key: 'veteran', label: 'Veteran', thresholds: [7, 30, 90, 365, 730], unit: 'days active' },
  { key: 'builder', label: 'Builder', thresholds: [1, 3, 5, 10, 20], unit: 'franchises created' },
  { key: 'roster_master', label: 'Roster Master', thresholds: [25, 100, 250, 500, 1000], unit: 'players rostered' },
  { key: 'season_champion', label: 'Season Champion', thresholds: [1, 5, 10, 20, 40], unit: 'seasons completed' }
]

const FRANCHISE_BADGES = [
  { key: 'contender', label: 'Contender', thresholds: [60, 70, 80, 85, 90], unit: 'team overall' },
  { key: 'dynasty', label: 'Dynasty', thresholds: [1, 3, 5, 10, 20], unit: 'seasons completed' },
  { key: 'deep_roster', label: 'Deep Roster', thresholds: [15, 25, 40, 60, 85], unit: 'players on roster' },
  { key: 'rising_program', label: 'Rising Program', thresholds: [2, 5, 8, 12, 18], unit: 'OVR gained' }
]

const TIERS = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Master']
const TIER_COLOR = {
  Bronze: 'bg-neutral-800 text-neutral-400 border border-neutral-700',
  Silver: 'bg-neutral-800 text-neutral-200 border border-neutral-600',
  Gold: 'bg-emerald-900/30 text-emerald-500 border border-emerald-900',
  Diamond: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/60',
  Master: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500'
}

function getTier(value, thresholds) {
  if (value === null || value === undefined) return null
  let earned = null
  for (let i = 0; i < TIERS.length; i++) {
    if (value >= thresholds[i]) earned = TIERS[i]
  }
  return earned
}

function BadgePill({ label, tier, value, unit }) {
  return (
    <div className="flex flex-col items-center bg-neutral-800/40 border border-neutral-800 rounded-xl p-4 text-center">
      <div className={'w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold mb-3 ' + (tier ? TIER_COLOR[tier] : 'bg-neutral-900 text-neutral-600 border border-neutral-800')}>
        {tier ? tier.slice(0, 1) : '-'}
      </div>
      <p className="text-xs font-semibold text-neutral-200">{label}</p>
      <p className={'text-[10px] font-semibold uppercase tracking-[0.14em] mt-1 ' + (tier ? 'text-emerald-400' : 'text-neutral-600')}>{tier || 'Not yet earned'}</p>
      <p className="text-[10px] text-neutral-500 mt-1">{value || 0} {unit}</p>
    </div>
  )
}

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [franchises, setFranchises] = useState([])
  const [loading, setLoading] = useState(true)
  const [accountStats, setAccountStats] = useState({})
  const [franchiseStats, setFranchiseStats] = useState({})

  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarDraft, setAvatarDraft] = useState('')
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const profileResult = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileResult.data && profileResult.data.avatar_url) {
      setAvatarUrl(profileResult.data.avatar_url)
      setAvatarDraft(profileResult.data.avatar_url)
    }

    const franchiseResult = await supabase
      .from('franchises')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const franchiseList = franchiseResult.data || []
    setFranchises(franchiseList)

    const franchiseIds = franchiseList.map(function(f) { return f.id })

    let allPlayers = []
    if (franchiseIds.length > 0) {
      const playersResult = await supabase.from('players').select('franchise_id').in('franchise_id', franchiseIds)
      allPlayers = playersResult.data || []
    }

    let allSnapshots = []
    if (franchiseIds.length > 0) {
      const snapshotsResult = await supabase.from('season_snapshots').select('*').in('franchise_id', franchiseIds)
      allSnapshots = snapshotsResult.data || []
    }

    const createdAt = new Date(user.created_at)
    const daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const totalEndSnapshots = allSnapshots.filter(function(s) { return s.label === 'End' }).length

    setAccountStats({
      veteran: daysActive,
      builder: franchiseList.length,
      roster_master: allPlayers.length,
      season_champion: totalEndSnapshots
    })

    const perFranchiseStats = {}
    for (let i = 0; i < franchiseList.length; i++) {
      const f = franchiseList[i]
      const fPlayers = allPlayers.filter(function(p) { return p.franchise_id === f.id })
      const fSnapshots = allSnapshots.filter(function(s) { return s.franchise_id === f.id })
      const endSnapshots = fSnapshots.filter(function(s) { return s.label === 'End' })
      const firstStart = fSnapshots.filter(function(s) { return s.label === 'Start' }).sort(function(a, b) { return a.season - b.season })[0]
      const lastEnd = endSnapshots.sort(function(a, b) { return b.season - a.season })[0]

      let ovrGain = null
      if (firstStart && lastEnd && firstStart.avg_overall !== null && lastEnd.avg_overall !== null) {
        ovrGain = lastEnd.avg_overall - firstStart.avg_overall
      }

      perFranchiseStats[f.id] = {
        contender: null,
        dynasty: endSnapshots.length,
        deep_roster: fPlayers.length,
        rising_program: ovrGain
      }
    }
    setFranchiseStats(perFranchiseStats)
    setLoading(false)
  }

  const isValidImageUrl = (url) => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch (e) {
      return false
    }
  }

  const handleSaveAvatar = async () => {
    setAvatarError('')

    if (avatarDraft.trim() && !isValidImageUrl(avatarDraft.trim())) {
      setAvatarError('Please enter a valid image URL starting with http:// or https://')
      return
    }

    setSavingAvatar(true)

    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: user.id, avatar_url: avatarDraft.trim() || null, updated_at: new Date().toISOString() })

    setSavingAvatar(false)

    if (!error) {
      setAvatarUrl(avatarDraft.trim())
      setEditingAvatar(false)
    } else {
      setAvatarError(error.message)
    }
  }

  const handleRemoveAvatar = async () => {
    setSavingAvatar(true)
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: user.id, avatar_url: null, updated_at: new Date().toISOString() })
    setSavingAvatar(false)
    if (!error) {
      setAvatarUrl('')
      setAvatarDraft('')
      setEditingAvatar(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500 text-sm uppercase tracking-[0.14em] font-semibold">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-12">

        <a href="/" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
          &larr; Back to Franchises
        </a>

        <div className="flex items-center gap-6 mt-8 mb-10">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile picture"
                className="w-24 h-24 rounded-full object-cover bg-neutral-900 border border-neutral-800 ring-2 ring-neutral-800/60"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 ring-2 ring-neutral-800/60 flex items-center justify-center text-3xl font-bold text-emerald-400">
                {user.email.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-all">{user.email}</h1>
            <button
              onClick={() => { setEditingAvatar(!editingAvatar); setAvatarDraft(avatarUrl) }}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold mt-1.5 transition-colors"
            >
              {editingAvatar ? 'Cancel' : (avatarUrl ? 'Change profile picture' : 'Add profile picture')}
            </button>
          </div>
        </div>

        {editingAvatar && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-10">
            <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-2">Image URL</label>
            <input
              type="text"
              value={avatarDraft}
              onChange={(e) => setAvatarDraft(e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {avatarError && <p className="text-red-400 text-xs mb-3">{avatarError}</p>}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveAvatar}
                disabled={savingAvatar}
                className="bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors rounded-lg px-5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {savingAvatar ? 'Saving...' : 'Save'}
              </button>
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={savingAvatar}
                  className="text-red-400 hover:text-red-300 disabled:opacity-40 text-sm font-medium px-4 py-2 transition-colors"
                >
                  Remove picture
                </button>
              )}
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold tracking-tight mb-1.5">Achievements</h1>
        <p className="text-neutral-400 text-sm mb-8">Your badges across the whole account and each franchise.</p>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-10">
          <h2 className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-5">Account Badges</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ACCOUNT_BADGES.map(function(b) {
              const value = accountStats[b.key]
              const tier = getTier(value, b.thresholds)
              return <BadgePill key={b.key} label={b.label} tier={tier} value={value} unit={b.unit} />
            })}
          </div>
        </div>

        <h2 className="text-lg font-bold tracking-tight mb-4">Franchise Badges</h2>

        {franchises.length === 0 ? (
          <p className="text-neutral-500 text-sm border border-dashed border-neutral-800 rounded-xl p-8 text-center">No franchises yet.</p>
        ) : (
          <div className="space-y-5">
            {franchises.map(function(f) {
              const stats = franchiseStats[f.id] || {}
              return (
                <div key={f.id} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6">
                  <div className="flex justify-between items-center gap-4 mb-5">
                    <div className="min-w-0">
                      <p className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em]">{f.game || 'EA FC 26'}</p>
                      <h3 className="font-bold text-lg tracking-tight mt-0.5 truncate">{f.club_name}</h3>
                    </div>
                    <a href={'/franchise/' + f.id} className="shrink-0 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors">
                      View Franchise &rarr;
                    </a>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {FRANCHISE_BADGES.map(function(b) {
                      const value = stats[b.key]
                      const tier = getTier(value, b.thresholds)
                      return <BadgePill key={b.key} label={b.label} tier={tier} value={value} unit={b.unit} />
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
