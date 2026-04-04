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

---

## 実行手順

### Step 1: GitHubリポジトリ作成

```bash
gh repo create colorsing-dashboard/{username} --public --confirm
```

### Step 2: customers.json に追記

`customers.json` の `repos` 配列に `"{username}"` を追加。

### Step 3: commit & push → sync-all.sh

```bash
git add customers.json
git commit -m "chore: add {username} to customers"
git push origin main
bash scripts/sync-all.sh
```

### Step 4: GitHub Pages 有効化

```bash
gh api repos/colorsing-dashboard/{username}/pages -X POST --input - <<'EOF'
{"build_type":"workflow","source":{"branch":"main","path":"/"}}
EOF
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
- **brightness** はテーマカラーに応じて `"light"` or `"dark"` を選択
- **headerGradientStart/End** は画像未設定なら空文字にする（背景が変わってしまうため）
- イベント非使用なら `views` の events を `enabled: false` に

```bash
# /tmp にcloneしたリポのWriteツールが効かない場合は bash の cat/sed で直接書く
git -C /tmp/{username} add public/customer/config.js
git -C /tmp/{username} commit -m "feat: initial config for {username}"
git -C /tmp/{username} push origin main
```

### Step 6: デプロイ確認

```bash
gh run list --repo colorsing-dashboard/{username} --limit 3
```

全て `completed success` になったら完了。

### Step 7: ユーザーに共有

```
サイトURL:   https://colorsing-dashboard.github.io/{username}/
管理画面URL: https://colorsing-dashboard.github.io/{username}/admin.html
パスワード:  {アンケートのパスワード}
```

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
□ GitHubリポ作成（colorsing-dashboard/{username}、Public）
□ customers.json 追記 → push → sync-all.sh
□ GitHub Pages 有効化（API経由）
□ config.js 作成・push（全設定反映済み）
□ デプロイ成功確認
□ サイトURL・管理画面URL・パスワードをユーザーに共有待ち
□ 残作業メモ（スプシID未設定、FAQ後日追記 等）
```
