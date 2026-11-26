import { describe, expect, it } from 'vitest'
import { assertCanChooseOption, assertCanEditHeirs, assertCanEditOptions, assertCanRemoveHeir, choiceResetsAgreements } from './locks'
import { codeOf } from './testUtils'

describe('選択肢は提案から編集不可', () => {
  it('相談ステージでは選択肢を編集できる', () => {
    expect(codeOf(() => assertCanEditOptions('consultation'))).toBeNull()
  })
  it('提案ステージでは選択肢を編集できない', () => {
    expect(codeOf(() => assertCanEditOptions('proposal'))).toBe('OPTIONS_LOCKED')
  })
})

describe('相続人の追加と同意の変更は契約から不可', () => {
  it('提案ステージでは相続人の追加と同意の変更ができる', () => {
    expect(codeOf(() => assertCanEditHeirs('proposal'))).toBeNull()
  })
  it('契約ステージでは相続人の追加と同意の変更ができない', () => {
    expect(codeOf(() => assertCanEditHeirs('contract'))).toBe('HEIRS_LOCKED')
  })
})

describe('相続人の削除は提案から不可（同意していない人を外して契約へ進めないため）', () => {
  it('相談ステージでは相続人を削除できる', () => {
    expect(codeOf(() => assertCanRemoveHeir('consultation'))).toBeNull()
  })
  it('提案ステージでは相続人を削除できない', () => {
    expect(codeOf(() => assertCanRemoveHeir('proposal'))).toBe('HEIR_REMOVAL_LOCKED')
  })
})

describe('選択肢の決定', () => {
  // 選択肢は案件7のもの。案件7から決定する場合と、案件8から決定する場合を試す。
  const option = { caseId: 7 }

  it('同じ案件の選択肢は提案ステージで決定できる', () => {
    expect(codeOf(() => assertCanChooseOption('proposal', option, 7))).toBeNull()
  })
  it('他の案件の選択肢は決定できない', () => {
    expect(codeOf(() => assertCanChooseOption('proposal', option, 8))).toBe('OPTION_NOT_FOUND')
  })
  it('提案以外のステージでは決定できない', () => {
    expect(codeOf(() => assertCanChooseOption('consultation', option, 7))).toBe('CHOOSE_ONLY_AT_PROPOSAL')
  })
})

describe('決定によって同意がリセットされる条件', () => {
  it('別の選択肢を決定するとリセットする', () => {
    expect(choiceResetsAgreements(1, 2)).toBe(true)
  })
  it('最初の決定でもリセットする（決定前の同意は数えない）', () => {
    expect(choiceResetsAgreements(null, 1)).toBe(true)
  })
  it('同じ選択肢をもう一度決定してもリセットしない', () => {
    expect(choiceResetsAgreements(1, 1)).toBe(false)
  })
})
