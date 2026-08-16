# 商品化refactor plan

更新日: 2026-08-16

## 原則

- 既存顧客のURL、Portal UI、Sheets、config、legacy公開経路を既定のまま保つ。
- 新経路は別entry pointとservice boundaryで追加する。
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
- Spreadsheet URLを貼るとIDを抽出し、必要sheetとSpecial headerを実際のfetch結果で検証。
- 基本情報、data connection、preview確認、publish readinessを試験できる。
- 既存legacy publish設定があるtenantだけは新UIから「公開する」を実行できる。copyに内部Git用語を出さない。

### Phase 4以降 — 外部判断後

- 認証済みserver-side provisioning adapter。
- repository作成、template反映、Pages設定、status取得の実接続。
- credential保管、rotation、audit policy。
- Control Planeとtenant状態store。
- Sheets template copy/OAuth支援。
- 中央DB import、shadow read、diff、switch、rollback window。

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
