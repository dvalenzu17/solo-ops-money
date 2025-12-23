import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
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
    const sb = supabaseUserServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = require('@supabase/supabase-js').createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const access = await admin.from('access').select('is_active').eq('user_id', user.id).maybeSingle()
    if (!access.data || !access.data.is_active) {
      return NextResponse.json({ error: 'Locked' }, { status: 403 })
    }

    const payload = await req.json()
    const { name, business, month, revenue, expenses, profit, margin } = payload || {}
    if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const padX = 48
    let y = 790

    page.drawText(business || 'Monthly Report', { x: padX, y, size: 20, font: fontBold, color: rgb(0.08, 0.08, 0.08) })
    y -= 22
    page.drawText(`${month} • Prepared for ${name || ''}`.trim(), { x: padX, y, size: 12, font, color: rgb(0.35, 0.35, 0.35) })

    y -= 28
    page.drawRectangle({ x: padX, y: y - 110, width: 595.28 - padX * 2, height: 110, borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 1 })

    const boxY = y - 22
    const w = (595.28 - padX * 2) / 4

    const items = [
      ['Revenue', Number(revenue || 0).toFixed(2)],
      ['Expenses', Number(expenses || 0).toFixed(2)],
      ['Profit', Number(profit || 0).toFixed(2)],
      ['Margin', `${Number(margin || 0).toFixed(1)}%`]
    ]

    items.forEach((it, i) => {
      const x = padX + i * w + 12
      page.drawText(it[0], { x, y: boxY, size: 10, font: fontBold, color: rgb(0.45, 0.45, 0.45) })
      page.drawText(it[1], { x, y: boxY - 22, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
    })

    y -= 150

    const rev = Number(revenue || 0)
    const exp = Number(expenses || 0)
    const prof = Number(profit || 0)

    const highlight1 = prof >= 0 ? `You closed the month profitable at ${prof.toFixed(2)}.` : `You closed the month at a loss of ${Math.abs(prof).toFixed(2)}.`
    const highlight2 = rev ? `Profit margin was ${((prof / rev) * 100).toFixed(1)}%.` : `No revenue recorded for this month.`
    const highlight3 = exp ? `Total expenses were ${exp.toFixed(2)}.` : `No expenses recorded for this month.`

    page.drawText('Highlights', { x: padX, y, size: 12, font: fontBold, color: rgb(0.12, 0.12, 0.12) })
    y -= 18
    ;[highlight1, highlight2, highlight3].forEach((t) => {
      page.drawText(`• ${t}`, { x: padX, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) })
      y -= 16
    })

    y -= 10
    page.drawText('Notes', { x: padX, y, size: 12, font: fontBold, color: rgb(0.12, 0.12, 0.12) })
    y -= 18
    page.drawText('This summary is generated from imported transactions. Review categorisation before filing taxes.', {
      x: padX,
      y,
      size: 10.5,
      font,
      color: rgb(0.35, 0.35, 0.35)
    })

    const bytes = await pdfDoc.save()
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="Monthly-Report-${month}.pdf"`
      }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
