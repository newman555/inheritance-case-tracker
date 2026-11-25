// POST /api/cases/:id/options = 物件の扱い方（売却・賃貸・建築・保有）を1つ追加する。
//   本文：{ "type": "sell", "amount": 20000000, "memo": "..." }（賃貸の amount は月額）
//   拒否（400）：不明な種類、または1円以上の整数でない金額。
//   拒否（409）：この案件に同じ種類がすでにある、または案件が提案ステージ以降（選択肢は編集不可）。
//   拒否（404）：この id の案件がない。
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { loadCase, stageOf } from '@/lib/cases'
import { fail, parseId, readBody } from '@/lib/http'
import { OPTION_LABELS } from '@/lib/labels'
import { RuleError } from '@/rules/errors'
import { assertCanEditOptions } from '@/rules/locks'
import { OPTION_TYPES } from '@/rules/stages'
import { MAX_YEN } from '@/rules/values'

const body = z.object({
  type: z.enum(OPTION_TYPES, '不明な選択肢の種類です'),
  amount: z
    .number('金額は数値で入力してください')
    .int('金額は整数で入力してください')
    .positive('金額は1円以上で入力してください')
    .max(MAX_YEN, '金額が大きすぎます'),
  memo: z.string().default(''),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caseId = parseId((await params).id)
    const data = await readBody(req, body)

    const found = await loadCase(caseId)
    assertCanEditOptions(stageOf(found))

    // 1つの案件に同じ種類は1つまで。データベースも拒否するが、先に確認して分かりやすいメッセージを返す。
    const sameType = await db.option.findUnique({ where: { caseId_type: { caseId, type: data.type } } })
    if (sameType) {
      throw new RuleError('OPTION_TYPE_EXISTS', `この案件にはすでに「${OPTION_LABELS[data.type]}」の選択肢があります。`, 409, 'type')
    }

    const option = await db.option.create({ data: { ...data, caseId } })
    return NextResponse.json(option, { status: 201 })
  } catch (e) {
    return fail(e)
  }
}
