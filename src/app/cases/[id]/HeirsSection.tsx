'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { callApi } from '@/lib/callApi'
import type { Lookup } from '@/lib/lookups'
import { canEditHeirs, canRemoveHeirs } from '@/rules/locks'
import { Stage } from '@/rules/stages'

// 案件詳細の「相続人」：相続する方々と、それぞれの同意の有無。
// 契約には相続人1名以上と全員の同意が必要。
// 削除は提案ステージから、追加と同意の変更は契約ステージからできない。
// できない操作のボタンは隠す（同意のチェックは押せなくする）が、サーバーも同じルールで確認する。

type Heir = { id: number; name: string; relationshipLabel: string; agreed: boolean }
type Props = { caseId: number; stage: Stage; heirs: Heir[]; relationships: Lookup[] }

export default function HeirsSection({ caseId, stage, heirs, relationships }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState(relationships[0]?.code ?? '')

  const editable = canEditHeirs(stage) // 追加・同意の変更
  const removable = canRemoveHeirs(stage) // 削除（提案ステージからできない）
  const agreedCount = heirs.filter((h) => h.agreed).length

  // API を1回呼ぶ。成功：ページのデータを再読み込み。拒否：サーバーのメッセージを表示。
  async function run(url: string, method: string, body?: unknown) {
    setError(null)
    const result = await callApi(url, method, body)
    if (!result.ok) {
      setError(result.error.message)
      return false
    }
    router.refresh()
    return true
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    if (await run(`/api/cases/${caseId}/heirs`, 'POST', { name, relationship })) {
      setName('')
    }
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">相続人</h2>
        {heirs.length > 0 && agreedCount === heirs.length ? (
          <span className="badge-ok">全員同意済み</span>
        ) : (
          <span className="text-sm text-muted">{heirs.length}名中 {agreedCount}名が同意</span>
        )}
      </div>

      {!editable && <p className="text-sm text-muted">契約ステージ以降は相続人と同意を変更できません。</p>}
      {editable && !removable && (
        <p className="text-sm text-muted">提案ステージ以降は相続人を削除できません（追加と同意の変更は契約の前までできます）。</p>
      )}

      {heirs.length === 0 ? (
        <p className="text-muted">まだ相続人がいません。契約には1名以上の登録と全員の同意が必要です。</p>
      ) : (
        <ul className="divide-y divide-line">
          {heirs.map((h) => (
            <li key={h.id} className="flex items-center gap-4 py-2">
              <span className="flex-1">
                {h.name} <span className="text-muted">（{h.relationshipLabel}）</span>
              </span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={h.agreed}
                  disabled={!editable}
                  onChange={(e) => run(`/api/cases/${caseId}/heirs/${h.id}`, 'PATCH', { agreed: e.target.checked })}
                />
                同意
              </label>
              {removable && (
                <button
                  className="btn-secondary px-3 py-1 text-sm"
                  onClick={() => run(`/api/cases/${caseId}/heirs/${h.id}`, 'DELETE')}
                >
                  削除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <form onSubmit={add} className="flex gap-2">
          <input className="input" placeholder="氏名" value={name} onChange={(e) => setName(e.target.value)} />
          {/* 選択肢は RelationshipType テーブル（マスタデータ）から。 */}
          <select className="input max-w-[12rem]" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            {relationships.map((r) => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </select>
          <button className="btn-primary shrink-0">相続人を追加</button>
        </form>
      )}

      {error && <div className="error-box">{error}</div>}
    </section>
  )
}
