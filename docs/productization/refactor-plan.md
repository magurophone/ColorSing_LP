# 商品化refactor plan

更新日: 2026-08-18

## 原則

- 既存顧客のURL、Portal UI、Sheets、config、legacy公開経路を既定のまま保つ。
- 新経路は別entry pointとservice boundaryで追加する。
- **新規顧客はCentral DBを正本にする（native）。既存顧客はSheets/config.js/GitHub Pages
  のまま（legacy）。両者を同じ経路へ押し込まない。既存顧客は移行が終わったものから
  個別にnativeへ移す。** 詳細はSLT `docs/platform-migration/native-tenant-model.md`。
- 状態は可能な限り実データから導出し、手動確認は視覚preview等に限定して理由を表示する。
- 外部API、認証、credential保管、課金は契約確定前に接続しない。

## 実装段階

### Phase 0 — 完了対象

- 現行architecture、手作業、互換性、未決事項を文書化。
- URL、config、Sheets、legacy publish、sync、Control Plane不在を監査。
- repository 10/50/100/500件のoperation数を定量化。

### Phase 1 — 完了対象

- legacy Sheets変換を純関数fixtureで固定。
- Public Portalのdesktop/mobile navigation、popup、entry pointsをPlaywrightで固定。
- 複数config patternとして全view有効、primary source未設定、中央read/fallbackを確認。
- admin Sheets入力と新Onboardingのregressionを追加。

### Phase 2 — 完了対象

- `DataSourceAdapter`: Sheets実装を既定にし、中央read境界とnormalized DTOを分離。
- `ProvisioningService`: idempotent step orchestration、resume、dry-run、監査eventを定義。
- `GitHubTenantProvisioner`: GitHub固有操作を注入gatewayの裏へ隔離。client secretは持たない。
- `PublishService`: legacy公開をadapter化し、新UIには内部用語を返さない。
- `Tenant`: slug、data source、公開状態を表す最小domain model。
- `OnboardingState`: config/validation/publish metaからstep状態を導出。

### Phase 3 — 完了対象

- `onboarding.html` を既存 `setup.html` と併存させる。
- 進捗、今やること、理由、必須/任意、完了条件、検証結果、修正方法、後から変更可否、previewを表示。
- **既存顧客（legacy）**: Spreadsheet URLを貼るとIDを抽出し、必要sheetとSpecial headerを
  実際のfetch結果で検証する。この経路は既存顧客専用で、新規顧客には出さない。
- **新規顧客（native）**: Sheetsを求めない。DAPの手順は「リスナー情報」であり、
  「データ管理方法・データ接続」は出さない。管理画面からSheetsタブ・デプロイタブ・
  Sheets前提のマニュアル導線を隠す。
- 基本情報、preview確認、publish readinessを試験できる。
- 既存legacy publish設定があるtenantだけは新UIから「公開する」を実行できる。copyに内部Git用語を出さない。

### Phase 3.5 — 完了対象

- 新規顧客の獲得導線 `/products` → `/start` → `/signup` → `fanpage-create.html`。
- 商品カタログ。歌推しページ単体とProの2商品を扱い、Proは `coming_soon` として
  申し込みへ進ませない。価格はコードへ固定しない。
- 決済・認証・provisioningはProvider境界の裏に置き、未接続なら受付を開かない。
  開発機のブラウザだけ仮処理で通しで歩けるようにし、仮であることを画面に出す。

### Phase 4 — native tenantの実接続（進行中）

ここまでの獲得導線は、**まだ実体を作っていない**。`fanpage-create.html` の
「作成が完了しました」は本番のtenant作成完了を意味しない。ここから先が実接続。

1. テナント認可境界の安全化 — 完了（SLT `tenantAccess.ts`）
2. native tenantモデルの確定 — 完了（SLT `tenantMode.ts`）
3. tenant作成API — 認証済みユーザー本人が呼ぶ。利用権はサーバー側entitlementを正とし、
   ブラウザのlocalStorageを認可根拠にしない。決済事業者は未確定のままProvider境界に置く。
   slugはサーバーで再検証しDB uniqueで最終保証。idempotentにし、account↔tenantの
   所有関係を安全に同時確立する。
4. tenant settings保存（表示名・branding・colors・views・benefit tiers・content）
5. native LP DTO生成。legacyとnativeで同じPublic DTOを返し、LP側に区別を持たせない。
6. LPのtenant resolver。`config.platform.tenantSlug` 依存から分離する。
7. 管理画面 → DB保存。新規顧客ではlocalStorageとconfig.jsを正本にしない。
8. 新規顧客の通しE2E。

### Phase 5以降 — 外部判断後

- credential保管、rotation、audit policy。
- Sheets template copy/OAuth支援（既存顧客の移行用）。
- 既存顧客のlegacy → native移行DAP。
- legacy経路（config.js配布・GitHub Pages・Sheets）の段階的縮小。

## Adapter境界

```text
Onboarding UI
  -> Onboarding state derivation
  -> ProvisioningService -> ProvisioningAdapter
  -> PublishService      -> Legacy client adapter / future server adapter
  -> DataSourceAdapter   -> Google Sheets / confirmed central API
```

UIはadapter固有のrepository、token、branch、commit、workflowという語彙を持たない。

## Rollout

1. template repositoryだけでbuild/test。
2. 内部trial tenantで `onboarding.html` を確認。
3. 新規trial customerを1件だけ作成し、legacy `setup.html` と並行利用。
4. Sheets接続、preview、legacy publish、公開サイトのsemantic parityを確認。
5. 問題があれば新entry pointだけを無効化し、既存経路へ戻す。
6. 既存顧客への案内・移行は個別同意後にのみ行う。
