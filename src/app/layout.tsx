import type { ReactNode } from 'react'
import Link from 'next/link'
import './globals.css'

// すべてのページの外枠：リンクの付いたネイビーのヘッダーと、その下のページ本体。
export const metadata = { title: '相続案件管理' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* ARPRO のサイトと同じフォント。ブラウザが Google Fonts から読み込む。 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <header className="no-print border-b-4 border-accent bg-navy text-white">
          <nav className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-3">
            <Link href="/" className="font-bold">相続案件管理</Link>
            <Link href="/" className="hover:text-accent">案件</Link>
            <Link href="/partners" className="hover:text-accent">提携先</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-[1200px] px-6 py-6">{children}</main>
      </body>
    </html>
  )
}
