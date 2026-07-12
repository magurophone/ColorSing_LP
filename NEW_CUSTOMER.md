# 新規顧客追加手順（Claude実行用）

ユーザーから新規顧客の追加依頼があったとき、この手順に従って実行する。

---

## 必要な情報（アンケート回答から取得）

| 項目 | config.jsのキー | 備考 |
|------|---------------|------|
| URL用ユーザー名 | リポ名・deploy.repo | 英数字・ハイフン・アンダースコアのみ。変更不可 |
| サイト名 | brand.name / brand.pageTitle | 絵文字OK |
| 管理画面パスワード | admin.password | |
| テーマカラー | colors.* / colorOverrides.* | イメージから配色を決定 |
| フォントイメージ | fonts.display / fonts.body | Google Fontsから選定 |
| 使用画面 | views[].enabled | Home/特典内容/特典権利者/枠内アイコン/イベント |
| 特典ティア | benefitTiers[] | key/label/icon/displayTemplate/showUsers/showHistory |
| 特典単位 | benefitTiers[].displayTemplate | 済→isBoolean:true / 曲→{value}曲 等 |
| 特典タイトル | benefitTiers[].label | なければキー名のまま |
| FAQ | home.faq.items[] | なければ空配列 |
| 運用用スプレッドシートURL | sheets.spreadsheetId / Google Sheets初期設定 | 申込回答シートとは別物 |

---

## 作業原則（必ず守る）

- アンケート回答CSV、管理画面パスワード、GitHubトークンの平文を、作業メモやコマンドログへ保存しない。
- コマンド出力へパスワードやトークンを表示しない。`config.js` の全文diffも、パスワードが含まれるため共有しない。
- URL用ユーザー名が日本語・絵文字の場合は、英数字のslug（例: `yusuke`）を決め、GitHub上で未使用か確認する。
- `admin.password` は公開JavaScriptに含まれる簡易保護であり、強い認証ではない。使い回しのない専用値を使う。
- 初回Pages公開はGit pushとActionsで実行できるが、管理画面からの再デプロイには別途Fine-grained PATが必要。
- 顧客用リポジトリへ直接テンプレートを反映する場合、`.github/workflows/deploy.yml` の対象ブランチを必ず `main` にする。

## アンケート回答の取得

Googleフォームの編集URLは回答者情報を直接取得できないことがある。回答先スプレッドシートを使う。

公開閲覧できる回答シートは、次のURLでCSV取得できる。

```text
https://docs.google.com/spreadsheets/d/{spreadsheet_id}/gviz/tq?tqx=out:csv&gid={gid}
```

- 先頭行はヘッダー。フォーム上の「N件目」はCSV上ではヘッダーを除いたN件目（表計算上は通常N+1行目）。
- 回答シートは申込情報用であり、サイト運用データ用スプレッドシートとは別物。
- 必要項目だけを読み取り、回答CSV自体はコミットしない。

---

## 実行手順

### Step 0: アンケート内容の整合性チェック（反映前の必須ゲート）

アンケート回答者がサイト仕様やシート構造を完全に理解しているとは限らない。回答をそのまま `config.js` やGoogle Sheetsへ転記してはいけない。

GitHubリポジトリ作成、config編集、Google Sheets編集などの外部反映を始める前に、回答全体を横断して精査する。

#### 必須チェック項目

| 確認対象 | チェック内容 |
|---|---|
| URL用ユーザー名 | 日本語・絵文字・空白を含んでいないか。GitHub slugへ変換が必要か |
| サイト名 | 空欄、仮名、URL用ユーザー名との取り違えがないか |
| 管理画面パスワード | 空欄や使い回しを疑う値ではないか。公開JavaScriptの簡易保護であることを理解しているか |
| 使用画面 | 特典データがあるのに特典画面が無効、イベント情報がないのにイベント画面が有効などの矛盾がないか |
| ティア条件 | 重複、順序逆転、`5k`/`5K`/全角などの表記揺れ、条件抜けがないか |
| 特典内容 | 条件と内容の対応が明確か。複数特典、期限、非売品、要相談などの注記を落としていないか |
| 獲得者表示 | 表示なしのティアを「特典管理」へ誤って追加しないか。表示ありなのに管理単位が未回答ではないか |
| 履歴・レコード | 履歴表示要否と「レコード機能」のTRUE/FALSEが一致するか |
| 特典単位 | 「済」「曲」「時間分」「なし」が特典内容と合っているか。数値管理とBoolean管理を取り違えていないか |
| 特典タイトル | ティア数とタイトル数が一致するか。どのタイトルがどのティアか曖昧でないか |
| FAQ・注意事項 | 公開すべき注意、期限、受取方法が特典説明から抜け落ちていないか |
| テーマ・フォント | 指定同士が矛盾していないか。可読性を損なう配色にならないか |
| 運用用スプレッドシート | 申込回答シートを誤って運用用として指定していないか |

