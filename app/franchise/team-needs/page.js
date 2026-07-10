'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function ovrColor(ovr) {
  if (ovr === null || ovr === undefined) return 'text-neutral-500'
  if (ovr >= 80) return 'text-green-400'
  if (ovr >= 70) return 'text-yellow-400'
  if (ovr >= 60) return 'text-orange-400'
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
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <a href={'/franchise/' + franchiseId} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          &larr; Back to {franchise.club_name}
        </a>

        <h1 className="text-3xl font-bold tracking-tight mt-4 mb-1">Team Needs</h1>
        <p className="text-neutral-400 text-sm mb-6">Track trade targets and players you'd like to bring in.</p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
          <label className="block text-xs font-medium text-neutral-400 mb-1">Search players to add as a target</label>
          <div className="relative mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder={isCfb ? 'Search by player name...' : 'Search by player name...'}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg overflow-hidden">
                {searchResults.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddTarget(p)}
                    disabled={adding}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-700 flex justify-between items-center text-sm"
                  >
                    <span>
                      {isCfb ? p.player_name : p.name}
                      <span className="text-neutral-400"> &middot; {p.position} &middot; {isCfb ? p.team : p.active_club}</span>
                    </span>
                    <span className={'font-semibold ' + ovrColor(p.overall_rating)}>{p.overall_rating}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Notes (optional, applies to next player added)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Need depth at RB, willing to overpay"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-neutral-200 mb-4">Current Targets ({targets.length})</h2>
          {targets.length === 0 ? (
            <p className="text-neutral-500 text-sm">No trade targets yet. Search above to add one.</p>
          ) : (
            <div className="space-y-2">
              {targets.map(function(t) {
                return (
                  <div key={t.id} className="flex justify-between items-center bg-neutral-800/50 border border-neutral-800 rounded-lg px-4 py-3">
                    <div>
                      <p className="font-medium text-neutral-100">
                        {t.player_name}
                        <span className="text-neutral-400 text-sm font-normal"> &middot; {t.position} &middot; {t.current_team}</span>
                      </p>
                      {t.notes && <p className="text-neutral-500 text-xs mt-1">{t.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={'font-semibold text-sm ' + ovrColor(t.overall_rating)}>{t.overall_rating}</span>
                      <button
                        onClick={() => handleRemoveTarget(t.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-medium"
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