# 顧客リポジトリへの配布境界

更新日: 2026-08-19
状態: **実装済み・未適用**。allowlist方式へ変更し、8顧客のdry-runまで確認した。
実顧客リポジトリへのsyncはまだ行っていない。

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

---

# 配布分類（2026-08-19 確定）

根拠は実際のHTML/import/build/runtime参照と `compatibility-contract.md` の保護URL。
「既存の顧客リポジトリに今あるから」を根拠にはしていない。

顧客リポジトリは GitHub Actions で `npm ci && npm run build`（vite）を実行し `dist` を
Pagesへ出す。したがって「必要」とは **build入力として到達可能**という意味である。

## A. 顧客repoへ配布必須

| 対象 | 根拠 |
|---|---|
| `index.html` `admin.html` `manual.html` `setup.html` `promotion.html` `features.html` `monitor.html` | `compatibility-contract.md` の保護URL |
| `package.json` `package-lock.json` | `npm ci` |
| `vite.config.js` `tailwind.config.js` `postcss.config.js` | build設定 |
| `.gitignore` `LICENSE` | リポジトリ運用・ライセンス |
| `src/App.jsx` `src/index.css` `src/main.jsx` `src/admin.jsx` `src/manual.jsx` `src/setup.jsx` | 保護HTMLの `<script src>` から到達 |
| `src/admin/` `src/assets/` `src/components/` `src/context/` `src/dataSources/` `src/hooks/` `src/lib/` `src/manual/` `src/setup/` `src/views/` | ディレクトリ全体が legacy entry から到達する |
| `src/productization/` のうち `benefitGridApi.js` `fanPageCreation.js` `provisioning.js` `publicAddress.js` `supportersApi.js` `tenant.js` `tenantKind.js` | admin が import する。同ディレクトリの他8ファイルは legacy から到達しない |
| `public/manual/` `public/ss_*.png` | manual画面の静的資産 |

`src/assets/` は import グラフの初回集計で漏れていた。`src/views/HomeView.jsx:6` が
`../assets/closed.png` を import しており、JS/JSXだけを辿る解析では見えなかった。
allowlistだけを取り出したツリーで実際に `vite build` を通して発見した。
**allowlistは机上の解析だけで確定させない。build を通すこと。**

## B. 中央サービス専用（顧客repoへ配布禁止）

商品選択・購入・アカウント作成・tenant作成・native onboardingは中央サービスの責務で
あり、顧客の公開歌推しページの資産ではない。

- `products.html` `start.html` `signup.html` `fanpage-create.html` `onboarding.html`
- `dev-reset.html`
- `src/products.jsx` `src/start.jsx` `src/signup.jsx` `src/fanPageCreate.jsx` `src/onboarding.jsx` `src/devReset.jsx`
- `src/entry/` `src/fanpage/` `src/onboarding/` `src/dev/` `src/productization/adapters/`
- `src/productization/` のうち `acquisition.js` `acquisitionSession.js` `addressAvailability.js`
  `localPreview.js` `plans.js` `publish.js` `setupReset.js`

いずれも保護HTML4本（`main` `admin` `manual` `setup`）からの import グラフに現れない。
`dev-reset.html` は `DevResetApp.jsx:46` が `isLocalPreview()` で本番ホストでの実行を
止めるが、それは配布してよい理由にしない。

## C. 開発・運用専用（顧客repoへ配布禁止）

runtimeから参照されない内部資料。

- `tests/` `playwright.config.js`
- `docs/`（`docs/productization/` `docs/color-system.md` を含む）
- `HANDOVER.md` `CLAUDE.md` `NEW_CUSTOMER.md` `SETUP.md` `OPERATION_PLAN.md` `TODO.md`
- `scripts/`（`sync-all.sh` `sync-allowlist.txt` `migrate-to-customer-dir.sh` 等）
- `.claude/`（settings、skills）
- `customers.json`
- `src/productization/questionnaire.js`（どのentryからも到達しない）
- ルートの `header.png` `header-mobile.png` `vite.svg`（どのHTMLからも参照されない。
  HTMLが参照するfaviconは `public/customer/vite.svg` 側）
- `assets/`（過去にコミットされたbuild成果物。ハッシュ名が多重化している）

### customers.json と NEW_CUSTOMER.md の判定

