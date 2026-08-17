# Productization refactor implementation status

更新日: 2026-08-16

## 実装済み

- 現行architecture、手作業、互換性、未決事項、release/rollback、design handoffの文書化。
- legacy Sheets parserとnormalized LP DTOのcontract fixture。
- Google Sheetsと中央read clientを交換可能にするDataSource adapter registry。
- 中央read失敗時のSheets fallbackと、表示を変えないshadow comparison。
- tenant snapshotとslug解決。
- idempotent provisioning step state、partial failure、resume、dry-run、secretを含まないaudit event。
- GitHub固有provisioning operationをinjected gatewayの裏へ隔離するadapter。
- legacy client publishを利用者向けcopyから分離するPublishService。
- Spreadsheet URL -> ID抽出、公開read、必要sheet、Special headerのconnection validation。
- 既存admin Sheets tabでのURL貼付と構造別validation表示。
- `onboarding.html` の状態駆動DAP。`setup.html` は未変更のまま併存。
- publish受付後に公開configとの一致を確認する明示的な公開確認操作。
- desktop/mobile Playwright regression。
- アンケート回答を外部反映する前の整合性ゲート。`NEW_CUSTOMER.md` のStep 0を機械化し、機械的に判定できる補正と、意味の判断が要る「要確認」を分ける。要確認が1件でもある間は正規化仕様を出さない。
- 権利者一覧の列ガード。獲得者を表示しないティアの `columnIndex` が表示名の列を読まないようにする。

## 変更していない保護領域

- 既存公開URLと顧客repository。
- 既存customer configの実データ。
- Public PortalのHeader、Sidebar、BottomNav、view、popup、theme。
- Google Sheets Source of Truth。
- legacy `admin.html`、`setup.html`、`manual.html` とlegacy publish API。
- `customers.json` と全顧客repositoryの状態。
- 料金、課金、認証provider、OAuth、最終hosting。

## 新規顧客で試験可能な範囲

1. 既存手順でtrial tenantの公開resourceを準備。
2. `onboarding.html` でPortal準備、基本情報、theme、data source、benefit structureを自動判定。
3. Spreadsheet URLを貼り、必要データとSpecial headerを検証。
4. 同一browserでpreviewし、目視確認。
5. legacy publish設定済みなら利用者向け公開操作を実行し、公開config一致を確認。

中央認証・中央credential・server-side provisioningがないため、repository作成からの完全な無人self provisioningは未実装。公開サービス未準備時はblockedとして明示し、既存adminへ戻せる。

## 現在の本番状態

この作業ではcustomer repositoryへの同期、GitHub Pages設定、公開URL変更を実行していない。したがって既存本番は変更前のまま。template release時は `operations.md` のgateを通し、trial customerから段階適用する。

## 検証command

```text
npm run build
npm run test:contracts
npm run test:e2e
```

Playwright projects:

- desktop: Chromium 1440×1000
- mobile: Chromium 390×844 / mobile context

E2Eは `127.0.0.1:4175` を使う。SLT側のPlaywrightが4174を使い、双方 `reuseExistingServer` が有効なため、同じポートのままだと一方のE2Eがもう一方のサーバーへ接続して両方の結果を壊す。

## 既知の不具合と対応

`showUsers` と `showHistory` は `NEW_CUSTOMER.md` が設定を指示し顧客configにも入っているが、Public Portalのコードは読んでいない。獲得者を表示しないティアは「特典管理」に列を作らないため、`columnIndex` は権利者一覧が参照しない値である必要がある。ところが `columnIndex: 0` は表示名の列と同じで、`hasRight()` は数字だけの文字列を権利ありと判定するため、表示名が数字だけの支援者に誤ってアイコンが付き、権利がなくても一覧へ出た。`RightsView` にはガードがなく、`PersonPopup` にだけ同等の判定があり、同じconfigに対して2画面の挙動が食い違っていた。

判定を `isRightsColumn()` へ一本化し、両画面から参照するようにした。既存顧客のティアはすべて `columnIndex >= 1` のため表示は変わらない。`showUsers` を実装で解釈するかどうかは、顧客の管理単位が確定してから判断する。

## 関連文書

- `current-architecture.md`
- `manual-setup-audit.md`
- `compatibility-contract.md`
- `refactor-plan.md`
- `decision-required.md`
- `operations.md`
- `design-handoff.md`
