import Link from 'next/link'

export default function Home() {
  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <div className="logo">M</div>
          <div>
            <div className="h1">Money Copilot</div>
            <div className="p">Monthly money reports that look professional — without the accounting headache.</div>
          </div>
        </div>

        <div className="row">
          <Link className="btn secondary" href="/login">Log in</Link>
          <Link className="btn" href="/app">Open app</Link>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <span className="badge">Built for freelancers</span>

          <h2 style={{ margin: '12px 0 6px', letterSpacing: '-0.02em' }}>
            Turn your bank export into a client-polished PDF in minutes.
          </h2>

          <p className="p">
            Import transactions, pick the month, download a one-page report you can confidently share.
          </p>

          <div className="row" style={{ marginTop: 14 }}>
            <Link className="btn" href="/app">Generate a report</Link>
            <Link className="btn secondary" href="/login">Email me a sign-in link</Link>
          </div>

          <hr className="sep" />

          <div className="note">
            No “finance app” bloat. Just clean reporting that makes you look organised.
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 900, letterSpacing: '-0.02em' }}>How it works</div>

          <div className="grid" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="logo" style={{ width: 28, height: 28, borderRadius: 9 }}>1</div>
              <div>
                <div style={{ fontWeight: 800 }}>Unlock</div>
                <div className="note">Buy on Gumroad, paste your licence key once.</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="logo" style={{ width: 28, height: 28, borderRadius: 9 }}>2</div>
              <div>
                <div style={{ fontWeight: 800 }}>Import</div>
                <div className="note">Upload a CSV/TSV/Excel export (Banco General supported).</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="logo" style={{ width: 28, height: 28, borderRadius: 9 }}>3</div>
              <div>
                <div style={{ fontWeight: 800 }}>Export</div>
                <div className="note">Download a client-ready monthly summary PDF.</div>
              </div>
            </div>
          </div>

          <hr className="sep" />

          <div className="note">
            The goal is confidence: your numbers, cleanly presented, ready when you need them.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, letterSpacing: '-0.02em' }}>What you get</div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Monthly snapshot</div>
            <div className="note">Revenue, expenses, profit, margin — one glance, done.</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Polished PDF</div>
            <div className="note">Clean, shareable, not a spreadsheet screenshot.</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Real exports supported</div>
            <div className="note">Handles tabs, commas, quotes, and “Excel weirdness”.</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>No fluff</div>
            <div className="note">No budgeting lectures. No “AI assistant” theatre.</div>
          </div>
        </div>
      </div>
    </main>
  )
}
