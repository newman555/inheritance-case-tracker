// 画面（ブラウザ側）から API を呼ぶための関数。
// データか、サーバーのエラー（{ code, message, field }）のどちらかを返す。例外は投げない。

export type ApiError = { code: string; message: string; field: string | null }
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export async function callApi<T = unknown>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text() // 204 の応答には本文がない
    const data = text ? JSON.parse(text) : null
    if (!res.ok) {
      return { ok: false, error: data?.error ?? { code: 'UNKNOWN', message: 'エラーが発生しました。', field: null } }
    }
    return { ok: true, data: data as T }
  } catch {
    return { ok: false, error: { code: 'NETWORK', message: 'サーバーに接続できませんでした。', field: null } }
  }
}
