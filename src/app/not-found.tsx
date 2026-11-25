import Link from 'next/link'

// 存在しないアドレス（データベースにない案件の id を含む）で表示する。
export default function NotFound() {
  return (
    <div className="card space-y-2">
      <h1 className="text-xl font-bold text-navy">ページが見つかりません</h1>
      <p>このページまたは案件は存在しません。</p>
      <Link href="/" className="link">パイプラインボードに戻る</Link>
    </div>
  )
}
