# 商品化リファクタリングの実装状況

更新日: 2026-08-18

## 前提（ここを読み違えないこと）

顧客は2種類ある。混ぜない。

| | 既存顧客（legacy） | 新規顧客（native） |
|---|---|---|
| 正規データソース | Google Sheets | Central DB（SLT側D1） |
| 顧客設定の置き場所 | `public/customer/config.js`（配布物） | tenant単位でDB保存（**未実装**） |
| 公開 | リポジトリへpush → GitHub Pages | DB更新 → Public API → 即時反映（**未実装**） |
| テナント解決 | `config.platform.tenantSlug`（配布物の中） | URLから解決（**未実装**） |

Google Sheetsは**既存顧客を壊さず移行するためのlegacy data source**であり、新規顧客の
標準運用ではない。新規顧客へテンプレートSheetのコピーやURL登録を求めない。判定は
`src/productization/tenantKind.js`。詳細は `product-scope.md` と、SLT側の
`docs/platform-migration/native-tenant-model.md`。

## 実装済み

- 現行architecture、手作業、互換性、未決事項、release/rollback、design handoffの文書化。
- legacy Sheets parserとnormalized LP DTOのcontract fixture。
- Google Sheetsと中央read clientを交換可能にするDataSource adapter registry。
- 中央read失敗時のSheets fallbackと、表示を変えないshadow comparison。
- tenant snapshotとslug解決（**legacy形式のみ**。`config.platform.tenantSlug` と
  `config.deploy.repo` から決めており、native向けのURL解決は未実装）。
- idempotent provisioning step state、partial failure、resume、dry-run、secretを含まないaudit event。
- GitHub固有provisioning operationをinjected gatewayの裏へ隔離するadapter。
- legacy client publishを利用者向けcopyから分離するPublishService。
- Spreadsheet URL -> ID抽出、公開read、必要sheet、Special headerのconnection validation（**既存顧客向け**）。
- 既存admin Sheets tabでのURL貼付と構造別validation表示（**既存顧客向け**）。
- `onboarding.html` の状態駆動DAP。`setup.html` は未変更のまま併存。
- 新規顧客向けの獲得導線 `/products` → `/start` → `/signup` → `fanpage-create.html`。
  決済・認証・provisioningはProvider境界の裏にあり、未接続なら受付を開かない。
- 商品カタログ（`plans.js`）。歌推しページ単体とProの2商品を扱う。Proは `coming_soon`
  で、申し込みへ進ませない。価格はコードへ固定せず、未設定と0円を取り違えない。
- 新規顧客向けの管理画面。Sheets前提のタブ・用語・マニュアル導線を出さない。特典の
  列位置は並び順から導出し、段階名は `5K` `10K` を例として見せる。
- publish受付後に公開configとの一致を確認する明示的な公開確認操作。
- desktop/mobile Playwright regression。
- アンケート回答を外部反映する前の整合性ゲート（**既存顧客の移行用**）。
- 権利者一覧の列ガード。獲得者を表示しないティアの `columnIndex` が表示名の列を読まない。
- 出荷時の既定から他の配信者の設定を外した（特典7段階・FAQ・「ボトルキープ」・
  サイドバーの `color sing`）。既定値のままの設定でどの必須項目も完了にならないことを
  回帰テストで固定している。

## 未実装（新規顧客の実体がまだ無い）

`fanpage-create.html` の「歌推しページの作成が完了しました」は、**本番のtenant作成完了を
意味しない**。`FanPageCreateApp.jsx` の provisioning adapter は本番では `null`（作成処理が
存在しない）、開発機では各工程を400ms待って成功したことにする仮実装である。

そのため、次の3つが同じ1つの原因で塞がっている。

| 症状 | 原因 |
|---|---|
| 公開ページがエラー／空 | 読む先の実体が無い |
| リスナー情報が「準備中」のまま | 置き場所が無い |
| 公開が「準備待ち」のまま | 公開先が無い |

表示の辻褄合わせで塞がない。SLT側の残工程（下記）が入るまで、正直に準備中と出す。

## 残工程（SLT側と共通の順序）

1. テナント認可境界の安全化 — **完了**（SLT `functions/_shared/tenantAccess.ts`）
2. native tenant モデルの確定 — **完了**（SLT `functions/_shared/tenantMode.ts`）
3. tenant作成API — 認証済みユーザー本人が呼ぶ。利用権はサーバー側entitlementを正とし、
   ブラウザのlocalStorageを認可根拠にしない。slugはサーバーで再検証しDB uniqueで最終
   保証。idempotentにし、account↔tenantの所有関係を安全に同時確立する。
4. tenant settings保存（表示名・branding・colors・views・benefit tiers・content）
5. native LP DTO生成（legacyとnativeで同じPublic DTOを返す）
6. LPのtenant resolver（`config.platform.tenantSlug` 依存から分離）
7. 管理画面 → DB保存
8. 新規顧客の通しE2E

## 変更していない保護領域

- 既存公開URLと顧客repository。
- 既存customer configの実データ。
- Public PortalのHeader、Sidebar、BottomNav、view、popup、theme。
- **既存顧客の**Google Sheets Source of Truth。
- legacy `admin.html`、`setup.html`、`manual.html` とlegacy publish API。
- `customers.json` と全顧客repositoryの状態。
- データの置き場所が未設定のときの公開ページの表示（`public-portal.spec.js`）。
- 料金、課金、認証provider、OAuth、最終hosting。

## 現在の本番状態

この作業ではcustomer repositoryへの同期、GitHub Pages設定、公開URL変更を実行していない。
したがって既存本番は変更前のまま。template release時は `operations.md` のgateを通し、
trial customerから段階適用する。

## 検証command

```text
npm run build
npm run test:contracts
npm run test:e2e
```

Playwright projects:

- desktop: Chromium 1440×1000
- mobile: Chromium 390×844 / mobile context

E2Eは `127.0.0.1:4175` を使う。SLT側のPlaywrightが4174を使い、双方 `reuseExistingServer` が
有効なため、同じポートのままだと一方のE2Eがもう一方のサーバーへ接続して両方の結果を壊す。

## 既知の不具合と対応

`showUsers` と `showHistory` は `NEW_CUSTOMER.md` が設定を指示し顧客configにも入っているが、
Public Portalのコードは読んでいない。獲得者を表示しないティアは「特典管理」に列を作らない
ため、`columnIndex` は権利者一覧が参照しない値である必要がある。ところが `columnIndex: 0` は
表示名の列と同じで、`hasRight()` は数字だけの文字列を権利ありと判定するため、表示名が数字
だけの支援者に誤ってアイコンが付き、権利がなくても一覧へ出た。`RightsView` にはガードがなく、
`PersonPopup` にだけ同等の判定があり、同じconfigに対して2画面の挙動が食い違っていた。

判定を `isRightsColumn()` へ一本化し、両画面から参照するようにした。既存顧客のティアは
すべて `columnIndex >= 1` のため表示は変わらない。`showUsers` を実装で解釈するかどうかは、
顧客の管理単位が確定してから判断する。

## 関連文書

- `product-scope.md`（商品の階層と、新規/既存の経路）
- `current-architecture.md`（既存=legacyの現状監査）
- `manual-setup-audit.md`
- `compatibility-contract.md`
- `refactor-plan.md`
- `decision-required.md`
- `operations.md`
- `design-handoff.md`
- SLT `docs/platform-migration/native-tenant-model.md`
