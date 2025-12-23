'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function money(n) {
  const v = Number(n || 0)
  return v.toFixed(2)
}

export default function ReportPage() {
  const [user, setUser] = useState(null)
  const [unlocked, setUnlocked] = useState(false)

  const [name, setName] = useState('Your Name')
  const [business, setBusiness] = useState('Your Business')

  const [months, setMonths] = useState([])
  const [month, setMonth] = useState('')
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, profit: 0, margin: 0, count: 0 })

  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('access')
      .select('is_active')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setUnlocked(Boolean(data && data.is_active)))
  }, [user])

  async function loadMonths() {
    setError(null)
    const res = await fetch('/api/transactions/summary')
    const out = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(out.error || 'Failed to load your history.')
      return
    }
    const list = out.months || []
    setMonths(list)
    if (!month && list.length) setMonth(list[list.length - 1].month)
  }

  async function loadMonthSummary(m) {
    if (!m) return
    setError(null)
    const res = await fetch(`/api/transactions/summary?month=${encodeURIComponent(m)}`)
    const out = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(out.error || 'Failed to load month summary.')
      return
    }
    setSummary({
      revenue: out.revenue || 0,
      expenses: out.expenses || 0,
      profit: out.profit || 0,
      margin: out.margin || 0,
      count: out.count || 0
    })
  }

  useEffect(() => {
    if (!user) return
    loadMonths()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!month) return
    loadMonthSummary(month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const monthOptions = useMemo(() => months.map(m => m.month), [months])

  async function downloadPDF() {
    setError(null)
    setStatus(null)

    if (!unlocked) {
      setError('Locked. Verify your Gumroad licence key on Import first.')
      return
    }
    if (!month) {
      setError('Pick a month.')
      return
    }

    const res = await fetch('/api/report/pdf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        business,
        month,
        revenue: summary.revenue,
        expenses: summary.expenses,
        profit: summary.profit,
        margin: summary.margin
      })
    })

    if (!res.ok) {
      const out = await res.json().catch(() => ({}))
      setError(out.error || 'Failed to generate PDF.')
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Monthly-Report-${month}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    setStatus('Downloaded. Send it with confidence.')
  }

  if (!user) {
    return (
      <main className="container">
        <div className="card">
          <div className="h1" style={{ fontSize: 22 }}>Log in first</div>
          <p className="p">We’ll email you a sign-in link. No passwords to remember.</p>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => router.push('/login')}>Go to login</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <div className="logo">M</div>
          <div>
            <div className="h1">Monthly report</div>
            <div className="p">Client-polished, one page, zero waffle.</div>
          </div>
        </div>
        <span className="badge">{unlocked ? 'Unlocked' : 'Locked'}</span>
      </div>

      <div className="grid2">
        <div className="card">
          <div style={{ fontWeight: 900 }}>Branding</div>
          <p className="p" style={{ marginTop: 6 }}>This shows on the PDF header.</p>
          <div className="grid" style={{ marginTop: 10 }}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <input className="input" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Business name" />
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 900 }}>Month</div>
          <p className="p" style={{ marginTop: 6 }}>Pick the month to summarise.</p>

          <select className="select" value={month} onChange={(e) => setMonth(e.target.value)} style={{ marginTop: 10 }}>
            {monthOptions.length ? monthOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            )) : <option value="">No data yet</option>}
          </select>

          <div className="note" style={{ marginTop: 10 }}>{summary.count} transactions</div>

          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn secondary" onClick={() => router.push('/app/import')}>Import more</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Snapshot</div>
        <p className="p" style={{ marginTop: 6 }}>Quick reality check before export.</p>

        <hr className="sep" />

        <div className="kpis">
          <div className="kpi">
            <div className="label">Revenue</div>
            <div className="value">{money(summary.revenue)}</div>
          </div>
          <div className="kpi">
            <div className="label">Expenses</div>
            <div className="value">{money(summary.expenses)}</div>
          </div>
          <div className="kpi">
            <div className="label">Profit</div>
            <div className="value">{money(summary.profit)}</div>
          </div>
          <div className="kpi">
            <div className="label">Margin</div>
            <div className="value">{Number(summary.margin || 0).toFixed(1)}%</div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={downloadPDF}>Download PDF</button>
          <a className="btn secondary" href="/pricing">Pricing</a>
          <a className="btn secondary" href="/help">Help</a>
        </div>

        {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
        {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
      </div>
    </main>
  )
}
