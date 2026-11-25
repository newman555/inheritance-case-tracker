import { describe, expect, it } from 'vitest'
import { brokerageFee } from './fee'
import { codeOf } from './testUtils'

describe('仲介手数料', () => {
  it('200万円 → 110,000円（5% ＋ 税）', () => {
    expect(brokerageFee(2_000_000)).toBe(110_000)
  })
  it('400万円 → 198,000円（4% ＋ 2万円、＋ 税）', () => {
    expect(brokerageFee(4_000_000)).toBe(198_000)
  })
  it('3,000万円 → 1,056,000円（3% ＋ 6万円、＋ 税）', () => {
    expect(brokerageFee(30_000_000)).toBe(1_056_000)
  })
  it('円未満は切り捨てる', () => {
    // 1,234,567 × 5% = 61,728.35 → 61,728。税込で 67,900.8 → 67,900
    expect(brokerageFee(1_234_567)).toBe(67_900)
  })
  it('0円は拒否する', () => {
    expect(codeOf(() => brokerageFee(0))).toBe('INVALID_PRICE')
  })
  it('マイナスの金額は拒否する', () => {
    expect(codeOf(() => brokerageFee(-1))).toBe('INVALID_PRICE')
  })
})
