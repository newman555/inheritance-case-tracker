import { RuleError } from './errors'

// ルール7。電話番号をどんな書き方でも同じ数字の並びにそろえる。
//   "090-1234-5678"           -> "09012345678"
//   "０９０－１２３４－５６７８" -> "09012345678"（全角数字）
//   "+81 90-1234-5678"        -> "09012345678"（国際表記）
//   "+81 090-1234-5678"       -> "09012345678"（国際表記で 0 を残した書き方）
// 同じ番号が常に同じ形にならないと、同じ依頼者を二重に登録してしまう。
export function normalizePhone(raw: string): string {
  // 手順1：NFKC で全角文字を半角にする。数字と "+" だけを残す。
  let s = raw.normalize('NFKC').trim().replace(/[^\d+]/g, '')

  // 手順2："+81"（日本の国番号）を先頭の 0 に戻す。
  //        "+81 090…" のように 0 を残した書き方もあるので、+81 の直後の 0 を取り除いてから 0 を付ける。
  if (s.startsWith('+81')) {
    s = '0' + s.slice(3).replace(/^0/, '')
  }

  // 手順3：残った "+"（+81 以外の国番号など）を取り除き、数字だけにする。
  s = s.replace(/\D/g, '')

  // 手順4：日本の電話番号は 0 から始まる10桁または11桁。
  if (!/^0\d{9,10}$/.test(s)) {
    throw new RuleError('INVALID_PHONE', '電話番号は0から始まる10桁または11桁で入力してください。', 400, 'clientPhone')
  }
  return s
}

// 名前は空白（半角・全角）を除き、大文字・小文字を区別せずに比べる。
function normalizeName(name: string): string {
  return name.normalize('NFKC').replace(/\s+/g, '').toLowerCase()
}

// 電話番号は1件だけ登録する。すでに登録されている場合：
//   - 名前が同じ → 同じ方が再び来られた（例：二次相続）ので、既存の依頼者を再利用
//   - 名前が違う → 別の方と取り違えないよう拒否
// `existing` はこの電話番号で登録済みの依頼者（新しい番号なら null）。
export function resolveClient(existing: { name: string } | null, inputName: string): 'create' | 'reuse' {
  if (existing === null) return 'create'
  if (normalizeName(existing.name) === normalizeName(inputName)) return 'reuse'
  throw new RuleError('PHONE_NAME_MISMATCH', 'この電話番号は別の名前の依頼者で登録されています。', 409, 'clientPhone')
}
