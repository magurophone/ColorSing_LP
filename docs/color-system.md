# カラーシステム技術リファレンス

ColorSing_LP のカラー設定の全体像と実装詳細。コード変更時は本ドキュメントも更新すること。

## アーキテクチャ

```
config.colors.*           (ベースカラー6色)
config.colorOverrides.*   (上書き用オーバーライド)
         ↓ ConfigContext.jsx (useEffect で CSS 変数注入)
 --base-*, --override-*, --color-*, カスタムCSS変数
         ↓ index.css @theme / Tailwind
 Tailwindクラス (text-primary, border-card-border等) / インラインstyle
```

主要ファイル:
- `src/context/ConfigContext.jsx`: CSS 変数注入ロジック
- `src/index.css`: Tailwind `@theme` と `[data-theme="light"]` オーバーライド
- `src/admin/tabs/ColorsTab.jsx`: 管理画面の色ピッカー UI
- `src/lib/defaults.js`: デフォルト config 値

## 全 config フィールド → CSS 変数 → 使用箇所の対応表

### ベースカラー `config.colors.*`

| フィールド | CSS 変数 | 主な使用箇所 |
|---|---|---|
| `deepBlue` | `--base-deep-blue` → `--color-deep-blue` | body 背景グラデ両端、ヘッダー背景両端、全カード/ティア/メニューのフォールバック元 |
| `oceanTeal` | `--base-ocean-teal` → `--color-ocean-teal` | body 背景グラデ中央、ヘッダー背景中央、タイトルグラデ `start` フォールバック |
| `lightBlue` | `--base-light-blue` → `--color-light-blue` | text-primary/card-border/name-text/content-text の算出元、スクロールバー、text-glow、water-shimmer |
| `amber` | `--base-amber` → `--color-amber` | text-highlight/card-border-hover/footer-text の元 |
| `accent` | `--base-accent` → `--color-tuna-red` | rank1Card フォールバック、**box-glow-soft の光彩色（全ポップアップの光）** |
| `gold` | `--base-gold` → `--color-gold` | 限定コンテンツ・アクセスキー・メンバーシップティア |

### テキスト系オーバーライド `config.colorOverrides.*`

| フィールド | CSS 変数/Tailwind | 実際の使用箇所 |
|---|---|---|
| `primaryText` | `--color-primary` / `text-primary` | 全セクション見出し、Sidebar/BottomNav 選択中タブ、Header 更新ボタン、サイト名グラデOFFフォールバック、Loading |
| `accentText` | `--color-highlight` / `text-highlight` | **最広範囲**: ランキング2-3位数字、▸矢印、FAQ、MenuView 全ラベル+カード名、PersonPopup 人物名+ティアヘッダー+Special権利、全アイコン類 |
| `nameText` | `--color-name-text` / `text-name-text` | ランキング名、権利者カード名、枠内アイコンのユーザー名 |
| `contentText` | `--color-content-text` / `text-content-text` | 目標内容、FAQ回答、イベント説明、MenuView カード名+説明、PersonPopup ティア+Special権利、BenefitPopup 特典名+説明 |
| `footerText` | `--color-footer-text` / `text-footer-text` | フッターメイン行のみ |
| `subText` | `--color-sub-text` / `text-sub-text` | 補足テキスト全般（閉じる×、タイムスタンプ、空状態メッセージ、フッター副文、「歌推しPt」ラベル等） |
| `titleColor` | `--color-title` | サイト名（グラデOFF時のみ）|
| `titleGradientStart/Mid/End` | `--color-title-gradient-*` | サイト名グラデーション3色 |

### 背景・カード系オーバーライド

| フィールド | CSS 変数 | 使用箇所 |
|---|---|---|
| `glassBgColor`/`Opacity` | `--override-glass-bg` | `.glass-effect` ユーティリティ全般（**UI要素の大半**）|
| `sidebarBgColor`/`Opacity` | `--sidebar-bg` | PC サイドバー専用 |
| `bottomNavBgColor`/`Opacity` | `--bottom-nav-bg` | スマホ下部メニュー専用 |
| `menuCardBgColor`/`Opacity` | `--menu-card-bg` | MenuView カード専用 |
| `menuCardLabelColor`/`Opacity` | `--menu-card-label-bg` | MenuView カード内側レイヤー（**デスクトップはラベル帯/モバイルはカード全面**）|
| `tierCardBgColor`/`Opacity` | `--tier-card-bg` | PersonPopup ティアカード |
| `popupOverlayColor`/`Opacity` | `--popup-overlay-bg` | 全ポップアップの背景暗幕 |
| `backgroundMain`/`backgroundMid` | `--override-background-main/-mid` | body 背景グラデ |
| `cardBorder` | `--color-card-border` / `border-card-border` | 全カード・入力欄・境界・仕切り線 |
| `cardBorderHover` | `--color-card-hover` / `border-card-hover` | ホバー時 **+ HomeView 目標カード常時・MenuView ラベル帯下線常時** |
| `rank1Card` | `--color-rank1-card` | ランキング1位カード border + ポイント数 |
| `headerGradientStart` | `--color-header-gradient-start` | **ヘッダー背景グラデ中央の明るい色**（名前と実態ズレ）|
| `headerGradientEnd` | `--color-header-gradient-end` | **ヘッダー背景グラデ両端の暗い色**（名前と実態ズレ）|

