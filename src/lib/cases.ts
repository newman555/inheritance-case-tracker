import { db } from '@/lib/db'
import { todayJst, toJstDate } from '@/lib/today'
import { RuleError } from '@/rules/errors'
import { daysBetween, deadlinesFor, isNearDeadline, isStuck } from '@/rules/dates'
import { isStage, Stage } from '@/rules/stages'

// 案件の読み取り。API ルートと画面の両方がこの関数を使うので、
// ボード・案件詳細・API が表示する内容は常に同じになる。

// 案件を探す。なければ 404 で拒否する。案件を変更する前に必ず使う。
export async function loadCase(id: number) {
  const found = await db.case.findUnique({ where: { id } })
  if (!found) throw new RuleError('CASE_NOT_FOUND', '案件が見つかりません。', 404)
  return found
}

// ステージは文字列で保存されている。ルールに渡す前に実在するステージか確認する。
export function stageOf(c: { stage: string }): Stage {
  if (!isStage(c.stage)) throw new Error(`データベースに不明なステージがあります: ${c.stage}`)
  return c.stage
}

// 画面には必要だがデータベースには保存していない情報を加える：
// 3つの法定期限、現在のステージでの経過日数、「停滞」「期限間近」のバッジ。
export function withFlags<T extends { stage: string; dateOfDeath: string; stageUpdatedAt: Date }>(c: T) {
  const today = todayJst()
  const stage = stageOf(c)
  const deadlines = deadlinesFor(c.dateOfDeath, today)
  const stageSince = toJstDate(c.stageUpdatedAt)
  return {
    ...c,
    deadlines,
    daysInStage: daysBetween(stageSince, today),
    stuck: isStuck(stage, stageSince, today),
    nearDeadline: isNearDeadline(stage, deadlines),
  }
}

// パイプラインボード用の一覧。絞り込み（任意）：依頼者1人、提携先1社。
export async function listCases(filter: { clientId?: number; partnerId?: number } = {}) {
  const cases = await db.case.findMany({
    where: {
      ...(filter.clientId ? { clientId: filter.clientId } : {}),
      ...(filter.partnerId ? { partnerId: filter.partnerId } : {}),
    },
    include: { client: true, property: { include: { propertyType: true } }, partner: true },
    orderBy: { updatedAt: 'desc' },
  })
  return cases.map(withFlags)
}

// 案件1件のすべての情報（案件詳細・比較シート用）。存在しなければ null。
export async function getCaseDetail(id: number) {
  const found = await db.case.findUnique({
    where: { id },
    include: {
      client: true,
      property: { include: { propertyType: true } },
      partner: true,
      heirs: { orderBy: { id: 'asc' }, include: { relationshipType: true } },
      options: { orderBy: { id: 'asc' } },
      history: { orderBy: { changedAt: 'asc' } },
    },
  })
  return found ? withFlags(found) : null
}
