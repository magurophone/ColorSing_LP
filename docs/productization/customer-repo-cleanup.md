# 顧客リポジトリの掃除候補

更新日: 2026-08-19
状態: **一覧のみ。削除は未実行。** レビュー後に、同期とは別の作業として行う。

過去の `sync-all.sh` は `main` を丸ごとmergeしていたため、内部ファイルが全顧客の
PUBLIC repoへ入っている。allowlist方式へ変えたので今後は増えないが、**すでに入った
ものは残ったまま**である。同期処理では自動削除しない。

分類の定義と根拠は `distribution-boundary.md`。

## 対象範囲

`bash scripts/sync-all.sh --dry-run` が出した削除候補を統合した。延べ226件、
実ファイル30種。うち28種は全8顧客に共通、2種は war-mi だけにある。

`public/customer/` と `.github/` は対象外（顧客所有）。

## 全8顧客に共通（28ファイル）

対象顧客: magurophone, npe, yuzukkuma, Hina_Amagi, aruma, NaNa7, war-mi, yusuke

| ファイル | 分類 | runtime参照 | 削除してよい根拠 |
|---|---|---|---|
| `CLAUDE.md` | C | なし | 作業ガイド。buildにもruntimeにも使わない |
| `NEW_CUSTOMER.md` | C | なし | `questionnaire.js:3,8` が挙げるのは**コメント行**のみ。コードは読まない。その `questionnaire.js` 自体もどのentryからも到達しない |
| `SETUP.md` | C | なし | 運営者向け手順書 |
| `OPERATION_PLAN.md` | C | なし | 運営計画 |
| `TODO.md` | C | なし | 未実装リスト |
| `customers.json` | C | なし | 読むのは `scripts/sync-all.sh` と `scripts/migrate-to-customer-dir.sh` のみで、どちらも運営者の機械で動く。**全顧客のリポジトリ名一覧なので、他顧客のPUBLIC repoに置く理由がない** |
| `docs/color-system.md` | C | なし | 設計文書 |
| `scripts/sync-all.sh` | C | なし | 配布する側のスクリプト。顧客repoで実行することはない |
| `scripts/migrate-to-customer-dir.sh` | C | なし | 過去の一回限りの移行スクリプト |
| `.claude/settings.json` | C | なし | 開発ツール設定 |
| `.claude/settings.local.json` | C | なし | **開発者ローカル設定**。個人環境の設定が公開repoに入っている |
| `.claude/skills/glass-material/SKILL.md` | C | なし | 開発ツール用の内部資料 |
| `.claude/skills/ui-design/SKILL.md` | C | なし | 同上 |
| `header.png` | C | なし | HTMLもsrcも参照するのは `./customer/header.png`（`BrandingTab.jsx`、`configIO.js`）。**ルート側は誰も見ていない** |
| `header-mobile.png` | C | なし | 同上。参照は `./customer/header-mobile.png` |
| `vite.svg` | C | なし | 保護HTML7本のfavicon参照はすべて `/customer/vite.svg`。**ルート側は誰も見ていない** |
| `assets/index-DyJqRmtL.js` | C | なし | 過去にコミットされたbuild成果物。現在のbuildは `dist/` へ出る |
| `assets/index-Dxy_s3bl.css` | C | なし | 同上 |
| `assets/header-YdcD-wQN.png` | C | なし | 同上 |
| `assets/header-YdcD-wQN-YdcD-wQN.png` | C | なし | 同上。ハッシュが多重に付いており、同じ画像が繰り返し取り込まれている |
| `assets/header-YdcD-wQN-YdcD-wQN-YdcD-wQN-YdcD-wQN.png` | C | なし | 同上 |
| `assets/header-mobile-DoGtBzvs.png` | C | なし | 同上 |
| `assets/header-mobile-DoGtBzvs-DoGtBzvs.png` | C | なし | 同上 |
| `assets/header-mobile-DoGtBzvs-DoGtBzvs-DoGtBzvs-DoGtBzvs.png` | C | なし | 同上 |
| `assets/vite-DcBtz0py.svg` | C | なし | 同上 |
| `assets/vite-DcBtz0py-DcBtz0py.svg` | C | なし | 同上 |
| `assets/vite-DcBtz0py-DcBtz0py-DcBtz0py.svg` | C | なし | 同上 |
| `assets/vite-DcBtz0py-DcBtz0py-DcBtz0py-DcBtz0py-DcBtz0py.svg` | C | なし | 同上 |

## war-mi のみ（2ファイル）

| ファイル | 分類 | runtime参照 | 削除してよい根拠 |
|---|---|---|---|
| `playwright.config.js` | C | なし | E2E設定。顧客repoのbuildは `npm ci && npm run build` だけで、テストを実行しない |
| `tests/war-mi.spec.js` | C | なし | この顧客専用のspecが1件だけ入っている。他の7顧客には無い。テンプレート `main` にも無い |

## B分類（中央サービス専用）は候補に出ていない

`products.html` `start.html` `signup.html` `fanpage-create.html` `onboarding.html`
`dev-reset.html` とその `src` は、**まだ顧客repoへ配られていない**。前回の同期が
それらの追加より前だったためである。したがって削除候補にも現れない。

allowlist方式にしたので、今後も入らない。

## 検証方法

30ファイルすべてについて、保護HTML7本と `src/` と `package.json` と `vite.config.js`
からの参照を調べた。basenameが一致した3件（`vite.svg`、`header.png`、
`header-mobile.png`）は参照パスまで確認し、いずれも `public/customer/` 側を指していて
ルートのファイルではないことを確かめた。`NEW_CUSTOMER.md` の1件はコメント行だった。

**結果: 30ファイルすべてruntime参照なし。**

## 実行方針

- 同期（`sync-all.sh`）では削除しない。dry-runで候補として出すだけにする。
- 掃除はこの一覧のレビュー後、独立した作業として行う。
- 削除しても顧客サイトのbuildと表示は変わらない（すべてruntime非参照）。
  ただし実行時は1顧客で先に試し、Pagesのbuild成功と公開URLを確認してから残りへ広げる。
