import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'

// テスト全体の前に1回だけ実行する。
// 1. 前回のテスト用データベースを削除し、毎回まっさらな状態から始める。
// 2. マイグレーション（prisma/migrations）からテーブルとマスタデータを作り直す。
// ファイルは prisma/test.db。Git の対象外（*.db）で、開発用の dev.db には触れない。
export default function setup() {
  for (const file of ['test.db', 'test.db-journal']) {
    rmSync(path.join(process.cwd(), 'prisma', file), { force: true })
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  })
}
