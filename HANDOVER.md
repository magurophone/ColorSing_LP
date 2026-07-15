# 作業引き継ぎ — ゆうすけさんサイト

更新日時: 2026-07-15（JST）

## 最優先で確認すること

直前に作成した「ゆうすけさんへ確認する注意点」には、ユーザーから**言いたいことがある**との申し出がある。時間切れのため内容はまだ聞けていない。

次回は変更・案内を先に進めず、まずユーザーの指摘を聞くこと。下記の確認事項は未承認のたたき台であり、そのままゆうすけさんへ送らない。

## 現在の公開物

- サイト: https://colorsing-dashboard.github.io/yusuke/
- 管理画面: https://colorsing-dashboard.github.io/yusuke/admin.html
- GitHub: https://github.com/colorsing-dashboard/yusuke
- ローカル作業コピー: `C:\tmp\yusuke-site`
- 顧客リポジトリ最新コミット: `5febbb2 ci: deploy yusuke from main`
- 初回の GitHub Pages デプロイと公開 URL の HTTP 200 は確認済み

## Google Sheets

- 対象: https://docs.google.com/spreadsheets/d/1LrzNTqSO2QN0fgb04VYBr7wISW7vh2rvQXS62AMdQkc/edit?gid=918756293
- ファイル名: `yu-suke仮_CS歌推し管理サイト`
- `gid=918756293` は「特典内容」タブ
- 全7タブ: 目標管理・ランキング、特典内容、特典管理、特典履歴、枠内アイコン、イベント、README
- Google Drive 連携が有効な別スレッドで、「特典内容」と「特典管理」の初期設定を実施したとの報告あり
- `k` / `K` / 全角表記に差異があれば、サイト設定と一致する `1k / 3k / 5k / 10k / 20k / 30k以上` へスプレッドシート側を対応させる指示に修正済み
- 現スレッドには Google Drive の操作ツールがないため、編集結果の再取得・独立検証は未実施
- 「リンクを知っている全員が閲覧可」になっているかは未確認。公開サイトから読むために必要
- 顧客サイトの `public/customer/config.js` は `spreadsheetId: ""` のまま。ID `1LrzNTqSO2QN0fgb04VYBr7wISW7vh2rvQXS62AMdQkc` はまだ反映していない

## 現在のサイト設定

- 表示名: `😎ゆうすけ😎`
- サイト名: `歌推し様進捗スコア`
- ダーク＋ゴールド系、やわらかいフォント
- 有効画面: 特典内容、特典権利者、枠内アイコン
- 無効画面: Home、イベント
- 1k: 枠内専用ノーマルアイコン、獲得者表示なし
- 3k: 名前入りノーマルアイコン
- 5k: SRアイコン＋オリジナルステッカー（非売品）
- 10k: SSRアイコン＋直筆サイン・コメント入り色紙
- 20k: URアイコン＋オリジナルグッズ（非売品）
- 30k以上: 要相談
- 3k以上は「済」のチェック方式
- 全ティアでレコード／履歴機能はオフ
- 1k は獲得者一覧に列を作らず、3k以上を特典管理で扱う初期設計

## 未確定の確認事項（たたき台）

以下はユーザーの訂正を受けてから整理し直す。

1. Home を使わないため、ランキング・目標・イベント予告・FAQ・メインヘッダーが出ないがよいか
2. 全ティアで履歴オフのため、チェックを外すと「誰に・いつ・何を渡したか」を残さなくてよいか
3. 1k 獲得者は一覧に表示しなくてよいか
4. 同一ティアの複数特典を一つの「済」でまとめて管理してよいか
5. 30k以上の相談結果を「済」だけで管理するか、自由記入・Special・履歴等を使うか
6. 特典権利の有効期限、月次リセット、再獲得の扱い
7. 物理特典の申請方法、住所の扱い、発送期限、送料、対象地域など
8. アイコンが永続か月替わりか、共通か個別か
9. イベント画面は不要で確定か
10. ダーク＋ゴールド、ヘッダー画像なしでよいか

## デプロイトークン

- 未発行・未設定
- トークン値をチャットや文書へ貼らせない。本人が管理画面へ直接入力する
- 発行 URL: https://github.com/settings/personal-access-tokens/new
- 事前入力 URL: https://github.com/settings/personal-access-tokens/new?name=yusuke&description=ColorSing+dashboard+deployment&target_name=colorsing-dashboard&expires_in=365&contents=write&pages=write
- Resource owner: `colorsing-dashboard`
- Repository access: `Only select repositories` → `yusuke`
- Permissions: `Contents: Read and write`、`Pages: Read and write`
- `Actions` / `Workflows` は不要
- Expiration: 1年
- 発行後は管理画面へ直接入力し、「保存」→「デプロイ実行」まで本人に行ってもらう
- 現行実装の `rev:` は難読化にすぎず暗号化ではないため、権限・対象リポジトリ・有効期限を最小化する

## 次回の再開順

1. ユーザーから、上記「未確定の確認事項」への指摘を聞く
2. 指摘を反映し、ゆうすけさんへ送る確認文を確定する
3. Google Sheets の編集結果と公開閲覧設定を再確認する
4. 問題がなければ顧客 config にスプレッドシートIDを設定する
5. `npm run build`、commit、push、GitHub Actions 成功、公開サイト読込を確認する
6. Fine-grained PAT の発行・管理画面への直接設定・デプロイをユーザーへ依頼する
7. 必要なら回答内容に応じて Home、履歴、ティア管理方法などを再設定する

## 手順書の保存状況

- 新規顧客対応の正本: `NEW_CUSTOMER.md`
- アンケート不整合チェックを外部反映より前に必須化済み
- Google Sheets の「特典内容」「特典管理」の初期設定、表記揺れの修正、編集後検証を記録済み
- Fine-grained PAT の発行 URL、必要権限、発行後の案内まで記録済み
- テンプレートリポジトリ最新コミット: `7c6c46c docs: automate questionnaire and Sheets validation`

## 機密情報

- 管理画面パスワードやトークン値は、この文書へ記録していない
- 顧客 config には現行仕様上、管理画面パスワードが含まれている。外部共有時に値を転記しない

