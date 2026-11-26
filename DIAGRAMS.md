# 図

ER図・状態遷移図・システム構成図・「次のステージへ進める」処理の流れ（Mermaid。GitHub 上でそのまま表示されます）。

## 1. データモデル（ER図）

```mermaid
erDiagram
    PARTNER |o--o{ CASE : "紹介する"
    CLIENT ||--o{ CASE : "依頼する"
    PROPERTY ||--|| CASE : "対象物件"
    CASE ||--o{ HEIR : "相続人"
    CASE ||--o{ OPTION : "比較する選択肢"
    CASE |o--o| OPTION : "決定した選択肢"
    CASE ||--o{ STAGE_HISTORY : "履歴"
    PARTNER_TYPE ||--o{ PARTNER : "分類する"
    PROPERTY_TYPE ||--o{ PROPERTY : "分類する"
    RELATIONSHIP_TYPE ||--o{ HEIR : "分類する"

    PARTNER_TYPE {
        string code PK "tax_accountant など（コード）"
        string label "表示名（税理士・司法書士・弁護士）"
        int sortOrder "表示順"
    }
    PROPERTY_TYPE {
        string code PK "house など（コード）"
        string label "表示名（戸建て・区分マンションなど）"
        int sortOrder "表示順"
    }
    RELATIONSHIP_TYPE {
        string code PK "spouse など（コード）"
        string label "表示名（配偶者・息子・娘 … その他）"
        int sortOrder "表示順"
    }
    PARTNER {
        int id PK
        string name "提携先名"
        string type FK "PARTNER_TYPE のコード"
        datetime createdAt "登録日時"
        datetime updatedAt "更新日時"
    }
    CLIENT {
        int id PK
        string name "依頼者名"
        string phone UK "電話番号（正規化して数字のみで保存）"
        datetime createdAt "登録日時"
        datetime updatedAt "更新日時"
    }
    PROPERTY {
        int id PK
        string address "所在地"
        string type FK "PROPERTY_TYPE のコード"
        int estimatedPrice "査定額（円）"
        datetime createdAt "登録日時"
        datetime updatedAt "更新日時"
    }
    CASE {
        int id PK
        int clientId FK
        int propertyId FK, UK "1案件1物件"
        int partnerId FK "紹介は必須、相談会は任意"
        string leadSource "partner_referral（紹介） | consultation_event（相談会）"
        string eventName "相談会の名称（相談会の案件のみ）"
        string eventDate "相談会の日付 YYYY-MM-DD（相談会の案件のみ）"
        string dateOfDeath "死亡日 YYYY-MM-DD（法定期限の起算日）"
        string stage "intake | consultation | proposal | contract | closed（受付〜完了）"
        int chosenOptionId FK, UK "決定した選択肢（未決定は空、同じ案件の選択肢のみ）"
        datetime stageUpdatedAt "現在のステージになった日時"
        datetime createdAt "登録日時"
        datetime updatedAt "更新日時"
    }
    HEIR {
        int id PK
        int caseId FK
        string name "相続人名"
        string relationship FK "RELATIONSHIP_TYPE のコード（続柄）"
        boolean agreed "同意済みか（選択肢を決定すると未同意に戻る）"
        datetime createdAt "登録日時"
        datetime updatedAt "更新日時"
    }
    OPTION {
        int id PK
        int caseId FK
        string type "sell | rent | build | keep（売却・賃貸・建築・保有、案件ごとに重複不可）"
        int amount "金額（円、賃貸は月額）"
        string memo "メリット・デメリット"
        datetime createdAt "登録日時"
        datetime updatedAt "更新日時"
    }
    STAGE_HISTORY {
        int id PK
        int caseId FK
        string fromStage "変更前"
        string toStage "変更後"
        datetime changedAt "変更日時"
    }
```

## 2. 案件の状態遷移図

