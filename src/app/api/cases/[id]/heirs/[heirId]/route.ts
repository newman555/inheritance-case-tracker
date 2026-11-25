// 案件の相続人1人。
//
// PATCH  /api/cases/:id/heirs/:heirId = 「同意」を付ける・外す。   本文：{ "agreed": true }
// DELETE /api/cases/:id/heirs/:heirId = 相続人を削除する。
//
// どちらも、案件が契約ステージ以降なら拒否（409、相続人は編集不可）。
// どちらも、案件がない、またはその相続人がこの案件にいなければ拒否（404）。
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { loadCase, stageOf } from '@/lib/cases'
import { fail, parseId, readBody } from '@/lib/http'
import { RuleError } from '@/rules/errors'
import { assertCanEditHeirs } from '@/rules/locks'

type Params = { params: Promise<{ id: string; heirId: string }> }

// PATCH と DELETE で共通：案件が相続人の変更を許していて、相続人がこの案件にいること。
async function loadHeir(params: Params['params']) {
  const { id, heirId } = await params
  const caseId = parseId(id)
  const found = await loadCase(caseId)
  assertCanEditHeirs(stageOf(found))

  const heir = await db.heir.findFirst({ where: { id: parseId(heirId, 'heirId'), caseId } })
  if (!heir) throw new RuleError('HEIR_NOT_FOUND', 'この案件に該当する相続人が見つかりません。', 404)
  return heir
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { agreed } = await readBody(req, z.object({ agreed: z.boolean('agreed は true か false で指定してください') }))
    const heir = await loadHeir(params)
    return NextResponse.json(await db.heir.update({ where: { id: heir.id }, data: { agreed } }))
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const heir = await loadHeir(params)
    await db.heir.delete({ where: { id: heir.id } })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return fail(e)
  }
}
