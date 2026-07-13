'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function RosterHQLogo({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="violetGradLogin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="256" r="248" fill="url(#violetGradLogin)" />
      <rect x="150" y="214" width="94" height="30" rx="15" fill="#ddd6fe" />
      <rect x="150" y="272" width="58" height="30" rx="15" fill="#ddd6fe" opacity="0.6" />
      <text x="326" y="268" dominantBaseline="central" textAnchor="middle"
        fontFamily="'Arial Black', Impact, sans-serif" fontWeight="900" fontStyle="italic" fontSize="296"
        fill="#ffffff">R</text>
    </svg>
  )
}

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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-5">
          <RosterHQLogo size={90} />
        </div>

        <div className="text-center mb-8">
          <h1 className="inline-block text-3xl font-bold uppercase tracking-[0.18em] text-neutral-100">
            ROSTER<span className="text-violet-400">HQ</span>
          </h1>
          <p className="text-violet-500/90 text-[10px] font-semibold uppercase tracking-[0.22em] mt-2">Franchise Tracker</p>
          <p className="text-neutral-400 mt-2 text-sm">
            {isSignUp ? 'Create an account to get started' : 'Log in to your franchises'}
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-neutral-500 text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                required
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold uppercase tracking-[0.14em] transition-colors rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
            >
              {isSignUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-sm text-violet-400 hover:text-violet-300 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}