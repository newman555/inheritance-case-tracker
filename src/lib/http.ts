import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z, ZodError, ZodType } from 'zod'
import { RuleError } from '@/rules/errors'

// すべての API ルートで使う共通処理（サーバー側のみ）。

// リクエストの JSON を読み、zod で形を確認する。形が違えば ZodError（→ 400）を投げる。
// JSON でない本文は null になり、それも zod が拒否する。
export async function readBody<S extends ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const json = await req.json().catch(() => null)
  return schema.parse(json) as z.infer<S>
}

// URL の id は文字列。正の整数に変換し、できなければ 400 で拒否する。
export function parseId(raw: string, name = 'id'): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) {
    throw new RuleError('INVALID_ID', `${name} は正の整数で指定してください。`, 400, name)
  }
  return n
}

// API のエラーは常に同じ形で返す：
//   { "error": { "code": "...", "message": "...", "field": "..." または null } }
function errorResponse(status: number, code: string, message: string, field: string | null = null) {
  return NextResponse.json({ error: { code, message, field } }, { status })
}

// ルートの中で投げられたものを、正しい HTTP の応答に変える。
export function fail(e: unknown) {
  // 業務ルールが拒否した。ステータス（400・404・409）はエラー自身が持っている。
  if (e instanceof RuleError) {
    return errorResponse(e.status, e.code, e.message, e.field)
  }
  // 本文の形が違う（項目がない、型が違う など）：400。
  if (e instanceof ZodError) {
    const issue = e.issues[0]
    return errorResponse(400, 'INVALID_INPUT', issue.message, issue.path.join('.') || null)
  }
  // データベースが重複を拒否した（一意の列）。2つのリクエストが同時に来た場合に起こる：409。
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return errorResponse(409, 'DUPLICATE', 'すでに登録されています。')
  }
  // それ以外はこちらの不具合。ログに残し、呼び出し側には内部の情報を返さない。
  console.error(e)
  return errorResponse(500, 'INTERNAL_ERROR', 'サーバーでエラーが発生しました。')
}
