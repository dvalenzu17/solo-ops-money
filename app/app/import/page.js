'use client'

import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && String(obj[k]).trim() !== '') return obj[k]
  }
  return ''
}

function cleanNumber(v) {
  const s = String(v ?? '').trim()
  if (!s) return 0
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  let normalised = s.replace(/[^0-9.,-]/g, '')
  if (hasComma && hasDot) normalised = normalised.replace(/\./g, '').replace(',', '.')
  else if (hasComma && !hasDot) normalised = normalised.replace(',', '.')
  const n = Number(normalised)
  return Number.isFinite(n) ? n : 0
}

function normaliseDate(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    let dd = Number(m[1])
    let mm = Number(m[2])
    let yy = Number(m[3])
    if (yy < 100) yy += 2000
    const pad = (n) => String(n).padStart(2, '0')
    return `${yy}-${pad(mm)}-${pad(dd)}`
  }
  return s
}

function detectDelimiter(text) {
  const head = (text || '').slice(0, 4000)
  const tabCount = (head.match(/\t/g) || []).length
  const commaCount = (head.match(/,/g) || []).length
  const semiCount = (head.match(/;/g) || []).length
  if (tabCount >= commaCount && tabCount >= semiCount) return '\t'
  if (semiCount > commaCount) return ';'
  return ','
}

function inferAmount(row) {
  const debitRaw = pick(row, ['Débito', 'Debito', 'DEBITO', 'Cargo', 'CARGO'])
  const creditRaw = pick(row, ['Crédito', 'Credito', 'CREDITO', 'Abono', 'ABONO'])
  const debit = cleanNumber(debitRaw)
  const credit = cleanNumber(creditRaw)
  if (credit && !debit) return credit
  if (debit && !credit) return -debit
  if (credit || debit) return credit - debit
  const amountRaw = pick(row, ['Monto', 'MONTO', 'Amount', 'AMOUNT', 'Importe', 'IMPORTE', 'Total', 'TOTAL'])
  if (String(amountRaw || '').trim() !== '') return cleanNumber(amountRaw)
  return 0
}

function normaliseRow(r) {
  const date = normaliseDate(pick(r, ['Fecha', 'FECHA', 'Date', 'DATE']))
  const description = String(pick(r, ['Descripción', 'Descripcion', 'DESCRIPCION', 'Transacción', 'Transaccion', 'TRANSACCION', 'Detalle', 'DETALLE'])).trim()
  const amount = inferAmount(r)
  return { date, description, amount }
}

function parseAny(text) {
  const delimiter = detectDelimiter(text)
  const parsed = Papa.parse(text, {
    header: true,
    delimiter,
    dynamicTyping: false,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => String(h || '').trim()
  })
  const rows = Array.isArray(parsed.data) ? parsed.data : []
  return rows.map(normaliseRow).filter((r) => r.date && r.description)
}

