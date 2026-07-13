'use client'

// Player profile page — click a name on the roster to land here.
// Themed on the Franchise HQ design system: gradient hero with headshot,
// tier-colored attribute bars, game-aware details, and the player's
// transfer entries. FC headshots come from the SoFIFA CDN via sofifa_id.
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function statTextColor(v) {
  if (v === null || v === undefined) return 'text-neutral-500'
  if (v >= 85) return 'text-green-400'
  if (v >= 80) return 'text-green-400'
  if (v >= 72) return 'text-amber-400'
  if (v >= 64) return 'text-orange-400'
  return 'text-red-400'
}
function statBarColor(v) {
  if (v === null || v === undefined) return 'bg-neutral-700'
  if (v >= 80) return 'bg-green-400'
  if (v >= 72) return 'bg-amber-400'
  if (v >= 64) return 'bg-orange-400'
  return 'bg-red-400'
}
function initials(name) {
  return (name || '?').split(/\s+/).map(function(w) { return w[0] }).slice(0, 2).join('').toUpperCase()
}
function sofifaHeadshot(id) {
  if (!id) return null
  const s = String(id).padStart(6, '0')
  return 'https://cdn.sofifa.net/players/' + s.slice(0, 3) + '/' + s.slice(3) + '/26_120.png'
}
function formatEuro(num) {
  if (num === null || num === undefined) return null
  if (num >= 1000000) return '€' + (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return '€' + (num / 1000).toFixed(0) + 'K'
  return '€' + num.toFixed(0)
}

export default function PlayerProfilePage() {
  const [franchise, setFranchise] = useState(null)
  const [player, setPlayer] = useState(null)
  const [reference, setReference] = useState(null)
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoFailed, setPhotoFailed] = useState(false)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id
  const playerId = params.playerId

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: fr } = await supabase.from('franchises').select('*').eq('id', franchiseId).single()
      if (!fr) { router.push('/'); return }
      setFranchise(fr)

      const { data: p } = await supabase.from('players').select('*').eq('id', playerId).single()
      if (!p) { router.push('/franchise/' + franchiseId); return }
      setPlayer(p)

      // Reference enrichment (headshot id, league, market data)
      if (fr.game === 'EA CFB 27') {
        const { data } = await supabase.from('cfb_player_reference').select('*').ilike('player_name', p.name).limit(1)
        if (data && data[0]) setReference(data[0])
      } else if (fr.game === 'MLB The Show 26') {
        const { data } = await supabase.from('mlb_player_reference').select('*').ilike('player_name', p.name).order('version', { ascending: false }).limit(1)
        if (data && data[0]) setReference(data[0])
      } else {
        const { data } = await supabase.from('player_reference').select('*').ilike('name', p.name).limit(1)
        if (data && data[0]) setReference(data[0])
      }

      const { data: th } = await supabase.from('transfer_history').select('*').eq('franchise_id', franchiseId).ilike('player_name', p.name).order('created_at', { ascending: false })
      setTransfers(th || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !player || !franchise) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Loading...</div>
    )
  }

  const isCfb = franchise.game === 'EA CFB 27'
  const isMlb = franchise.game === 'MLB The Show 26'
  const isFc = !isCfb && !isMlb && (franchise.game === 'EA FC 26' || !franchise.game)
  const photo = isFc && reference ? sofifaHeadshot(reference.sofifa_id) : null

  const fcAttrs = [['Pace', player.pace], ['Shooting', player.shooting], ['Passing', player.passing], ['Dribbling', player.dribbling], ['Defending', player.defending], ['Physical', player.physical]]
  const cfbAttrs = [['Speed', player.speed], ['Strength', player.strength], ['Agility', player.agility], ['Acceleration', player.acceleration], ['COD', player.change_of_direction], ['Injury', player.injury], ['Stamina', player.stamina], ['Awareness', player.awareness]]
  const attrs = isCfb ? cfbAttrs : fcAttrs
  const showBars = !isMlb

  const details = []
  if (player.age != null) details.push(['Age', player.age])
  if (player.nationality) details.push(['Nation', player.nationality])
  if (isFc && player.value_eur != null) details.push(['Value', formatEuro(player.value_eur)])
  if (isFc && player.wage_eur_wk != null) details.push(['Wage / wk', formatEuro(player.wage_eur_wk)])
  if (isCfb && player.cfb_class) details.push(['Class', player.cfb_class])
  if (isCfb && player.archetype) details.push(['Archetype', player.archetype])
  if (isCfb && player.nil_value != null) details.push(['NIL', player.nil_value.toLocaleString()])
  if (isMlb && reference) {
    if (reference.level) details.push(['Level', reference.level])
    if (reference.bats) details.push(['Bats', reference.bats])
    if (reference.throws) details.push(['Throws', reference.throws])
    if (reference.true_rating != null) details.push(['True Rating', reference.true_rating])
  }
  if (isMlb && player.dev_trait) details.push(['Potential', player.dev_trait])
  if (isCfb && player.dev_trait) details.push(['Dev Trait', player.dev_trait])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <a href={'/franchise/' + franchiseId} className="text-violet-400 hover:text-violet-300 text-sm font-medium">
          &larr; Back to {franchise.club_name}
        </a>

        <div className="mt-4 bg-gradient-to-br from-violet-600/40 via-violet-900/20 to-neutral-900 border border-violet-500/40 rounded-2xl p-7 flex items-center gap-7 flex-wrap">
          {photo && !photoFailed ? (
            <img src={photo} alt={player.name} width={110} height={110}
              className="rounded-full bg-neutral-900/80 border-2 border-violet-500/40 object-cover"
              onError={() => setPhotoFailed(true)} />
          ) : (
            <div className="w-[110px] h-[110px] rounded-full bg-neutral-900/80 border-2 border-violet-500/40 flex items-center justify-center">
              <span className="text-3xl font-black text-violet-300">{initials(player.name)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em]">
              {(franchise.game || 'EA FC 26') + ' · ' + franchise.club_name}
            </p>
            <h1 className="text-4xl font-black uppercase tracking-tight leading-none mt-1">{player.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {player.position && <span className="text-[11px] font-bold uppercase tracking-wide bg-violet-600/20 border border-violet-500/40 text-violet-300 rounded-full px-2.5 py-0.5">{player.position}</span>}
              {player.status && <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{player.status}</span>}
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-neutral-400 text-[10px] uppercase tracking-wide mb-0.5">Overall</p>
              <p className={'text-5xl font-bold tabular-nums leading-none ' + statTextColor(player.overall_rating)}>{player.overall_rating != null ? player.overall_rating : '-'}</p>
            </div>
            {!isMlb && (
              <div className="text-center">
                <p className="text-neutral-400 text-[10px] uppercase tracking-wide mb-0.5">Potential</p>
                <p className={'text-5xl font-bold tabular-nums leading-none ' + statTextColor(player.potential_rating)}>{player.potential_rating != null ? player.potential_rating : '-'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em] mb-5">Attributes</p>
            {showBars ? (
              <div className="space-y-4">
                {attrs.map(function(a) {
                  const label = a[0], v = a[1]
                  return (
                    <div key={label} className="flex items-center gap-4">
                      <span className="w-28 shrink-0 text-neutral-400 text-xs font-semibold uppercase tracking-wide">{label}</span>
                      <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div className={'h-full rounded-full ' + statBarColor(v)} style={{ width: (v != null ? Math.min(v, 99) : 0) + '%' }} />
                      </div>
                      <span className={'w-8 text-right font-bold tabular-nums ' + statTextColor(v)}>{v != null ? v : '-'}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">Detailed MLB attribute breakdowns arrive with a future roster sync.</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em] mb-4">Details</p>
            <div className="space-y-3">
              {details.map(function(d) {
                return (
                  <div key={d[0]} className="flex justify-between items-baseline border-b border-neutral-800/70 pb-2">
                    <span className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wide">{d[0]}</span>
                    <span className="text-neutral-100 text-sm font-semibold">{d[1]}</span>
                  </div>
                )
              })}
              {details.length === 0 && <p className="text-neutral-500 text-sm">No additional details.</p>}
            </div>
          </div>
        </div>

        {transfers.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-violet-600/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-[0.16em] mb-4">Transfer Record</p>
            <div className="space-y-2">
              {transfers.map(function(t) {
                return (
                  <div key={t.id} className="flex items-center gap-3 text-sm flex-wrap">
                    <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ' + (t.transfer_type.includes('In') ? 'bg-violet-900/40 text-violet-300' : 'bg-red-900/40 text-red-400')}>{t.transfer_type}</span>
                    <span className="text-neutral-400">Season {t.season}</span>
                    <span className="text-neutral-300">{(t.from_club || '?') + ' → ' + (t.to_club || '?')}</span>
                    {t.fee_eur != null && <span className="text-neutral-100 font-semibold tabular-nums">{formatEuro(t.fee_eur)}</span>}
                    {t.sell_on_pct != null && <span className="text-neutral-400">{t.sell_on_pct}% sell-on</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
