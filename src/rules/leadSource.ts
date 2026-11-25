import { RuleError } from './errors'
import { isValidDate } from './dates'

// 案件の流入経路。ARPRO の案件は次の2つからのみ来る。
// ここで一度だけ定義し、ルール・API・画面がこの名前を import して使う。
export const LEAD_SOURCES = ['partner_referral', 'consultation_event'] as const
export const REFERRAL: (typeof LEAD_SOURCES)[number] = 'partner_referral'
export const EVENT: (typeof LEAD_SOURCES)[number] = 'consultation_event'

export type LeadSourceInput = {
  leadSource: string
  partnerId?: number | null
  eventName?: string | null
  eventDate?: string | null // "YYYY-MM-DD"
}

// ルール5。
// - 紹介の場合は、紹介した提携先が必須。
// - 相談会の場合は、名称と実在する日付が必須。日付は未来であってはならない（すでに参加済みのため）。
//   提携先は任意。
// `today`（"YYYY-MM-DD"）は引数で受け取るので、テストは常に同じ結果になる。
export function validateLeadSource(input: LeadSourceInput, today: string): void {
  if (input.leadSource === REFERRAL) {
    if (!input.partnerId) {
      throw new RuleError('PARTNER_REQUIRED', '紹介の場合は提携先を選んでください。', 400, 'partnerId')
    }
    return
  }

  if (input.leadSource === EVENT) {
    if (!input.eventName || input.eventName.trim() === '') {
      throw new RuleError('EVENT_NAME_REQUIRED', '相談会の名称を入力してください。', 400, 'eventName')
    }
    if (!input.eventDate || !isValidDate(input.eventDate)) {
      throw new RuleError('EVENT_DATE_REQUIRED', '相談会の日付を正しく入力してください。', 400, 'eventDate')
    }
    // "YYYY-MM-DD" の文字列は日付順に並ぶので、> で「より後」を判定できる。
    if (input.eventDate > today) {
      throw new RuleError('EVENT_DATE_IN_FUTURE', '相談会の日付に未来の日付は指定できません。', 400, 'eventDate')
    }
    return
  }

  // 2つの流入経路のどちらでもない。
  throw new RuleError('INVALID_LEAD_SOURCE', '不明な流入経路です。', 400, 'leadSource')
}
