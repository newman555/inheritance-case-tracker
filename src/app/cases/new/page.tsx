import { getLookups } from '@/lib/lookups'
import { listPartners } from '@/lib/partners'
import { todayJst } from '@/lib/today'
import NewCaseForm from './NewCaseForm'

// 画面②：新規案件。サーバーがプルダウンのデータと今日の日付（日本時間）を読み込み、
// 残りはフォーム（ブラウザ側）が担当する。
export const dynamic = 'force-dynamic'

export default async function NewCasePage() {
  const [partners, { propertyTypes }] = await Promise.all([listPartners(), getLookups()])

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-navy">新規案件</h1>
      <NewCaseForm
        partners={partners.map((p) => ({ id: p.id, name: p.name }))}
        propertyTypes={propertyTypes}
        today={todayJst()}
      />
    </div>
  )
}
