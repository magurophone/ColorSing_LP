// 新規顧客と既存顧客を状態で分ける。
//
// 新規顧客の正規データソースはCentral DBで、管理画面から直接入力する。
// Google Sheetsは既存顧客を壊さず移行するためのlegacy data sourceであり、
// 新規顧客の標準運用ではない。新しい商品で旧運用を再生産しないための境界。
//
// DataSourceは内部実装の概念なので、利用者へ選ばせない。

export const TENANT_KIND = Object.freeze({
  NEW: 'new',
  LEGACY: 'legacy',
})

export const DATA_SOURCE = Object.freeze({
  CENTRAL: 'central',
  SHEETS: 'sheets',
})

export function resolveTenantKind(config = {}) {
  const declared = config.platform?.tenantKind
  if (declared === TENANT_KIND.NEW || declared === TENANT_KIND.LEGACY) return declared
  // 既存顧客はスプレッドシートIDを持っている。新規顧客には作らせない。
  if (String(config.sheets?.spreadsheetId ?? '').trim()) return TENANT_KIND.LEGACY
  return TENANT_KIND.NEW
}

export function resolveDataSource(config = {}) {
  return resolveTenantKind(config) === TENANT_KIND.NEW ? DATA_SOURCE.CENTRAL : DATA_SOURCE.SHEETS
}

// Sheets→DBの移行は既存顧客だけの機能。新規顧客の導線へ出さない。
export function isSheetsMigrationAvailable(config = {}) {
  return resolveTenantKind(config) === TENANT_KIND.LEGACY
}

// 新規顧客の支援者情報は管理画面で扱う。管理画面が未接続のときは、
// 空を「完了」と誤判定せず、準備中として扱う。
export function describeSupportersStep(supporters = null) {
  if (!supporters || supporters.status === 'not_configured') {
    return {
      headline: '支援者情報の管理画面を準備しています',
      statusLabel: '準備中',
      now: '準備ができると、この画面から支援者を追加・編集できます。',
      why: '登録した支援者が、歌推しページのランキングや特典の表示になります。',
      completion: '支援者を登録できること。',
      later: '登録した内容は公開後もいつでも変更できます。',
      action: null,
      blocking: 'waiting',
    }
  }
  if (supporters.status === 'ready') {
    return {
      headline: '支援者情報を登録しました',
      now: '続けて公開する内容を確認してください。',
      why: '登録した支援者が、歌推しページのランキングや特典の表示になります。',
      completion: '支援者を登録できること。',
      later: '登録した内容は公開後もいつでも変更できます。',
      action: null,
      blocking: 'action_required',
    }
  }
  return {
    headline: 'まだ支援者を登録していません',
    now: '支援者情報を設定しましょう。「支援者を登録する」から追加できます。',
    why: '登録した支援者が、歌推しページのランキングや特典の表示になります。',
    completion: '支援者を登録できること。',
    later: '登録した内容は公開後もいつでも変更できます。',
    action: { label: '支援者を登録する', route: '/supporters' },
    blocking: 'action_required',
  }
}
