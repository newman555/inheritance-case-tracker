'use client'

import { FormEvent, ReactNode, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ApiError, callApi } from '@/lib/callApi'
import type { Lookup } from '@/lib/lookups'
import { EVENT, REFERRAL } from '@/rules/leadSource'

// 画面②のフォーム。入力を POST /api/cases に送り、結果を表示する。
// ルールはすべてサーバーで確認する。このフォームはサーバーの答えを表示するだけ。

type Props = {
  partners: { id: number; name: string }[]
  propertyTypes: Lookup[]
  today: string // 日本時間の "YYYY-MM-DD"：日付の入力で選べる最後の日
}

export default function NewCaseForm({ partners, propertyTypes, today }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    propertyAddress: '',
    propertyType: propertyTypes[0]?.code ?? '',
    estimatedPrice: '',
    dateOfDeath: '',
    leadSource: REFERRAL as string,
    partnerId: '',
    eventName: '',
    eventDate: '',
  })
  const [error, setError] = useState<ApiError | null>(null)
  const [saving, setSaving] = useState(false)
  const isEvent = form.leadSource === EVENT

  // フォームの1項目を更新する。
  const set = (name: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [name]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await callApi<{ id: number }>('/api/cases', 'POST', {
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      propertyAddress: form.propertyAddress,
      propertyType: form.propertyType,
      // 空欄は「値なし」で送るので、サーバーが「数値で入力してください」と返す。
      estimatedPrice: form.estimatedPrice === '' ? undefined : Number(form.estimatedPrice),
      dateOfDeath: form.dateOfDeath,
      leadSource: form.leadSource,
      partnerId: form.partnerId === '' ? null : Number(form.partnerId),
      eventName: isEvent ? form.eventName : null,
      eventDate: isEvent ? form.eventDate : null,
    })
    setSaving(false)
    if (!result.ok) return setError(result.error)
    router.push(`/cases/${result.data.id}`) // 登録した案件のページへ移動
  }

  // ラベル・入力欄と、この項目についてのサーバーのメッセージ（赤字）。
  const field = (label: ReactNode, name: string, input: ReactNode) => (
    <label className="block space-y-1">
      <span>{label}</span>
      {input}
      {error?.field === name && <p className="field-error">{error.message}</p>}
    </label>
  )

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* 特定の項目の問題ではない拒否（例：この電話番号は別の名前で登録済み）。 */}
      {error && !error.field && <div className="error-box">{error.message}</div>}

      <section className="card space-y-4">
        <h2 className="font-bold text-navy">依頼者</h2>
        {field('氏名', 'clientName', <input className="input" value={form.clientName} onChange={set('clientName')} />)}
        {field(
          '電話番号',
          'clientPhone',
          <input className="input" value={form.clientPhone} onChange={set('clientPhone')} placeholder="090-1234-5678" />,
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold text-navy">物件</h2>
        {field('所在地', 'propertyAddress', <input className="input" value={form.propertyAddress} onChange={set('propertyAddress')} />)}
        {field(
          '物件種別',
          'propertyType',
          <select className="input" value={form.propertyType} onChange={set('propertyType')}>
            {propertyTypes.map((t) => (
              <option key={t.code} value={t.code}>{t.label}</option>
            ))}
          </select>,
        )}
        {field(
          '査定額（円）',
          'estimatedPrice',
          <input className="input" type="number" value={form.estimatedPrice} onChange={set('estimatedPrice')} />,
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold text-navy">案件</h2>
        {/* max={today}：未来の日付は選べない。サーバーも未来の日付を拒否する。 */}
        {field(
          '死亡日',
          'dateOfDeath',
          <input className="input" type="date" max={today} value={form.dateOfDeath} onChange={set('dateOfDeath')} />,
        )}
        {field(
          '流入経路',
          'leadSource',
          <select className="input" value={form.leadSource} onChange={set('leadSource')}>
            <option value={REFERRAL}>提携先からの紹介</option>
            <option value={EVENT}>相談会</option>
          </select>,
        )}

        {/* 紹介の場合は提携先が必須。相談会の場合は任意。 */}
        {field(
          <>提携先 {isEvent && <span className="text-muted">（任意）</span>}</>,
          'partnerId',
          <select className="input" value={form.partnerId} onChange={set('partnerId')}>
            <option value="">なし</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>,
        )}
        {partners.length === 0 && (
          <p className="text-sm text-muted">
            まだ提携先がありません。<Link href="/partners" className="link">提携先ページで追加してください。</Link>
          </p>
        )}

        {/* 名称と日付は相談会の場合のみ。 */}
        {isEvent && (
          <>
            {field('相談会の名称', 'eventName', <input className="input" value={form.eventName} onChange={set('eventName')} />)}
            {field(
              '相談会の日付',
              'eventDate',
              <input className="input" type="date" max={today} value={form.eventDate} onChange={set('eventDate')} />,
            )}
          </>
        )}
      </section>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? '登録中...' : '案件を登録'}
      </button>
    </form>
  )
}
