'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ImportPage() {
  const [game, setGame] = useState('EA FC 26')
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState([])
  const [status, setStatus] = useState('')
  const [importing, setImporting] = useState(false)

  const supabase = createClient()

  const cleanNumber = (val) => {
    if (!val) return null
    const cleaned = val.replace(/[€,$]/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  const cleanInt = (val) => {
    if (!val) return null
    const num = parseInt(String(val).replace(/[^0-9-]/g, ''))
    return isNaN(num) ? null : num
  }

  const parseFcData = (text) => {
    const lines = text.trim().split('\n')
    const rows = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line || !line.trim()) continue

      const parts = line.split('\t').map((p) => p.trim())

      if (i === 0 && parts[0].toLowerCase() === 'name') {
        continue
      }

      if (parts.length < 2 || !parts[0]) continue

      rows.push({
        name: parts[0] || '',
        position: parts[1] || '',
        age: cleanInt(parts[2]),
        overall_rating: cleanInt(parts[3]),
        potential_rating: cleanInt(parts[4]),
        nationality: parts[5] || '',
        active_club: parts[6] || '',
        status: parts[7] || '',
        owned_by: parts[8] || '',
        squad_number: cleanInt(parts[9]),
        contract: parts[10] || '',
        value_eur: cleanNumber(parts[11]),
        wage_eur_wk: cleanNumber(parts[12]),
        gro: cleanInt(parts[13]),
        skill_moves: cleanInt(parts[14]),
        weak_foot: cleanInt(parts[15]),
        work_rate: parts[16] || '',
        height_cm: cleanInt(parts[17]),
        weight_kg: cleanInt(parts[18]),
        build: parts[19] || '',
        igs: cleanInt(parts[20]),
        real_club: parts[6] || ''
      })
    }

    return rows
  }

  const parseCfbData = (text) => {
    const lines = text.trim().split('\n')
    const rows = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line || !line.trim()) continue

      const parts = line.split('\t').map((p) => p.trim())

      if (i === 0 && parts[0].toLowerCase() === 'team') {
        continue
      }

      if (parts.length < 2 || !parts[1]) continue

      rows.push({
        team: parts[0] || '',
        player_name: parts[1] || '',
        position: parts[2] || '',
        jersey_number: cleanInt(parts[3]),
        height: parts[4] || '',
        weight: cleanInt(parts[5]),
        class: parts[6] || '',
        archetype: parts[7] || '',
        overall_rating: cleanInt(parts[8]),
        dev_trait: parts[9] || '',
        speed: cleanInt(parts[10]),
        strength: cleanInt(parts[11]),
        agility: cleanInt(parts[12]),
        acceleration: cleanInt(parts[13]),
        change_of_direction: cleanInt(parts[14]),
        injury: cleanInt(parts[15]),
        stamina: cleanInt(parts[16]),
        awareness: cleanInt(parts[17])
      })
    }

    return rows
  }

  const handlePreview = () => {
    const rows = game === 'EA CFB 27' ? parseCfbData(csvText) : parseFcData(csvText)
    setPreview(rows)
    setStatus('')
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setImporting(true)
    setStatus('')

    const tableName = game === 'EA CFB 27' ? 'cfb_player_reference' : 'player_reference'

    let existingResult
    if (game === 'EA CFB 27') {
      const teams = Array.from(new Set(preview.map(function(p) { return p.team })))
      existingResult = await supabase.from(tableName).select('team, player_name').in('team', teams)
    } else {
      const clubs = Array.from(new Set(preview.map(function(p) { return p.active_club })))
      existingResult = await supabase.from(tableName).select('active_club, name').in('active_club', clubs)
    }

    const existingSet = new Set()
    if (!existingResult.error && existingResult.data) {
      existingResult.data.forEach(function(row) {
        if (game === 'EA CFB 27') {
          existingSet.add(row.team + '||' + row.player_name)
        } else {
          existingSet.add(row.active_club + '||' + row.name)
        }
      })
    }

    const newRows = preview.filter(function(p) {
      const key = game === 'EA CFB 27' ? (p.team + '||' + p.player_name) : (p.active_club + '||' + p.name)
      return !existingSet.has(key)
    })

    const skippedCount = preview.length - newRows.length

    if (newRows.length === 0) {
      setImporting(false)
      setStatus('All ' + preview.length + ' players already exist in the database. Nothing new to import.')
      return
    }

    const result = await supabase.from(tableName).insert(newRows)

    setImporting(false)

    if (result.error) {
      setStatus('Error: ' + result.error.message)
    } else {
      let message = 'Successfully imported ' + newRows.length + ' new player' + (newRows.length !== 1 ? 's' : '') + '.'
      if (skippedCount > 0) {
        message += ' Skipped ' + skippedCount + ' duplicate' + (skippedCount !== 1 ? 's' : '') + ' already in the database.'
      }
      setStatus(message)
      setCsvText('')
      setPreview([])
    }
  }

  const handleGameChange = (newGame) => {
    setGame(newGame)
    setCsvText('')
    setPreview([])
    setStatus('')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-12">

        <a href="/" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
          &larr; Back to Franchises
        </a>

        <div className="mt-6 mb-8">
          <h1 className="text-4xl font-bold uppercase tracking-tight leading-none">Import Players</h1>
          <p className="text-neutral-400 text-sm mt-3 max-w-2xl">
            Bulk-add players to your shared player database (used for search/autocomplete). Duplicate team+name combinations are automatically skipped.
          </p>
        </div>

        <div className="flex gap-2 mb-8">
          <button
            type="button"
            onClick={() => handleGameChange('EA FC 26')}
            className={
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ' +
              (game === 'EA FC 26'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200')
            }
          >
            EA FC 26
          </button>
          <button
            type="button"
            onClick={() => handleGameChange('EA CFB 27')}
            className={
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ' +
              (game === 'EA CFB 27'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200')
            }
          >
            EA CFB 27
          </button>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
          <h2 className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Expected Columns (in order)</h2>
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-lg px-4 py-3 text-xs font-mono text-neutral-300 leading-relaxed">
            {game === 'EA CFB 27'
              ? 'Team | Player | Pos | No. | Height | Weight | Class | Archetype | OVR | Dev Trait | Speed | Strength | Agility | Acceleration | Change of Direction | Injury | Stamina | Awareness'
              : 'Name | Position | Age | Overall_Rating | Potential_Rating | Nationality | Active Club | Status | Owned By | Squad# | Contract | Value | Wage | GRO | SM | WF | WR | Height | Weight | Build | IGS'
            }
          </div>
          <p className="text-neutral-500 text-xs mt-3 leading-relaxed">
            Include the header row if you like — it's detected and skipped automatically. Copying directly from a spreadsheet preserves tabs between columns, which this importer expects.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
          <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">Paste Spreadsheet Data</label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={10}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-100 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            onClick={handlePreview}
            disabled={!csvText.trim()}
            className="mt-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Preview
          </button>
        </div>

        {preview.length > 0 && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 mb-6">
            <h2 className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-4">
              Preview ({preview.length} players)
            </h2>
            <div className="overflow-x-auto -mx-3">
              {game === 'EA CFB 27' ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-neutral-400 text-[11px] uppercase tracking-wide border-b border-neutral-800">
                      <th className="text-left py-2 px-3">Team</th>
                      <th className="text-left py-2 px-3">Player</th>
                      <th className="text-left py-2 px-3">Pos</th>
                      <th className="text-left py-2 px-3">Class</th>
                      <th className="text-left py-2 px-3">Archetype</th>
                      <th className="text-left py-2 px-3">OVR</th>
                      <th className="text-left py-2 px-3">Dev Trait</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, idx) => (
                      <tr key={idx} className="border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2 px-3 text-neutral-300">{p.team}</td>
                        <td className="py-2 px-3 font-medium">{p.player_name}</td>
                        <td className="py-2 px-3 text-neutral-300">{p.position}</td>
                        <td className="py-2 px-3 text-neutral-300">{p.class}</td>
                        <td className="py-2 px-3 text-neutral-300">{p.archetype}</td>
                        <td className="py-2 px-3 text-emerald-400 font-semibold">{p.overall_rating}</td>
                        <td className="py-2 px-3 text-neutral-300">{p.dev_trait}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-neutral-400 text-[11px] uppercase tracking-wide border-b border-neutral-800">
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Pos</th>
                      <th className="text-left py-2 px-3">Age</th>
                      <th className="text-left py-2 px-3">OVR</th>
                      <th className="text-left py-2 px-3">POT</th>
                      <th className="text-left py-2 px-3">Nation</th>
                      <th className="text-left py-2 px-3">Club</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, idx) => (
                      <tr key={idx} className="border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2 px-3 font-medium">{p.name}</td>
                        <td className="py-2 px-3 text-neutral-300">{p.position}</td>
                        <td className="py-2 px-3 text-neutral-300">{p.age}</td>
                        <td className="py-2 px-3 text-emerald-400 font-semibold">{p.overall_rating}</td>
                        <td className="py-2 px-3 text-neutral-400">{p.potential_rating}</td>
                        <td className="py-2 px-3 text-neutral-300">{p.nationality}</td>
                        <td className="py-2 px-3 text-neutral-300">{p.active_club}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {importing ? 'Importing...' : 'Import ' + preview.length + ' Players'}
            </button>
          </div>
        )}

        {status && (
          <div
            className={
              'rounded-xl border px-4 py-3 ' +
              (status.startsWith('Error')
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-emerald-500/30 bg-emerald-500/5')
            }
          >
            <p className={status.startsWith('Error') ? 'text-red-400 text-sm font-medium' : 'text-emerald-400 text-sm font-medium'}>
              {status}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}