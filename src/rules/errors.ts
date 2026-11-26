// 業務ルールや入力チェックが「できない」と判断したときに投げるエラー。すべて同じ形で投げ、
// API の fail()（src/lib/http.ts）がそのまま JSON の応答に変える。
//
// code    = 拒否の理由を表す短いラベル（例：NEED_TWO_OPTIONS）。テストはこれで「どのルールが拒否したか」を確認する
// message = 画面に表示する文章
// status  = API が返す HTTP ステータス。省略すると 409
//             400 = 入力が誤っている（例：存在しない日付）
//             404 = 対象が見つからない
//             409 = 入力は正しいが、現在の状態ではルール上できない
// field   = 誤りのある入力項目。画面はその項目の下に message を表示する（特定の項目の問題でなければ null）
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
