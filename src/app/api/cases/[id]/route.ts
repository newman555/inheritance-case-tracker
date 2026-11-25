// GET /api/cases/:id = 案件1件のすべての情報。
//   含むもの：依頼者・物件・提携先・相続人・選択肢・履歴（タイムライン）、
//             3つの法定期限と残り日数、2つのバッジ。
//   拒否（404）：この id の案件がない。
import { NextResponse } from 'next/server'
import { getCaseDetail } from '@/lib/cases'
import { fail, parseId } from '@/lib/http'
import { RuleError } from '@/rules/errors'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const found = await getCaseDetail(parseId((await params).id))
    if (!found) throw new RuleError('CASE_NOT_FOUND', '案件が見つかりません。', 404)
    return NextResponse.json(found)
  } catch (e) {
    return fail(e)
  }
}
