import { RuleError } from './errors'

// 案件のステージ（順番どおり）。「次のステージ」はこの配列の次の要素。
export const STAGES = ['intake', 'consultation', 'proposal', 'contract', 'closed'] as const
export type Stage = (typeof STAGES)[number]

// 物件の扱い方の4種類（売却・賃貸・建築・保有）。
export const OPTION_TYPES = ['sell', 'rent', 'build', 'keep'] as const
export type OptionType = (typeof OPTION_TYPES)[number]

// 文字列が実在するステージ名か（外部から来る値は何でもありうるため確認する）。
export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value)
}

// ステージの位置：受付 = 0 … 完了 = 4
export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage)
}

// ルールの判断に使う案件の情報（必要な項目だけ）。
export type AdvanceInput = {
  stage: Stage // 現在のステージ
  toStage: string // 移動したいステージ
  optionTypes: string[] // 登録済みの選択肢の種類（例：['sell', 'rent']）
  chosenOptionId: number | null // 決定した選択肢（未決定なら null）
  heirs: { agreed: boolean }[] // 相続人ごとの同意の有無
}

// ルール1〜3：案件を次のステージへ進めてよいかを判断する。
// 問題なければ何もせず、できない場合は RuleError を投げる。
// 上から順に確認し、最初に当てはまった理由で拒否する（テストはその code を確認している）。
export function checkAdvance(input: AdvanceInput): void {
  const { stage, toStage, optionTypes, chosenOptionId, heirs } = input

  // ルール1：完了した案件は二度と動かない。
  if (stage === 'closed') {
    throw new RuleError('CASE_CLOSED', '完了した案件は変更できません。')
  }

  // ルール1：指定されたステージが実在するか（外から来る値なので確認する）。
  if (!isStage(toStage)) {
    throw new RuleError('INVALID_STAGE', '不明なステージです。', 400, 'toStage')
  }

  // ルール1：ちょうど次のステージであること（飛ばす・戻すは不可）。
  const next = STAGES[stageIndex(stage) + 1]
  if (toStage !== next) {
    throw new RuleError('STAGE_NOT_NEXT', 'ステージを飛ばしたり戻したりすることはできません。')
  }

  // ルール2：「提案」へは、異なる種類の選択肢が2つ以上必要。
  //          （Set は重複を除くので、['sell', 'sell'] は1つと数える）
  if (next === 'proposal' && new Set(optionTypes).size < 2) {
    throw new RuleError('NEED_TWO_OPTIONS', '提案の前に、異なる種類の選択肢を2つ以上登録してください。')
  }

  // ルール3：「契約」へは、選択肢の決定・相続人1名以上・全員の同意が必要（この順に確認する）。
  if (next === 'contract') {
    if (chosenOptionId === null) {
      throw new RuleError('NO_CHOSEN_OPTION', '契約の前に選択肢を決定してください。')
    }
    // 「全員が同意」は空の配列でも true になるため、0人は別にチェックする。
    if (heirs.length === 0) {
      throw new RuleError('NO_HEIRS', '契約の前に相続人を1名以上登録してください。')
    }
    if (!heirs.every((h) => h.agreed)) {
      throw new RuleError('HEIRS_NOT_AGREED', '契約には相続人全員の同意が必要です。')
    }
  }
}
