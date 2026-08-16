# Productization operations / rollback

更新日: 2026-08-16

## Template release procedure

1. 変更scopeと `public/customer/` 非破壊を確認する。
2. `npm ci`、`npm run build`、contract testsを実行する。
3. Playwrightのdesktop/mobile regressionを実行する。
4. internal trial tenantでPublic Portal、admin、legacy setup、新onboardingを確認する。
5. customer configをfixtureまたはcloneで複数pattern確認する。
6. `sync-all.sh` は最初に少数trialへ適用し、Pages成功と公開smokeを確認する。
7. 全体同期時はcustomerごとのcommit、deploy、公開確認を記録する。

testが失敗した状態では顧客repositoryへdeployしない。

## 新規trial onboarding

1. 従来手順でtrial repositoryとcustomer configを準備する。
2. `setup.html` を残したまま `onboarding.html` を案内する。
3. 基本情報、Sheets接続validation、benefit structure、previewまで完了させる。
4. publish service未導入環境では公開操作をblockedとして表示し、legacy adminで公開する。
5. legacy publish設定済み環境では新画面の利用者向け公開操作を試し、公開URLを別browserで確認する。

## Rollback

### UI / onboarding rollback

- `onboarding.html` の案内を停止する。
- `setup.html`、`admin.html`、legacy publishへ戻す。
- Public PortalのURL、Sheets、顧客configは変更しない。

### Data source rollback

- customer config/runtime flagを `sheets` に戻す。
- 中央readを止めても同じnormalized DTOをSheets adapterから供給する。
- shadow compareは表示を変更しないため、必要ならflagだけ無効化する。
- switch後の差異はsource snapshotとsemantic contractで調査する。

### Template release rollback

- 問題commitの逆変更をtemplateへ追加し、同じrelease gateを通す。
- customer固有 `public/customer/` とworkflowを上書きしない。
- 一括削除、強制reset、既存repositoryの自動cleanupを行わない。
- 一部顧客だけ失敗した場合は成功済み顧客を作り直さず、失敗顧客だけ再開する。

## Future Sheets -> DB migration path

```text
Sheets検査
 -> source snapshot
 -> import dry-run
 -> normalized DTO semantic diff
 -> shadow read
 -> customer preview
 -> customer単位switch
 -> rollback window
 -> Sheets fallback終了は別承認
```

switch条件は差異0だけに固定せず、許容差異schemaと承認者を決める。migration中も既存Sheetsを削除・変更しない。

## Incident evidence

最低限記録するもの:

- tenant/slug
- operation id / idempotency key
- step名と開始/終了時刻
- adapter名とversion
- secretを含まないerror category
- 作成済みresource reference
- last successful publish
- rollback判断と実行者
