import { RuleError } from './errors'
import { Stage } from './stages'

// ルール9。ここで扱う日付はすべて "YYYY-MM-DD" の文字列（時刻もタイムゾーンもない暦日）。
// そのため、タイムゾーンの違いで日付が1日ずれることがない。
const DAY_MS = 86_400_000 // 1日のミリ秒

// 実在する日付か。"2026-02-30" は形は正しいが存在しない。
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  // JavaScript は 2月30日を 3月2日に変えてしまう。入力と食い違えば存在しない日付。
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

// 日付の文字列 → 引き算できる数値。
function toUtc(value: string): number {
  const [y, m, d] = value.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// from から to までの日数（to の方が前ならマイナス）。
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

// 法定期限の日付：value（死亡日）から「Nか月」の期間が終わる日。
// 民法・国税通則法の期間の数え方に合わせる：
//   1. 初日は数えない。数え始めは翌日
//   2. Nか月後の同じ日付（応当日）の前日に終わる
//   3. Nか月後の月にその日付がなければ、その月の末日に終わる
// 例：
//   1/15 ＋ 3か月 → 1/16 から数え、4/16 の前日 → 4/15（ふつうは同じ日付になる）
//   8/31 ＋ 3か月 → 9/1 から数え、12/1 の前日 → 11/30
//   9/30 ＋ 3か月 → 10/1 から数え、1/1 の前日 → 12/31（月末の死亡は、期限も月末）
//   7/30 ＋ 4か月 → 7/31 から数え、11/31 はない → 11/30（その月の末日）
export function deadlineFrom(value: string, months: number): string {
  if (!isValidDate(value)) {
    throw new RuleError('INVALID_DATE', '日付が正しくありません。', 400)
  }
  const [y, m, d] = value.split('-').map(Number)

  // 1. 数え始めの日（翌日）。月末なら翌月の1日になる。
  const start = new Date(Date.UTC(y, m - 1, d + 1))
  const startDay = start.getUTCDate()

  // Nか月後の月の1日と、その月の末日（翌月の0日 = その月の末日）。
  const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()

  // 3. 応当日がない → その月の末日。2. ある → 応当日の前日（応当日が1日なら、前の月の末日になる）。
  const dueDay = startDay > lastDay ? lastDay : startDay - 1
  const due = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), dueDay))

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${due.getUTCFullYear()}-${pad(due.getUTCMonth() + 1)}-${pad(due.getUTCDate())}`
}

export type Deadline = { key: string; label: string; due: string; daysLeft: number }

// 死亡日から数える3つの法定期限（法律上は「相続の開始を知った日」から数える。README の「既知の簡略化」に記載）。
const DEADLINES = [
  { key: 'renounce', label: '相続放棄（家庭裁判所への申述）', months: 3 },
  { key: 'final_income_tax', label: '準確定申告（被相続人の所得税）', months: 4 },
  { key: 'inheritance_tax', label: '相続税の申告・納付', months: 10 },
]

// 死亡日の入力チェック（案件の登録時）：実在する日付で、未来の日付ではないこと。
// `today` は時計から読まずに引数で受け取るので、テストは常に同じ結果になる。
export function validateDateOfDeath(dateOfDeath: string, today: string): void {
  if (!isValidDate(dateOfDeath)) {
    throw new RuleError('INVALID_DATE', '死亡日が正しくありません。', 400, 'dateOfDeath')
  }
  // "YYYY-MM-DD" の文字列は日付順に並ぶので、> で「より後」を判定できる。
  if (dateOfDeath > today) {
    throw new RuleError('DATE_IN_FUTURE', '死亡日に未来の日付は指定できません。', 400, 'dateOfDeath')
  }
}

// 3つの期限と、`today` から見た残り日数（表示用）。
// 上の入力チェックとは分けている：表示のたびにチェックして拒否すると、データベースを直接編集して
// 正しくない日付が1件入っただけで、ボード全体が表示できなくなるため。
// 正しくない日付からは期限を計算せず、空の配列を返す（「期限間近」のバッジも付かない）。
export function deadlinesFor(dateOfDeath: string, today: string): Deadline[] {
  if (!isValidDate(dateOfDeath)) return []
  return DEADLINES.map(({ key, label, months }) => {
    const due = deadlineFrom(dateOfDeath, months)
    return { key, label, due, daysLeft: daysBetween(today, due) }
  })
}

// 「期限間近」バッジ：完了していない案件で、期限まで30日以内（または超過）のものがある。
export function isNearDeadline(stage: Stage, deadlines: Deadline[]): boolean {
  return stage !== 'closed' && deadlines.some((d) => d.daysLeft <= 30)
}

// 「停滞」バッジ：完了していない案件で、14日以上ステージが動いていない。
export function isStuck(stage: Stage, stageUpdatedAt: string, today: string): boolean {
  return stage !== 'closed' && daysBetween(stageUpdatedAt, today) >= 14
}
