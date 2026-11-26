import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // 開発サーバー（npm run dev）は、ファイルが変わるとアプリを再ビルドする。
      // SQLite のデータベース（prisma/dev.db とその一時ファイル）は保存のたびに書き換わるため、
      // そのままだと保存のたびに再ビルドが走り、画面の更新が遅れたり止まったりする。監視の対象から外す。
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/prisma/*.db*'],
      }
    }
    return config
  },
}

export default nextConfig
