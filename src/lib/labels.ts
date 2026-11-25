// データベースに保存されたコードに対する、画面の表示名。ここで一度だけ定義し、すべての画面で使う。
// （物件種別・提携先種別・続柄はここにはない：表示名はデータベースのマスタにある）

export const STAGE_LABELS: Record<string, string> = {
  intake: '受付',
  consultation: '相談',
  proposal: '提案',
  contract: '契約',
  closed: '完了',
}

export const OPTION_LABELS: Record<string, string> = {
  sell: '売却',
  rent: '賃貸',
  build: '建築',
  keep: '保有',
}

// 20000000 -> "20,000,000円"
export function yen(amount: number): string {
  return amount.toLocaleString('ja-JP') + '円'
}
