// 案件の相続人1人。
//
// PATCH  /api/cases/:id/heirs/:heirId = 「同意」を付ける・外す。   本文：{ "agreed": true }
// DELETE /api/cases/:id/heirs/:heirId = 相続人を削除する。
//
// 拒否（409）：PATCH は案件が契約ステージ以降（相続人と同意は編集不可）。
//             DELETE は案件が提案ステージ以降（同意していない方を外して契約へ進めないため）。
// 拒否（404）：案件がない、またはその相続人がこの案件にいない。
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { loadCase, stageOf } from '@/lib/cases'
import { fail, parseId, readBody } from '@/lib/http'
import { RuleError } from '@/rules/errors'
import { assertCanEditHeirs, assertCanRemoveHeir } from '@/rules/locks'

type Params = { params: Promise<{ id: string; heirId: string }> }

// PATCH と DELETE で共通：案件が相続人の変更を許していて、相続人がこの案件にいること。
// 案件のステージも返す（DELETE はさらに早くかかるロックを確認するため）。
async function loadHeir(params: Params['params']) {
  const { id, heirId } = await params
  const caseId = parseId(id)
  const found = await loadCase(caseId)
  const stage = stageOf(found)
  assertCanEditHeirs(stage)

  const heir = await db.heir.findFirst({ where: { id: parseId(heirId, 'heirId'), caseId } })
  if (!heir) throw new RuleError('HEIR_NOT_FOUND', 'この案件に該当する相続人が見つかりません。', 404)
  return { heir, stage }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { agreed } = await readBody(req, z.object({ agreed: z.boolean('agreed は true か false で指定してください') }))
    const { heir } = await loadHeir(params)
    return NextResponse.json(await db.heir.update({ where: { id: heir.id }, data: { agreed } }))
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { heir, stage } = await loadHeir(params)
    assertCanRemoveHeir(stage) // 削除は提案ステージからできない（追加・同意の変更より早いロック）
    await db.heir.delete({ where: { id: heir.id } })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return fail(e)
  }
}
