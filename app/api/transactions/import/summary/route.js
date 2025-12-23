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

function monthKey(isoDate) {
  return String(isoDate || '').slice(0, 7) || 'Unknown'
}

export async function GET(req) {
  try {
    const sb = supabaseUserServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') || ''

    if (month) {
      const from = `${month}-01`
      const toMonth = month.split('-').map(Number)
      const y = toMonth[0]
      const m = toMonth[1]
      const nextY = m === 12 ? y + 1 : y
      const nextM = m === 12 ? 1 : m + 1
      const to = `${nextY}-${String(nextM).padStart(2, '0')}-01`

      const { data, error } = await sb
        .from('transactions')
        .select('date,amount')
        .eq('user_id', user.id)
        .gte('date', from)
        .lt('date', to)

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })

      let revenue = 0
      let expenses = 0
      for (const r of data || []) {
        const a = Number(r.amount || 0)
        if (a > 0) revenue += a
        if (a < 0) expenses += Math.abs(a)
      }
      const profit = revenue - expenses
      const margin = revenue ? (profit / revenue) * 100 : 0

      return NextResponse.json({
        ok: true,
        month,
        count: (data || []).length,
        revenue,
        expenses,
        profit,
        margin
      })
    }

    const { data, error } = await sb
      .from('transactions')
      .select('date,amount')
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const buckets = new Map()
    for (const r of data || []) {
      const m = monthKey(r.date)
      const a = Number(r.amount || 0)
      const prev = buckets.get(m) || { month: m, revenue: 0, expenses: 0, count: 0 }
      prev.count += 1
      if (a > 0) prev.revenue += a
      if (a < 0) prev.expenses += Math.abs(a)
      buckets.set(m, prev)
    }

    const months = Array.from(buckets.values())
      .map(x => ({ ...x, profit: x.revenue - x.expenses }))
      .sort((a, b) => (a.month > b.month ? 1 : -1))

    return NextResponse.json({ ok: true, months })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
