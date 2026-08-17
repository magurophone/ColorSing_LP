// 動作確認用の仮実装を許す場所を、開発機のブラウザだけに限定する。
//
// 決済や認証が未接続のとき、本番で仮の受付を開いてはいけない。一方で開発中は
// 画面を通しで確認できる必要がある。判定をここへ集約し、各画面が個別に
// 緩めないようにする。

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export function isLocalPreview() {
  if (typeof window === 'undefined') return false
  // 本番の挙動を検査できるようにする明示の上書き。テストだけが使う。
  if (typeof window.__localPreview === 'boolean') return window.__localPreview
  return LOCAL_HOSTS.has(window.location.hostname)
}

// 仮実装を使っていることは画面にも出す。黙って動かさない。
export const PLACEHOLDER_NOTICE = '※ 動作確認用の仮処理です。公開サービスへは接続していません。'
