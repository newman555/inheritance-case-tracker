import { describe, expect, it } from 'vitest'
import { AdvanceInput, checkAdvance } from './stages'
import { codeOf } from './testUtils'

// 「受付」の案件が次のステージへ進もうとしている状態。各テストは必要な項目だけ変える。
const base: AdvanceInput = {
  stage: 'intake',
  toStage: 'consultation',
  optionTypes: [],
  chosenOptionId: null,
  heirs: [],
}

// 一部の項目を変えて checkAdvance を実行する。結果：null = 許可、または拒否した code。
const run = (changes: Partial<AdvanceInput>) => codeOf(() => checkAdvance({ ...base, ...changes }))

describe('ステージは1段階ずつ', () => {
  it('次のステージへは進める', () => {
    expect(run({})).toBeNull()
  })
  it('ステージを飛ばすことはできない', () => {
    expect(run({ toStage: 'proposal' })).toBe('STAGE_NOT_NEXT')
  })
  it('前のステージへ戻ることはできない', () => {
    expect(run({ stage: 'proposal', toStage: 'consultation' })).toBe('STAGE_NOT_NEXT')
  })
  it('完了した案件は動かせない', () => {
    expect(run({ stage: 'closed', toStage: 'intake' })).toBe('CASE_CLOSED')
  })
  it('存在しないステージ名は拒否する', () => {
    expect(run({ toStage: 'nonsense' })).toBe('INVALID_STAGE')
  })
  it('契約 → 完了 には追加のルールがない', () => {
    expect(run({ stage: 'contract', toStage: 'closed' })).toBeNull()
  })
})

describe('提案には異なる種類の選択肢が2つ以上必要', () => {
  const atConsultation = { stage: 'consultation', toStage: 'proposal' } as const

  it('異なる2種類なら進める', () => {
    expect(run({ ...atConsultation, optionTypes: ['sell', 'rent'] })).toBeNull()
  })
  it('1つでは進めない', () => {
    expect(run({ ...atConsultation, optionTypes: ['sell'] })).toBe('NEED_TWO_OPTIONS')
  })
  it('0では進めない', () => {
    expect(run({ ...atConsultation, optionTypes: [] })).toBe('NEED_TWO_OPTIONS')
  })
  it('同じ種類が2つでは進めない（1つと数える）', () => {
    expect(run({ ...atConsultation, optionTypes: ['sell', 'sell'] })).toBe('NEED_TWO_OPTIONS')
  })
})

describe('契約には選択肢の決定・相続人1名以上・全員の同意が必要', () => {
  const atProposal = { stage: 'proposal', toStage: 'contract' } as const
  // すべてそろった状態。失敗のテストはここから1つだけ崩す。
  const ready = { chosenOptionId: 1, heirs: [{ agreed: true }, { agreed: true }] }

  it('すべてそろえば進める', () => {
    expect(run({ ...atProposal, ...ready })).toBeNull()
  })
  it('1人でも同意していなければ進めない', () => {
    expect(run({ ...atProposal, ...ready, heirs: [{ agreed: true }, { agreed: false }] })).toBe('HEIRS_NOT_AGREED')
  })
  it('相続人が0人なら進めない', () => {
    expect(run({ ...atProposal, ...ready, heirs: [] })).toBe('NO_HEIRS')
  })
  it('選択肢が未決定なら進めない', () => {
    expect(run({ ...atProposal, ...ready, chosenOptionId: null })).toBe('NO_CHOSEN_OPTION')
  })
})
