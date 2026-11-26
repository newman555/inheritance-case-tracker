# API

技術者向けの詳細です。画面のボタンやフォームは、すべてこの API を通してデータを保存・取得します。ルールに合わない操作は、サーバーが理由を付けて断ります（データの形式は JSON）。

## 共通
- エラーの形：`{ "error": { "code": "NEED_TWO_OPTIONS", "message": "画面に表示する文章", "field": "入力項目名 または null" } }`
- ステータス：
  - **400** 入力の誤り（項目の不足・型の違い・存在しない日付・マスタにないコードなど）
  - **404** 対象が存在しない（案件・相続人・選択肢・提携先）
  - **409** 入力は正しいが、案件の今の状態ではルール上できない
- 本文の形は zod で確認します（code は `INVALID_INPUT`、メッセージは日本語）。URL やクエリの id が正の整数でなければ `INVALID_ID`（400）。
- DB の一意制約に当たった場合（同じ登録が同時に来たときなど）は `DUPLICATE`（409）。
- 想定外のエラーは 500 `INTERNAL_ERROR`（サーバーのログに残し、内部の情報は返さない）。
- 2つ以上のテーブルに書く処理（2・4・10）は1つのトランザクションで行います（すべて保存するか、何も保存しないか）。

## 一覧
| # | メソッドとパス | 内容 | 成功 |
|---|---|---|---|
| 1 | `GET /api/cases?client=&partner=` | ボード用の案件一覧（絞り込みは任意） | 200 |
| 2 | `POST /api/cases` | 依頼者（または再利用）・物件・案件を登録 | 201 |
| 3 | `GET /api/cases/:id` | 案件1件（相続人・選択肢・履歴・期限・バッジ） | 200 |
| 4 | `POST /api/cases/:id/advance` | 次のステージへ進める | 200 |
| 5 | `POST /api/cases/:id/heirs` | 相続人を追加 | 201 |
| 6 | `PATCH /api/cases/:id/heirs/:heirId` | 同意を付ける・外す | 200 |
| 7 | `DELETE /api/cases/:id/heirs/:heirId` | 相続人を削除 | 204 |
| 8 | `POST /api/cases/:id/options` | 選択肢を追加 | 201 |
| 9 | `DELETE /api/cases/:id/options/:optionId` | 選択肢を削除 | 204 |
| 10 | `PUT /api/cases/:id/chosen-option` | 選択肢を決定（相続人の同意をリセット） | 200 |
| 11 | `GET /api/partners` | 提携先の一覧と件数 | 200 |
| 12 | `POST /api/partners` | 提携先を追加 | 201 |
| 13 | `GET /api/lookups` | マスタデータ（プルダウン用） | 200 |

## 各エンドポイント

### 1. GET /api/cases
- クエリ：`client`（依頼者 id）、`partner`（提携先 id）。どちらも任意。正の整数でなければ 400 `INVALID_ID`
- 返す値：案件の配列（更新が新しい順）。各案件に依頼者・物件（種別の表示名つき）・提携先、`deadlines`（3つの法定期限と残り日数）、`daysInStage`、`stuck`（停滞）、`nearDeadline`（期限間近）

### 2. POST /api/cases
- 本文：`clientName, clientPhone, propertyAddress, propertyType, estimatedPrice, dateOfDeath, leadSource, partnerId, eventName, eventDate`
- 電話番号を正規化し、同じ番号・同じ名前の依頼者がいれば再利用。相談会の名称・日付は相談会の案件にだけ保存（紹介では送られても空）
- 返す値：登録した案件（依頼者・物件つき）
- 拒否：
  - 400 `INVALID_INPUT`：項目の不足・型の違い、査定額が1円未満または20億円超、提携先 id が正の整数でない
  - 400 `PARTNER_REQUIRED`（紹介で提携先なし）、`EVENT_NAME_REQUIRED`、`EVENT_DATE_REQUIRED`、`EVENT_DATE_IN_FUTURE`、`INVALID_LEAD_SOURCE`
  - 400 `INVALID_DATE`・`DATE_IN_FUTURE`（死亡日）、`INVALID_PHONE`、`INVALID_PROPERTY_TYPE`（マスタにない）
  - 404 `PARTNER_NOT_FOUND`
  - 409 `PHONE_NAME_MISMATCH`（同じ電話番号で名前が違う）

