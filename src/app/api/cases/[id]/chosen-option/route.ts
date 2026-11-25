// PUT /api/cases/:id/chosen-option = 「決定」ボタン：ご家族が選んだ選択肢を決定する。
//   本文：{ "optionId": 3 }
//   拒否（404）：案件・選択肢がない、または選択肢が他の案件のもの。
//   拒否（409）：案件が提案ステージではない。
//   決定が「変わる」と、相続人全員の「同意」が未同意に戻る（同意は以前の選択肢へのものだったため）。
//   同じ選択肢をもう一度決定しても何も変わらない。
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { loadCase, stageOf } from '@/lib/cases'
import { fail, parseId, readBody } from '@/lib/http'
import { RuleError } from '@/rules/errors'
import { assertCanChooseOption, choiceResetsAgreements } from '@/rules/locks'

const body = z.object({ optionId: z.number('optionId は数値で指定してください').int() })

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caseId = parseId((await params).id)
    const { optionId } = await readBody(req, body)

    const found = await loadCase(caseId)
    const option = await db.option.findUnique({ where: { id: optionId } })
    if (!option) throw new RuleError('OPTION_NOT_FOUND', '選択肢が見つかりません。', 404, 'optionId')

    // ルール：この案件の選択肢であること、ステージが「提案」であること。
    assertCanChooseOption(stageOf(found), option, caseId)

    // 決定の保存と（変わった場合の）同意のリセットを一緒に行う。両方か、どちらもしないか。
    const updated = await db.$transaction(async (tx) => {
      await tx.case.update({ where: { id: caseId }, data: { chosenOptionId: optionId } })
      if (choiceResetsAgreements(found.chosenOptionId, optionId)) {
        await tx.heir.updateMany({ where: { caseId }, data: { agreed: false } })
      }
      return tx.case.findUniqueOrThrow({ where: { id: caseId }, include: { heirs: true, options: true } })
    })

    return NextResponse.json(updated)
  } catch (e) {
    return fail(e)
  }
}
