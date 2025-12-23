import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function supabaseUserServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        }
      }
    }
  )
}

export async function POST(req) {
  try {
    const sb = supabaseUserServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json()
    const rows = Array.isArray(body.rows) ? body.rows : []
    const source = body.source || 'Unknown'
    const file_name = body.file_name || null

    if (!rows.length) return NextResponse.json({ error: 'No rows provided' }, { status: 400 })

    const { data: imp, error: impErr } = await sb
      .from('imports')
      .insert({ user_id: user.id, source, file_name })
      .select('id')
      .single()

    if (impErr) return NextResponse.json({ error: impErr.message }, { status: 400 })

    const import_id = imp.id

    const normalised = rows
      .filter(r => r && r.date && r.description && typeof r.amount === 'number')
      .map(r => ({
        user_id: user.id,
        import_id,
        date: String(r.date).slice(0, 10),
        description: String(r.description).slice(0, 500),
        amount: r.amount
      }))

    if (!normalised.length) return NextResponse.json({ error: 'Rows missing date/description/amount' }, { status: 400 })

    const batchSize = 500
    for (let i = 0; i < normalised.length; i += batchSize) {
      const chunk = normalised.slice(i, i + batchSize)
      const { error } = await sb.from('transactions').insert(chunk)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, import_id, inserted: normalised.length })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
