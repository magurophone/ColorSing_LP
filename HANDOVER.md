# 作業引き継ぎ — ゆうすけさんサイト

更新日時: 2026-07-15（JST）

## 最優先で確認すること

「ゆうすけさんへ確認する注意点」に対するユーザーの指摘を受領済み。

質問の切り分けは、回答によってサイト設定、シート構造、または実際の特典提供ルールが変わるかで判断する。未確定で本人の意思が必要なものは質問する。アンケートで確定済みの内容は再質問しない。アイコンの永続／月替わり、共通／個別のように、どのケースでも同じ仕組みで対応できて入力方法だけが変わるものは、選択を迫る質問にせず、ケース別の操作方法として案内する。こちらが本人の運用方針を勝手に決めてはいけない。

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

## ゆうすけさんへの質問・案内方針

以前の「未確定の確認事項」10項目は撤回し、そのまま送らない。

- Home・イベントの非表示、1k獲得者の非表示、デザインはアンケート回答どおりの確定事項として扱い、再質問しない
- 回答によってサイト設定やシート構造が変わる、複数特典の管理単位、履歴の要否、30k以上の記録方法は具体的に質問する
- 特典管理を毎月リセットするかどうかは、公開後に本人が管理シート上で行う日常運用であり、初期設定の質問にしない。制作側が前提を決めつけない
- 物理特典の申請・発送条件も本人の日常運用であり、サイトへ表示・設定する要件がない限り初期設定の質問に含めない
- 物理特典の住所は公開シートへ記録させず、安全な受領・発送・削除手順を別途案内する
- アイコンの月替わり／常設、共通／個別は、それぞれの場合のシート入力方法を案内し、全体方針の選択質問にはしない
- 質問には、その回答をサイト、シート、または案内へどう反映するかが明確なものだけを残す
- 質問候補を一問ずつ場当たり的に足し引きせず、全項目を同じ基準で監査する

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

1. `yusuke_questions.txt` の質問についてユーザー確認を得る
2. 回答をサイト設定、シート構造、特典提供案内へ反映する
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
