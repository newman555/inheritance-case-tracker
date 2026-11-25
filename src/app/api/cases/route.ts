// 案件（一覧・新規作成）
//
// POST /api/cases = 新しい案件を登録する。
//   依頼者・物件・案件をまとめて保存する（1つのトランザクション）。
//   拒否（400）：項目の不足・誤り、不明な物件種別、存在しない・未来の死亡日、提携先のない紹介、
//               名称のない・日付がない・未来の日付の相談会、誤った電話番号。
//   拒否（404）：提携先が存在しない。
//   拒否（409）：この電話番号が別の名前の依頼者で登録済み。
//   電話番号と名前が登録済みの依頼者と一致すれば、その依頼者を再利用する（再び来られたご家族）。
//
// GET /api/cases = パイプラインボード用の一覧。
//   絞り込み（任意）：?client=1 または ?partner=1
//   各案件には、ステージでの経過日数・「停滞」バッジ・「期限間近」バッジが付く。
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { listCases } from '@/lib/cases'
import { fail, parseId, readBody } from '@/lib/http'
import { todayJst } from '@/lib/today'
import { normalizePhone, resolveClient } from '@/rules/clients'
import { deadlinesFor } from '@/rules/dates'
import { RuleError } from '@/rules/errors'
import { validateLeadSource } from '@/rules/leadSource'
import { MAX_YEN } from '@/rules/values'

// 本文の形。業務ルールより先に zod が確認する。
const createCaseBody = z.object({
  clientName: z.string().trim().min(1, '依頼者の氏名を入力してください'),
  clientPhone: z.string().min(1, '電話番号を入力してください'),
  propertyAddress: z.string().trim().min(1, '物件の所在地を入力してください'),
  propertyType: z.string().min(1, '物件種別を選んでください'), // 下で PropertyType テーブルと照合する
  estimatedPrice: z
    .number('査定額は数値で入力してください')
    .int('査定額は整数で入力してください')
    .positive('査定額は1円以上で入力してください')
    .max(MAX_YEN, '査定額が大きすぎます'),
  dateOfDeath: z.string().min(1, '死亡日を入力してください'),
  leadSource: z.string().min(1, '流入経路を選んでください'),
  partnerId: z.number().int().nullish(),
  eventName: z.string().nullish(),
  eventDate: z.string().nullish(),
})

export async function POST(req: Request) {
  try {
    const body = await readBody(req, createCaseBody)

    // 1. データベースを使わない業務ルール。
    const today = todayJst()
    validateLeadSource(body, today) // 紹介は提携先が必須、相談会は名称と過去の日付が必須
    deadlinesFor(body.dateOfDeath, today) // 存在しない・未来の死亡日を拒否
    const phone = normalizePhone(body.clientPhone)

    // 2. データベースを使うルール。
    if (body.partnerId) {
      const partner = await db.partner.findUnique({ where: { id: body.partnerId } })
      if (!partner) throw new RuleError('PARTNER_NOT_FOUND', '提携先が見つかりません。', 404, 'partnerId')
    }
    const propertyType = await db.propertyType.findUnique({ where: { code: body.propertyType } })
    if (!propertyType) throw new RuleError('INVALID_PROPERTY_TYPE', '不明な物件種別です。', 400, 'propertyType')

    const existingClient = await db.client.findUnique({ where: { phone } })
    const action = resolveClient(existingClient, body.clientName) // 'create' か 'reuse'（または 409）

    // 3. すべて保存するか、何も保存しないか：1つでも失敗すれば、どれも残らない。
    const created = await db.$transaction(async (tx) => {
      const client =
        action === 'reuse' && existingClient
          ? existingClient
          : await tx.client.create({ data: { name: body.clientName, phone } })

      const property = await tx.property.create({
        data: { address: body.propertyAddress, type: body.propertyType, estimatedPrice: body.estimatedPrice },
      })

      return tx.case.create({
        data: {
          clientId: client.id,
          propertyId: property.id,
          partnerId: body.partnerId ?? null,
          leadSource: body.leadSource,
          eventName: body.eventName ?? null,
          eventDate: body.eventDate ?? null,
          dateOfDeath: body.dateOfDeath,
        },
        include: { client: true, property: true },
      })
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return fail(e)
  }
}

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams
    const client = params.get('client')
    const partner = params.get('partner')
    const cases = await listCases({
      clientId: client ? parseId(client, 'client') : undefined,
      partnerId: partner ? parseId(partner, 'partner') : undefined,
    })
    return NextResponse.json(cases)
  } catch (e) {
    return fail(e)
  }
}
