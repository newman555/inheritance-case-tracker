import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCaseDetail } from '@/lib/cases'
import { OPTION_LABELS, STAGE_LABELS, yen } from '@/lib/labels'
import { brokerageFee } from '@/rules/fee'
import PrintButton from './PrintButton'

// 画面④：比較シート。案件のすべての選択肢を横に並べる。閲覧専用で印刷できる。
// ARPRO の考え方「すべての選択肢をご家族に示し、売却を押し付けない」を形にした画面。
export const dynamic = 'force-dynamic'

// 選択肢1列分の数字。
//   売却：価格 − 仲介手数料（法定上限）= 手数料控除後の金額
//   賃貸：月額賃料 × 12か月 × 10年 = 10年分の賃料収入
//   建築・保有：金額のみ（内容はメモで説明）
type Figures = { rows: [string, string][]; result: [string, string] | null }

function figures(o: { type: string; amount: number }): Figures {
  if (o.type === 'sell') {
    const fee = brokerageFee(o.amount)
    return {
      rows: [
        ['売却価格', yen(o.amount)],
        ['仲介手数料（法定上限）', `− ${yen(fee)}`],
      ],
      result: ['手数料控除後', yen(o.amount - fee)],
    }
  }
  if (o.type === 'rent') {
    return {
      rows: [
        ['月額賃料', yen(o.amount)],
        ['期間', '12か月 × 10年'],
      ],
      result: ['10年分の賃料収入', yen(o.amount * 12 * 10)],
    }
  }
  return { rows: [['金額', yen(o.amount)]], result: null }
}

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const c = await getCaseDetail(id)
  if (!c) notFound()

  const agreedCount = c.heirs.filter((h) => h.agreed).length

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link href={`/cases/${c.id}`} className="link">← 案件に戻る</Link>
        <PrintButton />
      </div>

      <section className="card space-y-1">
        <h1 className="text-xl font-bold text-navy">{c.client.name} 様　選択肢の比較</h1>
        <p>
          {c.property.address}（{c.property.propertyType.label}）・査定額 {yen(c.property.estimatedPrice)}
        </p>
        <p className="text-muted">
          ステージ：{STAGE_LABELS[c.stage]}・相続人 {c.heirs.length}名中 {agreedCount}名が同意
        </p>
      </section>

      {c.options.length < 2 && <p className="card text-muted">比較するには、案件ページで選択肢を2つ以上登録してください。</p>}

      {/* 選択肢ごとに1列。決定済みの選択肢は黄色の枠。 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(c.options.length, 1)}, minmax(0, 1fr))` }}>
        {c.options.map((o) => {
          const chosen = o.id === c.chosenOptionId
          const f = figures(o)
          return (
            <section key={o.id} className={`card space-y-3 ${chosen ? 'border-2 border-accent' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-navy">{OPTION_LABELS[o.type]}</h2>
                {chosen && <span className="rounded bg-accent px-2 py-0.5 text-sm font-bold text-navy">決定済み</span>}
              </div>
              <dl className="space-y-1">
                {f.rows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-muted">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
                {f.result && (
                  <div className="flex justify-between gap-2 border-t border-line pt-1 font-bold">
                    <dt>{f.result[0]}</dt>
                    <dd>{f.result[1]}</dd>
                  </div>
                )}
              </dl>
              {o.memo && <p className="text-sm">{o.memo}</p>}
            </section>
          )
        })}
      </div>

      <p className="text-sm text-muted">
        仲介手数料は法定上限額（消費税10%込み）です。800万円以下の物件の特例は反映していません。
        賃料収入は経費・税金を差し引く前の金額です。
      </p>
    </div>
  )
}