### 3. GET /api/cases/:id
- 返す値：1 の各案件の内容に加え、相続人（続柄の表示名つき）・選択肢・ステージ履歴
- 拒否：400 `INVALID_ID`、404 `CASE_NOT_FOUND`

### 4. POST /api/cases/:id/advance
- 本文：`{ "toStage": "consultation" }`（次のステージ名）
- 確認の順（最初に当てはまった理由で拒否。[DIAGRAMS.md](DIAGRAMS.md) の4番の図と同じ）：
  1. 400 `INVALID_INPUT`（本文の形）
  2. 404 `CASE_NOT_FOUND`
  3. 409 `CASE_CLOSED`
  4. 400 `INVALID_STAGE`（存在しないステージ名）
  5. 409 `STAGE_NOT_NEXT`（飛ばす・戻す）
  6. 提案へ進める場合：409 `NEED_TWO_OPTIONS`
  7. 契約へ進める場合：409 `NO_CHOSEN_OPTION` → `NO_HEIRS` → `HEIRS_NOT_AGREED`
  8. 409 `STAGE_CHANGED`（読み込んだ後に、他の人がステージを動かした）
- ステージの更新と履歴の1行を1つのトランザクションで保存。返す値：更新後の案件

### 5. POST /api/cases/:id/heirs
- 本文：`{ "name": "山田 花子", "relationship": "spouse" }`（続柄はマスタのコード）。追加した相続人は未同意から始まる
- 返す値：追加した相続人
- 拒否：400 `INVALID_INPUT`、404 `CASE_NOT_FOUND`、409 `HEIRS_LOCKED`（契約ステージ以降）、400 `INVALID_RELATIONSHIP`（マスタにない）

### 6. PATCH /api/cases/:id/heirs/:heirId
- 本文：`{ "agreed": true }`
- 返す値：更新した相続人
- 拒否：400 `INVALID_INPUT`・`INVALID_ID`、404 `CASE_NOT_FOUND`・`HEIR_NOT_FOUND`（この案件の相続人でない）、409 `HEIRS_LOCKED`（契約ステージ以降）

### 7. DELETE /api/cases/:id/heirs/:heirId
- 拒否：404 `CASE_NOT_FOUND`・`HEIR_NOT_FOUND`、409 `HEIRS_LOCKED`（契約ステージ以降）、409 `HEIR_REMOVAL_LOCKED`（提案ステージ。同意していない相続人を外して契約へ進めないため）

### 8. POST /api/cases/:id/options
- 本文：`{ "type": "sell", "amount": 20000000, "memo": "..." }`（type は sell・rent・build・keep。賃貸の amount は月額）
- 返す値：追加した選択肢
- 拒否：400 `INVALID_INPUT`（不明な種類、金額が1円未満または20億円超）、404 `CASE_NOT_FOUND`、409 `OPTIONS_LOCKED`（提案ステージ以降）、409 `OPTION_TYPE_EXISTS`（同じ種類がすでにある）

### 9. DELETE /api/cases/:id/options/:optionId
- 拒否：404 `CASE_NOT_FOUND`・`OPTION_NOT_FOUND`（この案件の選択肢でない）、409 `OPTIONS_LOCKED`（提案ステージ以降）

### 10. PUT /api/cases/:id/chosen-option
- 本文：`{ "optionId": 3 }`
- 決定が変わると（最初の決定も含む）相続人全員の同意を未同意に戻す。決定と同意のリセットは1つのトランザクション
- 返す値：案件（相続人・選択肢つき）
- 拒否：400 `INVALID_INPUT`、404 `CASE_NOT_FOUND`・`OPTION_NOT_FOUND`（存在しない、または他の案件の選択肢）、409 `CHOOSE_ONLY_AT_PROPOSAL`（提案ステージ以外）

### 11. GET /api/partners
- 返す値：`[{ id, name, type, typeLabel, caseCount, closedCount }]`。`caseCount` は紹介と、提携先を記録した相談会の両方（ボードの `?partner=` と同じ案件）

### 12. POST /api/partners
- 本文：`{ "name": "さくら税理士事務所", "type": "tax_accountant" }`
- 返す値：追加した提携先
- 拒否：400 `INVALID_INPUT`（名称が空）、400 `INVALID_PARTNER_TYPE`（マスタにない）

### 13. GET /api/lookups
- 返す値：`{ propertyTypes, partnerTypes, relationships }`。それぞれ `[{ code, label }]` を表示順で
