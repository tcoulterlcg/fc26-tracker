'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const CURATED_TESTIMONIALS = [
  { name: 'Trevor C.', message: 'Built this from scratch to track my FC 26 and CFB 27 saves in one place. It has become my go-to during every session.' }
]

export default function TestimonialsPage() {
  const [user, setUser] = useState(null)
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false })

    if (!error) {
      setTestimonials(data)
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!user) {
      router.push('/login')
      return
    }
    if (!message.trim()) return

    setSubmitting(true)
    const { error } = await supabase.from('testimonials').insert({
      user_id: user.id,
      name: name.trim() || user.email,
      message: message.trim()
    })

    setSubmitting(false)

    if (!error) {
      setSubmitStatus('Thanks! Your testimonial has been submitted for review.')
      setMessage('')
      setName('')
    } else {
      setSubmitStatus('Something went wrong: ' + error.message)
    }
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
      <div className="max-w-3xl mx-auto px-6 py-10">
        <a href="/" className="text-violet-400 hover:text-violet-300 text-sm font-medium">
          &larr; Back to Franchises
        </a>

        <h1 className="text-3xl font-bold tracking-tight mt-4 mb-1">Testimonials</h1>
        <p className="text-neutral-400 text-sm mb-8">What people are saying about Roster HQ.</p>

        <div className="space-y-4 mb-10">
          {CURATED_TESTIMONIALS.map(function(t, idx) {
            return (
              <div key={'curated-' + idx} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <p className="text-neutral-200 text-sm mb-2">&ldquo;{t.message}&rdquo;</p>
                <p className="text-violet-400 text-xs font-medium">{t.name}</p>
              </div>
            )
          })}

          {testimonials.map(function(t) {
            return (
              <div key={t.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <p className="text-neutral-200 text-sm mb-2">&ldquo;{t.message}&rdquo;</p>
                <p className="text-violet-400 text-xs font-medium">{t.name}</p>
              </div>
            )
          })}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-neutral-200 mb-4">Share your experience</h2>

          {!user ? (
            <p className="text-neutral-500 text-sm">
              <a href="/login" className="text-violet-400 hover:text-violet-300 font-medium">Log in</a> to submit a testimonial.
            </p>
          ) : (
            <>
              <div className="mb-3">
                <label className="block text-xs font-medium text-neutral-400 mb-1">Your name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={user.email}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-400 mb-1">Your testimonial</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="What do you like about Roster HQ?"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit Testimonial'}
              </button>
              {submitStatus && (
                <p className="text-violet-400 text-xs mt-3">{submitStatus}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}