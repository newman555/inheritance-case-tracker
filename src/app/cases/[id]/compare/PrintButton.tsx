'use client'

// ブラウザの印刷画面を開く。ヘッダーとこのボタンは印刷されない（.no-print）。
export default function PrintButton() {
  return (
    <button className="btn-secondary" onClick={() => window.print()}>
      印刷
    </button>
  )
}
