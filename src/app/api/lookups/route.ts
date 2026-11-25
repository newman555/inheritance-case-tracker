// GET /api/lookups = マスタデータ：物件種別・提携先種別・相続人の続柄。
// それぞれ表示順に { code, label } で返す。
import { NextResponse } from 'next/server'
import { fail } from '@/lib/http'
import { getLookups } from '@/lib/lookups'

export async function GET() {
  try {
    return NextResponse.json(await getLookups())
  } catch (e) {
    return fail(e)
  }
}
