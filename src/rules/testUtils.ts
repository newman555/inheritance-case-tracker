import { RuleError } from './errors'

// テスト用の補助関数。関数を実行して結果を返す：
//   null        = エラーにならなかった（ルールが許可した）
//   "SOME_CODE" = その code の RuleError になった（ルールがその理由で拒否した）
// これで「何かが失敗した」ではなく、「どのルールが拒否したか」までテストで確認できる。
export function codeOf(fn: () => unknown): string | null {
  try {
    fn()
    return null
  } catch (e) {
    return e instanceof RuleError ? e.code : 'NOT_A_RULE_ERROR'
  }
}
