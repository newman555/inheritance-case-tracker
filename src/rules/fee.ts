import { RuleError } from './errors'

// ルール8。売却時の仲介手数料：法定上限額、消費税10%込み、円未満切り捨て。
//
//   価格 200万円以下        ：価格の 5%
//   価格 400万円以下        ：価格の 4% ＋ 2万円
//   価格 400万円超          ：価格の 3% ＋ 6万円
//   最後に消費税 10% を加える
//
// 例：3,000万円 → 3% = 90万円 ＋ 6万円 = 96万円 → ＋10% = 1,056,000円
//
// 意図的に対応していないもの：800万円以下の物件の特例（上限33万円、2024年7月〜）。
// README の「既知の簡略化」に記載。
export function brokerageFee(price: number): number {
  // 価格は1円以上の整数であること。
  if (!Number.isInteger(price) || price <= 0) {
    throw new RuleError('INVALID_PRICE', '金額は1円以上の整数で入力してください。', 400, 'amount')
  }

  let base: number
  if (price <= 2_000_000) {
    base = Math.floor((price * 5) / 100)
  } else if (price <= 4_000_000) {
    base = Math.floor((price * 4) / 100) + 20_000
  } else {
    base = Math.floor((price * 3) / 100) + 60_000
  }

  // 消費税10%。「× 11 ÷ 10」で整数のまま計算し、Math.floor で切り捨てる。
  return Math.floor((base * 11) / 10)
}