export default function ImportPage() {
  const [user, setUser] = useState(null)
  const [licence, setLicence] = useState('')
  const [unlocked, setUnlocked] = useState(false)

  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)

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

  const monthly = useMemo(() => {
    const buckets = new Map()
    for (const r of rows) {
      const m = (r.date || '').slice(0, 7) || 'Unknown'
      const income = r.amount > 0 ? r.amount : 0
      const expense = r.amount < 0 ? Math.abs(r.amount) : 0
      const prev = buckets.get(m) || { month: m, revenue: 0, expenses: 0 }
      prev.revenue += income
      prev.expenses += expense
      buckets.set(m, prev)
    }
    return Array.from(buckets.values()).sort((a, b) => (a.month > b.month ? 1 : -1))
  }, [rows])

  async function verifyLicence() {
    setError(null)
    setStatus(null)
    if (!licence.trim()) return

    const res = await fetch('/api/gumroad/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ licence_key: licence.trim() })
    })

    const out = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(out.error || 'Could not verify that key.')
      return
    }

    setStatus('Unlocked — you’re good to go.')
    setUnlocked(true)
  }

  async function onFile(e) {
    setError(null)
    setStatus(null)

    const f = e.target.files && e.target.files[0]
    if (!f) return

    setFileName(f.name)
    const text = await f.text()
    const parsed = parseAny(text)

    if (!parsed.length) {
      setRows([])
      setError('No usable rows found. Export as CSV/TSV from Excel and try again.')
      return
    }

    const nonZero = parsed.filter((r) => r.amount !== 0)
    if (!nonZero.length) {
      setRows(parsed)
      setError('Imported rows but amounts look zero. This export may use different debit/credit columns.')
      return
    }

    setRows(parsed)
    setStatus(`Imported ${parsed.length} transactions. Next: save to your account.`)
  }

  async function loadSample() {
    setError(null)
    setStatus(null)
    const res = await fetch('/sample-banco-general.tsv')
    const text = await res.text()
    const parsed = parseAny(text)
    setFileName('sample-banco-general.tsv')
    setRows(parsed)
    setStatus(`Loaded sample file (${parsed.length} transactions).`)
  }

  async function saveToSupabase() {
    setError(null)
    setStatus(null)
    if (!unlocked) {
      setError('Locked. Verify your Gumroad licence key first.')
      return
    }
    if (!rows.length) return

    setSaving(true)
    const res = await fetch('/api/transactions/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'Banco General (Excel export)',
        file_name: fileName || null,
        rows
      })
    })
    const out = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(out.error || 'Failed to save.')
      return
    }

    setStatus(`Saved ${out.inserted} transactions. Your history is now stored.`)
    router.push('/app/report')
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
            <div className="h1">Import transactions</div>
            <div className="p">Upload a CSV/TSV/Excel export. Banco General is supported.</div>
          </div>
        </div>
        <span className="badge">{unlocked ? 'Unlocked' : 'Locked'}</span>
      </div>

      {!unlocked ? (
        <div className="card">
          <div style={{ fontWeight: 900 }}>Unlock your access</div>
          <p className="p" style={{ marginTop: 6 }}>Bought it on Gumroad? Paste your licence key to unlock.</p>
          <div className="row" style={{ marginTop: 10 }}>
            <input className="input" value={licence} onChange={(e) => setLicence(e.target.value)} placeholder="Licence key" />
            <button className="btn" onClick={verifyLicence}>Verify</button>
          </div>
          <div className="note" style={{ marginTop: 10 }}>It’s on your Gumroad receipt page.</div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Step 1 — Upload (or try the sample)</div>
        <p className="p" style={{ marginTop: 6 }}>If you exported from Excel, CSV or TSV both work.</p>

        <div className="row" style={{ marginTop: 10 }}>
          <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} />
          <button className="btn secondary" onClick={loadSample}>Use sample file</button>
        </div>

        {fileName ? <div className="note" style={{ marginTop: 10 }}>{fileName}</div> : null}
      </div>

      {monthly.length ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Step 2 — Monthly check</div>
          <p className="p" style={{ marginTop: 6 }}>Quick sanity check before saving.</p>

          <hr className="sep" />

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 640, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 10 }}>
              <div style={{ opacity: 0.7, fontWeight: 900 }}>Month</div>
              <div style={{ opacity: 0.7, fontWeight: 900 }}>Revenue</div>
              <div style={{ opacity: 0.7, fontWeight: 900 }}>Expenses</div>
              <div style={{ opacity: 0.7, fontWeight: 900 }}>Profit</div>

              {monthly.map((m) => {
                const profit = m.revenue - m.expenses
                return (
                  <div key={m.month} style={{ display: 'contents' }}>
                    <div style={{ padding: '8px 0' }}>{m.month}</div>
                    <div style={{ padding: '8px 0' }}>{m.revenue.toFixed(2)}</div>
                    <div style={{ padding: '8px 0' }}>{m.expenses.toFixed(2)}</div>
                    <div style={{ padding: '8px 0' }}>{profit.toFixed(2)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" onClick={saveToSupabase} disabled={saving}>
              {saving ? 'Saving…' : 'Step 3 — Save to my account'}
            </button>
            <button className="btn secondary" onClick={() => router.push('/app/report')}>Go to report</button>
          </div>
        </div>
      ) : null}

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
      {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
    </main>
  )
}
