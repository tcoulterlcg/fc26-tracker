'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function ovrColor(ovr) {
  if (ovr === null || ovr === undefined) return 'text-neutral-500'
  if (ovr >= 85) return 'text-green-400'
  if (ovr >= 80) return 'text-green-400'
  if (ovr >= 72) return 'text-amber-400'
  if (ovr >= 64) return 'text-orange-400'
  return 'text-red-400'
}

export default function TeamNeedsPage() {
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [targets, setTargets] = useState([])

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id

  const isCfb = franchise && franchise.game === 'EA CFB 27'

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.length >= 2 && franchise) {
        search()
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchTerm, franchise])

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
    await loadTargets()
    setLoading(false)
  }

  const loadTargets = async () => {
    const { data, error } = await supabase
      .from('trade_targets')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('created_at', { ascending: false })

    if (!error) setTargets(data)
  }

  const search = async () => {
    if (isCfb) {
      const { data, error } = await supabase
        .from('cfb_player_reference')
        .select('*')
        .ilike('player_name', `%${searchTerm}%`)
        .limit(8)
      if (!error) {
        setSearchResults(data)
        setShowResults(true)
      }
    } else {
      const { data, error } = await supabase
        .from('player_reference')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(8)
      if (!error) {
        setSearchResults(data)
        setShowResults(true)
      }
    }
  }

  const handleAddTarget = async (p) => {
    setAdding(true)
    const payload = isCfb
      ? {
          franchise_id: franchiseId,
          player_name: p.player_name,
          position: p.position,
          current_team: p.team,
          overall_rating: p.overall_rating,
          notes: notes.trim() || null
        }
      : {
          franchise_id: franchiseId,
          player_name: p.name,
          position: p.position,
          current_team: p.active_club,
          overall_rating: p.overall_rating,
          notes: notes.trim() || null
        }

    const { error } = await supabase.from('trade_targets').insert(payload)

    setAdding(false)
    if (!error) {
      setSearchTerm('')
      setNotes('')
      setShowResults(false)
      await loadTargets()
    } else {
      alert(error.message)
    }
  }

  const handleRemoveTarget = async (id) => {
    const { error } = await supabase.from('trade_targets').delete().eq('id', id)
    if (!error) await loadTargets()
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
      <div className="max-w-4xl mx-auto px-6 py-10">
        <a href={'/franchise/' + franchiseId} className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-violet-500">
          &larr; Back to {franchise.club_name}
        </a>

        <h1 className="text-4xl font-bold uppercase tracking-wide mt-5 mb-1">Team Needs</h1>
        <p className="text-neutral-400 text-sm mb-8">Track trade targets and players you'd like to bring in.</p>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
          <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Search players to add as a target</label>
          <div className="relative mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder={isCfb ? 'Search by player name...' : 'Search by player name...'}
              className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-600"
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-20 mt-2 w-full bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg shadow-black/40 overflow-hidden">
                {searchResults.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddTarget(p)}
                    disabled={adding}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-800/60 flex justify-between items-center gap-3 text-sm border-b border-neutral-800/60 last:border-b-0 disabled:opacity-50 transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-neutral-100 truncate">{isCfb ? p.player_name : p.name}</span>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-violet-900/40 text-violet-400 shrink-0">{p.position}</span>
                      <span className="text-neutral-500 text-xs truncate">{isCfb ? p.team : p.active_club}</span>
                    </span>
                    <span className={'font-bold tabular-nums shrink-0 ' + ovrColor(p.overall_rating)}>{p.overall_rating}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Notes (optional, applies to next player added)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Need depth at RB, willing to overpay"
            className="w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-600"
          />
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-200 mb-4">Current Targets <span className="text-neutral-500">({targets.length})</span></h2>
          {targets.length === 0 ? (
            <div className="border border-dashed border-neutral-800 rounded-lg py-10 text-center">
              <p className="text-neutral-500 text-sm">No trade targets yet. Search above to add one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {targets.map(function(t) {
                return (
                  <div key={t.id} className="flex justify-between items-center gap-4 bg-neutral-950/40 border border-neutral-800 rounded-lg px-4 py-3 hover:border-neutral-700 transition-colors">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-neutral-100">{t.player_name}</span>
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-violet-900/40 text-violet-400">{t.position}</span>
                        <span className="text-neutral-400 text-sm">{t.current_team}</span>
                      </p>
                      {t.notes && <p className="text-neutral-500 text-xs mt-1.5">{t.notes}</p>}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={'font-bold tabular-nums ' + ovrColor(t.overall_rating)}>{t.overall_rating}</span>
                      <button
                        onClick={() => handleRemoveTarget(t.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        Remove
                      </button>
                    </div>
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
