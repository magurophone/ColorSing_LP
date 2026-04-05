# 未実装リスト

## 保留中（スプシ構成確定後に実装）

### ② Homeにイベント告知ポスター
- **場所**: HomeView.jsx — Targetsセクションの直後、FAQの前
- **config**: `home.eventPoster.enabled / imageUrl / linkUrl / altText`
- **管理UI**: ContentTab.jsx にトグル＋URLフィールドを追加
- **メモ**: Google Drive URL → convertDriveUrl() で変換する

### ① イベント履歴ビュー（歌＋画像）
- **シート構成（案）**: A=日付 / B=タイトル / C=内容 / D=画像URL
- **新規ファイル**: `src/views/HistoryView.jsx`
- **変更**: `defaults.js` に views エントリ追加（enabled: false）、`App.jsx` にルーティング、`useSheetData.js` にfetch追加、`sheets.js` に履歴データ取得関数追加
- **表示**: 日付降順・月別グループ・画像ありの場合はカード内に表示

---

## 実装済みだが表示制御が未完

### メンシプ枠のアクセスキー制御
- TiersTab.jsx で `useKey / accessKey` の設定UIは追加済み
- **未実装**: 実際の表示ゲート（キーを知るユーザーのみ閲覧可にするロジック）

---

## mainへの反映（タイミングを見て実施）

- magurophoneブランチの全変更をmainにマージ
- `bash scripts/sync-all.sh` で全顧客に配布
- **注意**: マージ後は `git checkout HEAD -- public/customer/config.js` でconfig.jsを保護する
