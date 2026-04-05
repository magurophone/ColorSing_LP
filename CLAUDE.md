# ColorSing LP — Claude作業ガイド

コード変更・push 時に必ず確認するルール集。

---

## 新規顧客追加（最重要）

**ユーザーから新規顧客の追加・初期設定を依頼されたら、作業開始前に必ず `NEW_CUSTOMER.md` を読むこと。**
手順・設定ガイド・チェックリストが全て記載されている。

---

## カラー・テーマ作業（重要）

**カラー設定・テーマ変更・管理画面のカラー UI 修正を依頼されたら、作業開始前に必ず `docs/color-system.md` を読むこと。**

設計上の落とし穴（cardBorderHover が常時ボーダーにも使われる、menuCardLabelColor がモバイルで全面を占有、glassBgColor の影響範囲は UI 全体など）、ライトテーマ自動挙動、各 config フィールドの完全な使用箇所マップ、管理画面の説明文執筆原則、kawaii パステル配色の原則が記載されている。

---

## リポジトリ構成

```
magurophone/ColorSing_LP  ← テンプレートリポジトリ（ここで作業）
  ├─ main ブランチ        ← おおもと。sync-all.sh はここを参照して全顧客に配布
  └─ magurophone ブランチ ← 開発・テスト用 兼 magurophoneサイトのバックアップ

colorsing-dashboard/magurophone  ← magurophoneの本番サイト（一般顧客と同じ構造）
  └─ main ブランチ                  https://colorsing-dashboard.github.io/magurophone/
```

- **magurophoneの本番**は `colorsing-dashboard` org 側。テンプレートの `magurophone` ブランチは開発環境。
- `public/customer/config.js` は顧客固有ファイルなので **main への反映・sync-all.sh の対象外**。

---

## 更新の正しい手順

```
1. magurophone ブランチで開発・動作確認
2. main ブランチに反映（public/customer/config.js は除く）
3. bash scripts/sync-all.sh で全顧客に配布
```

### コード変更後の push コマンド

```bash
# 1. main にcommit & push（ここで作業することが多い）
git add <files>
git commit -m "..."
git push origin main

# 2. magurophone ブランチにも反映
git checkout magurophone
git merge main --no-edit
git checkout HEAD -- public/customer/config.js  # ← magurophoneの実データを保持（必須）
git push origin magurophone
git checkout main

# 3. 全顧客に配布
bash scripts/sync-all.sh
```

> **注意**: `git push origin main:magurophone` は magurophone が独自のマージコミットを持つため
> non-fast-forward になることがある。必ず checkout → merge → push の順で行う。

---

## ファイル構成の注意点

| パス | 役割 |
|------|------|
| `public/customer/config.js` | 顧客固有設定。sync-all.sh で **上書きされない** |
| `public/customer/*.png` | 顧客固有画像。sync-all.sh で **上書きされない** |
| `scripts/sync-all.sh` | 全顧客リポに main を配布するスクリプト |
| `customers.json` | 配布対象の顧客リポ名一覧 |
| `src/lib/defaults.js` | デフォルト設定値（config.js 未設定時のフォールバック） |

---

## よくあるミス

- `magurophone` ブランチへの push を `git push origin main:magurophone` で行うと失敗する
  → checkout → merge → push で行う
- `public/customer/config.js` を main に含めると全顧客に配布されてしまう
  → このファイルは commit しない
- `git merge main` 後に magurophone の config.js が main のプレースホルダーに上書きされる
  → merge 直後に `git checkout HEAD -- public/customer/config.js` で復元する（push 前に必ず実行）

---

## フロントエンドUI生成ルール

「AIが作った感」を排除するためのルール。コード生成・修正時は常時適用すること。

### 絶対禁止（Anti-patterns）

テーマを問わず以下は使わない：

- Interフォント（デフォルトに戻るな）
- Lucideアイコン**のみ**の使用（Phosphor Icons を優先）
- 青→紫グラデーション背景
- shadcn デフォルトそのまま流用
- 角丸 16px 以上
- 無彩色のみの配色構成
- アニメーション・インタラクション完全なし

### 指示ルール

修正指示は**必ず数値で**行う：

| 曖昧（禁止） | 具体（必須） |
|------------|-----------|
| 「綺麗にして」 | 「padding を 24px に」 |
| 「もっと丸く」 | 「border-radius を 4px に」 |
| 「余白を増やして」 | 「section の margin-top を 80px に」 |

### テーマ定義

- **現行テーマ（ダーク）**: `src/lib/defaults.js` / `src/index.css` 参照
- **ウォームフラットテーマ**: `/ui-design` スキルを参照（`.claude/skills/ui-design/SKILL.md`）
