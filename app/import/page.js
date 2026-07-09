'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ImportPage() {
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState([])
  const [status, setStatus] = useState('')
  const [importing, setImporting] = useState(false)

  const supabase = createClient()

  const cleanNumber = (val) => {
    if (!val) return null
    const cleaned = val.replace(/[€,]/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  const cleanInt = (val) => {
    if (!val) return null
    const num = parseInt(val.replace(/[^0-9-]/g, ''))
    return isNaN(num) ? null : num
  }

  const parseData = (text) => {
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

  const handlePreview = () => {
    const rows = parseData(csvText)
    setPreview(rows)
    setStatus('')
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setImporting(true)
    setStatus('')

    const result = await supabase.from('player_reference').insert(preview)

    setImporting(false)

    if (result.error) {
      setStatus('Error: ' + result.error.message)
    } else {
      setStatus('Successfully imported ' + preview.length + ' players.')
      setCsvText('')
      setPreview([])
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-10">

        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          &larr; Back to Franchises
        </a>

        <h1 className="text-3xl font-bold tracking-tight mt-4 mb-2">Import Players</h1>
        <p className="text-neutral-400 text-sm mb-8">
          Paste rows copied directly from your spreadsheet (Excel/Google Sheets). Select the cells, copy (Ctrl+C), then paste below.
        </p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-3 text-neutral-200">Expected Columns (in order)</h2>
          <div className="bg-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-300 leading-relaxed">
            Name | Position | Age | Overall_Rating | Potential_Rating | Nationality | Active Club | Status | Owned By | Squad# | Contract | Value | Wage | GRO | SM | WF | WR | Height | Weight | Build | IGS
          </div>
          <p className="text-neutral-500 text-xs mt-2">
            Include the header row if you like — it's detected and skipped automatically. Copying directly from a spreadsheet preserves tabs between columns, which this importer expects.
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
          <label className="block text-xs font-medium text-neutral-400 mb-2">Paste Spreadsheet Data</label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={10}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            onClick={handlePreview}
            disabled={!csvText.trim()}
            className="mt-3 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Preview
          </button>
        </div>

        {preview.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold mb-4 text-neutral-200">
              Preview ({preview.length} players)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-xs uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Pos</th>
                    <th className="text-left py-2 px-3">Age</th>
                    <th className="text-left py-2 px-3">OVR</th>
                    <th className="text-left py-2 px-3">POT</th>
                    <th className="text-left py-2 px-3">Nation</th>
                    <th className="text-left py-2 px-3">Club</th>
                    <th className="text-left py-2 px-3">Contract</th>
                    <th className="text-left py-2 px-3">Wage</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, idx) => (
                    <tr key={idx} className="border-b border-neutral-800/60">
                      <td className="py-2 px-3 font-medium">{p.name}</td>
                      <td className="py-2 px-3 text-neutral-300">{p.position}</td>
                      <td className="py-2 px-3 text-neutral-300">{p.age}</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">{p.overall_rating}</td>
                      <td className="py-2 px-3 text-neutral-400">{p.potential_rating}</td>
                      <td className="py-2 px-3 text-neutral-300">{p.nationality}</td>
                      <td className="py-2 px-3 text-neutral-300">{p.active_club}</td>
                      <td className="py-2 px-3 text-neutral-300">{p.contract}</td>
                      <td className="py-2 px-3 text-neutral-300">{p.wage_eur_wk ? '€' + p.wage_eur_wk : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors rounded-lg px-4 py-2.5 text-sm font-semibold"
            >
              {importing ? 'Importing...' : 'Import ' + preview.length + ' Players'}
            </button>
          </div>
        )}

        {status && (
          <p className={status.startsWith('Error') ? 'text-red-400 text-sm' : 'text-emerald-400 text-sm'}>
            {status}
          </p>
        )}

      </div>
    </div>
  )
}