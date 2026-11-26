import { RuleError } from './errors'
import { Stage, stageIndex } from './stages'

// ルール6（編集ロック）とルール4（選択肢の決定）。
// ステージ移動の時点だけでチェックすると、後から崩せてしまう
// （例：提案へ進んだ後に選択肢を削除する）。そのため、ステージに応じて編集を禁止する。

// 選択肢の追加・削除は「提案」より前のみ。
export function canEditOptions(stage: Stage): boolean {
  return stageIndex(stage) < stageIndex('proposal')
}

// 相続人の追加と同意の変更は「契約」より前のみ。
export function canEditHeirs(stage: Stage): boolean {
  return stageIndex(stage) < stageIndex('contract')
}

// 相続人の削除は、それより早く「提案」より前のみ。
// 追加は同意が必要な人が増えるだけでルールは緩まない。削除は、同意していない人を外して契約へ進む
// 抜け道になる。そのため、同意を集め始める提案ステージから、削除だけを先に禁止する。
export function canRemoveHeirs(stage: Stage): boolean {
  return stageIndex(stage) < stageIndex('proposal')
}

// 上の3つを「拒否」として使う版。API は変更の前に必ずこれを呼ぶ。
// （画面は canEdit… / canRemove… をボタンを隠すためだけに使う。判断するのは常にサーバー）
export function assertCanEditOptions(stage: Stage): void {
  if (!canEditOptions(stage)) {
    throw new RuleError('OPTIONS_LOCKED', '提案ステージ以降は選択肢を変更できません。')
  }
}

export function assertCanEditHeirs(stage: Stage): void {
  if (!canEditHeirs(stage)) {
    throw new RuleError('HEIRS_LOCKED', '契約ステージ以降は相続人と同意を変更できません。')
  }
}

export function assertCanRemoveHeir(stage: Stage): void {
  if (!canRemoveHeirs(stage)) {
    throw new RuleError('HEIR_REMOVAL_LOCKED', '提案ステージ以降は相続人を削除できません。')
  }
}

// ご家族が選ぶ選択肢の決定。
// - この案件の選択肢であること（他の案件の選択肢は不可）
// - 提案ステージでのみ決定できる
export function assertCanChooseOption(stage: Stage, option: { caseId: number }, caseId: number): void {
  if (option.caseId !== caseId) {
    throw new RuleError('OPTION_NOT_FOUND', 'この選択肢はこの案件のものではありません。', 404, 'optionId')
  }
  if (stage !== 'proposal') {
    throw new RuleError('CHOOSE_ONLY_AT_PROPOSAL', '選択肢は提案ステージでのみ決定できます。')
  }
}

// この決定で相続人の同意をリセットするか。
// 決定が「変わる」とき（最初の決定も含む）はリセットする：それまでの同意はこの選択肢へのものではないため。
// 同じ選択肢をもう一度決定した場合はリセットしない。
export function choiceResetsAgreements(currentChosenId: number | null, newChosenId: number): boolean {
  return currentChosenId !== newChosenId
}
