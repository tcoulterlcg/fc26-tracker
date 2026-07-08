'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import React from 'react'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState(null)
  const [franchises, setFranchises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [clubName, setClubName] = useState('')
  const [league, setLeague] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const result = await supabase.auth.getUser()
    const user = result.data.user
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    await loadFranchises(user.id)
    setLoading(false)
  }

  const loadFranchises = async (userId) => {
    const result = await supabase
      .from('franchises')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (!result.error) {
      setFranchises(result.data)
    }
  }

  const resetCreatePanel = () => {
    setShowCreatePanel(false)
    setClubName('')
    setLeague('')
  }

  const handleCreateFranchise = async () => {
    const result = await supabase
      .from('franchises')
      .insert({
        user_id: user.id,
        club_name: clubName,
        league: league,
        current_season: 1
      })
    if (!result.error) {
      resetCreatePanel()
      await loadFranchises(user.id)
    } else {
      alert(result.error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return React.createElement('div', { className: 'min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400' }, 'Loading...')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FC 26 Franchise Tracker</h1>
            <p className="text-neutral-400 mt-1 text-sm">Logged in as {user.email}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreatePanel(!showCreatePanel)} className="bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap">
              {showCreatePanel ? 'Cancel' : '+ New Franchise'}
            </button>
            <button onClick={handleLogout} className="border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-900 transition-colors rounded-lg px-4 py-2 text-sm font-medium text-neutral-300">
              Log Out
            </button>
          </div>
        </div>

        {showCreatePanel ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-8">
            <h2 className="text-sm font-semibold mb-4 text-neutral-200">New Franchise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Club Name</label>
                <input type="text" placeholder="e.g. Arsenal" value={clubName} onChange={(e) => setClubName(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">League</label>
                <input type="text" placeholder="e.g. Premier League" value={league} onChange={(e) => setLeague(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={resetCreatePanel} className="text-neutral-400 hover:text-neutral-200 text-sm px-3 py-2">Cancel</button>
              <button onClick={handleCreateFranchise} disabled={!clubName} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-4 py-2 text-sm font-semibold">Create Franchise</button>
            </div>
          </div>
        ) : null}

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Your Franchises</h2>
          {franchises.length === 0 ? (
            <p className="text-neutral-500 text-sm">No franchises yet. Click "+ New Franchise" above to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {franchises.map(function(f) {
                var franchiseUrl = "/franchise/" + f.id
                return (
                  <a key={f.id} href={franchiseUrl} className="block bg-neutral-800/50 border border-neutral-800 hover:border-emerald-600 rounded-lg p-4 transition-colors">
                    <h3 className="font-semibold text-neutral-100">{f.club_name}</h3>
                    <p className="text-neutral-400 text-sm mt-1">{f.league ? f.league : 'No league set'}</p>
                    <p className="text-emerald-400 text-xs mt-2 font-medium">Season {f.current_season}</p>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}