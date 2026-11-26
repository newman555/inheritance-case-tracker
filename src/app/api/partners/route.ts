// 提携先 = 案件を紹介してくれる事務所（税理士・司法書士・弁護士）。
//
// GET  /api/partners = 一覧。各提携先の「案件数」（紹介・相談会）と「完了件数」付き。
// POST /api/partners = 提携先を追加する。   本文：{ "name": "...", "type": "tax_accountant" }
//   拒否（400）：名称が空、または PartnerType テーブルにない種別。
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { fail, readBody } from '@/lib/http'
import { listPartners } from '@/lib/partners'
import { RuleError } from '@/rules/errors'

const body = z.object({
  name: z.string().trim().min(1, '名称を入力してください'),
  type: z.string().min(1, '種別を選んでください'), // 下で PartnerType テーブルと照合する
})

export async function GET() {
  try {
    return NextResponse.json(await listPartners())
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: Request) {
  try {
    const data = await readBody(req, body)
    const partnerType = await db.partnerType.findUnique({ where: { code: data.type } })
    if (!partnerType) throw new RuleError('INVALID_PARTNER_TYPE', '不明な提携先種別です。', 400, 'type')
    return NextResponse.json(await db.partner.create({ data }), { status: 201 })
  } catch (e) {
    return fail(e)
  }
}
