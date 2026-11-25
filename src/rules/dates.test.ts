import { describe, expect, it } from 'vitest'
import { addMonthsClamped, deadlinesFor, isNearDeadline, isStuck } from './dates'
import { codeOf } from './testUtils'

describe('法定期限', () => {
  it('通常の日付に3・4・10か月を足す', () => {
    const d = deadlinesFor('2026-01-15', '2026-02-01')
    expect(d.map((x) => x.due)).toEqual(['2026-04-15', '2026-05-15', '2026-11-15'])
    expect(d[0].daysLeft).toBe(73) // 2/1 → 4/15
  })
  it('8/31 ＋ 3か月は 12/1 ではなく 11/30', () => {
    expect(addMonthsClamped('2026-08-31', 3)).toBe('2026-11-30')
  })
  it('2月の末日に丸める（平年・うるう年）', () => {
    expect(addMonthsClamped('2026-11-30', 3)).toBe('2027-02-28')
    expect(addMonthsClamped('2027-11-30', 3)).toBe('2028-02-29')
  })
  it('年をまたぐ', () => {
    expect(addMonthsClamped('2026-10-31', 10)).toBe('2027-08-31')
  })
  it('存在しない日付は拒否する', () => {
    expect(codeOf(() => deadlinesFor('2026-02-30', '2026-03-01'))).toBe('INVALID_DATE')
  })
  it('未来の死亡日は拒否する', () => {
    expect(codeOf(() => deadlinesFor('2026-12-01', '2026-11-25'))).toBe('DATE_IN_FUTURE')
  })
})

describe('バッジ（完了していない案件のみ）', () => {
  it('期限まで30日以内なら「期限間近」', () => {
    // 死亡日 2026-08-27 → 3か月の期限は 2026-11-27。2026-11-25 から2日後
    expect(isNearDeadline('intake', deadlinesFor('2026-08-27', '2026-11-25'))).toBe(true)
  })
  it('完了した案件には付けない', () => {
    expect(isNearDeadline('closed', deadlinesFor('2026-08-27', '2026-11-25'))).toBe(false)
  })
  it('「停滞」は14日から（13日では付かない）', () => {
    expect(isStuck('consultation', '2026-11-11', '2026-11-25')).toBe(true) // 14日
    expect(isStuck('consultation', '2026-11-12', '2026-11-25')).toBe(false) // 13日
  })
  it('完了した案件は「停滞」にならない', () => {
    expect(isStuck('closed', '2026-01-01', '2026-11-25')).toBe(false)
  })
})
