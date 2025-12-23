import Link from 'next/link'

export default function HelpPage() {
  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <div className="logo">M</div>
          <div>
            <div className="h1">Help</div>
            <div className="p">Quick answers. No support ticket maze.</div>
          </div>
        </div>
        <div className="row">
          <Link className="btn secondary" href="/">Home</Link>
          <Link className="btn" href="/app/import">Import</Link>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 900 }}>Where do I find my Gumroad licence key?</div>
        <p className="p" style={{ marginTop: 6 }}>
          On your Gumroad receipt page after purchase. Copy/paste it into the Unlock box.
        </p>

        <hr className="sep" />

        <div style={{ fontWeight: 900 }}>What file formats work?</div>
        <p className="p" style={{ marginTop: 6 }}>
          CSV and TSV (tab-separated). If you have Excel, export as CSV or TSV and upload.
        </p>

        <hr className="sep" />

        <div style={{ fontWeight: 900 }}>Banco General export tips</div>
        <p className="p" style={{ marginTop: 6 }}>
          Your columns should include: Fecha, Descripción (or Transacción), and Débito/Crédito.
        </p>

        <div className="row" style={{ marginTop: 14 }}>
          <a className="btn secondary" href="/sample-banco-general.tsv" download>Download sample file</a>
          <a className="btn" href="https://devbydan.gumroad.com/l/jfiuj" target="_blank" rel="noreferrer">Buy on Gumroad</a>
        </div>
      </div>
    </main>
  )
}
