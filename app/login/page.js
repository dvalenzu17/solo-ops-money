'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  async function sendMagicLink() {
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` }
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Log in</h1>
      <p style={{ opacity: 0.8, marginTop: 10 }}>Magic link. No passwords. Less drama.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          style={{ padding: 12, borderRadius: 12, border: '1px solid #ddd', fontSize: 16 }}
        />
        <button
          onClick={sendMagicLink}
          style={{ padding: 12, borderRadius: 12, border: '1px solid #ddd', fontSize: 16, cursor: 'pointer' }}
        >
          Send magic link
        </button>
        <button
          onClick={signOut}
          style={{ padding: 12, borderRadius: 12, border: '1px solid #ddd', fontSize: 16, cursor: 'pointer', opacity: 0.85 }}
        >
          Sign out
        </button>
      </div>

      {sent ? <p style={{ marginTop: 14 }}>Check your email for the link.</p> : null}
      {error ? <p style={{ marginTop: 14, color: '#b00020' }}>{error}</p> : null}
    </main>
  )
}
