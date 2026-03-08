# 新規顧客サイト作成手順

## リポジトリ構成

```
magurophone/ColorSing_LP（テンプレートリポジトリ）
  └─ main ブランチ  ← 全顧客への配布元。ここを変更して sync-all.sh で展開

colorsing-dashboard/{username}（顧客リポジトリ）
  └─ main ブランチ  ← 本番サイト
                      https://colorsing-dashboard.github.io/{username}/
```

**コード変更→全顧客反映の流れ:**
1. テンプレート（`main` ブランチ）で修正・push
2. `bash scripts/sync-all.sh` で全顧客に自動展開

---

## 新規顧客追加手順

### 1. 顧客リポジトリを作成

```
GitHub → colorsing-dashboard org → New repository
  名前: {username}（英数字・ハイフン。URLになる）
  Public
  README: なし（空リポジトリで作成）
```

### 2. customers.json に追記

テンプレートリポジトリの `customers.json` に追加:

```json
{
  "org": "colorsing-dashboard",
  "repos": ["magurophone", "npe", "{username}"]
}
```

### 3. sync-all.sh を実行

```bash
bash scripts/sync-all.sh
```

テンプレートのコードが顧客リポジトリにプッシュされる。

### 4. GitHub Pages を有効化（手動・1回のみ）

```
顧客リポジトリ → Settings → Pages
  → Source: 「GitHub Actions」を選択 → Save
```

その後 GitHub Actions が自動でビルド＆デプロイされる（数分かかる）。

> **Tips:** Actions タブでジョブの進捗を確認できる。

### 5. 顧客に管理画面URLを共有

```
https://colorsing-dashboard.github.io/{username}/admin.html
```

---

## 顧客側の初期設定（管理画面で行う）

| 優先 | タブ | 設定内容 |
|------|------|---------|
| 必須 | Google Sheets | スプレッドシートID（「リンクを知っている全員が閲覧可」に設定必須） |
| 必須 | デプロイ | Owner: `colorsing-dashboard` / Repo: `{username}` / Branch: `main` / Token（顧客のGitHub PAT） |
| 必須 | ブランディング | ブランド名・ページタイトル |
| 推奨 | カラー | テーマカラー |
| 推奨 | ビュー管理 | 使用するビューの有効/無効、ラベル |
| 推奨 | 特典ティア | ティア構成・スプレッドシートの列構成に合わせる |
| 任意 | コンテンツ | FAQ・UIテキスト |
| 任意 | エフェクト | パーティクル等 |

### GitHub PAT（Personal Access Token）の発行方法（顧客向け）

```
GitHub にログイン → Settings → Developer settings（左メニュー最下部）
  → Fine-grained tokens → Generate new token

設定:
  Token name: ColorSing LP
  Expiration: 任意（1年推奨）
  Resource owner: colorsing-dashboard
  Repository access: Only select repositories → {username}
  Permissions:
    Contents: Read and write
    Pages: Read and write（または Write）
```

> **注意:** Fine-grained token は org 管理者が `colorsing-dashboard` の Settings → Personal access tokens → Allow fine-grained personal access tokens を許可しておく必要がある。

---

## チェックリスト

```
管理者側:
  □ colorsing-dashboard org にリポジトリ作成（Public・空）
  □ customers.json に追記
  □ bash scripts/sync-all.sh を実行
  □ GitHub Pages を「GitHub Actions」に設定（Settings → Pages）
  □ 管理画面URLを顧客に共有

顧客側（管理画面）:
  □ Sheets タブ: スプレッドシートID入力
  □ デプロイ タブ: Repo / Token 入力
  □ ブランディング タブ: 名前・タイトル入力
  □ デプロイ実行（→ Actions でビルド完了確認）
  □ カラー・ティア等カスタマイズ
  □ 管理画面パスワードを設定してデプロイ
```

---

## テンプレート同期（コード更新時）

```bash
bash scripts/sync-all.sh
```

- `public/customer/` は各顧客側を保持（設定・画像は上書きされない）
- `.github/workflows/deploy.yml` も各顧客側を保持
- プッシュにより GitHub Actions が自動トリガー

---

## スプレッドシートの構成

| シート名（デフォルト） | 内容 |
|----------------------|------|
| `目標管理・ランキング` | ランキング（D2:G5）・目標（A2:B10） |
| `特典管理` | 権利者データ（1行目: ヘッダー。Special列必須） |
| `特典内容` | メニュー表示用特典一覧（A2:E20） |
| `特典履歴` | 特典実行履歴（A列: 年月, B列: ユーザー名, C列: ティアキー） |
| `枠内アイコン` | アイコン（1行目: ヘッダー, A列: 月/カテゴリ, B列: 名前, C列: 画像URL） |
| `イベント` | イベント情報（下記参照） |

**特典管理シートのヘッダー行（1行目）は必須。**
`Special` という列名が必要（大文字小文字不問）。なければ最終列が自動でSpecial列扱いになる。

---

### 枠内アイコンシートの注意事項

**A列は必ず「書式なしテキスト」に設定すること。**

```
A列を選択 → 表示形式 → 数字 → 書式なしテキスト
```

これを行わないと、`202601` のような年月値が数値と判定され、`まつり` 等の文字列カテゴリ名が正しく読み込まれない。

---

### イベントシートの構成・画像追加方法

列構成: `A列: 日付(yyyymmdd)` / `B列: タイトル` / `C列: セットリスト` / `D列: 画像URL` / `E列: 備考`

| 行 | 用途 |
|----|------|
| 3行目 | **次回イベント**（開催予定）の基本情報 |
| 4〜6行目 | 予約済み（使用しない） |
| 7行目以降 | **過去イベント**の情報 |

#### 次回イベントに画像を追加する（最大10枚）

- **1枚目**: 3行目のD列に画像URLを入力
- **2枚目以降**: 7行目以降に A・B・C列を**空白のまま**、D列だけに画像URLを入力

```
行3: 20260315  次回イベントタイトル  セットリスト  https://画像URL1  備考
行7: （空白）   （空白）              （空白）       https://画像URL2
行8: （空白）   （空白）              （空白）       https://画像URL3
```

#### 過去イベントに画像を追加する（最大10枚）

同じ日付＋タイトルの行を複数追加する。D列に1枚ずつ画像URLを入力。

```
行7:  20260215  イベント名  セットリスト  https://画像URL1  備考
行8:  20260215  イベント名  （空白）      https://画像URL2
行9:  20260215  イベント名  （空白）      https://画像URL3
```

> 同じ日付＋タイトルの行は自動的に1つのイベントとして集約される。画像は最大10枚まで。

---

## トラブルシューティング

| 症状 | 原因・対処 |
|------|----------|
| GitHub Actions が動かない | Settings → Pages が「GitHub Actions」になっているか確認 |
| データが表示されない | スプレッドシートの共有設定が「リンクを知っている全員が閲覧可」になっているか確認 |
| ヘッダー行がデータに混入する | 特典管理シートの1行目が正しくヘッダー（Special列含む）になっているか確認 |
| デプロイが失敗する | DeployTab の Token が正しいか確認。org の fine-grained token 許可設定を確認 |
| 設定が反映されない | 管理画面で「デプロイ実行」後、Actions の完了を待つ。ブラウザキャッシュをクリア |
| 削除したティアが復活する | ページリロード後に再確認（修正済み） |
