import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCaseDetail, stageOf } from '@/lib/cases'
import { STAGE_LABELS, yen } from '@/lib/labels'
import { getLookups } from '@/lib/lookups'
import { toJstDate } from '@/lib/today'
import { REFERRAL } from '@/rules/leadSource'
import { STAGES, stageIndex } from '@/rules/stages'
import AdvanceButton from './AdvanceButton'
import HeirsSection from './HeirsSection'
import OptionsSection from './OptionsSection'

// 画面③：案件詳細。サーバーコンポーネント：GET /api/cases/:id と同じ関数で案件を読む。
// ボタンはブラウザ側の小さな部品で、API を呼んだ後にこのページのデータを再読み込みする。
export const dynamic = 'force-dynamic'

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  // アドレスの id は正の整数であること。そうでなければ「見つかりません」。
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const [c, { relationships }] = await Promise.all([getCaseDetail(id), getLookups()])
  if (!c) notFound()

  const stage = stageOf(c)
  // この案件が進めるのは、配列で次のステージだけ（「完了」の後はない）。
  const nextStage = STAGES[stageIndex(stage) + 1] ?? null

  // タイムライン：案件の登録日、そのあとステージが動くたびに1行。
  const timeline = [
    { text: '案件登録', date: toJstDate(c.createdAt) },
    ...c.history.map((h) => ({
      text: `${STAGE_LABELS[h.fromStage]} → ${STAGE_LABELS[h.toStage]}`,
      date: toJstDate(h.changedAt),
    })),
  ]

  return (
    <div className="space-y-6">
      <Link href="/" className="link">← パイプラインボード</Link>

      {/* ヘッダー：依頼者、物件、流入経路、ステージ移動ボタン */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-navy">{c.client.name}</h1>
          <span className="rounded-full bg-navy px-3 py-1 text-sm text-white">{STAGE_LABELS[stage]}</span>
          {c.stuck && <span className="badge-stuck">停滞</span>}
          {c.nearDeadline && <span className="badge-deadline">期限間近</span>}
          <span className="text-muted">このステージで{c.daysInStage}日</span>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Info label="電話番号">{c.client.phone}</Info>
          <Info label="死亡日">{c.dateOfDeath}</Info>
          <Info label="物件">
            {c.property.address} <span className="text-muted">（{c.property.propertyType.label}）</span>
          </Info>
          <Info label="査定額">{yen(c.property.estimatedPrice)}</Info>
          <Info label="流入経路">
            {c.leadSource === REFERRAL ? '提携先からの紹介' : `相談会：${c.eventName}（${c.eventDate}）`}
          </Info>
          <Info label="提携先">
            {c.partner ? (
              <Link href={`/?partner=${c.partner.id}`} className="link">{c.partner.name}</Link>
            ) : (
              <span className="text-muted">なし</span>
            )}
          </Info>
          <Info label="依頼者の案件">
            <Link href={`/?client=${c.client.id}`} className="link">この依頼者の案件をすべて表示</Link>
          </Info>
        </dl>

        <AdvanceButton caseId={c.id} nextStage={nextStage} nextLabel={nextStage ? STAGE_LABELS[nextStage] : null} />
      </section>

      <div className="grid grid-cols-3 gap-6">
        {/* 左：ご家族が決めること */}
        <div className="col-span-2 space-y-6">
          <OptionsSection
            caseId={c.id}
            stage={stage}
            chosenOptionId={c.chosenOptionId}
            options={c.options.map((o) => ({ id: o.id, type: o.type, amount: o.amount, memo: o.memo }))}
          />
          <HeirsSection
            caseId={c.id}
            stage={stage}
            relationships={relationships}
            heirs={c.heirs.map((h) => ({
              id: h.id,
              name: h.name,
              relationshipLabel: h.relationshipType.label, // 表示名はデータベースのマスタから
              agreed: h.agreed,
            }))}
          />
        </div>

        {/* 右：日付 */}
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 font-bold text-navy">法定期限</h2>
            <ul className="space-y-3">
              {c.deadlines.map((d) => (
                <li key={d.key}>
                  <div>{d.label}</div>
                  <div className={d.daysLeft <= 30 && stage !== 'closed' ? 'font-bold text-danger-text' : 'text-muted'}>
                    {d.due}・{d.daysLeft >= 0 ? `残り${d.daysLeft}日` : `${-d.daysLeft}日超過`}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">死亡日から計算しています。</p>
          </section>

          <section className="card">
            <h2 className="mb-3 font-bold text-navy">タイムライン</h2>
            <ol className="space-y-2">
              {timeline.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-24 shrink-0 text-muted">{t.date}</span>
                  <span>{t.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}

// ヘッダーの項目名と値の1組。
function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
