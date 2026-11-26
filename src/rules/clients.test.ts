import { describe, expect, it } from 'vitest'
import { normalizePhone, resolveClient } from './clients'
import { codeOf } from './testUtils'

describe('電話番号の正規化', () => {
  it('ハイフンを取り除く', () => {
    expect(normalizePhone('090-1234-5678')).toBe('09012345678')
  })
  it('全角数字を半角にする', () => {
    expect(normalizePhone('０９０－１２３４－５６７８')).toBe('09012345678')
  })
  it('+81 を 0 にする', () => {
    expect(normalizePhone('+81 90-1234-5678')).toBe('09012345678')
  })
  it('+81 の後に 0 を残した書き方も同じ番号になる', () => {
    expect(normalizePhone('+81 090-1234-5678')).toBe('09012345678')
  })
  it('桁数が足りない番号は拒否する', () => {
    expect(codeOf(() => normalizePhone('123'))).toBe('INVALID_PHONE')
  })
})

describe('依頼者の再利用', () => {
  it('新しい電話番号なら依頼者を作る', () => {
    expect(resolveClient(null, '山田 太郎')).toBe('create')
  })
  it('同じ電話番号・同じ名前なら再利用する（全角スペースでも同じ）', () => {
    expect(resolveClient({ name: '山田 太郎' }, '山田　太郎')).toBe('reuse')
  })
  it('同じ電話番号で名前が違えば拒否する', () => {
    expect(codeOf(() => resolveClient({ name: '山田 太郎' }, '佐藤 花子'))).toBe('PHONE_NAME_MISMATCH')
  })
})
