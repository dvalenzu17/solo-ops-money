import Link from 'next/link'

export default function PricingPage() {
  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <div className="logo">M</div>
          <div>
            <div className="h1">Pricing</div>
            <div className="p">Simple. No weird tiers. No “contact sales” nonsense.</div>
          </div>
        </div>
        <div className="row">
          <Link className="btn secondary" href="/">Home</Link>
          <Link className="btn" href="/app">Open app</Link>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div style={{ fontWeight: 900, fontSize: 18 }}>Early Access</div>
          <p className="p" style={{ marginTop: 8 }}>
            One-time purchase. Generate monthly PDFs whenever you need them.
          </p>

          <hr className="sep" />

          <div className="grid">
            <div>✅ Banco General export support</div>
            <div>✅ Unlimited imports</div>
            <div>✅ Unlimited PDF reports</div>
            <div>✅ Stored history (multi-device)</div>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <a className="btn" href="https://devbydan.gumroad.com/l/jfiuj" target="_blank" rel="noreferrer">
              Buy on Gumroad
            </a>
            <Link className="btn secondary" href="/help">Where’s my licence key?</Link>
          </div>

          <div className="note" style={{ marginTop: 12 }}>
            Price will go up once auto-unlock + recurring reports ship.
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 900, fontSize: 18 }}>Why it exists</div>
          <p className="p" style={{ marginTop: 8 }}>
            Freelancers don’t need a finance app. They need a clean report that makes them look organised.
          </p>

          <hr className="sep" />

          <div className="note">
            This tool is built to be boring in the best way: consistent, reliable, and hard to mess up.
          </div>
        </div>
      </div>
    </main>
  )
}
