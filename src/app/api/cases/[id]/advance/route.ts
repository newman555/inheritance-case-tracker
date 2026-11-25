// POST /api/cases/:id/advance = 「次のステージへ進める」ボタン。
//   本文：{ "toStage": "consultation" }
//   ルールは src/rules/stages.ts にある。このファイルはデータを読み、ルールに判断させ、保存するだけ。
//   拒否（400）：不明なステージ名。
//   拒否（409）：完了済み、次のステージではない、「提案」の前に異なる選択肢が2つ未満、
//               「契約」の前に選択肢が未決定・相続人がいない・全員が同意していない。
//               直前に他の人が案件を動かした場合も。
//   拒否（404）：この id の案件がない。
//   新しいステージと履歴の1行を、1つのトランザクションで保存する（両方か、どちらもしないか）。
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { stageOf, withFlags } from '@/lib/cases'
import { fail, parseId, readBody } from '@/lib/http'
import { RuleError } from '@/rules/errors'
import { checkAdvance } from '@/rules/stages'

const body = z.object({ toStage: z.string().min(1, '移動先のステージを指定してください') })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseId((await params).id)
    const { toStage } = await readBody(req, body)

    // ルールの判断に必要な情報と一緒に案件を読む。
    const current = await db.case.findUnique({ where: { id }, include: { options: true, heirs: true } })
    if (!current) throw new RuleError('CASE_NOT_FOUND', '案件が見つかりません。', 404)
    const stage = stageOf(current)

    // ルールが判断する。できない場合はエラーを投げる。
    checkAdvance({
      stage,
      toStage,
      optionTypes: current.options.map((o) => o.type),
      chosenOptionId: current.chosenOptionId,
      heirs: current.heirs,
    })

    // ステージの変更と履歴の記録を一緒に行う。両方か、どちらもしないか。
    const updated = await db.$transaction(async (tx) => {
      // 「ステージ = 読み込んだ時のステージ」の条件付き更新：直前に他の人が動かしていれば何も変わらない。
      const moved = await tx.case.updateMany({
        where: { id, stage },
        data: { stage: toStage, stageUpdatedAt: new Date() },
      })
      if (moved.count === 0) {
        throw new RuleError('STAGE_CHANGED', '案件が直前に他の人によって変更されました。再読み込みしてやり直してください。')
      }
      await tx.stageHistory.create({ data: { caseId: id, fromStage: stage, toStage } })
      return tx.case.findUniqueOrThrow({ where: { id }, include: { client: true, property: true } })
    })

    return NextResponse.json(withFlags(updated))
  } catch (e) {
    return fail(e)
  }
}
