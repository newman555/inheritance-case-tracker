import { PrismaClient } from '@prisma/client'

// アプリ全体で共有するデータベース接続を1つだけ作る。
// 開発中の Next.js はコードを頻繁に再読み込みするため、そのたびに新しい接続ができてしまう。
// 最初の接続を、再読み込みしても消えない `globalThis` に保存して使い回す。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
