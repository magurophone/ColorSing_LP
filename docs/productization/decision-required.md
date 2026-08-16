# Decision required

更新日: 2026-08-16

以下は実装で推測せず、product/運用/security担当の決定が必要である。

## 1. 顧客認証

選択肢:

- 管理サービス独自account/session
- 外部identity provider
- 既存platform accountとの統合

影響: tenant紐付け、管理画面保護、session、退会、監査、support手順。現時点では既存のclient-side password gateを互換のため維持できるが、新SaaSの本人確認には使用しない。

## 2. Provisioning / publish serviceの配置

選択肢:

- 既存platform backendへ追加
- 専用control-plane service
- 当面は運営者実行のautomation worker

影響: API契約、queue、retry、audit、rate limit、可用性、費用。現時点ではorchestration contractとinjected adapterまで実装可能。

## 3. GitHub credential方式

選択肢:

- GitHub App installation token
- 組織管理の短命token/worker identity
- legacy PATを運営者側だけで継続

影響: secret保管、rotation、repository scope、audit、障害対応。顧客へ新規PATを要求する設計は拡張しない。

## 4. 最終hosting

選択肢:

- 顧客別GitHub Pagesを継続
- 集中static hosting
- tenant-aware web application

影響: URL、custom domain、build回数、停止/再開、cache、failure isolation。既存URLのredirect/維持契約を先に決める。

## 5. 中央DB/API契約

選択肢:

- 既存統合基盤のpublic DTOを採用
- adapter gatewayで既存schemaを変換
- 新規schemaを別途設計

影響: tenant identity、cache、公開範囲、fallback、semantic diff、migration。repository内にDB schemaやAPI実体はない。現在のclient境界へbase URLを設定する前にendpointとpayloadをAPI所有者が確認する。

## 6. Sheets連携権限

選択肢:

- 公開read-only GVizを継続
- Google OAuthでcopy/validation支援
- 中央service account/Drive連携

影響: consent、scope、共有設定、template copy、個人Driveへのアクセス。現時点ではURL解析と公開read validationまで実装可能。

## 7. 料金・plan境界・決済

選択肢は未確定。Portal/Proの価格、trial、停止猶予、決済providerをコードへ固定しない。planにより機能をgateする前にentitlement sourceを決める。

## 8. sign-upとslug ownership

外部signupを即時許可するか、招待制trialにするか、slug予約と商標/なりすまし確認をどう扱うかを決める。現時点ではformat validationと候補作成まで可能。

## 9. lifecycle

suspend、reactivate、解約後の保持期間、repository/archive、Sheets参照停止、顧客削除、データexportの運用決定が必要。既存resourceを自動削除しない。

## 10. 既存顧客migration

任意opt-in、段階移行、全面移行のどれにするか未確定。現時点ではlegacy経路を既定とし、customer単位flagとrollback可能性だけ確保する。
