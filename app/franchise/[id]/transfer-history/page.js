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

        <h1 className="text-3xl font-bold tracking-tight mt-4 mb-1">Transfer History</h1>
        <p className="text-neutral-400 text-sm mb-6">Log every transfer in or out. Season {franchise.current_season}.</p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Player Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Transfer Type</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="In">Transfer In</option>
                <option value="Out">Transfer Out</option>
                <option value="Loan In">Loan In</option>
                <option value="Loan Out">Loan Out</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">From Club</label>
              <input
                type="text"
                value={fromClub}
                onChange={(e) => setFromClub(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">To Club</label>
              <input
                type="text"
                value={toClub}
                onChange={(e) => setToClub(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Fee (&euro;)</label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <button
            onClick={handleAddTransfer}
            disabled={saving || !playerName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {saving ? 'Saving...' : 'Add Transfer'}
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-neutral-200 mb-4">History ({transfers.length})</h2>
          {transfers.length === 0 ? (
            <p className="text-neutral-500 text-sm">No transfers logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-xs uppercase tracking-wide border-b border-neutral-800">
                    <th className="text-left py-2 px-3">Season</th>
                    <th className="text-left py-2 px-3">Player</th>
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-left py-2 px-3">From</th>
                    <th className="text-left py-2 px-3">To</th>
                    <th className="text-left py-2 px-3">Fee</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(function(t) {
                    return (
                      <tr key={t.id} className="border-b border-neutral-800/60">
                        <td className="py-2 px-3">Season {t.season}</td>
                        <td className="py-2 px-3 font-medium">{t.player_name}</td>
                        <td className="py-2 px-3 text-neutral-300">{t.transfer_type}</td>
                        <td className="py-2 px-3 text-neutral-300">{t.from_club || '-'}</td>
                        <td className="py-2 px-3 text-neutral-300">{t.to_club || '-'}</td>
                        <td className="py-2 px-3 text-neutral-300">{formatEuro(t.fee_eur)}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => handleRemove(t.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Remove</button>
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