どちらも **runtimeから参照されない**。`customers.json` を読むのは
`scripts/sync-all.sh` と `scripts/migrate-to-customer-dir.sh` で、いずれも運営者の
機械で動く。`NEW_CUSTOMER.md` は `src/productization/questionnaire.js` の**コメント**が
文書名を挙げているだけで、コードは読んでいない。よってC。

`customers.json` は全顧客のリポジトリ名一覧であり、現在すべての顧客のPUBLIC repoから
読める状態にある。

---

# HANDOVER.md の監査

## 現在の内容

**実secret（credential / token / password）は含まれていない。**

`token` に一致した2行はGitHub Personal Access Tokenの**発行ページURL**であり、
トークン値ではない。

顧客固有だがsecretではない情報として、次が含まれる。

- 特定顧客の公開サイトURL、管理画面URL、GitHubリポジトリURL
- 運用スプレッドシートのURLとID、ファイル名、タブ構成
- サイト設定（表示名、配色、有効画面、ティアごとの運用方針）
- 本人へ確認する事項と、その回答方針

## git履歴

`HANDOVER.md` のリビジョンは2つだけである。

- `a82ccad`（2026-07-15）作成
- `28ba654`（2026-08-17）`chore: keep customer questionnaire notes out of this public repository`

`28ba654` はsecretの除去ではない。質問たたき台10項目の撤回と文言整理であり、
削除された内容も顧客の特典運用に関する記述で、credentialではない。

`.gitignore` に `*_questions.txt` `*_questionnaire_summary.txt` が追加されているが、
**それらのファイルがcommitされた記録は履歴に無い**。

## 別に見つかった実secret（HANDOVER.md とは無関係）

`public/customer/config.js` の `admin.password` に、テンプレート既定値として
実際の文字列が入っていた時期がある。

- 混入期間: `c955332` 系列（2026-02-20、当時は `public/config.js`）から
  `385a322`（2026-02-23、空へ変更）まで
- 該当commit: `c528ea0`、`507fd08`、`b38361a` ほか
- このリポジトリはPUBLICであり、**値は現在もgit履歴から取得できる**
- `sync-all.sh` が全体mergeでテンプレート履歴を各顧客repoへ持ち込んでいるため、
  同じ履歴が顧客のPUBLIC repoにも存在する可能性が高い

### 漏洩対象とrotate対象

| 項目 | 状態 |
|---|---|
| 漏洩した値 | テンプレート既定の `admin.password`（固定文字列1件） |
| 現在この値を使っている顧客 | **0件**。公開中8顧客の `config.js` を確認し、全員が独自値、magurophoneは空 |
| rotate必須 | この値を他のサービスで使い回している場合のみ。サイト側では不要 |

**履歴のrewriteは行っていない。** 実施するかどうかは判断を仰ぐ。

なお `admin.password` はrotateしても解決しない。`config.js` はPUBLICなJavaScriptとして
配信されており、**現役8顧客全員の値が今この瞬間も誰でも読める**。これは履歴の問題では
なく設計の問題であり、SLT `migration-plan.md` のPhase 8にsecurity debtとして記録済み。

---

# 実装（allowlist方式）

## 変更したもの

- `scripts/sync-allowlist.txt` を新設。**ここに書いたものだけを配る。**
- `scripts/sync-all.sh` を全体mergeから allowlist取り出しへ変更。`--dry-run` を追加。
- `vite.config.js` の entry を、存在するものだけに絞るようにした。

`vite.config.js` の変更が必要なのは、13 entry を固定列挙していたためである。中央
サービス専用の6 HTMLを配らないと、顧客側の `vite build` が「entry が無い」で落ちる。
テンプレート側には全て揃っているので、こちらのbuild結果は変わらない（13 HTML生成、
確認済み）。

`public/customer/` と `.github/` は allowlist に載せない。したがって同期処理が触れる
経路そのものが無い。退避と復元で守る形をやめ、最初から対象外にした。

allowlistにテンプレート側で存在しない項目が書かれていたら、同期は開始せず止まる。

## 検証: allowlistだけでbuildが通るか

allowlistを展開した95ファイルだけを別ディレクトリへ取り出し、顧客の `config.js` を
置いて `vite build` を実行した。

- 結果: exit 0
- 生成HTML: `index` `admin` `manual` `setup` `promotion` `features` `monitor` の7つ
- 中央サービス専用のHTMLは1つも生成されない
- `dist/customer/config.js` は出力される

