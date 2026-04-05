---
name: ui-design
description: ウォームフラットテーマで本番品質のフロントエンドUIを生成する。「新テーマで」「#E87C35 ベースで」「ウォームな感じで」「ライトテーマで」などの指示で自動起動する。汎用的なAIデザインを排除し、以下のルールを厳守して実装する。
---

# AI UI生成 — 完全設計ルール

## ① 前提（最重要）

「想像で補完」しない。
必ず以下の構造・スタイル・トークン・禁止事項に従って実装する。
定義されていない要素は推測せず、既存ルールに従って統一する。
曖昧な解釈は禁止。

## ② 構造定義

レイアウト構造：
```
Header:       ロゴ（左）+ ナビ（右、3〜5リンク）
Hero:         左=テキスト（見出し+説明+CTA） / 右=ビジュアルor図形要素
Card Section: 3カラム（アイコン+タイトル+説明）
Footer
```

比率ルール：
- 最大幅: 1200px
- セクション余白: 上下 80px
- カラム間ギャップ: 24px
- 8px グリッドシステム準拠

## ③ デザイントークン（全コンポーネントで統一必須）

```
Primary:       #E87C35
Secondary:     #EAD0B3
Accent:        #5D4037
Background:    #FFFBF6
Alert:         #FF6B6B
Text Base:     #333333

Font Heading:  "Zen Kaku Gothic New"
Font Body:     "Noto Sans JP"
Spacing:       8px grid
Border-radius: 6px
Shadow:        0 4px 16px rgba(0,0,0,0.06)
```

CSS変数として定義：
```css
:root {
  --color-primary:   #E87C35;
  --color-secondary: #EAD0B3;
  --color-accent:    #5D4037;
  --color-bg:        #FFFBF6;
  --color-alert:     #FF6B6B;
  --color-text:      #333333;
  --radius:          6px;
  --shadow:          0 4px 16px rgba(0,0,0,0.06);
}
```

## ④ ビジュアルスタイル

- 余白を広めに取る（8pxグリッド準拠）
- グラデーション使用しない（ベタ塗り + 淡い背景色）
- フラット寄り、冷たすぎない
- 角丸: 4px〜8px（最大6px推奨）
- トーン：「整っているが無機質ではない」「ブランド感はあるが過剰装飾なし」

## ⑤ カラールール

- 背景: 暖色系オフホワイト (#FFFBF6)
- ボタン: Primary (#E87C35)
- Hover: Primary の 10% 暗色 (#d06e2e 相当)
- テキスト基本: #333333
- 禁止: Tailwind デフォルトブルー、無彩色のみの構成、青→紫グラデーション

## ⑥ アイコン指定

Phosphor Icons（Regular または Duotone）のみ使用：
- 線の太さ統一
- サイズ: 20px〜24px

```jsx
import { House, User, ArrowRight } from "@phosphor-icons/react"
```

Lucide アイコンのみに依存しない。

## ⑦ 禁止事項（Anti-patterns）

- Interフォント
- Lucideアイコンのみ使用
- 青→紫グラデーション背景
- shadcnデフォルトそのまま
- 角丸16px以上
- デフォルトUIの流用感
- アニメーション完全なし

## ⑧ 実装形式

- React + Tailwind CSS
- コンポーネント分割構成
- デザイントークンをCSS変数またはTailwindテーマ変数で管理
- 再利用可能設計

## ⑨ 出力形式

コードの前に必ず記載：

```
**Theme**: ウォームフラット (#E87C35)
**Structure**: [使用レイアウト構造]
**Key Decisions**: [主要デザイン判断 3点]
```
