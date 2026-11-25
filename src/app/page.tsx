import Link from 'next/link'
import { db } from '@/lib/db'
import { listCases } from '@/lib/cases'
import { STAGE_LABELS } from '@/lib/labels'
import { REFERRAL } from '@/rules/leadSource'
import { STAGES } from '@/rules/stages'

// 画面①：パイプラインボード。すべての案件を、ステージごとの列に並べる。
// サーバーコンポーネント：GET /api/cases と同じ関数でデータベースを直接読む。
// "force-dynamic" = キャッシュせず、常に最新のデータを表示する。
export const dynamic = 'force-dynamic'

// "?client=3" -> 3。正の整数でなければ無視する（絞り込みなし）。
function toId(value: string | undefined): number | undefined {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; partner?: string }>
}) {
  const query = await searchParams
  const clientId = toId(query.client)
  const partnerId = toId(query.partner)
  const cases = await listCases({ clientId, partnerId })

  // 上部の絞り込みタグに表示する名前。
  const [filterClient, filterPartner] = await Promise.all([
    clientId ? db.client.findUnique({ where: { id: clientId } }) : null,
    partnerId ? db.partner.findUnique({ where: { id: partnerId } }) : null,
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">パイプラインボード</h1>
        <Link href="/cases/new" className="btn-primary">新規案件</Link>
      </div>

      {/* 有効な絞り込み。✕ で全件表示に戻る。 */}
      {(filterClient || filterPartner) && (
        <div className="flex gap-2">
          {filterClient && <Chip label={`依頼者：${filterClient.name}`} />}
          {filterPartner && <Chip label={`提携先：${filterPartner.name}`} />}
        </div>
      )}

      {cases.length === 0 && !clientId && !partnerId && (
        <p className="card text-muted">まだ案件がありません。「新規案件」から登録してください。</p>
      )}

      <div className="grid grid-cols-5 gap-4">
        {STAGES.map((stage) => {
          const inStage = cases.filter((c) => c.stage === stage)
          return (
            <section key={stage} className="rounded-card border border-line bg-white/60 p-3">
              <h2 className="mb-3 flex justify-between font-bold text-navy">
                {STAGE_LABELS[stage]}
                <span className="text-muted">{inStage.length}</span>
              </h2>
              <div className="space-y-3">
                {inStage.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="block rounded-card border border-line bg-white p-3 hover:border-navy"
                  >
                    <div className="font-bold text-navy">{c.client.name}</div>
                    <div className="text-sm">{c.property.address}</div>
                    <div className="text-sm text-muted">{c.property.propertyType.label}</div>
                    <div className="text-sm text-muted">
                      {c.leadSource === REFERRAL ? `紹介：${c.partner?.name ?? '-'}` : `相談会：${c.eventName ?? '-'}`}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted">このステージで{c.daysInStage}日</span>
                      {c.stuck && <span className="badge-stuck">停滞</span>}
                      {c.nearDeadline && <span className="badge-deadline">期限間近</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

// ✕ で絞り込みを解除できる小さなタグ。
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-navy px-3 py-1 text-sm text-navy">
      {label}
      <Link href="/" aria-label="絞り込みを解除">✕</Link>
    </span>
  )
}