この検証で `src/assets/` の漏れが見つかった。解析だけで確定させてはいけない。

## dry-run 結果（8顧客、2026-08-19）

`bash scripts/sync-all.sh --dry-run`

| repo | 新規追加 | 更新 | 削除候補 | public/customer | 保護URL |
|---|---|---|---|---|---|
| magurophone | 14 | 19 | 28 | 保持 | 7件すべて存在 |
| npe | 14 | 19 | 28 | 保持 | 7件すべて存在 |
| yuzukkuma | 14 | 19 | 28 | 保持 | 7件すべて存在 |
| Hina_Amagi | 14 | 19 | 28 | 保持 | 7件すべて存在 |
| aruma | 14 | 19 | 28 | 保持 | 7件すべて存在 |
| NaNa7 | 14 | 19 | 28 | 保持 | 7件すべて存在 |
| war-mi | 14 | 19 | **30** | 保持 | 7件すべて存在 |
| yusuke | 14 | 19 | 28 | 保持 | 7件すべて存在 |

失敗 0 / スキップ 8（dry-runのため）。

**新規追加14件**はすべて legacy が使うもので、中央サービス専用は1件も入らない。
`SupportersTab.jsx`、`dataSources/`、`lib/lpCompatibility.js` `platformData.js`
`spreadsheetConnection.js`、`productization/` の7ファイル。

**更新19件**は `.gitignore`、`package.json`、`package-lock.json`、`vite.config.js` と
既存src 15ファイル。

**削除候補**は過去の全体mergeで入った内部ファイルである。`.claude/`（settingsとskills）、
`CLAUDE.md`、`NEW_CUSTOMER.md`、`OPERATION_PLAN.md`、`SETUP.md`、`TODO.md`、
`customers.json`、`docs/color-system.md`、`scripts/`、ルートの `header*.png` `vite.svg`、
`assets/` のbuild成果物12件。war-mi だけ `playwright.config.js` と
`tests/war-mi.spec.js` が加わって30件になる。

**自動削除はしない。** 消すかどうかは別の判断であり、この同期では触らない。

## まだやっていないこと

- 実顧客リポジトリへのsync（dry-runのみ）
- 削除候補の扱いの決定
- trial顧客1件への適用と公開URLのsmoke

---

# 付随して見つかった不具合: build後のE2Eが不安定になる

`npm run build` で `dist/`（5.8MB / 55ファイル）を作った状態で `npm run test:e2e` を
実行すると、`page.goto` が `net::ERR_ABORTED; maybe frame was detached?` で落ちる。

## 観測

| 実行 | dist | 結果 |
|---|---|---|
| 1回目 | 無し | 162 passed / 2 skipped / **0 failed** |
| 2回目 | 有り | 161 passed / **1 failed**（`one-place-to-enter.spec.js:71` mobile） |
| 3回目 | 有り | 161 passed / **1 failed**（`step-handoff.spec.js:98` desktop） |
| 4回目 | 削除後 | 162 passed / 2 skipped / **0 failed** |

落ちるテストは毎回違い、エラーは常に `page.goto` の `ERR_ABORTED` である。assertionの
失敗ではない。単体で実行すると3回とも通る。

原因はテスト側でも `vite.config.js` の変更でもない。`entries()` は
`build.rollupOptions.input` の中だけで使われ、E2Eの webServer は `npm run dev`
（dev server）なので `build` 設定を読まない。

`vite.config.js` に `server.watch.ignored` の設定は無く、dev server の watcher が
プロジェクト直下の `dist/` を見ている。

## これが問題な理由

`operations.md` のLP側preflightは

```
npm run test:contracts
npm run build
npm run test:e2e
```

の順である。**この順に実行すると、必ず dist がある状態でE2Eが走る。** 手順どおりに
やった人が、コードとは無関係な失敗を踏む。

今回このセッションで最初にgreenを取れたのは、たまたま build より先に E2E を
実行していたからである。

## 対応案（未実施）

`vite.config.js` へ watcher の除外を足す案がある。ただし `vite.config.js` は
allowlistのA分類で全顧客へ配布されるファイルなので、判断を仰ぐ。

```js
server: { watch: { ignored: ['**/dist/**', '**/test-results/**'] } }
```

暫定の回避は、E2Eの前に `dist/` を消すこと。
