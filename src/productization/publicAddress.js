// 公開URLの識別子（service.example.com/<ここ>）の検証。
//
// 利用者にはページ名とURLを別の入力として見せる。ページ名は自由に決められ、
// URLだけが技術的な制約を持つ。利用者向けの文言に slug、repository、tenant
// などのシステム語彙を出さない。

// 公開URLの直下に既存の入口があるため、それらは使えない。
// 既存資産を壊さないための予約であり、商品名の予約ではない。
const RESERVED = new Set([
  'index', 'admin', 'setup', 'manual', 'monitor', 'features', 'promotion',
  'onboarding', 'customer', 'assets', 'products', 'start', 'signup', 'portal',
  'api', 'static', 'public', 'www', 'help', 'support', 'about', 'login', 'logout',
])

const MIN_LENGTH = 3
const MAX_LENGTH = 30
const ALLOWED = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

function toHalfWidth(value) {
  return String(value ?? '').replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
}

// 大文字小文字は同じ住所として扱うため小文字へ揃える。
export function normalizePublicAddress(input) {
  return toHalfWidth(input).trim().toLowerCase()
}

// 入力から機械的に導ける候補。日本語やスペースを含む入力でも、使える文字だけを残す。
export function suggestPublicAddress(input) {
  return normalizePublicAddress(input)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
}

function issue(code, message) {
  return { code, message }
}

// isTaken は重複確認の注入点。未接続なら重複判定を行わず、その旨を返す。
export function validatePublicAddress(input, { isTaken = null } = {}) {
  const raw = String(input ?? '')
  const normalized = normalizePublicAddress(raw)
  const issues = []

  if (!normalized) {
    issues.push(issue('empty', '公開URLを入力してください。'))
    return { valid: false, normalized, normalizedFromInput: false, issues, duplicateChecked: false }
  }
  if (normalized.length < MIN_LENGTH) {
    issues.push(issue('too_short', `公開URLは${MIN_LENGTH}文字以上で入力してください。`))
  }
  if (normalized.length > MAX_LENGTH) {
    issues.push(issue('too_long', `公開URLは${MAX_LENGTH}文字以内で入力してください。`))
  }
  if (!ALLOWED.test(normalized)) {
    issues.push(issue(
      'unsupported_characters',
      '公開URLに使えるのは半角の英小文字、数字、ハイフンだけです。先頭と末尾にハイフンは使えません。',
    ))
  }
  if (RESERVED.has(normalized)) {
    issues.push(issue('reserved', 'この公開URLはサイトの他のページで使われているため指定できません。別の名前を入力してください。'))
  }

  let duplicateChecked = false
  if (issues.length === 0 && typeof isTaken === 'function') {
    duplicateChecked = true
    if (isTaken(normalized) === true) {
      issues.push(issue('taken', 'この公開URLはすでに使われています。別の名前を入力してください。'))
    }
  }

  return {
    valid: issues.length === 0,
    normalized,
    // 入力をそのまま使えず整えた場合は、確定前に見せて同意を取る。
    normalizedFromInput: normalized !== raw.trim(),
    issues,
    duplicateChecked,
  }
}

export function publicAddressPreview(baseUrl, address) {
  const base = String(baseUrl ?? '').replace(/\/+$/, '')
  return `${base}/${normalizePublicAddress(address)}`
}

// 公開後の変更は閲覧者のリンクを壊すため、確定前と確定後で伝え方を変える。
export function describeAddressChange({ current = '', next = '', published = false } = {}) {
  const from = normalizePublicAddress(current)
  const to = normalizePublicAddress(next)
  if (!from || from === to) {
    return { changed: false, severity: 'none', message: '' }
  }
  if (!published) {
    return {
      changed: true,
      severity: 'notice',
      message: '公開前なので、公開URLはこのまま変更できます。',
    }
  }
  return {
    changed: true,
    severity: 'warning',
    message: '公開URLを変えると、これまで案内したリンクが開けなくなります。変更前に運営へご相談ください。',
  }
}
