'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const router = useRouter()

  async function sendLink(e) {
    e.preventDefault()
    setErr('')
    setMsg('')
    const v = email.trim()
    if (!v) return

    setLoading(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.signInWithOtp({
        email: v,
        options: {
          emailRedirectTo: `${origin}/app`
        }
      })
      if (error) throw error
      setMsg('Check your email for the sign-in link.')
    } catch (e2) {
      setErr(e2?.message || 'Could not send the email link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <div className="logo">M</div>
          <div>
            <div className="h1">Log in</div>
            <div className="p">We’ll email you a sign-in link. No passwords.</div>
          </div>
        </div>
        <button className="btn secondary" onClick={() => router.push('/')}>Back</button>
      </div>

      <div className="card">
        <form onSubmit={sendLink} className="grid">
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            inputMode="email"
            autoComplete="email"
          />
          <button className="btn" disabled={loading}>
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
        {err ? <p className="error" style={{ marginTop: 12 }}>{err}</p> : null}

        <p className="note" style={{ marginTop: 12 }}>
          If it doesn’t arrive, check spam/promotions. Some inboxes are dramatic.
        </p>
      </div>
    </main>
  )
}
