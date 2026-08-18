# ColorSing LP 現行アーキテクチャ監査（既存顧客＝legacy）

更新日: 2026-08-16（監査時点）／適用範囲の注記を2026-08-18に追記
対象コミット基準: `main` / `a82ccad` と作業ツリー上の互換性保護差分

> **適用範囲**: この文書は**既存顧客（legacy）の現状**を記録した監査であり、
> あるべき姿ではない。ここに書かれたGoogle Sheets、顧客ごとのrepository複製、
> `public/customer/config.js` の配布、GitHub Pagesは、いずれもlegacy経路である。
>
> 新規顧客はCentral DBを正本にする（native）。新規顧客へSheetsやrepository複製を
> 求めない。方針は `product-scope.md`、モデルはSLT
> `docs/platform-migration/native-tenant-model.md`、進捗は
> `implementation-status.md` を見ること。

## 監査結果の要約

現行は「共通Reactコード + 顧客ごとの `public/customer/` + 顧客ごとの公開repository」という分離で稼働している。Public Portalの正規データソースはGoogle Sheetsであり、管理画面の編集値はまずブラウザのlocalStorageへ保存され、公開操作時に顧客repositoryの `public/customer/config.js` へ反映される。

商品化で再利用できる境界はあるが、顧客作成API、中央認証、中央credential保管、Control Plane、課金、中央DBの実体はこのrepository内に存在しない。これらが存在する前提で本番接続してはならない。

## 配布単位とURL

| 対象 | 現行 |
|---|---|
| 共通テンプレート | `magurophone/ColorSing_LP` |
| 顧客repository | `colorsing-dashboard/{slug}` |
| 公開URL | `https://colorsing-dashboard.github.io/{slug}/` |
| 顧客一覧 | `customers.json` |
| 顧客固有領域 | `public/customer/` |
| 共通同期 | `scripts/sync-all.sh` |

保護対象の既存entry pointは `index.html`、`admin.html`、`setup.html`、`manual.html`、`features.html`、`promotion.html`、`monitor.html`。GitHub Pagesではrepository名がbase pathになる。Viteは `base: './'` でbuildする。

## 実行時データフロー

```text
public/customer/config.js
        + DEFAULT_CONFIG
        + customer別localStorage
                  |
                  v
             ConfigContext
                  |
Google Sheets -> public data adapter -> normalized LP view model
                                      -> existing Portal views
```

- `configIO.js` はパス先頭segmentを使ってlocalStorage keyを顧客別に分離する。
- `loadBaseConfig()` は `window.DASHBOARD_CONFIG` とdefaultsをmergeする。
- `loadConfig()` はさらにlocalStorageをmergeする。ただし `admin` は公開config側を常に優先する。
- viewsはID単位でdefaultsの新規viewを補完する。
- Public Portalはランキング、目標、特典内容、権利者、履歴、アイコン、イベントを正規化済みview modelとして受け取る。
- 現在の本番Source of TruthはGoogle Sheetsのまま。中央DB読取境界はbase URLが未設定なら完全に無効である。

## Google Sheets契約

| 論理データ | 既定sheet / range |
|---|---|
| ranking | `目標管理・ランキング` / `D2:G5` |
| goals | `目標管理・ランキング` / `A2:B10` |
| benefit contents | `特典内容` / `A3:E20` |
| rights | `特典管理` / 全行。`Special` headerを動的検出 |
| history | `特典履歴` / `A3:D` |
| icons | `枠内アイコン` / 全行 |
| events | `イベント` / `A3:E3` と `A7:E` |

取得は公開GViz endpointを利用する。primary dataの失敗は現行の全画面retry表示になり、履歴とイベントは欠落してもprimary dataを表示する。アイコンは画面を開いたときに遅延取得する。

## 設定・公開経路

```text
admin.htmlで編集
  -> localStorageへ即時保存
  -> Previewは同一ブラウザのlocalStorageを読む
  -> legacy公開操作
  -> GitHub Contents/Git APIでconfig.jsをcommit
  -> GitHub Actions
  -> GitHub Pages
```

`src/lib/github.js` はブラウザからGitHub APIへ直接接続するlegacy実装である。Fine-grained PATは現行互換のため残っている。tokenの `rev:` 変換は暗号化ではない。新しい中央credentialをclient bundle、localStorage、`config.js`、Gitへ追加してはならない。

## 顧客作成と共通同期

新規顧客作成は `NEW_CUSTOMER.md` と `SETUP.md` の手作業で行われる。repository作成、一覧更新、template反映、workflow修正、Pages有効化、顧客config生成、Sheets初期設定、build、公開確認が一つのtransactionとして管理されていない。

`sync-all.sh` は顧客ごとにclone/merge/pushする。`public/customer/` と顧客workflowを退避・復元するため顧客固有設定を保護するが、途中失敗の中央状態、retry queue、audit log、可視化されたroll backはない。

## Control Plane / 統合基盤監査

- customer/tenant一覧の正本は `customers.json` のみ。
- onboarding/provision/publishの中央状態storeはない。
- suspend/reactivateはPages設定等の手作業。
- plan/status、last successful publish、migration statusを集約する管理API/UIはない。
- 中央DB本体、DB schema、import API、semantic diff API、認証APIはこのrepositoryにない。
- `src/lib/platformData.js` の中央読取client境界はbase URL未設定時には呼ばれない。endpointとpayload契約は接続先所有者の確認なしに本番設定しない。

## Repository-per-customer の規模評価

1回の共通releaseを全顧客へ同期する場合、repository操作とdeploy起動は顧客数に線形比例する。実際のActions消費量は組織設定と各build時間を計測して判断し、ここでは固定値を仮定しない。

| 顧客数 | repository数 | 1回の全体同期 | 想定される運用上の境界 |
|---:|---:|---:|---|
| 10 | 10 | 最大10 clone/merge/push + 10 deploy | 手動監視可能。失敗一覧と再実行記録は必要 |
| 50 | 50 | 最大50操作 + 50 deploy | queue、並列数制御、成功/失敗集約が必要 |
| 100 | 100 | 最大100操作 + 100 deploy | 手元scriptだけでは監視・再試行・quota予測が重い |
| 500 | 500 | 最大500操作 + 500 deploy | 集中hostingまたはbuild artifact共有を比較すべき規模 |

評価式:

- 共通release当たりのbuild起動数 = 顧客数
- 月間build起動数 = 顧客数 × 月間共通release数 + 顧客別公開回数
- 概算build時間 = 起動数 × 顧客repositoryでの実測build時間
- 同期failure isolationは高いが、監視対象も顧客数と同数になる
- 顧客削除は既存resourceを自動削除せず、停止・archive・保持期間を別判断にする
- custom domainは顧客別に設定可能だが、証明・DNS・renewal状態の集約が必要
- 中央DB接続時は全静的siteから共通APIへ接続するためtenant識別、rate limit、cache、rollback契約が必要

## 現在の主なrisk

1. PATをbrowserで扱うlegacy経路があり、顧客の認知負荷とsecret露出面が大きい。
2. `admin.password` は公開JavaScript内の簡易gateで、本人確認を担う認証ではない。
3. localStorageと公開configの二層により、端末間差分と未公開変更が分かりにくい。
4. 新規顧客作成がidempotent transactionでなく、partial failureの再開点が人の記録に依存する。
5. Sheets共有・sheet名・header異常のエラーが十分に構造化されていない。
6. repository数の増加に対し、deploy statusと運用監視の集約がない。
