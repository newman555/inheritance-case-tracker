import { describe, expect, it } from 'vitest'
import { LeadSourceInput, validateLeadSource } from './leadSource'
import { codeOf } from './testUtils'

// 「今日」を固定して、いつ実行しても同じ結果になるようにする。
const TODAY = '2026-11-25'
const run = (input: LeadSourceInput) => codeOf(() => validateLeadSource(input, TODAY))

describe('流入経路', () => {
  it('提携先のある紹介は受け付ける', () => {
    expect(run({ leadSource: 'partner_referral', partnerId: 1 })).toBeNull()
  })
  it('名称と過去の日付がある相談会は、提携先なしでも受け付ける', () => {
    expect(run({ leadSource: 'consultation_event', eventName: '名古屋相続セミナー', eventDate: '2026-10-05' })).toBeNull()
  })
  it('今日開催の相談会は受け付ける', () => {
    expect(run({ leadSource: 'consultation_event', eventName: 'セミナー', eventDate: TODAY })).toBeNull()
  })
  it('提携先のない紹介は拒否する', () => {
    expect(run({ leadSource: 'partner_referral' })).toBe('PARTNER_REQUIRED')
  })
  it('名称のない相談会は拒否する', () => {
    expect(run({ leadSource: 'consultation_event', eventDate: '2026-10-05' })).toBe('EVENT_NAME_REQUIRED')
  })
  it('日付のない相談会は拒否する', () => {
    expect(run({ leadSource: 'consultation_event', eventName: 'セミナー' })).toBe('EVENT_DATE_REQUIRED')
  })
  it('存在しない日付の相談会は拒否する', () => {
    expect(run({ leadSource: 'consultation_event', eventName: 'セミナー', eventDate: '2026-02-30' })).toBe('EVENT_DATE_REQUIRED')
  })
  it('未来の日付の相談会は拒否する', () => {
    expect(run({ leadSource: 'consultation_event', eventName: 'セミナー', eventDate: '2026-11-26' })).toBe('EVENT_DATE_IN_FUTURE')
  })
  it('不明な流入経路は拒否する', () => {
    expect(run({ leadSource: 'flyer' })).toBe('INVALID_LEAD_SOURCE')
  })
})
