// 日付を日本時間の "YYYY-MM-DD" にする。
// サーバーが別のタイムゾーンで動いていても、ARPRO の期限は日本時間で数える。
// （"sv-SE" は日付の表記がちょうど YYYY-MM-DD になるロケール）
export function toJstDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(date)
}

// 日本時間の「今日」。
export function todayJst(): string {
  return toJstDate(new Date())
}
