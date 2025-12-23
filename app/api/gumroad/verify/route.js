import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )
}

export async function POST(req) {
  try {
    const { licence_key } = await req.json()
    if (!licence_key) return NextResponse.json({ error: 'Missing licence key' }, { status: 400 })

    const sb = supabaseUserServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = new URLSearchParams()
    body.set('product_permalink', process.env.GUMROAD_PRODUCT_PERMALINK)
    body.set('licence_key', licence_key)

    const gumroadRes = await fetch('https://api.gumroad.com/v2/licences/verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.GUMROAD_APPLICATION_TOKEN}`
      },
      body
    })

    const out = await gumroadRes.json()

    if (!gumroadRes.ok || !out.success) {
      return NextResponse.json({ error: 'Invalid licence key' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    await admin.from('access').upsert({
      user_id: user.id,
      is_active: true,
      gumroad_licence_key: licence_key
    }, { onConflict: 'user_id' })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
