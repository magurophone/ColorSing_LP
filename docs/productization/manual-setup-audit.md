# 新規顧客の手作業監査

更新日: 2026-08-16
根拠: `NEW_CUSTOMER.md`、`SETUP.md`、`customers.json`、`scripts/sync-all.sh`、管理画面実装

| 作業 | 現在誰が行う | 自動化可能 | 顧客操作必要 | 内部技術 |
|---|---|---|---|---|
| 申込回答取得 | 運営者 | 可能。入力schemaと同意設計が必要 | 申込内容入力 | Google Forms / CSV |
| 回答の正規化・矛盾確認 | 運営者 | 一部可能。意味判断は要確認 | 不明点への回答 | questionnaire mapping |
| slug候補生成 | 運営者 | 可能 | 希望slugの確認 | repository / URL naming |
| slug/repository存在確認 | 運営者 | 可能 | 不要 | GitHub API |
| repository作成 | 運営者 | 可能。server credentialが必要 | 不要 | GitHub Organization |
| `customers.json` 更新 | 運営者 | 可能 | 不要 | Git commit |
| template同期 | 運営者 | 可能 | 不要 | git clone/merge/push |
| workflow branch確認 | 運営者 | 可能 | 不要 | GitHub Actions YAML |
| Pages有効化 | 運営者 | 可能 | 不要 | GitHub Pages API |
| customer config生成 | 運営者 | 高い | 基本情報・表示内容の入力 | `config.js` |
| header placeholder除去 | 運営者 | 可能 | 不要 | repository file operation |
| 公開URL生成 | 運営者 | 可能 | 不要 | GitHub Pages URL rule |
| Sheets template準備/コピー案内 | 運営者 + 顧客 | 支援可能。自動copyは権限判断が必要 | 自分のDriveへのcopy | Google Drive / Sheets |
| Sheets共有設定 | 顧客 | OAuth/権限方式の決定後に一部可能 | 公開範囲への同意 | Google sharing |
| Sheets URL/ID登録 | 顧客 | URL解析で簡略化可能 | URL貼付 | spreadsheet ID |
| 必須sheet/range/header確認 | 運営者 + 顧客 | 可能な範囲が大きい | エラー時の修正 | GViz / sheet schema |
| Branding基本設定 | 顧客または運営者 | UI化済み | 表示名・画像等の選択 | customer config |
| Benefit tiers設定 | 顧客または運営者 | UI化済み。意味検証は一部のみ | 特典設計 | config + sheet columns |
| Theme設定 | 顧客または運営者 | UI化済み | 好みの選択 | CSS variables / config |
| local preview | 顧客 | 可能 | 見た目の確認 | localStorage |
| legacy公開credential発行 | 顧客 | 新方式では廃止候補 | legacyのみ必要 | Fine-grained PAT |
| config公開 | 顧客 | 可能。中央publish serviceが必要 | 公開承認 | GitHub commit / Actions |
| deploy status確認 | 運営者 + 顧客 | 可能 | 失敗時の再試行判断 | Actions / Pages status |
| PC smoke test | 運営者 | 大部分可能 | 内容確認 | browser / Playwright |
| smartphone smoke test | 運営者 | 大部分可能 | 内容確認 | responsive browser |
| URL引渡し | 運営者 | 可能 | 受領 | customer communication |

## 自動化の優先順位

1. 入力正規化、slug validation、config生成、URL生成。
2. Sheets URL解析、接続・sheet・header validation。
3. provisioning step stateとresume。操作はserver-side adapterへ注入する。
4. preview確認とpublish readinessの状態駆動化。
5. credentialを顧客へ要求しない中央publish/provision方式。ただし認証・secret保管の決定後のみ。
6. Control Planeで失敗、最終公開、停止、migration状態を集約。

## 人の判断として残すもの

- 回答の意味が矛盾する場合の仕様確定。
- 公開範囲、認証、課金、契約、削除/保持期間への同意。
- 見た目と掲載内容の最終preview承認。
- 既存顧客を新経路へ切り替えるかの個別判断。