```mermaid
stateDiagram-v2
    direction LR
    state "受付" as intake
    state "相談" as consultation
    state "提案" as proposal
    state "契約" as contract
    state "完了" as closed

    [*] --> intake : 新規案件（紹介または相談会）
    intake --> consultation : ご家族との面談
    consultation --> proposal : 異なる選択肢を2つ以上登録済み
    proposal --> contract : 選択肢が決定 かつ 相続人1名以上・全員が同意
    contract --> closed : 引き渡し完了
    closed --> [*]

    note right of consultation
        ステージを飛ばす・戻す変更はエラー
        「完了」以降は変更不可
    end note

    note right of proposal
        ここから選択肢の編集と
        相続人の削除は不可
        選択肢の決定はこのステージのみ
        相続人の追加と同意は「契約」から不可
    end note
```

## 3. システム構成図

```mermaid
flowchart LR
    U[スタッフのブラウザ] --> P[Next.js の画面<br/>サーバー側で src/lib の関数からDBを読む]
    U -->|フォームやボタンから fetch| API[APIルート<br/>/api/cases, /api/partners, /api/lookups]
    B[予約ツール Webhook<br/>未実装・今後の拡張] -.->|POST /api/intake/booking| API
    API -->|1. 入力の形を確認| Z[入力チェック<br/>zod]
    API -->|2. ルールに確認| R[業務ルール<br/>TypeScript の関数・DBは使わない]
    API -->|3. 保存・取得| DB[(SQLite / Prisma)]
    P --> DB
    T[Vitest のルールテスト] --> R
    T2[Vitest のAPIテスト<br/>専用DBファイル prisma/test.db] --> API
    DB -.->|provider と DATABASE_URL を変更し、<br/>マイグレーションを作り直す| S[(Supabase / Postgres<br/>本番運用の選択肢)]
```

## 4. 「次のステージへ進める」処理

URL の id の誤り（400 `INVALID_ID`）と本文の形の誤り（`toStage` がないなど、400 `INVALID_INPUT`）は、この前に拒否します。上から順に確認し、最初に当てはまった理由で拒否します。

```mermaid
flowchart TD
    A([開始：POST /api/cases/:id/advance]) --> B{案件は存在する？}
    B -- いいえ --> E1([404 CASE_NOT_FOUND<br/>案件が見つかりません。])
    B -- はい --> C{ステージは「完了」？}
    C -- はい --> E2([409 CASE_CLOSED<br/>完了した案件は変更できません。])
    C -- いいえ --> D0{指定されたステージは<br/>存在するステージ名？}
    D0 -- いいえ --> E0([400 INVALID_STAGE<br/>不明なステージです。])
    D0 -- はい --> D{指定されたステージは<br/>ちょうど次のステージ？}
    D -- いいえ --> E3([409 STAGE_NOT_NEXT<br/>ステージを飛ばしたり戻したり<br/>することはできません。])
    D -- はい --> F{「提案」へ進める？}
    F -- はい --> G{異なる種類の選択肢が<br/>2つ以上ある？}
    G -- いいえ --> E4([409 NEED_TWO_OPTIONS<br/>提案の前に、異なる種類の選択肢を<br/>2つ以上登録してください。])
    G -- はい --> K
    F -- いいえ --> H{「契約」へ進める？}
    H -- はい --> I1{選択肢が決定している？}
    I1 -- いいえ --> E5a([409 NO_CHOSEN_OPTION<br/>契約の前に選択肢を決定してください。])
    I1 -- はい --> I2{相続人が1名以上？}
    I2 -- いいえ --> E5b([409 NO_HEIRS<br/>契約の前に相続人を1名以上<br/>登録してください。])
    I2 -- はい --> I3{全員が同意している？}
    I3 -- いいえ --> E5c([409 HEIRS_NOT_AGREED<br/>契約には相続人全員の同意が必要です。])
    I3 -- はい --> K
    H -- いいえ：「相談」「完了」は<br/>追加ルールなし --> K{トランザクション内：<br/>ステージは読み込んだ時のまま？}
    K -- いいえ：先に他の人が変更 --> E6([409 STAGE_CHANGED<br/>案件が直前に他の人によって変更されました。<br/>再読み込みしてやり直してください。])
    K -- はい --> L[ステージと更新日時を更新し<br/>履歴の1行も同時に保存]
    L --> M([200：更新後の案件を返す])
```
