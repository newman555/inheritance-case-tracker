'use client'

import { useState, useTransition } from 'react'
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
  const [busy, setBusy] = useState(false) // API の応答を待っている間
  const [refreshing, startRefresh] = useTransition() // 新しいページのデータを待っている間
  // 画面が新しいステージに変わるまでボタンを押せなくする。押せると、古い表示のまま二度押しでき、
  // 「ステージを飛ばしたり戻したりすることはできません」のエラーになってしまう。
  const working = busy || refreshing

  if (!nextStage) {
    return <p className="text-muted">この案件は完了しています。これ以上ステージは動きません。</p>
  }

  async function move() {
    setBusy(true)
    setError(null)
    const result = await callApi(`/api/cases/${caseId}/advance`, 'POST', { toStage: nextStage })
    setBusy(false)
    if (!result.ok) return setError(result.error.message)
    startRefresh(() => router.refresh()) // ページのデータを再読み込み：新しいステージ、タイムラインの新しい行
  }

  return (
    <div className="space-y-2">
      <button onClick={move} disabled={working} className="btn-primary">
        {working ? '処理中...' : `「${nextLabel}」へ進める`}
      </button>
      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
