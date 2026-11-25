'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { callApi } from '@/lib/callApi'

// 「次のステージへ進める」ボタン。サーバー（POST /api/cases/:id/advance）に依頼するだけで、
// 判断はサーバーが行う。ルールが拒否した場合は、その理由を赤枠で表示する。
type Props = {
  caseId: number
  nextStage: string | null // 完了した案件では null
  nextLabel: string | null
}

export default function AdvanceButton({ caseId, nextStage, nextLabel }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!nextStage) {
    return <p className="text-muted">この案件は完了しています。これ以上ステージは動きません。</p>
  }

  async function move() {
    setBusy(true)
    setError(null)
    const result = await callApi(`/api/cases/${caseId}/advance`, 'POST', { toStage: nextStage })
    setBusy(false)
    if (!result.ok) return setError(result.error.message)
    router.refresh() // ページのデータを再読み込み：新しいステージ、タイムラインの新しい行
  }

  return (
    <div className="space-y-2">
      <button onClick={move} disabled={busy} className="btn-primary">
        {busy ? '処理中...' : `「${nextLabel}」へ進める`}
      </button>
      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
