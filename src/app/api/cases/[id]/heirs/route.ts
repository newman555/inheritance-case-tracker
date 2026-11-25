// POST /api/cases/:id/heirs = 相続人を追加する。
//   本文：{ "name": "...", "relationship": "son" }（relationship は RelationshipType テーブルのコード）
//   追加した相続人は「未同意」から始まる。
//   拒否（400）：氏名が空、または RelationshipType テーブルにない続柄。
//   拒否（409）：案件が契約ステージ以降（相続人は編集不可）。
//   拒否（404）：この id の案件がない。
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { loadCase, stageOf } from '@/lib/cases'
import { fail, parseId, readBody } from '@/lib/http'
import { RuleError } from '@/rules/errors'
import { assertCanEditHeirs } from '@/rules/locks'

const body = z.object({
  name: z.string().trim().min(1, '氏名を入力してください'),
  relationship: z.string().min(1, '続柄を選んでください'), // 下で RelationshipType テーブルと照合する
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caseId = parseId((await params).id)
    const data = await readBody(req, body)

    const found = await loadCase(caseId)
    assertCanEditHeirs(stageOf(found))

    const relationship = await db.relationshipType.findUnique({ where: { code: data.relationship } })
    if (!relationship) throw new RuleError('INVALID_RELATIONSHIP', '不明な続柄です。', 400, 'relationship')

    const heir = await db.heir.create({ data: { ...data, caseId } })
    return NextResponse.json(heir, { status: 201 })
  } catch (e) {
    return fail(e)
  }
}
