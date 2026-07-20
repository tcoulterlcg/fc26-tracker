'use client'

// Youth academy squad.
//
// Academy players are generated inside franchise mode, so they exist in no
// ratings database — there is nothing to look them up in and nothing to import
// from. Every detail is either typed in here or read off a screenshot of the
// academy screen.
//
// They are stored in the same `players` table as the senior squad, marked with
// status = 'youth', and every senior-squad calculation filters that marker out
// (see loadPlayers in ../page.js and loadPlayersForFranchises in app/page.js).
// Keeping them in one table means a promoted player is a status change rather
// than a copy between tables.

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const POSITIONS = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST']

function ratingColor(v) {
  if (v === null || v === undefined) return 'text-neutral-600'
  if (v >= 80) return 'text-green-400'
  if (v >= 70) return 'text-yellow-400'
  if (v >= 60) return 'text-orange-400'
  return 'text-red-400'
}

const emptyDraft = () => ({
  name: '', position: '', age: '', overall_rating: '', potential_rating: '', nationality: ''
})

export default function YouthAcademyPage() {
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [youth, setYouth] = useState([])
  const [draft, setDraft] = useState(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Photo import
  const [analyzing, setAnalyzing] = useState(false)
  const [found, setFound] = useState(null)
  const fileRef = useRef(null)

  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({})

  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id

  useEffect(() => {
    const load = async () => {
      const { data: f } = await supabase
        .from('franchises')
        .select('id, club_name, game')
        .eq('id', franchiseId)
        .single()
      setFranchise(f || null)
      await loadYouth()
      setLoading(false)
    }
    load()
  }, [franchiseId])

  const loadYouth = async () => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('franchise_id', franchiseId)
      .eq('status', 'youth')
      .order('potential_rating', { ascending: false, nullsFirst: false })
    setYouth(data || [])
  }

  const num = (v) => {
    if (v === '' || v === null || v === undefined) return null
    const n = parseInt(v, 10)
    return isNaN(n) ? null : n
  }

  const rowFromDraft = (d) => ({
    franchise_id: franchiseId,
    name: (d.name || '').trim(),
    position: (d.position || '').trim() || null,
    age: num(d.age),
    overall_rating: num(d.overall_rating),
    potential_rating: num(d.potential_rating),
    nationality: (d.nationality || '').trim() || null,
    status: 'youth'
  })

  const addPlayer = async (e) => {
    if (e) e.preventDefault()
    if (!draft.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('players').insert(rowFromDraft(draft))
    setSaving(false)
    if (err) { setError(err.message); return }
    setDraft(emptyDraft())
    await loadYouth()
  }

  const removePlayer = async (id) => {
    await supabase.from('players').delete().eq('id', id)
    await loadYouth()
  }

  // Promote to the senior squad: same row, senior marker. Everything on the
  // franchise page picks them up on next load.
  const promote = async (id) => {
    await supabase.from('players').update({ status: 'active' }).eq('id', id)
    await loadYouth()
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setEditDraft({
      name: p.name || '', position: p.position || '', age: p.age == null ? '' : String(p.age),
      overall_rating: p.overall_rating == null ? '' : String(p.overall_rating),
      potential_rating: p.potential_rating == null ? '' : String(p.potential_rating),
      nationality: p.nationality || ''
    })
  }

  const saveEdit = async () => {
    const row = rowFromDraft(editDraft)
    delete row.franchise_id
    await supabase.from('players').update(row).eq('id', editingId)
    setEditingId(null)
    await loadYouth()
  }

  const onPickFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setAnalyzing(true)
    setError('')
    setFound(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/analyze-roster-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mediaType: file.type || 'image/jpeg',
          game: franchise ? franchise.game : 'EA FC 26',
          mode: 'youth'
        })
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Could not read that image.'); return }
      const players = (json.players || []).filter(function(p) { return p && p.name })
      if (players.length === 0) { setError('No players found in that image.'); return }
      // Staged rather than inserted — the read is a best guess off a
      // screenshot, so it gets reviewed before anything is written.
      setFound(players.map(function(p) {
        return {
          name: p.name || '', position: p.position || '',
          age: p.age == null ? '' : String(p.age),
          overall_rating: p.overall_rating == null ? '' : String(p.overall_rating),
          potential_rating: p.potential_rating == null ? '' : String(p.potential_rating),
          nationality: p.nationality || '',
          include: true
        }
      }))
    } catch (err) {
      setError(err.message || 'Could not read that image.')
    } finally {
      setAnalyzing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const saveFound = async () => {
    const rows = found.filter(function(p) { return p.include && p.name.trim() }).map(rowFromDraft)
    if (rows.length === 0) { setFound(null); return }
    setSaving(true)
    const { error: err } = await supabase.from('players').insert(rows)
    setSaving(false)
    if (err) { setError(err.message); return }
    setFound(null)
    await loadYouth()
  }

  const setFoundField = (i, field, value) => {
    setFound(function(prev) {
      const next = prev.slice()
      next[i] = Object.assign({}, next[i], { [field]: value })
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500 text-sm uppercase tracking-[0.14em] font-semibold">
        Loading...
      </div>
    )
  }

  const withPot = youth.filter(function(p) { return typeof p.potential_rating === 'number' })
  const avgPot = withPot.length ? withPot.reduce(function(s, p) { return s + p.potential_rating }, 0) / withPot.length : null
  const best = withPot.length ? withPot.reduce(function(a, b) { return b.potential_rating > a.potential_rating ? b : a }) : null

  const inputCls = 'w-full bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2 text-sm placeholder:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-600'

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <a href={'/franchise/' + franchiseId} className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-violet-500">
          &larr; Back to {franchise ? franchise.club_name : 'franchise'}
        </a>

        <h1 className="text-4xl font-bold uppercase tracking-wide mt-5 mb-1">Youth Academy</h1>
        <p className="text-neutral-400 text-sm mb-8">
          Academy players are generated in-game, so add them by hand or from a screenshot. They are kept out of your senior squad ratings.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-3">
            <p className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1">In Academy</p>
            <p className="text-2xl font-bold">{youth.length}</p>
          </div>
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-3">
            <p className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1">Avg Potential</p>
            <p className={'text-2xl font-bold ' + ratingColor(avgPot)}>{avgPot === null ? '-' : avgPot.toFixed(1)}</p>
          </div>
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-3 col-span-2">
            <p className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1">Top Prospect</p>
            <p className="text-sm font-semibold truncate">
              {best ? best.name : '-'}
              {best && <span className={'ml-2 ' + ratingColor(best.potential_rating)}>POT {best.potential_rating}</span>}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-lg px-4 py-2.5 mb-4">{error}</div>
        )}

        {/* Add by hand */}
        <form onSubmit={addPlayer} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <h2 className="text-sm font-semibold text-neutral-200">Add a player</h2>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" id="youth-photo" />
              <label
                htmlFor="youth-photo"
                className={'inline-block border border-neutral-700 hover:border-violet-500 text-sm font-semibold px-3.5 py-1.5 rounded-lg cursor-pointer ' + (analyzing ? 'opacity-60 pointer-events-none' : '')}
              >
                {analyzing ? 'Reading photo…' : 'Import from photo'}
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <input className={inputCls + ' col-span-2'} placeholder="Name" value={draft.name} onChange={(e) => setDraft(Object.assign({}, draft, { name: e.target.value }))} />
            <select className={inputCls} value={draft.position} onChange={(e) => setDraft(Object.assign({}, draft, { position: e.target.value }))}>
              <option value="">Pos</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className={inputCls} placeholder="Age" inputMode="numeric" value={draft.age} onChange={(e) => setDraft(Object.assign({}, draft, { age: e.target.value }))} />
            <input className={inputCls} placeholder="OVR" inputMode="numeric" value={draft.overall_rating} onChange={(e) => setDraft(Object.assign({}, draft, { overall_rating: e.target.value }))} />
            <input className={inputCls} placeholder="POT" inputMode="numeric" value={draft.potential_rating} onChange={(e) => setDraft(Object.assign({}, draft, { potential_rating: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input className={inputCls + ' max-w-xs'} placeholder="Nationality (optional)" value={draft.nationality} onChange={(e) => setDraft(Object.assign({}, draft, { nationality: e.target.value }))} />
            <button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400">
              {saving ? 'Adding…' : '+ Add'}
            </button>
          </div>
        </form>

        {/* Review what the photo produced before writing anything */}
        {found && (
          <div className="bg-violet-600/10 border border-violet-500/40 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-neutral-100 mb-1">Found {found.length} player{found.length === 1 ? '' : 's'}</h2>
            <p className="text-neutral-400 text-xs mb-3">Check these over — anything the screenshot didn&apos;t show clearly can be fixed here before saving.</p>
            <div className="space-y-2 mb-3">
              {found.map(function(p, i) {
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input type="checkbox" checked={p.include} onChange={(e) => setFoundField(i, 'include', e.target.checked)} className="accent-violet-500" aria-label={'Include ' + p.name} />
                    <input className={inputCls + ' flex-1 min-w-[160px]'} value={p.name} onChange={(e) => setFoundField(i, 'name', e.target.value)} />
                    <input className={inputCls + ' w-20'} placeholder="Pos" value={p.position} onChange={(e) => setFoundField(i, 'position', e.target.value)} />
                    <input className={inputCls + ' w-16'} placeholder="Age" value={p.age} onChange={(e) => setFoundField(i, 'age', e.target.value)} />
                    <input className={inputCls + ' w-16'} placeholder="OVR" value={p.overall_rating} onChange={(e) => setFoundField(i, 'overall_rating', e.target.value)} />
                    <input className={inputCls + ' w-16'} placeholder="POT" value={p.potential_rating} onChange={(e) => setFoundField(i, 'potential_rating', e.target.value)} />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={saveFound} disabled={saving} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                {saving ? 'Saving…' : 'Save to academy'}
              </button>
              <button onClick={() => setFound(null)} className="border border-neutral-700 hover:border-neutral-500 text-neutral-300 text-sm font-semibold px-4 py-2 rounded-lg">
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Squad */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden">
          {youth.length === 0 ? (
            <p className="text-neutral-500 text-sm px-5 py-8 text-center">
              No academy players yet. Add one above, or import a screenshot of your youth squad.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-950/60 text-neutral-500 text-[10px] uppercase tracking-[0.14em]">
                    <th className="text-left font-semibold px-4 py-2.5">Name</th>
                    <th className="text-left font-semibold px-3 py-2.5">Pos</th>
                    <th className="text-right font-semibold px-3 py-2.5">Age</th>
                    <th className="text-right font-semibold px-3 py-2.5">OVR</th>
                    <th className="text-right font-semibold px-3 py-2.5">POT</th>
                    <th className="text-right font-semibold px-3 py-2.5">Upside</th>
                    <th className="text-right font-semibold px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {youth.map(function(p) {
                    const upside = (typeof p.potential_rating === 'number' && typeof p.overall_rating === 'number')
                      ? p.potential_rating - p.overall_rating : null
                    const editing = editingId === p.id
                    return (
                      <tr key={p.id} className="border-t border-neutral-800/70">
                        {editing ? (
                          <>
                            <td className="px-4 py-2"><input className={inputCls} value={editDraft.name} onChange={(e) => setEditDraft(Object.assign({}, editDraft, { name: e.target.value }))} /></td>
                            <td className="px-3 py-2"><input className={inputCls + ' w-20'} value={editDraft.position} onChange={(e) => setEditDraft(Object.assign({}, editDraft, { position: e.target.value }))} /></td>
                            <td className="px-3 py-2"><input className={inputCls + ' w-16'} value={editDraft.age} onChange={(e) => setEditDraft(Object.assign({}, editDraft, { age: e.target.value }))} /></td>
                            <td className="px-3 py-2"><input className={inputCls + ' w-16'} value={editDraft.overall_rating} onChange={(e) => setEditDraft(Object.assign({}, editDraft, { overall_rating: e.target.value }))} /></td>
                            <td className="px-3 py-2"><input className={inputCls + ' w-16'} value={editDraft.potential_rating} onChange={(e) => setEditDraft(Object.assign({}, editDraft, { potential_rating: e.target.value }))} /></td>
                            <td></td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              <button onClick={saveEdit} className="text-violet-400 hover:text-violet-300 text-xs font-semibold mr-3">Save</button>
                              <button onClick={() => setEditingId(null)} className="text-neutral-500 hover:text-neutral-300 text-xs font-semibold">Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5 font-medium text-neutral-100">
                              {p.name}
                              {p.nationality && <span className="text-neutral-600 text-xs ml-2">{p.nationality}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-neutral-400">{p.position || '-'}</td>
                            <td className="px-3 py-2.5 text-right text-neutral-300">{p.age == null ? '-' : p.age}</td>
                            <td className={'px-3 py-2.5 text-right font-bold ' + ratingColor(p.overall_rating)}>{p.overall_rating == null ? '-' : p.overall_rating}</td>
                            <td className={'px-3 py-2.5 text-right font-bold ' + ratingColor(p.potential_rating)}>{p.potential_rating == null ? '-' : p.potential_rating}</td>
                            <td className="px-3 py-2.5 text-right">
                              {upside === null ? <span className="text-neutral-700">-</span> : <span className="text-violet-400 font-semibold">+{upside}</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              <button onClick={() => startEdit(p)} className="text-neutral-500 hover:text-neutral-200 text-xs font-semibold mr-3">Edit</button>
                              <button onClick={() => promote(p.id)} className="text-green-400 hover:text-green-300 text-xs font-semibold mr-3" title="Move to the senior squad">Promote</button>
                              <button onClick={() => removePlayer(p.id)} className="text-neutral-600 hover:text-red-400 text-xs font-semibold">Remove</button>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
