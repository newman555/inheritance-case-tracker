import Link from 'next/link'
import { getLookups } from '@/lib/lookups'
import { listPartners } from '@/lib/partners'
import AddPartnerForm from './AddPartnerForm'

// 画面⑤：提携先。各事務所が紹介した案件数と、そのうち完了した案件数。
// サーバーコンポーネント：GET /api/partners と同じ関数でデータベースを読む。
export const dynamic = 'force-dynamic'

export default async function PartnersPage() {
  const [partners, { partnerTypes }] = await Promise.all([listPartners(), getLookups()])

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-navy">提携先</h1>

      <section className="card">
        {partners.length === 0 ? (
          <p className="text-muted">まだ提携先がありません。下のフォームから追加してください。</p>
        ) : (
          <table className="w-full text-left">
            <thead className="text-sm text-muted">
              <tr>
                <th className="py-2 font-normal">名称</th>
                <th className="font-normal">種別</th>
                <th className="text-right font-normal">紹介件数</th>
                <th className="text-right font-normal">完了件数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {partners.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{p.name}</td>
                  <td>{p.typeLabel}</td>
                  {/* 件数をクリックすると、この提携先の案件だけをボードに表示する。 */}
                  <td className="text-right">
                    <Link href={`/?partner=${p.id}`} className="link">{p.referred}</Link>
                  </td>
                  <td className="text-right">{p.closed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AddPartnerForm partnerTypes={partnerTypes} />
    </div>
  )
}
