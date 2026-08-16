# 新Onboarding DAP design handoff

更新日: 2026-08-16

## 目的

既存Public Portalのdesignは変更しない。新 `onboarding.html` は状態・情報構造・interactionを検証するfunctional baselineであり、visual polishは別担当へhandoffできる。

## 必須情報構造

- 全体progressと完了数
- 現在最初に行うrequired step
- 各stepのstatus: pending / in_progress / complete / warning / blocked / optional
- なぜ必要か
- 必須/任意
- 自動完了条件または手動確認が必要な理由
- 実際のvalidation結果
- errorの修正方法
- 後から変更できるか
- 次に進める条件
- desktop/mobile preview
- 公開状態と最終公開時刻

## 利用者向け語彙

使用: 「ページ」「公開」「接続」「確認」「設定を保存」「準備中」
非表示: repository、organization、Actions、Pages設定、PAT、branch、commit、push、workflow、`config.js`、`customers.json`

## Interaction states

- 初回未設定
- profile入力中/完了
- URL形式不正
- data source未公開/接続失敗
- 必須sheetごとの成功/失敗
- `Special` header不在
- preview未確認/確認済み
- publish service準備待ち
- 公開中/成功/失敗
- smartphoneでのstep navigationとpreview link

## 制約

- `setup.html` と既存adminを削除・改名しない。
- Public PortalのHeader / Sidebar / BottomNav / popupを再設計しない。
- 価格、plan、決済、認証provider、theme preset名を追加しない。
- 手動チェックはvisual previewの承認等、機械判定できない工程だけにする。
- error表示は検出できた事実だけを述べる。
- dark/light双方で既存CSS variableと可読性を維持する。

## Design担当への依頼

functional baselineのDOM/accessible nameとstate testを維持しつつ、hierarchy、spacing、progressの視認性、mobileの操作密度を改善する。完了後はdesktop 1440×1000、mobile 390×844のPlaywrightと目視snapshotを再確認する。
