# Legacy compatibility contract

更新日: 2026-08-16

商品化変更はadditiveとし、以下を破壊する変更はrelease不可とする。

## URL契約

- 既存の `https://colorsing-dashboard.github.io/{slug}/` を維持する。
- `index.html`、`admin.html`、`setup.html`、`manual.html`、`features.html`、`promotion.html`、`monitor.html` はHTTP成功しbodyを表示できる。
- 新オンボーディングは別entry pointとして追加し、`setup.html` を置換しない。

## 設定契約

- `public/customer/config.js` を顧客固有領域として同期時に保持する。
- `window.DASHBOARD_CONFIG` と旧 `window.MAGUROPHONE_CONFIG` の読取を維持する。
- defaults、customer config、顧客別localStorageのmerge順を維持する。
- `admin` はlocalStorageで上書きしない。
- 既存views配列へ新しいdefault viewが追加されても既存順・有効状態を壊さない。
- header画像未設定は壊れたplaceholderを表示せず、既存のno-image表示を維持する。

## Public data契約

- 初期のactive sourceはGoogle Sheets。
- 中央sourceは顧客単位の明示設定またはserver-side flagがない限り有効化しない。
- 中央source失敗時は保護されたSheetsへfallbackする。
- shadow compareは表示結果を変更しない。
- ranking、goals、benefits、rights、Special列、history、events、iconsの正規化結果をfixtureで固定する。
- history/eventのoptional fetch failureはprimary dataを失敗させない。
- primary data failureは既存の全画面エラーと再読込操作を維持する。

## UI/interaction契約

- PC sidebarとsmartphone bottom navigationを維持する。
- Home、Menu、権利者、アイコン、イベント間の移動を維持する。
- Person popupからBenefit popupへ遷移でき、Escapeで閉じられる。
- configで無効化されたviewはnavigationへ出さない。
- desktop 1440×1000とmobile 390×844でhorizontal overflowを発生させない。
- adminの既存tab、local保存、Preview、legacy publish機能を維持する。

## 公開契約

- legacy `deployConfigToGitHub` と `fetchConfigFromGitHub` は削除しない。
- `public/customer/config.js` だけをcommitする現行動作を維持する。
- 新publish UIはGitHub/PAT/branch/commit/pushを利用者向けcopyに出さない。
- secretを新しいclient configへ追加しない。

## Release gate

1. `npm run build`
2. contract/unit suite
3. Playwright desktop
4. Playwright mobile
5. protected entry point smoke
6. 変更対象のinteraction/boundary state

いずれかが失敗した場合は顧客repositoryへの同期・公開を停止する。
