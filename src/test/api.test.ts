import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import * as casesRoute from '@/app/api/cases/route'
import * as caseRoute from '@/app/api/cases/[id]/route'
import * as advanceRoute from '@/app/api/cases/[id]/advance/route'
import * as heirsRoute from '@/app/api/cases/[id]/heirs/route'
import * as heirRoute from '@/app/api/cases/[id]/heirs/[heirId]/route'
import * as optionsRoute from '@/app/api/cases/[id]/options/route'
import * as optionRoute from '@/app/api/cases/[id]/options/[optionId]/route'
import * as chosenRoute from '@/app/api/cases/[id]/chosen-option/route'
import * as partnersRoute from '@/app/api/partners/route'
import * as lookupsRoute from '@/app/api/lookups/route'

// ---------- 補助関数 ----------

// ルート関数を、サーバーと同じように直接呼び出す（ネットワークは使わない）。
// HTTP ステータスと JSON の本文を返す。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: Request, ctx: { params: Promise<any> }) => Promise<Response>

async function send(handler: Handler, method: string, url: string, body?: unknown, params: Record<string, string> = {}) {
  const req = new Request('http://localhost' + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const res = await handler(req, { params: Promise.resolve(params) })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

// 各テストの前にすべてのテーブルを空にして、テスト同士が影響し合わないようにする。
// 順番が大切：子のテーブルから先に消す（まだ参照されている行は、データベースが削除を拒否する）。
// マスタデータ（種別・続柄）は消さない。
beforeEach(async () => {
  await db.stageHistory.deleteMany()
  await db.heir.deleteMany()
  await db.option.deleteMany()
  await db.case.deleteMany()
  await db.property.deleteMany()
  await db.client.deleteMany()
  await db.partner.deleteMany()
})

// 相談会の案件は提携先が不要なので、最も簡単な正しい本文になる。各テストは必要な項目だけ変える。
const caseBody = (changes: Record<string, unknown> = {}) => ({
  clientName: '佐藤 花子',
  clientPhone: '080-1111-2222',
  propertyAddress: '名古屋市中区栄2-2-2',
  propertyType: 'condo_unit',
  estimatedPrice: 20_000_000,
  dateOfDeath: '2020-01-15',
  leadSource: 'consultation_event',
  eventName: '名古屋相続セミナー',
  eventDate: '2020-02-01',
  ...changes,
})

const createCase = (changes: Record<string, unknown> = {}) => send(casesRoute.POST, 'POST', '/api/cases', caseBody(changes))
const createPartner = () => send(partnersRoute.POST, 'POST', '/api/partners', { name: 'さくら税理士事務所', type: 'tax_accountant' })
const advance = (id: number, toStage: string) => send(advanceRoute.POST, 'POST', `/api/cases/${id}/advance`, { toStage }, { id: String(id) })
const addOption = (id: number, type: string, amount = 1_000_000) => send(optionsRoute.POST, 'POST', `/api/cases/${id}/options`, { type, amount }, { id: String(id) })
const addHeir = (id: number) => send(heirsRoute.POST, 'POST', `/api/cases/${id}/heirs`, { name: '佐藤 一郎', relationship: 'son' }, { id: String(id) })
const choose = (id: number, optionId: number) => send(chosenRoute.PUT, 'PUT', `/api/cases/${id}/chosen-option`, { optionId }, { id: String(id) })

// 選択肢を2つ登録して提案ステージまで進めた新しい案件。id を返す。
async function caseAtProposal() {
  const id = (await createCase({ clientPhone: '090-' + Math.floor(1000 + Math.random() * 8999) + '-0000' })).body.id as number
  await advance(id, 'consultation')
  const sell = (await addOption(id, 'sell', 20_000_000)).body.id as number
  const rent = (await addOption(id, 'rent', 90_000)).body.id as number
  await advance(id, 'proposal')
  return { id, sell, rent }
}

// ---------- 案件の登録 ----------

describe('POST /api/cases', () => {
  it('案件を登録できる（201）', async () => {
    const res = await createCase()
    expect(res.status).toBe(201)
    expect(res.body.stage).toBe('intake')
    expect(res.body.client.phone).toBe('08011112222')
  })

  it('存在する提携先からの紹介案件を登録できる（201）', async () => {
    const partner = (await createPartner()).body
    const res = await createCase({ leadSource: 'partner_referral', partnerId: partner.id })
    expect(res.status).toBe(201)
  })

  it('同じ電話番号・同じ名前なら依頼者を再利用する', async () => {
    const first = await createCase()
    const second = await createCase({ clientPhone: '０８０－１１１１－２２２２' }) // 全角数字
    expect(second.status).toBe(201)
    expect(second.body.clientId).toBe(first.body.clientId)
    expect(await db.client.count()).toBe(1)
  })

  it('同じ電話番号で名前が違えば拒否する（409）', async () => {
    await createCase()
    const res = await createCase({ clientName: '別の人' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('PHONE_NAME_MISMATCH')
    expect(await db.case.count()).toBe(1) // 2回目のリクエストでは何も保存されていない
  })

  it('提携先のない紹介は拒否する（400）', async () => {
    const res = await createCase({ leadSource: 'partner_referral' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('PARTNER_REQUIRED')
  })

  it('存在しない提携先は拒否する（404）', async () => {
    const res = await createCase({ leadSource: 'partner_referral', partnerId: 999 })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('PARTNER_NOT_FOUND')
  })

  it('存在しない死亡日は拒否する（400）', async () => {
    const res = await createCase({ dateOfDeath: '2026-02-30' })
    expect(res.status).toBe(400)
    expect(res.body.error.field).toBe('dateOfDeath')
  })

  it('未来の死亡日は拒否する（400）', async () => {
    const res = await createCase({ dateOfDeath: '2999-01-01' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('DATE_IN_FUTURE')
  })

  it('マイナスの査定額は拒否し（400）、何も保存しない', async () => {
    const res = await createCase({ estimatedPrice: -5 })
    expect(res.status).toBe(400)
    expect(res.body.error.field).toBe('estimatedPrice')
    expect(await db.property.count()).toBe(0)
  })

  it('マスタにない物件種別は拒否する（400）', async () => {
    const res = await createCase({ propertyType: 'castle' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_PROPERTY_TYPE')
    expect(res.body.error.field).toBe('propertyType')
  })

  it('未来の日付の相談会は拒否する（400）', async () => {
    const res = await createCase({ eventDate: '2999-01-01' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('EVENT_DATE_IN_FUTURE')
  })

  it('上限を超える査定額は拒否する（400）', async () => {
    const res = await createCase({ estimatedPrice: 3_000_000_000 })
    expect(res.status).toBe(400)
  })

  it('JSON でない本文は拒否する（400）', async () => {
    const req = new Request('http://localhost/api/cases', { method: 'POST', body: 'not json' })
    expect((await casesRoute.POST(req)).status).toBe(400)
  })
})

// ---------- 読み取り ----------

describe('案件の取得', () => {
  it('存在しない案件は 404', async () => {
    const res = await send(caseRoute.GET, 'GET', '/api/cases/999', undefined, { id: '999' })
    expect(res.status).toBe(404)
  })

  it('数値でない id は 400', async () => {
    const res = await send(caseRoute.GET, 'GET', '/api/cases/abc', undefined, { id: 'abc' })
    expect(res.status).toBe(400)
  })

  it('一覧を提携先で絞り込める', async () => {
    const partner = (await createPartner()).body
    await createCase({ leadSource: 'partner_referral', partnerId: partner.id })
    await createCase({ clientPhone: '090-9999-8888', clientName: '別の依頼者' }) // 相談会の案件（提携先なし）
    const all = await send(casesRoute.GET, 'GET', '/api/cases')
    const filtered = await send(casesRoute.GET, 'GET', `/api/cases?partner=${partner.id}`)
    expect(all.body).toHaveLength(2)
    expect(filtered.body).toHaveLength(1)
  })

  it('各案件に期限とバッジが付く', async () => {
    const created = await createCase()
    const res = await send(caseRoute.GET, 'GET', `/api/cases/${created.body.id}`, undefined, { id: String(created.body.id) })
    expect(res.body.deadlines).toHaveLength(3)
    expect(res.body.nearDeadline).toBe(true) // 死亡日が2020年：期限はとうに過ぎている
  })
})

// ---------- 案件の最初から最後まで ----------

describe('受付から完了までの案件', () => {
  it('途中のすべてのルールに従う', async () => {
    const partner = (await createPartner()).body
    const id = (await createCase({ leadSource: 'partner_referral', partnerId: partner.id })).body.id as number

    // ステージ：飛ばせない。
    let res = await advance(id, 'proposal')
    expect([res.status, res.body.error.code]).toEqual([409, 'STAGE_NOT_NEXT'])
    expect((await advance(id, 'consultation')).status).toBe(200)

    // 提案には異なる選択肢が2つ必要。
    res = await advance(id, 'proposal')
    expect([res.status, res.body.error.code]).toEqual([409, 'NEED_TWO_OPTIONS'])
    const sell = (await addOption(id, 'sell', 20_000_000)).body.id as number
    res = await addOption(id, 'sell', 19_000_000)
    expect([res.status, res.body.error.code]).toEqual([409, 'OPTION_TYPE_EXISTS'])
    expect((await addOption(id, 'rent', 90_000)).status).toBe(201)
    expect((await advance(id, 'proposal')).status).toBe(200)

    // 提案から選択肢は編集不可。
    res = await addOption(id, 'keep')
    expect([res.status, res.body.error.code]).toEqual([409, 'OPTIONS_LOCKED'])

    // 契約には選択肢の決定・相続人1名以上・全員の同意が必要。毎回違う理由で拒否される。
    res = await advance(id, 'contract')
    expect(res.body.error.code).toBe('NO_CHOSEN_OPTION')
    expect((await choose(id, sell)).status).toBe(200)
    res = await advance(id, 'contract')
    expect(res.body.error.code).toBe('NO_HEIRS')
    const heir = (await addHeir(id)).body
    res = await advance(id, 'contract')
    expect(res.body.error.code).toBe('HEIRS_NOT_AGREED')
    const agree = await send(heirRoute.PATCH, 'PATCH', `/api/cases/${id}/heirs/${heir.id}`, { agreed: true }, { id: String(id), heirId: String(heir.id) })
    expect(agree.status).toBe(200)
    expect((await advance(id, 'contract')).status).toBe(200)

    // 契約から相続人は編集不可。
    res = await addHeir(id)
    expect([res.status, res.body.error.code]).toEqual([409, 'HEIRS_LOCKED'])

    // 完了させると、もう動かない。
    expect((await advance(id, 'closed')).status).toBe(200)
    res = await advance(id, 'closed')
    expect([res.status, res.body.error.code]).toEqual([409, 'CASE_CLOSED'])

    // タイムラインには移動ごとに1行。
    const detail = await send(caseRoute.GET, 'GET', `/api/cases/${id}`, undefined, { id: String(id) })
    expect(detail.body.history.map((h: { toStage: string }) => h.toStage)).toEqual(['consultation', 'proposal', 'contract', 'closed'])

    // 提携先ページの件数に反映される。
    const partners = await send(partnersRoute.GET, 'GET', '/api/partners')
    expect(partners.body[0]).toMatchObject({ referred: 1, closed: 1 })
  })
})

// ---------- 選択肢の決定 ----------

describe('PUT chosen-option', () => {
  it('他の案件の選択肢は拒否する（404）', async () => {
    const a = await caseAtProposal()
    const b = await caseAtProposal()
    const res = await choose(a.id, b.sell)
    expect([res.status, res.body.error.code]).toEqual([404, 'OPTION_NOT_FOUND'])
  })

  it('提案ステージより前の決定は拒否する（409）', async () => {
    const id = (await createCase()).body.id as number
    const option = (await addOption(id, 'sell')).body.id as number
    const res = await choose(id, option)
    expect([res.status, res.body.error.code]).toEqual([409, 'CHOOSE_ONLY_AT_PROPOSAL'])
  })

  it('決定が変わると相続人全員の同意をリセットする', async () => {
    const { id, sell, rent } = await caseAtProposal()
    await choose(id, sell)
    const heir = (await addHeir(id)).body
    await send(heirRoute.PATCH, 'PATCH', `/api/cases/${id}/heirs/${heir.id}`, { agreed: true }, { id: String(id), heirId: String(heir.id) })

    // 同じ選択肢をもう一度決定しても、同意は残る。
    await choose(id, sell)
    expect((await db.heir.findUniqueOrThrow({ where: { id: heir.id } })).agreed).toBe(true)

    // 別の選択肢に決定すると、同意はリセットされる。
    await choose(id, rent)
    expect((await db.heir.findUniqueOrThrow({ where: { id: heir.id } })).agreed).toBe(false)
  })
})

// ---------- 削除と相続人の登録 ----------

describe('選択肢と相続人の削除', () => {
  it('提案ステージより前なら選択肢を削除できる（204）', async () => {
    const id = (await createCase()).body.id as number
    const option = (await addOption(id, 'sell')).body.id as number
    const res = await send(optionRoute.DELETE, 'DELETE', `/api/cases/${id}/options/${option}`, undefined, { id: String(id), optionId: String(option) })
    expect(res.status).toBe(204)
  })

  it('提案ステージでは選択肢を削除できない（409）', async () => {
    const { id, sell } = await caseAtProposal()
    const res = await send(optionRoute.DELETE, 'DELETE', `/api/cases/${id}/options/${sell}`, undefined, { id: String(id), optionId: String(sell) })
    expect([res.status, res.body.error.code]).toEqual([409, 'OPTIONS_LOCKED'])
  })

  it('契約ステージより前なら相続人を削除できる（204）', async () => {
    const id = (await createCase()).body.id as number
    const heir = (await addHeir(id)).body.id as number
    const res = await send(heirRoute.DELETE, 'DELETE', `/api/cases/${id}/heirs/${heir}`, undefined, { id: String(id), heirId: String(heir) })
    expect(res.status).toBe(204)
  })

  it('マスタにない続柄の相続人は拒否する（400）', async () => {
    const id = (await createCase()).body.id as number
    const res = await send(heirsRoute.POST, 'POST', `/api/cases/${id}/heirs`, { name: 'X', relationship: 'cousin_twice_removed' }, { id: String(id) })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_RELATIONSHIP')
  })

  it('他の案件の相続人は削除できない（404）', async () => {
    const a = (await createCase()).body.id as number
    const b = (await createCase({ clientPhone: '090-5555-6666', clientName: '別の依頼者' })).body.id as number
    const heirOfB = (await addHeir(b)).body.id as number
    const res = await send(heirRoute.DELETE, 'DELETE', `/api/cases/${a}/heirs/${heirOfB}`, undefined, { id: String(a), heirId: String(heirOfB) })
    expect([res.status, res.body.error.code]).toEqual([404, 'HEIR_NOT_FOUND'])
  })
})

// ---------- マスタデータ ----------

describe('マスタデータ（lookups）', () => {
  it('物件種別・提携先種別・続柄をデータベースから表示順で返す', async () => {
    const res = await send(lookupsRoute.GET, 'GET', '/api/lookups')
    expect(res.status).toBe(200)
    expect(res.body.propertyTypes.map((t: { code: string }) => t.code)).toEqual([
      'house', 'condo_unit', 'land', 'whole_building', 'commercial', 'other',
    ])
    expect(res.body.partnerTypes).toHaveLength(3)
    expect(res.body.partnerTypes[0]).toEqual({ code: 'tax_accountant', label: '税理士' })
    expect(res.body.relationships).toHaveLength(10)
    expect(res.body.relationships[0]).toEqual({ code: 'spouse', label: '配偶者' })
    expect(res.body.relationships.at(-1)).toEqual({ code: 'other', label: 'その他' })
  })

  it('マスタに行を追加するだけで、コードを変えずに新しい種別が使える', async () => {
    await db.propertyType.create({ data: { code: 'leasehold', label: '借地権', sortOrder: 7 } })
    expect((await createCase({ propertyType: 'leasehold' })).status).toBe(201)
    await db.case.deleteMany() // 後片付け：行を削除できるように、使っている案件を先に消す
    await db.property.deleteMany()
    await db.propertyType.delete({ where: { code: 'leasehold' } })
  })
})

// ---------- 提携先 ----------

describe('提携先', () => {
  it('提携先を追加できる（201）', async () => {
    expect((await createPartner()).status).toBe(201)
  })
  it('不明な提携先種別は拒否する（400）', async () => {
    const res = await send(partnersRoute.POST, 'POST', '/api/partners', { name: 'X', type: 'banker' })
    expect(res.status).toBe(400)
  })
})
