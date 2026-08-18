# 顧客リポジトリへの配布境界

更新日: 2026-08-19
状態: **方針確定・未実装**。監査を先に行い、除外で既存顧客が壊れないことを確認した。
実装（`sync-all.sh` の変更）はまだ行っていない。

## 方針

商品選択・購入・アカウント作成・tenant作成・native onboardingは**中央サービスの責務**であり、
顧客ごとの公開歌推しページへ置く画面ではない。配布物を次の2種類に分ける。

| 区分 | 扱い |
|---|---|
| 公開LPの共通資産 | legacy顧客へ同期する |
| acquisition / signup / native fanpage creation / native onboarding | **legacy顧客へ同期しない** |

「未完成だから一時的に隠す」という話ではない。完成しても、これらは顧客の公開ページの
資産ではない。

**未接続のprovisioning導線を「リンクしていないから問題ない」として配布してはいけない。**
ガードが効いていることも、配布してよい根拠にしない。

## 現在の配布機構

`sync-all.sh` は**ファイル選択を持たない**。`template/main` を顧客リポの `main` へ
そのままmergeする。除外は次の2つだけである。

- `public/customer/*` — merge前に退避し、conflictは `--ours`、merge後に書き戻す
- `.github/*` — conflictは `--ours`。`deploy.yml` は退避・復元し、トリガーbranchを `main` へ強制

したがって**それ以外のmainの全ファイルが、そのまま顧客の公開リポジトリへ入る**。
配布対象を絞る仕組みは存在しない。

## 監査結果（2026-08-19時点）

基準: 顧客リポ `colorsing-dashboard/magurophone` の `main` と、template `main`（`3009425`）。

- 顧客リポ: 115 files
- template main: 198 files
- **いま同期したら新たに入るファイル: 83**（`public/customer/*` と `.github/*` を除く）

| 区分 | 件数 | 内容 |
|---|---|---|
| `src/` | 36 | entry / fanpage / onboarding / productization を含む |
| `tests/` | 28 | Playwright spec と契約テスト |
| `docs/` | 10 | `docs/productization/*` の内部設計文書 |
| ROOT html | 6 | products / start / signup / fanpage-create / onboarding / dev-reset |
| `scripts/` | 1 | |
| ROOT その他 | 2 | `playwright.config.js`、`HANDOVER.md` |

### 同期しないもの（今回の方針で除外する）

- `products.html`
- `start.html`
- `signup.html`
- `fanpage-create.html`
- `onboarding.html`

`dev-reset.html` も顧客の公開サイトへ置く資産ではない。`DevResetApp.jsx:46` が
`isLocalPreview()` で本番ホストでの実行を止めてはいるが、それは配布してよい理由にならない。

### 除外しても既存顧客は壊れない

legacy側から除外対象を参照するのは1か所だけである。

`src/admin/AdminApp.jsx:61` に `./onboarding.html` への「設定の続きへ戻る」リンクがある。
ただしこれは `SetupGuideBar` の中にあり、`AdminApp.jsx:82` の
`new URLSearchParams(window.location.search).get('guide')` が
`setup-colors` / `setup-tiers` / `setup-supporters` のいずれかでない限り
`SETUP_GUIDES[info]` が `undefined` となって `null` を返す。

通常の管理画面訪問ではクエリが付かないため、**リンクそのものが描画されない**。
`?guide=` を付けるのは `onboarding.html` だけなので、onboardingを配布しない顧客に
この経路は発生しない。

`index.html` / `admin.html` / `manual.html` / `setup.html` / `promotion.html` /
`features.html` / `monitor.html` からの参照はない。
`compatibility-contract.md` の保護URL一覧にも、除外対象は含まれていない。

## 別途判断が必要なもの

### HANDOVER.md

**特定顧客の作業引き継ぎ文書であり、全顧客の公開リポジトリへ配布されようとしている。**
中身にはその顧客のサイトURL、管理画面URL、GitHubリポジトリ、運用スプレッドシートの
URLとID、ファイル名、サイト設定、本人の運用方針が入っている。

顧客リポジトリはpublicである。これが入ると、ある顧客の運用情報が他の顧客の公開
リポジトリから読める状態になる。配布対象から外すか、リポジトリ外へ移すかを決めること。

### docs/productization/

移行計画・現行監査・未決事項などの内部文書である。顧客の公開リポジトリへ置く必要が
あるかを判断すること。

### すでに配布済みのもの

次は**現時点で既に全顧客の公開リポジトリに存在する**。今回の方針の対象外だが、
同じ観点での判断が必要である。

- `customers.json` — 全顧客のリポジトリ名一覧
- `NEW_CUSTOMER.md` — 新規顧客の作業手順
- `CLAUDE.md`、`SETUP.md`、`OPERATION_PLAN.md`、`TODO.md`
- `scripts/sync-all.sh`

## 次にやること

1. この境界を `sync-all.sh` の配布契約として実装する（除外リスト、または配布対象の明示）
2. 実装後、trial顧客1件へ適用し、公開URLと既存画面のsmokeを確認する
3. 全体同期はその後
