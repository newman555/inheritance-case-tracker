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

// 日付に月数を足す。足した先の月が短い場合は、その月の末日にする。
//   8/31 ＋ 3か月 → 11/30（そのまま JavaScript で計算すると 12/1 になってしまう）
export function addMonthsClamped(value: string, months: number): string {
  if (!isValidDate(value)) {
    throw new RuleError('INVALID_DATE', '日付が正しくありません。', 400)
  }
  const [y, m, d] = value.split('-').map(Number)

  // 足した先の月の1日を作り、その月の末日（翌月の0日）を求める。
  const first = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()

  const day = Math.min(d, lastDay)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${first.getUTCFullYear()}-${pad(first.getUTCMonth() + 1)}-${pad(day)}`
}

export type Deadline = { key: string; label: string; due: string; daysLeft: number }

// 死亡日から数える3つの法定期限。
const DEADLINES = [
  { key: 'renounce', label: '相続放棄（家庭裁判所への申述）', months: 3 },
  { key: 'final_income_tax', label: '準確定申告（被相続人の所得税）', months: 4 },
  { key: 'inheritance_tax', label: '相続税の申告・納付', months: 10 },
]

// 3つの期限と、`today` から見た残り日数を計算する。
// `today` は時計から読まずに引数で受け取るので、テストは常に同じ結果になる。
export function deadlinesFor(dateOfDeath: string, today: string): Deadline[] {
  if (!isValidDate(dateOfDeath)) {
    throw new RuleError('INVALID_DATE', '死亡日が正しくありません。', 400, 'dateOfDeath')
  }
  if (dateOfDeath > today) {
    // "YYYY-MM-DD" の文字列は日付順に並ぶので、> で「より後」を判定できる。
    throw new RuleError('DATE_IN_FUTURE', '死亡日に未来の日付は指定できません。', 400, 'dateOfDeath')
  }
  return DEADLINES.map(({ key, label, months }) => {
    const due = addMonthsClamped(dateOfDeath, months)
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
