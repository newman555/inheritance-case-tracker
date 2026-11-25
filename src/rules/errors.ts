// 業務ルールが「できない」と判断したときに投げるエラー。すべてのルールが同じ形で返す。
//
// code    = ルールを表す短いラベル（例：NEED_TWO_OPTIONS）。テストと画面が使う
// message = 画面に表示する文章
// status  = API が返す HTTP ステータス
//             400 = 入力が誤っている（例：存在しない日付）
//             404 = 対象が見つからない
//             409 = 入力は正しいが、現在の状態ではルール上できない
// field   = 誤りのある入力項目（特定の項目の問題でなければ null）
export class RuleError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: 400 | 404 | 409 = 409,
    public field: string | null = null,
  ) {
    super(message)
    this.name = 'RuleError'
  }
}
