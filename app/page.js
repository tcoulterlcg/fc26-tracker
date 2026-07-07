'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState(null)
  const [franchises, setFranchises] = useState([])
  const [loading, setLoading] = useState(true)
  const [clubName, setClubName] = useState('')
  const [league, setLeague] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    await loadFranchises(user.id)
    setLoading(false)
  }

  const loadFranchises = async (userId) => {
    const { data, error } = await supabase
      .from('franchises')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error) {
      setFranchises(data)
    }
  }

  const handleCreateFranchise = async (e) => {
    e.preventDefault()

    const { error } = await supabase
      .from('franchises')
      .insert({
        user_id: user.id,
        club_name: clubName,
        league: league,
        current_season: 1
      })

    if (!error) {
      setClubName('')
      setLeague('')
      await loadFranchises(user.id)
    } else {
      alert(error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div style={{ padding: '40px' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>FC 26 Franchise Tracker</h1>
        <button onClick={handleLogout}>Log Out</button>
      </div>

      <p>Logged in as: {user.email}</p>

      <h2>Create New Franchise</h2>
      <form onSubmit={handleCreateFranchise} style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Club Name (e.g. Manchester United)"
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="League (e.g. Premier League)"
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px' }}>Create Franchise</button>
      </form>

      <h2>Your Franchises</h2>
      {franchises.length === 0 ? (
        <p>No franchises yet. Create one above to get started.</p>
      ) : (
        <ul>
  {franchises.map((f) => (
    <li key={f.id} style={{ marginBottom: '10px' }}>
      <a href={`/franchise/${f.id}`} style={{ color: 'blue', textDecoration: 'underline' }}>
        <strong>{f.club_name}</strong> — {f.league} (Season {f.current_season})
      </a>
    </li>
  ))}
</ul>
      )}
    </div>
  )
}