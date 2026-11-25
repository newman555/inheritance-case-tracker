// DELETE /api/cases/:id/options/:optionId = 選択肢を削除する。
//   拒否（409）：案件が提案ステージ以降（選択肢は編集不可）。
//   拒否（404）：案件がない、またはその選択肢がこの案件にない。
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loadCase, stageOf } from '@/lib/cases'
import { fail, parseId } from '@/lib/http'
import { RuleError } from '@/rules/errors'
import { assertCanEditOptions } from '@/rules/locks'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; optionId: string }> }) {
  try {
    const { id, optionId } = await params
    const caseId = parseId(id)
    const found = await loadCase(caseId)
    assertCanEditOptions(stageOf(found))

    const option = await db.option.findFirst({ where: { id: parseId(optionId, 'optionId'), caseId } })
    if (!option) throw new RuleError('OPTION_NOT_FOUND', 'この案件に該当する選択肢が見つかりません。', 404)

    await db.option.delete({ where: { id: option.id } })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return fail(e)
  }
}
