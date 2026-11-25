import { db } from '@/lib/db'

// すべての提携先と、紹介した案件数・そのうち完了した案件数。
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
    referred: p.cases.length,
    closed: p.cases.filter((c) => c.stage === 'closed').length,
  }))
}
