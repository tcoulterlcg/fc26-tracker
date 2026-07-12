'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function TransferHistoryPage() {
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [transfers, setTransfers] = useState([])

  const [playerName, setPlayerName] = useState('')
  const [transferType, setTransferType] = useState('In')
  const [fromClub, setFromClub] = useState('')
  const [toClub, setToClub] = useState('')
  const [fee, setFee] = useState('')
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const franchiseId = params.id

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

    if (franchiseData.game === 'EA CFB 27') {
      router.push('/franchise/' + franchiseId)
      return
    }

    setFranchise(franchiseData)
    await loadTransfers()
    setLoading(false)
  }

  const loadTransfers = async () => {
    const { data, error } = await supabase
      .from('transfer_history')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('season', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error) setTransfers(data)
  }

  const handleAddTransfer = async () => {
    if (!playerName.trim()) return
    setSaving(true)

    const payload = {
      franchise_id: franchiseId,
      season: franchise.current_season,
      player_name: playerName.trim(),
      transfer_type: transferType,
      from_club: fromClub.trim() || null,
      to_club: toClub.trim() || null,
      fee_eur: fee ? parseFloat(fee) : null
    }

    const { error } = await supabase.from('transfer_history').insert(payload)

    setSaving(false)
    if (!error) {
      setPlayerName('')
      setFromClub('')
      setToClub('')
      setFee('')
      await loadTransfers()
    } else {
      alert(error.message)
    }
  }

  const handleRemove = async (id) => {
    const { error } = await supabase.from('transfer_history').delete().eq('id', id)
    if (!error) await loadTransfers()
  }

  const formatEuro = (num) => {
    if (num === null || num === undefined) return '-'
    if (num >= 1000000) return '\u20ac' + (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return '\u20ac' + (num / 1000).toFixed(0) + 'K'
    return '\u20ac' + num.toFixed(0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-neutral-800 border-t-emerald-500 animate-spin" />
          <span className="text-neutral-500 text-sm uppercase tracking-[0.14em] font-semibold">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <a href={'/franchise/' + franchiseId} className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded">
          &larr; Back to {franchise.club_name}
        </a>

        <header className="mt-5 mb-8">
          <h1 className="text-4xl font-bold uppercase tracking-wide leading-none">Transfer History</h1>
          <p className="text-neutral-400 text-sm mt-2">Log every transfer in or out. Season {franchise.current_season}.</p>
        </header>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 md:p-7 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Player Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Transfer Type</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="In">Transfer In</option>
                <option value="Out">Transfer Out</option>
                <option value="Loan In">Loan In</option>
                <option value="Loan Out">Loan Out</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">From Club</label>
              <input
                type="text"
                value={fromClub}
                onChange={(e) => setFromClub(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">To Club</label>
              <input
                type="text"
                value={toClub}
                onChange={(e) => setToClub(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Fee (&euro;)</label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleAddTransfer}
            disabled={saving || !playerName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors rounded-lg px-5 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
          >
            {saving ? 'Saving...' : 'Add Transfer'}
          </button>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 md:p-7">
          <h2 className="text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-4">History ({transfers.length})</h2>
          {transfers.length === 0 ? (
            <div className="border border-dashed border-neutral-800 rounded-lg py-12 text-center">
              <p className="text-neutral-500 text-sm">No transfers logged yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-[11px] uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left font-semibold py-2.5 px-3">Season</th>
                    <th className="text-left font-semibold py-2.5 px-3">Player</th>
                    <th className="text-left font-semibold py-2.5 px-3">Type</th>
                    <th className="text-left font-semibold py-2.5 px-3">From</th>
                    <th className="text-left font-semibold py-2.5 px-3">To</th>
                    <th className="text-right font-semibold py-2.5 px-3">Fee</th>
                    <th className="py-2.5 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(function(t) {
                    return (
                      <tr key={t.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-neutral-400 whitespace-nowrap">Season {t.season}</td>
                        <td className="py-2.5 px-3 font-medium text-neutral-100">{t.player_name}</td>
                        <td className="py-2.5 px-3">
                          <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ' + (t.transfer_type.includes('In') ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400')}>
                            {t.transfer_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-neutral-300">{t.from_club || '-'}</td>
                        <td className="py-2.5 px-3 text-neutral-300">{t.to_club || '-'}</td>
                        <td className="py-2.5 px-3 text-right text-neutral-100 font-medium tabular-nums whitespace-nowrap">{formatEuro(t.fee_eur)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button onClick={() => handleRemove(t.id)} className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded">Remove</button>
                        </td>
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
