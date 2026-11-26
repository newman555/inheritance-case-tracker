'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { callApi } from '@/lib/callApi'
import { OPTION_LABELS, yen } from '@/lib/labels'
import { canEditOptions } from '@/rules/locks'
import { OPTION_TYPES, Stage } from '@/rules/stages'

// 案件詳細の「選択肢」：ご家族が比較する、物件の扱い方。
// - 追加・削除：提案ステージより前のみ
// - 決定：提案ステージでのみ。決定すると（決定し直す場合も）、全員の同意が未同意に戻る
// できない操作のボタンは隠すが、サーバーも同じルールで確認する。

type Option = { id: number; type: string; amount: number; memo: string }
type Props = { caseId: number; stage: Stage; options: Option[]; chosenOptionId: number | null }

export default function OptionsSection({ caseId, stage, options, chosenOptionId }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')

  const editable = canEditOptions(stage)
  const canChoose = stage === 'proposal'
  // 1つの案件で各種類は1回までなので、プルダウンにはまだ使っていない種類だけを出す。
  const unusedTypes = OPTION_TYPES.filter((t) => !options.some((o) => o.type === t))
  const selectedType = unusedTypes.includes(type as (typeof OPTION_TYPES)[number]) ? type : (unusedTypes[0] ?? '')

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
    const ok = await run(`/api/cases/${caseId}/options`, 'POST', {
      type: selectedType,
      amount: amount === '' ? undefined : Number(amount),
      memo,
    })
    if (ok) {
      setAmount('')
      setMemo('')
    }
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">選択肢</h2>
        {options.length >= 2 ? (
          <Link href={`/cases/${caseId}/compare`} className="btn-secondary">比較シートを見る</Link>
        ) : (
          <span className="text-sm text-muted">比較には選択肢が2つ必要です</span>
        )}
      </div>

      {editable && options.length < 2 && (
        <p className="text-sm text-muted">提案ステージの前に、異なる種類の選択肢を2つ以上登録してください。</p>
      )}
      {!editable && <p className="text-sm text-muted">提案ステージ以降は選択肢を変更できません。</p>}
      {canChoose && (
        <p className="text-sm text-muted">ご家族が選んだ選択肢を決定してください。決定すると（決定し直す場合も）、相続人全員の同意が未同意に戻ります。</p>
      )}

      {options.length === 0 ? (
        <p className="text-muted">まだ選択肢がありません。</p>
      ) : (
        <ul className="space-y-2">
          {options.map((o) => {
            const chosen = o.id === chosenOptionId
            return (
              <li key={o.id} className={`rounded-card p-3 ${chosen ? 'border-2 border-accent' : 'border border-line'}`}>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-navy">{OPTION_LABELS[o.type]}</span>
                  <span>
                    {yen(o.amount)}
                    {o.type === 'rent' && ' / 月'}
                  </span>
                  {chosen && <span className="rounded bg-accent px-2 py-0.5 text-sm font-bold text-navy">決定済み</span>}
                  <span className="flex-1" />
                  {canChoose && !chosen && (
                    <button
                      className="btn-primary px-3 py-1 text-sm"
                      onClick={() => run(`/api/cases/${caseId}/chosen-option`, 'PUT', { optionId: o.id })}
                    >
                      決定
                    </button>
                  )}
                  {editable && (
                    <button
                      className="btn-secondary px-3 py-1 text-sm"
                      onClick={() => run(`/api/cases/${caseId}/options/${o.id}`, 'DELETE')}
                    >
                      削除
                    </button>
                  )}
                </div>
                {o.memo && <p className="mt-1 text-sm text-muted">{o.memo}</p>}
              </li>
            )
          })}
        </ul>
      )}

      {editable && unusedTypes.length > 0 && (
        <form onSubmit={add} className="grid grid-cols-[auto_10rem_1fr_auto] gap-2">
          <select className="input" value={selectedType} onChange={(e) => setType(e.target.value)}>
            {unusedTypes.map((t) => (
              <option key={t} value={t}>{OPTION_LABELS[t]}</option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            placeholder={selectedType === 'rent' ? '月額（円）' : '金額（円）'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input className="input" placeholder="メモ（メリット・デメリット）" value={memo} onChange={(e) => setMemo(e.target.value)} />
          <button className="btn-primary">選択肢を追加</button>
        </form>
      )}

      {error && <div className="error-box">{error}</div>}
    </section>
  )
}
