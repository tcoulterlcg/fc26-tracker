'use client'

// Franchise notepad — free-text lines for whatever you want to remember about a
// save (targets, formation ideas, who to sell in January).
//
// Notes are stored in the browser's localStorage, keyed per franchise, because
// there is no notes table in Supabase and creating one needs schema access this
// app doesn't have. That means notes stay on this device and this browser. If a
// notes table is added later, swapping the load/save pair below for Supabase
// calls is the only change needed — the rest of the component is storage-agnostic.

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const MIN_ROWS = 10
const storageKey = (franchiseId) => 'roster_hq_notes_' + franchiseId

// Always render at least MIN_ROWS so the pad looks like a pad even when empty.
function padRows(rows) {
  const out = (rows || []).slice()
  while (out.length < MIN_ROWS) out.push('')
  return out
}

export default function NotesPage() {
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState(padRows([]))
  const [saved, setSaved] = useState(true)

  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id
  const inputRefs = useRef([])
  const loadedFor = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('franchises')
        .select('id, club_name, game')
        .eq('id', franchiseId)
        .single()
      setFranchise(data || null)

      try {
        const raw = window.localStorage.getItem(storageKey(franchiseId))
        const parsed = raw ? JSON.parse(raw) : []
        setRows(padRows(Array.isArray(parsed) ? parsed : []))
      } catch (e) {
        setRows(padRows([]))
      }
      loadedFor.current = franchiseId
      setLoading(false)
    }
    load()
  }, [franchiseId])

  // Debounced autosave. Guarded on loadedFor so the initial render can't write
  // an empty pad over saved notes before they've been read back.
  useEffect(() => {
    if (loadedFor.current !== franchiseId) return
    setSaved(false)
    const t = setTimeout(() => {
      try {
        // Drop trailing blanks so the pad doesn't grow every time it's opened.
        const trimmed = rows.slice()
        while (trimmed.length > 0 && !trimmed[trimmed.length - 1].trim()) trimmed.pop()
        window.localStorage.setItem(storageKey(franchiseId), JSON.stringify(trimmed))
        setSaved(true)
      } catch (e) {
        // Storage full or blocked — leave the indicator showing unsaved.
      }
    }, 400)
    return () => clearTimeout(t)
  }, [rows, franchiseId])

  const setRow = (i, value) => {
    setRows(function(prev) {
      const next = prev.slice()
      next[i] = value
      return next
    })
  }

  const addRow = () => {
    setRows(function(prev) { return prev.concat('') })
    // Focus the row that was just added.
    setTimeout(function() {
      const el = inputRefs.current[rows.length]
      if (el) el.focus()
    }, 0)
  }

  const removeRow = (i) => {
    setRows(function(prev) {
      const next = prev.slice()
      next.splice(i, 1)
      return padRows(next)
    })
  }

  const onKeyDown = (e, i) => {
    // 'Return' is what some platforms and automation report for the same key.
    if (e.key === 'Enter' || e.key === 'Return') {
      e.preventDefault()
      if (i === rows.length - 1) {
        addRow()
      } else {
        const el = inputRefs.current[i + 1]
        if (el) el.focus()
      }
    } else if (e.key === 'Backspace' && !rows[i] && rows.length > MIN_ROWS && i === rows.length - 1) {
      e.preventDefault()
      removeRow(i)
      setTimeout(function() {
        const el = inputRefs.current[i - 1]
        if (el) el.focus()
      }, 0)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const el = inputRefs.current[i + 1]
      if (el) el.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const el = inputRefs.current[i - 1]
      if (el) el.focus()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500 text-sm uppercase tracking-[0.14em] font-semibold">
        Loading...
      </div>
    )
  }

  const written = rows.filter(function(r) { return r.trim() }).length

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <a href={'/franchise/' + franchiseId} className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-violet-500">
          &larr; Back to {franchise ? franchise.club_name : 'franchise'}
        </a>

        <div className="flex items-end justify-between gap-4 mt-5 mb-1 flex-wrap">
          <h1 className="text-4xl font-bold uppercase tracking-wide">Notes</h1>
          <span className={'text-[11px] font-semibold uppercase tracking-[0.14em] ' + (saved ? 'text-neutral-600' : 'text-violet-400')}>
            {saved ? (written > 0 ? 'Saved' : '') : 'Saving…'}
          </span>
        </div>
        <p className="text-neutral-400 text-sm mb-8">
          Anything you want to remember about this save. Saved automatically on this device.
        </p>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden">
          {rows.map(function(row, i) {
            return (
              <div key={i} className="group flex items-stretch border-b border-neutral-800/70 last:border-b-0">
                <div className="w-11 flex-shrink-0 flex items-center justify-center bg-neutral-950/40 border-r border-violet-500/25 select-none">
                  <span className="text-neutral-700 text-[11px] font-semibold tabular-nums">{i + 1}</span>
                </div>
                <input
                  ref={function(el) { inputRefs.current[i] = el }}
                  type="text"
                  value={row}
                  onChange={function(e) { setRow(i, e.target.value) }}
                  onKeyDown={function(e) { onKeyDown(e, i) }}
                  aria-label={'Note line ' + (i + 1)}
                  className="flex-1 bg-transparent px-4 py-2.5 text-[15px] leading-relaxed placeholder:text-neutral-700 focus:outline-none focus:bg-violet-500/[0.04]"
                />
                <button
                  type="button"
                  onClick={function() { removeRow(i) }}
                  aria-label={'Clear line ' + (i + 1)}
                  className={'w-10 flex-shrink-0 text-neutral-700 hover:text-red-400 text-lg leading-none transition-opacity focus:outline-none focus:ring-2 focus:ring-violet-500 rounded ' + (row.trim() ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : 'opacity-0 pointer-events-none')}
                >
                  &times;
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
          <button
            type="button"
            onClick={addRow}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            + Add row
          </button>
          <span className="text-neutral-600 text-xs">
            {rows.length} rows &middot; {written} written
          </span>
        </div>
      </div>
    </div>
  )
}
