import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token || token !== process.env.GUMROAD_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const form = await req.formData()

    const productPermalink = form.get('product_permalink') || form.get('product_id')
    const email = form.get('email')
    const licenceKey = form.get('license_key') || form.get('licence_key')
    const refunded = String(form.get('refunded') || 'false') === 'true'
    const chargebacked = String(form.get('chargebacked') || 'false') === 'true'

    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

    // Ensure it matches your product
    if (String(productPermalink || '') !== process.env.GUMROAD_PRODUCT_PERMALINK) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserByEmail(String(email))
    if (userErr || !userRes?.user) {
      // User hasn’t signed up yet — that’s fine. We’ll unlock once they log in by email.
      return NextResponse.json({ ok: true, pending: true })
    }

    const userId = userRes.user.id
    const isActive = !(refunded || chargebacked)

    await admin.from('access').upsert(
      { user_id: userId, is_active: isActive, gumroad_licence_key: licenceKey || null },
      { onConflict: 'user_id' }
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
