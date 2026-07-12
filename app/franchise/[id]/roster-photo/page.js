'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function findBestMatch(name, players) {
  const norm = normalizeName(name)
  if (!norm) return 'new'

  const exact = players.filter(function(p) { return normalizeName(p.name) === norm })
  if (exact.length === 1) return exact[0].id

  const partial = players.filter(function(p) {
    const pn = normalizeName(p.name)
    return pn && (pn.indexOf(norm) !== -1 || norm.indexOf(pn) !== -1)
  })
  if (partial.length === 1) return partial[0].id

  return 'new'
}

export default function RosterPhotoPage() {
  const [franchise, setFranchise] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [extracted, setExtracted] = useState(null)
  const [saving, setSaving] = useState(false)
  const [resultMessage, setResultMessage] = useState('')

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id

  const isCfb = franchise && franchise.game === 'EA CFB 27'

  useEffect(() => {
    loadData()
  }, [])

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
    await loadPlayers()
    setLoading(false)
  }

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('franchise_id', franchiseId)

    if (!error) {
      setPlayers(data)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setError('')
    setExtracted(null)
    setResultMessage('')
    setAnalyzing(true)

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result
      const base64 = dataUrl.split(',')[1]
      const mediaType = file.type || 'image/jpeg'

      try {
        const response = await fetch('/api/analyze-roster-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mediaType: mediaType, game: franchise.game })
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Something went wrong analyzing the image.')
        } else if (!result.players || result.players.length === 0) {
          setError('No players were detected in that photo. Try a clearer, closer photo of the roster or depth chart screen.')
        } else {
          const rows = result.players.map(function(p, idx) {
            return {
              tempId: idx,
              name: p.name || '',
              position: p.position || '',
              jersey_number: p.jersey_number,
              overall_rating: p.overall_rating,
              depth_rank: p.depth_rank,
              matchSelection: findBestMatch(p.name, players)
            }
          })
          setExtracted(rows)
        }
      } catch (err) {
        setError('Failed to analyze image. Please try again.')
      }

      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  const updateRow = (idx, key, value) => {
    setExtracted(function(prev) {
      const next = prev.slice()
      next[idx] = Object.assign({}, next[idx])
      next[idx][key] = value
      return next
    })
  }

  const handleSave = async () => {
    if (!extracted) return
    setSaving(true)
    setResultMessage('')

    let updatedCount = 0
    let addedCount = 0
    let skippedCount = 0

    for (let i = 0; i < extracted.length; i++) {
      const row = extracted[i]

      if (row.matchSelection === 'skip') {
        skippedCount++
        continue
      }

      const payload = {
        name: row.name,
        position: row.position,
        overall_rating: row.overall_rating !== null && row.overall_rating !== undefined && row.overall_rating !== '' ? parseInt(row.overall_rating) : null,
        jersey_number: row.jersey_number !== null && row.jersey_number !== undefined && row.jersey_number !== '' ? parseInt(row.jersey_number) : null
      }

      if (row.depth_rank !== null && row.depth_rank !== undefined && row.depth_rank !== '') {
        payload.depth_order = parseInt(row.depth_rank) - 1
      }

      if (row.matchSelection === 'new') {
        payload.franchise_id = franchiseId
        const { error } = await supabase.from('players').insert(payload)
        if (!error) addedCount++
      } else {
        const { error } = await supabase.from('players').update(payload).eq('id', row.matchSelection)
        if (!error) updatedCount++
      }
    }

    setSaving(false)
    setResultMessage(
      'Updated ' + updatedCount + ', added ' + addedCount + (skippedCount > 0 ? ', skipped ' + skippedCount : '') + '.'
    )
    setExtracted(null)
    await loadPlayers()
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
      <div className="max-w-5xl mx-auto px-6 py-10">

        <a href={'/franchise/' + franchiseId} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          &larr; Back to {franchise.club_name}
        </a>

        <h1 className="text-3xl font-bold tracking-tight mt-4 mb-1">Import Roster from Photo</h1>
        <p className="text-neutral-400 text-sm mb-6">
          Upload a photo of your in-game roster or depth chart screen. Existing players are matched by name and updated; anyone new can be added.
        </p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
          <label className="block text-xs font-medium text-neutral-400 mb-2">Upload Roster / Depth Chart Screenshot</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="block w-full text-sm text-neutral-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 file:cursor-pointer"
          />
          <p className="text-neutral-500 text-xs mt-2">
            On an iPhone, this opens your camera or photo library. A depth chart screen (players grouped by position, ranked top to bottom) will also set each player's depth order{isCfb ? ' on the Depth Chart tab' : ''}. A flat roster list just updates position/rating/number.
          </p>

          {analyzing && (
            <p className="text-emerald-400 text-sm mt-4">Analyzing photo, this can take a few seconds...</p>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-4">{error}</p>
          )}

          {resultMessage && (
            <p className="text-emerald-400 text-sm mt-4">{resultMessage}</p>
          )}
        </div>

        {extracted && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-neutral-200 mb-1">Review Before Saving</h2>
            <p className="text-neutral-500 text-xs mb-4">
              Double-check everything below — AI extraction can make mistakes. Edit any field, and confirm who each row should apply to before saving.
            </p>

            <div className="space-y-3">
              {extracted.map(function(row, idx) {
                return (
                  <div key={row.tempId} className="bg-neutral-800/50 border border-neutral-800 rounded-lg p-3">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                      <div>
                        <label className="block text-[10px] text-neutral-500 mb-0.5">Name</label>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(idx, 'name', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500 mb-0.5">Position</label>
                        <input
                          type="text"
                          value={row.position}
                          onChange={(e) => updateRow(idx, 'position', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500 mb-0.5">OVR</label>
                        <input
                          type="number"
                          value={row.overall_rating !== null && row.overall_rating !== undefined ? row.overall_rating : ''}
                          onChange={(e) => updateRow(idx, 'overall_rating', e.target.value === '' ? null : e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500 mb-0.5">No.</label>
                        <input
                          type="number"
                          value={row.jersey_number !== null && row.jersey_number !== undefined ? row.jersey_number : ''}
                          onChange={(e) => updateRow(idx, 'jersey_number', e.target.value === '' ? null : e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500 mb-0.5">Depth Rank</label>
                        <input
                          type="number"
                          value={row.depth_rank !== null && row.depth_rank !== undefined ? row.depth_rank : ''}
                          onChange={(e) => updateRow(idx, 'depth_rank', e.target.value === '' ? null : e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">Apply To</label>
                      <select
                        value={row.matchSelection}
                        onChange={(e) => updateRow(idx, 'matchSelection', e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                      >
                        <option value="new">+ Add as new player</option>
                        <option value="skip">Skip this player</option>
                        {players.map(function(p) {
                          return (
                            <option key={p.id} value={p.id}>
                              Update {p.name} ({p.position || '-'}{p.overall_rating ? ', ' + p.overall_rating + ' OVR' : ''})
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors rounded-lg px-4 py-2.5 text-sm font-semibold"
            >
              {saving ? 'Saving...' : 'Save ' + extracted.length + ' Player' + (extracted.length !== 1 ? 's' : '')}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
