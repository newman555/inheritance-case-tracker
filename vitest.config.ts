import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // テストでもアプリと同じ "@/..." の import を使えるようにする。
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  test: {
    // 全テストの前に1回実行：まっさらなテスト用データベースを作る。
    globalSetup: ['./src/test/globalSetup.ts'],
    // テストは専用のデータベースファイルを使い、開発用の dev.db には触れない。
    env: { DATABASE_URL: 'file:./test.db' },
    // API テストは1つのデータベースファイルを共有するので、テストファイルは1つずつ順番に実行する。
    fileParallelism: false,
  },
})
