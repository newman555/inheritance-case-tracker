'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiError, callApi } from '@/lib/callApi'
import type { Lookup } from '@/lib/lookups'

// 画面⑤の「提携先を追加」フォーム。POST /api/partners を送り、一覧を再読み込みする。
export default function AddPartnerForm({ partnerTypes }: { partnerTypes: Lookup[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [type, setType] = useState(partnerTypes[0]?.code ?? '')
  const [error, setError] = useState<ApiError | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const result = await callApi('/api/partners', 'POST', { name, type })
    if (!result.ok) return setError(result.error)
    setName('')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-bold text-navy">提携先を追加</h2>
      <div className="flex gap-2">
        <input className="input" placeholder="事務所名" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input max-w-xs" value={type} onChange={(e) => setType(e.target.value)}>
          {partnerTypes.map((t) => (
            <option key={t.code} value={t.code}>{t.label}</option>
          ))}
        </select>
        <button className="btn-primary shrink-0">追加</button>
      </div>
      {error && <p className="field-error">{error.message}</p>}
    </form>
  )
}
