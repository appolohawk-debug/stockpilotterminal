import { NextResponse } from 'next/server'
import { searchTickers } from '@/lib/yahoo'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()

  if (!q || q.length < 1) return NextResponse.json([])

  try {
    const results = await searchTickers(q)
    return NextResponse.json(results)
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json([])
  }
}
