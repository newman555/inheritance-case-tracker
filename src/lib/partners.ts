import { db } from '@/lib/db'

// すべての提携先と、その提携先の案件数（紹介と、提携先を記録した相談会の両方）・そのうち完了した案件数。
// ボードの絞り込み（/?partner=ID）と同じ案件を数えるので、件数とクリック先の一覧が一致する。
// GET /api/partners、提携先ページ、新規案件フォームで使う。
export async function listPartners() {
  const partners = await db.partner.findMany({
    orderBy: { id: 'asc' },
    include: { partnerType: true, cases: { select: { stage: true } } },
  })
  return partners.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    typeLabel: p.partnerType.label,
    caseCount: p.cases.length,
    closedCount: p.cases.filter((c) => c.stage === 'closed').length,
  }))
}