#### 特に確認を返すべき例

- 「獲得者表示あり」だが、単位が空欄。
- 「履歴表示要」だが、レコード機能をFALSEとしている。
- ティアが `30k以上` のような範囲条件なのに、管理方法が「済」でよいか不明。
- 1ティアに複数特典があり、一括で「済」にするのか個別管理するのか不明。
- 「要相談」「後で決める」など、サイト掲載文として未確定の回答がある。
- 使用画面にHomeがないのに、サイト名や要望がランキング・進捗表示を前提としている。
- 同じ特典が複数ティアへ重複しており、意図的か判断できない。
- ティアタイトルと条件の対応数が合わない。

#### 判定と対応

回答項目を次の3分類に分ける。

1. **問題なし**: そのまま正規化案へ採用できる。
2. **軽微な補正候補**: k/K、全角半角、余分な空白、句読点など。補正案を明示する。
3. **要確認**: 意味、管理方法、公開内容が変わる可能性がある。不明点をユーザーへ返す。

要確認が1件でもある場合は、外部反映を開始しない。次の形式で精査結果を提示し、ユーザーの判断を得る。

```text
アンケート精査結果

【問題なし】
- ...

【こちらで補正予定】
- 元の回答: ...
- 補正案: ...
- 理由: ...

【確認が必要】
1. 対象項目: ...
   現在の回答: ...
   懸念点: ...
   確認したいこと: ...

【反映予定の正規化仕様】
- 有効画面: ...
- ティア: ...
- 特典管理列: ...
- レコード対象: ...
- 未設定項目: ...
```

ユーザー確認後、確定した正規化仕様を基準に `config.js` とGoogle Sheetsの両方を生成する。アンケート原文と実装内容が異なる場合は、確認済みの正規化仕様を優先する。

### Step 1: GitHubリポジトリ作成

最初にCLIの実認証を確認する。`gh auth status` が成功しても保存トークンが失効している場合があるため、API呼び出しまで確認する。

```bash
gh api user --jq .login
gh repo view colorsing-dashboard/{username}
```

`repo view` が `Repository not found` なら未使用。次に公開リポジトリを作成する。

```bash
gh repo create colorsing-dashboard/{username} --public
```

#### `gh` が未導入・API認証が401になる場合

1. GitHub CLIがなければ、公式リリースのWindows portable zipを `C:\tmp` へ展開して `bin\gh.exe` を使う。
2. `git push` は成功するのに `gh api user` が401の場合、Git Credential Managerの保存認証を利用できる。
3. サンドボックス内で認証・APIが失敗し、ユーザーが明示的に許可した場合のみサンドボックス外で実行する。

PowerShellフォールバック例（秘密情報を出力しないこと）:

```powershell
$credentialInput = "protocol=https`nhost=github.com`nusername={github_login}`n`n"
$credentialLines = $credentialInput | git credential fill
$passwordLine = $credentialLines | Where-Object { $_ -like 'password=*' }
if (-not $passwordLine) { throw 'GitHub credential not found' }
$token = $passwordLine.Substring(9)

$headers = @{
  Authorization = "Bearer $token"
  Accept = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}
$body = @{ name = '{username}'; private = $false } | ConvertTo-Json
Invoke-RestMethod `
  -Method Post `
  -Uri 'https://api.github.com/orgs/colorsing-dashboard/repos' `
  -Headers $headers `
  -Body $body `
  -ContentType 'application/json' |
  Select-Object full_name, html_url, visibility

