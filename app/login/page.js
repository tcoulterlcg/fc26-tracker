'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isSignUp) {
      const result = await supabase.auth.signUp({ email, password })
      if (result.error) {
        setError(result.error.message)
      } else {
        router.push('/')
      }
    } else {
      const result = await supabase.auth.signInWithPassword({ email, password })
      if (result.error) {
        setError(result.error.message)
      } else {
        router.push('/')
      }
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">FC 26 Franchise Tracker</h1>
          <p className="text-neutral-400 mt-2 text-sm">
            {isSignUp ? 'Create an account to get started' : 'Log in to your franchises'}
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            {error ? (
              <p className="text-red-400 text-sm">{error}</p>
            ) : null}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-lg px-4 py-2.5 text-sm font-semibold"
            >
              {isSignUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-center mt-4 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>

      </div>
    </div>
  )
}