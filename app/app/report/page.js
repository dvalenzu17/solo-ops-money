'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function monthFromDate(d) {
  return String(d || '').slice(0, 7) || 'Unknown'
}

function money(n) {
  const v = Number(n || 0)
  return v.toFixed(2)
}

export default function ReportPage() {
  const [user, setUser] = useState(null)
  const [unlocked, setUnlocked] = useState(false)

  const [name, setName] = useState('Your Name')
  const [business, setBusiness] = useState('Your Business')
  const [month, setMonth] = useState('')

  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('soloops_rows')
    if (raw) setRows(JSON.parse(raw))
  }, [])

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => monthFromDate(r.date)))
    return Array.from(set).filter(Boolean).sort()
  }, [rows])

  useEffect(() => {
    if (!month && months.length) setMonth(months[months.length - 1])
  }, [months, month])

  useEffect(() => {
    if (!user) return
    supabase
      .from('access')
      .select('is_active')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setUnlocked(Boolean(data && data.is_active)))
  }, [user])

  const summary = useMemo(() => {
    const inMonth = rows.filter((r) => monthFromDate(r.date) === month)
    let revenue = 0
    let expenses = 0
    for (const r of inMonth) {
      if (r.amount > 0) revenue += r.amount
      if (r.amount < 0) expenses += Math.abs(r.amount)
    }
    const profit = revenue - expenses
    const margin = revenue ? (profit / revenue) * 100 : 0
    return { revenue, expenses, profit, margin, count: inMonth.length }
  }, [rows, month])

  async function downloadPDF() {
    setError(null)
    setStatus(null)

    if (!unlocked) {
      setError('Locked. Go back to Import and verify your Gumroad licence key.')
      return
    }

    if (!month || month === 'Unknown') {
      setError('Pick a month to generate a report.')
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
          <div style={{ fontWeight: 700 }}>Branding</div>
          <p className="p" style={{ marginTop: 6 }}>
            This is what shows on the PDF header.
          </p>
          <div className="grid" style={{ marginTop: 10 }}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <input className="input" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Business name" />
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 700 }}>Month</div>
          <p className="p" style={{ marginTop: 6 }}>
            Pick the month you want to summarise.
          </p>
          <select className="select" value={month} onChange={(e) => setMonth(e.target.value)} style={{ marginTop: 10 }}>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="note" style={{ marginTop: 10 }}>{summary.count} transactions found</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700 }}>Snapshot</div>
        <p className="p" style={{ marginTop: 6 }}>
          A quick reality check before you export.
        </p>

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
          <button className="btn secondary" onClick={() => router.push('/app/import')}>Back to import</button>
        </div>

        {!unlocked ? (
          <p className="note" style={{ marginTop: 12 }}>
            Locked. Verify your Gumroad licence key on the import page.
          </p>
        ) : null}

        {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
        {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
      </div>
    </main>
  )
}