## 設計上の落とし穴（要注意）

### 1. `cardBorderHover` は「ホバー時」だけじゃない
- `src/views/HomeView.jsx:160` 目標カードの**常時**ボーダー
- `src/views/MenuView.jsx:59` デスクトップラベル帯の下線（常時）

### 2. `menuCardLabelColor` はモバイルでカード全面
- デスクトップ: カード上部のラベル帯のみ
- モバイル: `flex-1` でカード内側全面を占有

### 3. `glassBgColor` は「ランキングカード等」の範疇じゃない
全 `.glass-effect` 要素 = **UI 要素の大半**
（カード全種、ポップアップ、Sidebar、BottomNav、Header 更新ボタン、入力欄、FAQ、管理画面 UI 全般）

### 4. `accentText` の内部名は `highlight`
CSS: `--color-highlight` → `text-highlight`（コード調査時の混乱防止）

### 5. `headerGradientStart/End` の名前と実態がズレ
- `start` → 中央（50%位置）
- `end` → 両端（上下）

## ライトテーマ自動挙動（`colors.brightness === 'light'`）

index.css の `[data-theme="light"]` セレクタで以下が自動上書き：

| 項目 | ダーク | ライト |
|---|---|---|
| `--color-name-text` | `lightBlue 20%, white` | `lightBlue 35%, #2c1810` |
| `--color-content-text` | `lightBlue 10%, white` | `lightBlue 25%, #2c1810` |
| `--color-sub-text` | `#9ca3af` | `#6b5a4e`（暖色茶）|
| body color | white | `#2c1810` |

ConfigContext で計算される値（ライトテーマ時）:
- `glassBgOpacity` デフォルト 0.6 → **0.85**
- `tierCardBg` デフォルト `deepBlue@50%` → **`#ffffff@55%`**
- `popupOverlayColor` デフォルト `黒@70%` → **`oceanTeal@55%`**

**注意**: `#2c1810`（暖色茶）混入があるため、ピンク×ブルーなどクール系テーマでは**くすみモーブ**が生じる。クール系では `nameText`/`contentText` を explicit 指定推奨。

## override 不可のハードコード色

以下は config 経由でしか変更不可（Tailwind クラスで hex はないが専用 override がない）:
- `HomeView.jsx:185` 未終了イベント枠: `border-amber/40`
- `HomeView.jsx:195` イベント日付: `text-amber`
- `IconGallery.jsx:255` アイコン画像bg: `bg-deep-blue/30`
- `HomeView.jsx:227-229` coming up 装飾: `bg-primary/30`, `/50`

## 管理画面 UI 説明文の執筆原則

### DO
- **ユーザーの見た目の名前**を使う（「サイドバー」「特典内容ページ」「人物ポップアップ」）
- **何が変わるか**を具体的に（「ランキング2-3位の数字」「FAQ見出し」）
- **フォールバック**を明記（「未設定なら〜と同じ」）
- **ライトテーマ時の挙動**があれば明記

### DON'T
- CSS 変数名やコンポーネント名を書かない（`text-highlight`, `Sidebar`, `glass-effect` 等）
- `color-mix`、opacity算式などの実装詳細を書かない
- 「ランキングカード等」の曖昧表現を避ける

## kawaii パステル配色の原則

**物理的事実**: 明度80%+の真のパステルを白背景上のテキストにすると WCAG コントラスト不足。

### Sanrio/Hello Kitty 等 kawaii ブランドの実際の配色
- 公式ピンク `#E16389`（明度55%、中彩度ペイル）
- 公式ブルー `#095D9A`（中濃ブルー）
- テキスト `#1E181A`（near-black）

### 正しい kawaii パステル配色パターン
1. **背景**: 真のパステル（明度85%+）
2. **カード**: やや濃いパステル（明度60-80%）
3. **文字**: 深めの色（明度30-55%）
4. **装飾**（アイコン・ボーダー）: パステル

参考:
- [UX PA Magazine - Color Contrast](https://uxpamagazine.org/color-contrast-infographics-and-ui-accessibility/)
- [Figma - Color Combinations](https://www.figma.com/resource-library/color-combinations/)
- [Pink Blue Pairing](https://www.media.io/color-palette/pink-blue-color-palette.html)

## 画像からの色抽出（リファレンス画像 → テーマ色）

```bash
cd /tmp && npm install sharp
```

```js
const sharp = require('sharp');
const img = sharp('path.jpg');
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
// 5px おきにピクセルサンプリング
// (r>>4, g>>4, b>>4) でバケット化
// ヒストグラムで dominant colors を抽出
```

## 既知の設計的改善点（未対応）

- `cardBorderHover` の命名変更 or 常時ボーダー用の別 override 追加
- `menuCardLabelColor` のリネーム（「ラベル」じゃない）
- `headerGradientStart/End` のリネーム（実態は middle/edges）
- `accentText` / CSS `highlight` の命名統一
- `text-amber`/`border-amber/40` のハードコードを専用 override に
- ライトテーマ時の `nameText`/`contentText` 自動値を色相適応化（現在は `#2c1810` 固定）

## 更新履歴

- 2026-04-05: 初版作成（NaNa7 顧客セットアップ作業で発見した知見を基に）