Remove-Variable token, credentialLines, passwordLine
```

`$credentialLines` や `$token` を単独で実行・出力しない。

### Step 2: customers.json に追記

`customers.json` の `repos` 配列に `"{username}"` を追加。

### Step 3: commit & push → sync-all.sh

```bash
git add customers.json
git commit -m "chore: add {username} to customers"
git push origin main
bash scripts/sync-all.sh
```

`sync-all.sh` が利用できない場合は、テンプレートを作業用ディレクトリへ複製し、顧客リポジトリへ直接pushする。

```powershell
git clone --local . C:\tmp\{username}-site
git -C C:\tmp\{username}-site remote set-url origin https://github.com/colorsing-dashboard/{username}.git
```

直接pushする場合の必須確認:

- `.github/workflows/deploy.yml` の `branches` を `[main]` に変更する。
- `public/customer/header.png` と `header-mobile.png` を削除する。
- `public/customer/config.js` を顧客用に置き換える。
- `npm ci` と `npm run build` が成功してからcommit・pushする。
- push後、テンプレート側と作業用顧客リポジトリの両方で `git status --short` が空であることを確認する。

### Step 4: GitHub Pages 有効化

先に顧客リポジトリのdeploy workflowが `main` を対象としていることを確認する。

```bash
gh api repos/colorsing-dashboard/{username}/pages -X POST --input - <<'EOF'
{"build_type":"workflow","source":{"branch":"main","path":"/"}}
EOF
```

`gh api` が401の場合は、Step 1と同じGit Credential Manager経由の `$headers` を使う。

```powershell
$body = @{
  build_type = 'workflow'
  source = @{ branch = 'main'; path = '/' }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod `
  -Method Post `
  -Uri 'https://api.github.com/repos/colorsing-dashboard/{username}/pages' `
  -Headers $headers `
  -Body $body `
  -ContentType 'application/json' |
  Select-Object html_url, status, build_type
```

### Step 5: config.js 作成・push

顧客リポを clone して config.js を作成:

```bash
cd /tmp
git clone https://github.com/colorsing-dashboard/{username}.git
```

config.js を作成する際の注意:
- 既存顧客の config.js を参考にする（`gh api repos/colorsing-dashboard/{既存}/contents/public/customer/config.js --jq '.content' | base64 -d`）
- **deploy.repo** に `{username}` を設定
- **admin.password** にアンケートのパスワードを設定
- **deploy.token** は初期状態では必ず空文字にする（PATをリポジトリへ直接書かない）
- **brightness** はテーマカラーに応じて `"light"` or `"dark"` を選択
- **headerGradientStart/End** は画像未設定なら空文字にする（背景が変わってしまうため）
- **images.headerDesktop / headerMobile** は空文字にする（後述）
- イベント非使用なら `views` の events を `enabled: false` に
- 運用用スプレッドシートが未作成なら `sheets.spreadsheetId` は空文字にする。申込回答シートのIDを入れない

⚠️ **ヘッダー画像のプレースホルダー削除（必須）**

sync-all.sh はテンプレ main の `public/customer/header.png` `header-mobile.png`（magurophone のプレースホルダー画像）を新規顧客リポに配布してしまう。
そのまま放置すると顧客サイトに magurophone の画像が表示されるため、Step 5 内で必ず削除する：

```bash
git -C /tmp/{username} rm public/customer/header.png public/customer/header-mobile.png
```

合わせて config.js の `images.headerDesktop` `images.headerMobile` を空文字 `""` にしておく。

```bash
git -C /tmp/{username} add public/customer/config.js
git -C /tmp/{username} commit -m "feat: initial config for {username}"
git -C /tmp/{username} push origin main
```

ファイル編集には利用中の正規編集ツールを使い、シェルの文字列リダイレクトで秘密情報を含むファイルを生成しない。

### Step 5.5: Google Sheetsの初期設定（次回から自動実行）

運用用スプレッドシートが共有されたら、`config.js` だけで終わらせず、「特典内容」と「特典管理」をStep 0でユーザー確認済みの正規化仕様に合わせて初期設定する。未精査のアンケート原文を直接転記しない。

#### 前提条件

- Google Driveアプリが接続済みで、Google Sheetsの書き込みアクションが有効であること。
- Step 0の整合性チェックが完了し、要確認事項についてユーザー回答を得ていること。
- 接続Googleアカウントが対象スプレッドシートの編集者であること。
- 対象が申込回答シートではなく、顧客の運用用スプレッドシートであること。
- 最初は必ず読み取り確認だけを行い、実データの有無を確認してから編集する。
- サイトからの読み取りには最終的に「リンクを知っている全員・閲覧者」が必要だが、共有設定の変更はユーザーへ確認してから行う。

#### 事前確認する範囲

```text
特典内容: A1:E20
特典管理: A1:Z20
```

「特典管理」のデータ開始行（通常3行目）以降に実ユーザーデータがある場合は、自動上書きせず停止して報告する。テンプレート見出しのみ、または空欄なら初期設定を続行する。

#### 「特典内容」生成ルール

通常はA3から、アンケートのティア順に1行ずつ設定する。

| 列 | 内容 | 生成元 |
|---|---|---|
| A | 特典ティア | `benefitTiers[].key` |
| B | 特典タイトル | `benefitTiers[].label` |
| C | 簡易説明 | アンケートの特典内容を短く整理 |
| D | 詳細説明・備考 | 期限、非売品、表示条件など |
| E | レコード機能 | 履歴が必要ならTRUE、不要ならFALSE |

表記対応ルール:

- スプレッドシート上の `1K`、`１Ｋ`、`1 k` などは、configのティアキーへ対応する表記に修正する。
- k/K、全角半角、余分な空白だけが違う既存行は同じティアとして扱い、重複行を作らない。
- 表記差以外の既存内容がアンケート回答と異なる場合は、勝手に上書きせず報告する。
- レコード機能は文字列ではなく、真偽値またはチェックボックス状態として設定する。

#### 「特典管理」生成ルール

通常は2行目をヘッダー行として使う。1行目の結合タイトル（例: 権利者）は保持する。

1. A列は `ユーザー名`。
2. `showUsers: true` のティアだけを、アンケート順にB列から追加する。
3. `showUsers: false` のティア列は作成しない。
4. 最後の列を `Special` にする。
5. 既存のk/K・全角半角・空白差はconfigのティアキーへ対応させる。
6. 古いテンプレートの未使用ティア見出しは、実データがないことを確認したうえで文字だけをクリアする。列自体は削除しない。

列の入力形式:

| 特典設定 | 特典管理の入力形式 |
|---|---|
| `isBoolean: true` / 単位が「済」 | チェックボックスまたはTRUE/FALSE。初期値FALSE |
| `{value}曲`、`{value}時間分` など | 数値入力 |
| `{value}` / 直接記入 | プレーンテキスト |
| `Special` | プレーンテキスト |

`config.js` の `columnIndex` は「特典管理」の配列位置と一致させる。A列のユーザー名がindex 0、B列がindex 1、C列がindex 2となる。獲得者表示なしのティアは、権利者一覧で参照しない値にする。

#### Sheets編集用の共通指示テンプレート

次回はアンケート回答から `{benefit_rows}` と `{rights_headers}` を組み立て、Google Drive接続済みスレッドへ以下を渡す。

```text
次の運用用Googleスプレッドシートを初期設定してください。

{spreadsheet_url}

対象は「特典内容」と「特典管理」の2タブだけです。
ほかのタブ、共有設定、シート名、数式、結合状態、セル書式、列幅、行高は変更しないでください。

最初に次を読み取ってください。
- 「特典内容」A1:E20
- 「特典管理」A1:Z20

「特典管理」のデータ開始行以降に実ユーザーデータがある場合は、何も編集せず報告してください。
テンプレート見出しだけ、または空欄なら次の初期設定を行ってください。

【特典内容】
次の行をA3から設定してください。

{benefit_rows}

- k/K・全角半角・空白だけが異なる既存ティアは、configのティアキーへ対応する表記に修正してください。
- 表記差のある既存行を見つけた場合は、その行を使い、重複行を追加しないでください。
- 表記差以外の既存内容が指定内容と異なる場合は、勝手に上書きせず報告してください。
- レコード機能は文字列ではなく、真偽値またはチェックボックス状態として設定してください。

【特典管理】
ヘッダー行を確認し、通常は2行目を次の構成へ対応させてください。

{rights_headers}

- A列はユーザー名です。
- 獲得者表示ありのティアだけをB列から順に配置してください。
- 獲得者表示なしのティア列は作成しないでください。
- 最後の列をSpecialにしてください。
- BooleanティアはチェックボックスまたはTRUE/FALSE、数値ティアは数値入力、直接記入ティアとSpecialはプレーンテキストにしてください。
- 未使用の旧ティア見出しは、実データがない場合だけ文字をクリアしてください。列は削除しないでください。
- 3行目以降へダミーユーザーを入力しないでください。
- 入力規則を設定できない場合は、別形式で代用せず未対応として報告してください。

編集後、両タブを再取得し、次を報告してください。
- 実際に編集したセル範囲
- 特典内容の全設定行
- 特典管理のヘッダー順
- 各特典列の入力形式
- 未対応項目、既存データとの差異
- ほかのタブを変更していないこと
```

#### 編集後の必須検証

- 「特典内容」のティア数、順序、タイトル、説明、レコード機能がアンケート回答と一致する。
- ティアキーのk/K・全角半角・空白差がconfigと対応済み。
- 重複ティアがない。
- 「特典管理」は `ユーザー名 → showUsers:trueのティア → Special` の順。
- 各列の入力形式が特典単位に対応している。
- 3行目以降へ不要なユーザーデータを追加していない。
- ほかのタブ、共有設定、書式、数式を変更していない。

#### スプレッドシートIDの反映

Sheets初期設定と共有確認が完了したら、URLの `/d/` と `/edit` の間を `sheets.spreadsheetId` に設定する。申込回答シートのIDを設定しない。設定後にビルド・push・Pages再デプロイを行う。

### Step 6: デプロイ確認

ローカル検証:

```bash
node --check public/customer/config.js
npm ci
npm run build
git status --short
```

設定項目も確認する:

- 有効画面がアンケート回答どおり
- ティアキーが重複していない
- `columnIndex` が0から連番
- `deploy.repo` が `{username}`
- ヘッダー画像のプレースホルダーが存在しない
- `deploy.token` が空

GitHub Actions確認:

```bash
gh run list --repo colorsing-dashboard/{username} --limit 3
```

対象コミットのrunが `completed success` になったら、次の公開URLがHTTP 200を返すことを確認する。

```text
https://colorsing-dashboard.github.io/{username}/
https://colorsing-dashboard.github.io/{username}/customer/config.js
```

公開configの確認時は、サイト名と `deploy.repo` の一致だけを真偽値で検証し、本文をログへ出さない。

### Step 7: GitHub PAT 生成・設定（手動・自動化不可）

この手順だけは毎回ユーザーによる手動操作が必要。初回Pages公開が成功していても省略しない。

ユーザーへの依頼文:

```text
サイトの初回公開は完了しました。
管理画面から今後デプロイできるように、GitHubのFine-grained PATを発行してください。
発行URL: {token_issuance_url}

発行画面では次のとおり設定してください。
- Token name: {username}
- Expiration: 1年
- Resource owner: colorsing-dashboard
- Repository access: Only select repositories
- Selected repositories: {username}
- Repository permissions:
  - Contents: Read and write
  - Pages: Read and write
- Actions / Workflowsなど、上記以外の権限は追加しない

トークンはチャットへ貼らず、管理画面の「デプロイ」タブへ直接入力してください。
入力後は「保存」→「デプロイ実行」まで行い、成功したことを教えてください。
```

発行URL:

```text
https://github.com/settings/personal-access-tokens/new
```

顧客名・Organization・期限・権限を事前入力するURLテンプレート:

```text
https://github.com/settings/personal-access-tokens/new?name={username}&description=ColorSing+dashboard+deployment&target_name=colorsing-dashboard&expires_in=365&contents=write&pages=write
```

このURLではリポジトリ選択までは固定されない。画面上で必ず `Only select repositories` → `{username}` を選択する。

### 作業完了後の必須案内ルール

初回公開作業が完了したら、最終回答に必ず次を含める。

1. サイトURL
2. 管理画面URL
3. Fine-grained PAT発行URL（可能なら顧客slug入りの事前入力URL）
4. Resource owner: `colorsing-dashboard`
5. Repository access: `Only select repositories` → `{username}`
6. `Contents: Read and write`
7. `Pages: Read and write`
8. `Actions` / `Workflows` など追加権限は不要
9. Expiration: 1年
10. トークンはチャットへ貼らず、管理画面へ直接入力すること
11. 管理画面で「保存」→「デプロイ実行」まで行うこと
12. 運用用スプレッドシートIDなど、その時点で残っている作業

この案内を送る前に「作業完了」とだけ報告して終了しない。

GitHub公式手順:

```text
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token
```

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token
2. 設定:
   - Token name: `{username}`
   - Expiration: 1年
   - Resource owner: `colorsing-dashboard`
   - Repository access: Only select repositories → `{username}`
   - Permissions:
     - Contents: **Read and write**
     - Pages: **Read and write**
3. Generate → トークンをコピー
4. 管理画面（`https://colorsing-dashboard.github.io/{username}/admin.html`）→ デプロイタブ → Token に貼り付け → 保存 → デプロイ実行

注意:

- トークンをチャット、Issue、コミット、スクリーンショットへ貼らせない。
- 発行済みかどうかは、管理画面で本人に確認してもらう。こちらから値を読み出さない。
- Fine-grained PATは対象リポジトリを `{username}` のみに限定する。
- 現行管理画面はトークンを `rev:` 形式へ難読化して設定ファイルへ保存することがあるが、暗号化ではない。必ず対象リポジトリ・権限・期限を最小化し、使い回さない。

### Step 8: ユーザーに共有

```
サイトURL:   https://colorsing-dashboard.github.io/{username}/
管理画面URL: https://colorsing-dashboard.github.io/{username}/admin.html
残作業:      運用用スプレッドシート設定 / Fine-grained PAT設定 / 必要ならヘッダー画像設定
```

管理画面パスワードを再掲する必要がある場合は、安全な連絡手段を使う。公開Issueやコミットメッセージには書かない。

---

## 完了状態の区別

- **初回公開完了**: 顧客リポジトリ作成、専用config push、Pages有効化、Actions成功、公開URL 200まで。
- **ユーザー作業依頼済み**: Fine-grained PATの発行・管理画面への直接入力を依頼した状態。
- **運用準備完了**: 運用用スプレッドシートID、必要画像、Fine-grained PATを管理画面で設定し、管理画面からのデプロイ成功まで確認した状態。

初回公開完了だけで「すべて完了」と報告しない。未設定項目を必ず明示する。

---

## フォント選定ガイド

| アンケート回答 | display候補 | body候補 |
|-------------|-----------|---------|
| 格式高い・高級感 | Playfair Display, Noto Serif JP | Noto Serif JP, Shippori Mincho |
| モダン・すっきり | Montserrat, Noto Sans JP | Noto Sans JP, M PLUS 2 |
| インパクト・個性的 | Oswald, Bebas Neue | M PLUS 2, Noto Sans JP |
| やわらかい・親しみやすい | Zen Maru Gothic, Kosugi Maru | M PLUS Rounded 1c, Zen Maru Gothic |

---

## テーマカラー設定ガイド

lightテーマの場合:
- `deepBlue` → 背景色（白系: #FFF0F5 等）
- `oceanTeal` → サブ背景色（薄い色）
- `lightBlue` → UIメインカラー
- `amber` → サブカラー
- `accent` → アクセントカラー
- `brightness` → `"light"`

darkテーマの場合:
- `deepBlue` → 背景色（暗い色: #0a1628 等）
- `brightness` → `"dark"`

---

## 特典ティア設定ガイド

| アンケート情報 | config.jsのキー |
|-------------|---------------|
| 条件（1K, 5K等） | key: "1k", "5k" 等 |
| 特典タイトル | label |
| 獲得者表示有 | showUsers: true |
| 獲得者表示無 | showUsers: false |
| 履歴表示要 | showHistory: true |
| 履歴表示不要 | showHistory: false |
| 単位「済」 | isBoolean: true, displayTemplate: "済" |
| 単位「曲」 | displayTemplate: "{value}曲" |
| 単位「時間分」 | displayTemplate: "{value}時間分" |
| 単位「なし」（直接記入） | displayTemplate: "{value}" |

---

## チェックリスト

```
□ アンケート全項目の整合性チェック完了
□ 補正案・要確認事項をユーザーへ提示し、正規化仕様の確認済み
□ 要確認事項が残ったまま外部反映を始めていない
□ GitHubリポ作成（colorsing-dashboard/{username}、Public）
□ customers.json 追記 → push → sync-all.sh
□ deploy.yml の対象ブランチが main
□ GitHub Pages 有効化（API経由）
□ ヘッダープレースホルダー画像 削除（public/customer/header.png, header-mobile.png）
□ config.js 作成・push（全設定反映済み・headerDesktop/Mobile/token は空）
□ Google Drive接続とSheets書き込み権限を確認
□ 「特典内容」を正規化仕様どおり初期設定
□ 「特典管理」を showUsers・単位・columnIndex に合わせて初期設定
□ Sheets編集後に両タブを再取得し、重複・表記・入力形式・未変更範囲を検証
□ 運用用スプレッドシートIDをconfigへ反映（申込回答シートではない）
□ node --check / npm run build 成功
□ GitHub Actions completed success
□ 公開URL 200 / 公開configのサイト名・repo一致
□ GitHub PAT発行をユーザーへ依頼（発行URL・Resource owner・対象repo・Contents/Pages R/W・期限1年を明記）
□ Actions / Workflowsなど余分な権限は不要と案内
□ トークンはチャットには貼らず管理画面へ直接入力と案内
□ GitHub PAT設定後、管理画面からデプロイ実行を本人が確認
□ サイトURL・管理画面URL・残作業をユーザーに共有
□ 残作業メモ（スプシID未設定、FAQ後日追記 等）
```
