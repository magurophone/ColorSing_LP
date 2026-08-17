// アンケート回答を外部へ反映する前の整合性ゲート。
//
// 判定内容は `NEW_CUSTOMER.md` の「Step 0: アンケート内容の整合性チェック」と
// 「Step 5.5 生成ルール」に書かれている手順をそのまま機械化したものであり、
// ここで新しい仕様を決めない。機械的に判定できるものだけを扱い、意味の判断が
// 要るものは補正せず「要確認」として返す。
//
// 入力の項目名は NEW_CUSTOMER.md の「必要な情報（アンケート回答から取得）」表に
// 対応する。回答CSVそのもの、管理画面パスワード、トークンは保存も出力もしない。

const TIER_UNITS = new Map([
  ['済', { isBoolean: true }],
  ['曲', { displayTemplate: '{value}曲' }],
  ['時間分', { displayTemplate: '{value}時間分' }],
  ['なし', { displayTemplate: '{value}' }],
])
// 「要相談」「後で決める」等、掲載文として未確定のまま反映してはいけない回答。
const UNSETTLED_PATTERNS = [/要相談/, /後で決め/, /未定/, /あとで/, /検討中/]
// 「30k以上」のような範囲条件。管理方法が「済」でよいか判断できない。
const RANGE_PATTERNS = [/以上/, /以下/, /〜/, /～/, /-\s*$/]
const VIEW_KEYS = ['home', 'benefitContents', 'benefitRights', 'frameIcons', 'events']
const SLUG_PATTERN = /^[A-Za-z0-9_-]+$/

function text(value) {
  return String(value ?? '').trim()
}

function toHalfWidth(value) {
  return text(value).replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
}

// `1K`、`１Ｋ`、`1 k` を同じティアとして扱うための正規化。
export function normalizeTierKey(value) {
  return toHalfWidth(value).replace(/\s+/g, '').replace(/K/g, 'k')
}

// URL用ユーザー名は英数字・ハイフン・アンダースコアのみ。日本語や絵文字は
// そのまま使えないため、機械的に導ける候補だけを提示する。
export function suggestSlug(value) {
  const candidate = toHalfWidth(value)
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .toLowerCase()
  return candidate
}

export function validateSlug(value) {
  const slug = text(value)
  if (!slug) return { valid: false, reason: 'empty' }
  if (!SLUG_PATTERN.test(slug)) return { valid: false, reason: 'unsupported-characters' }
  return { valid: true, reason: '' }
}

function ok(field, detail) {
  return { severity: 'ok', field, detail }
}

function correction(field, original, corrected, reason) {
  return { severity: 'correction', field, original, corrected, reason }
}

function confirm(field, current, concern, question) {
  return { severity: 'confirm', field, current, concern, question }
}

function reviewIdentity(answers, findings) {
  const rawName = text(answers.urlUserName)
  if (!rawName) {
    findings.push(confirm('urlUserName', '(空欄)', 'URL用ユーザー名が未回答です。', '公開URLに使う英数字の名前を決めてください。'))
  } else if (validateSlug(rawName).valid) {
    findings.push(ok('urlUserName', `URL用ユーザー名 ${rawName} はそのまま使えます。`))
  } else {
    const candidate = suggestSlug(rawName)
    if (candidate) {
      findings.push(correction('urlUserName', rawName, candidate, '日本語・絵文字・空白はURLに使えないため英数字のslugへ変換します。'))
    } else {
      findings.push(confirm('urlUserName', rawName, '英数字を含まないため候補を機械的に作れません。', '公開URLに使う英数字の名前を決めてください。'))
    }
  }

  const siteName = text(answers.siteName)
  if (!siteName) {
    findings.push(confirm('siteName', '(空欄)', 'サイト名が未回答です。', 'サイト名を教えてください。'))
  } else if (siteName === rawName) {
    findings.push(confirm('siteName', siteName, 'サイト名がURL用ユーザー名と同じで、取り違えの可能性があります。', 'この文字列はサイト名とURL名のどちらですか。'))
  } else {
    findings.push(ok('siteName', `サイト名は ${siteName} です。`))
  }

  // 値そのものは検査結果へ含めない。空欄かどうかだけを見る。
  if (!text(answers.adminPassword)) {
    findings.push(confirm('adminPassword', '(空欄)', '管理画面パスワードが未回答です。', '管理画面用のパスワードを決めてください。使い回しのない専用の値にしてください。'))
  } else {
    findings.push(ok('adminPassword', '管理画面パスワードは設定済みです。'))
  }
}

function reviewSpreadsheets(answers, findings) {
  const operations = text(answers.operationsSpreadsheetUrl)
  const application = text(answers.applicationSpreadsheetUrl)
  if (!operations) {
    findings.push(confirm('operationsSpreadsheetUrl', '(空欄)', '運用用スプレッドシートが未回答です。', '運用用スプレッドシートのURLを共有してください。'))
    return
  }
  if (application && operations === application) {
    findings.push(confirm(
      'operationsSpreadsheetUrl',
      operations,
      '運用用として申込回答シートが指定されています。',
      '運用用スプレッドシートは申込回答シートとは別物です。運用用のURLを確認してください。',
    ))
    return
  }
  findings.push(ok('operationsSpreadsheetUrl', '運用用スプレッドシートが指定されています。'))
}

function reviewTierKeys(tiers, findings) {
  const seen = new Map()
  for (const tier of tiers) {
    const raw = text(tier.key)
    const normalized = normalizeTierKey(raw)
    if (raw && normalized !== raw) {
      findings.push(correction(`tier:${raw}`, raw, normalized, 'k/K・全角半角・空白の表記揺れを揃えます。'))
    }
    if (!normalized) {
      findings.push(confirm('tier', '(空欄)', 'ティア条件が未回答の行があります。', 'このティアの獲得条件を教えてください。'))
      continue
    }
    if (seen.has(normalized)) {
      findings.push(confirm(
        `tier:${normalized}`,
        `${seen.get(normalized)} / ${raw}`,
        '表記を揃えると同じティアが重複します。',
        'これらは同じティアですか。別のティアなら条件を分けてください。',
      ))
    } else {
      seen.set(normalized, raw)
    }
  }
}

function reviewTierOrder(tiers, findings) {
  const values = tiers
    .map((tier) => ({ key: normalizeTierKey(tier.key), amount: Number.parseFloat(normalizeTierKey(tier.key)) }))
    .filter((entry) => Number.isFinite(entry.amount))
  for (let index = 1; index < values.length; index += 1) {
    if (values[index].amount < values[index - 1].amount) {
      findings.push(confirm(
        'tierOrder',
        `${values[index - 1].key} → ${values[index].key}`,
        'ティアの並びが昇順になっていません。',
        'この順序は意図したものですか。表示順を確認させてください。',
      ))
      return
    }
  }
}

function reviewTierContents(tiers, findings) {
  const contentOwners = new Map()
  for (const tier of tiers) {
    const key = normalizeTierKey(tier.key) || '(未設定)'
    const benefit = text(tier.benefit)
    const unit = text(tier.unit)
    const label = text(tier.label)

    if (!benefit) {
      findings.push(confirm(`tier:${key}`, '(空欄)', '特典内容が未回答です。', `${key} でお渡しする特典を教えてください。`))
    } else if (UNSETTLED_PATTERNS.some((pattern) => pattern.test(benefit))) {
      findings.push(confirm(
        `tier:${key}`,
        benefit,
        '特典内容が未確定のままで、サイト掲載文として使えません。',
        `${key} は現時点でどのように表示しますか。決定後に差し替えるなら暫定の表示文が必要です。`,
      ))
    }

    if (!label) {
      findings.push(correction(`tier:${key}`, '(タイトルなし)', key, '特典タイトルが未回答のため、ティア条件をそのまま表示名にします。'))
    }

    if (tier.showUsers === true) {
      if (!unit) {
        findings.push(confirm(
          `tier:${key}`,
          '獲得者表示あり / 単位が空欄',
          '獲得者を表示するティアの管理単位が決まっていません。',
          `${key} は「済」のチェック管理と数値管理のどちらにしますか。`,
        ))
      } else if (!TIER_UNITS.has(unit)) {
        findings.push(confirm(
          `tier:${key}`,
          unit,
          '管理単位が既知の入力形式に対応しません。',
          `${key} の単位「${unit}」は、済・曲・時間分・なしのどれに当たりますか。`,
        ))
      }
      if (unit === '済' && RANGE_PATTERNS.some((pattern) => pattern.test(key))) {
        findings.push(confirm(
          `tier:${key}`,
          `${key} / 済`,
          '範囲条件のティアを「済」だけで管理すると、提供内容が記録に残りません。',
          `${key} は提供の有無だけを記録しますか。それとも決まった内容もサイトへ表示しますか。`,
        ))
      }
    } else if (unit) {
      findings.push(confirm(
        `tier:${key}`,
        `獲得者表示なし / 単位 ${unit}`,
        '獲得者を表示しないティアに管理単位が指定されています。',
        `${key} は獲得者一覧へ表示しますか。表示しないなら特典管理に列は作りません。`,
      ))
    }

    if (tier.showHistory === true && tier.record === false) {
      findings.push(confirm(
        `tier:${key}`,
        '履歴表示あり / レコード機能FALSE',
        '履歴を表示する設定とレコード機能の指定が一致しません。',
        `${key} は誰に・いつ・何を渡したかを記録として残しますか。`,
      ))
    }
    if (tier.showHistory === false && tier.record === true) {
      findings.push(confirm(
        `tier:${key}`,
        '履歴表示なし / レコード機能TRUE',
        '履歴を表示しない設定とレコード機能の指定が一致しません。',
        `${key} は記録を残しますか。残す場合は履歴表示も有効にする必要があります。`,
      ))
    }

    if (benefit) {
      const owners = contentOwners.get(benefit) ?? []
      owners.push(key)
      contentOwners.set(benefit, owners)
    }
  }

  for (const [benefit, owners] of contentOwners) {
    if (owners.length > 1) {
      findings.push(confirm(
        'tierContents',
        `${owners.join(' / ')}: ${benefit}`,
        '同じ特典が複数のティアへ重複しています。',
        'これは意図した重複ですか。ティアごとに内容を分けますか。',
      ))
    }
  }
}

function reviewViews(answers, tiers, findings) {
  const views = answers.views ?? {}
  const enabled = VIEW_KEYS.filter((key) => views[key] === true)
  const hasTiers = tiers.length > 0
  const showsUsers = tiers.some((tier) => tier.showUsers === true)

  if (hasTiers && views.benefitContents !== true) {
    findings.push(confirm(
      'views.benefitContents',
      '特典内容を使用しない',
      '特典ティアの回答があるのに特典内容の画面が無効です。',
      '特典内容の画面は表示しますか。表示しない場合、特典の説明はどこへ載せますか。',
    ))
  }
  if (showsUsers && views.benefitRights !== true) {
    findings.push(confirm(
      'views.benefitRights',
      '特典権利者を使用しない',
      '獲得者を表示するティアがあるのに特典権利者の画面が無効です。',
      '獲得者一覧は表示しますか。',
    ))
  }
  if (views.events === true && !text(answers.eventInfo)) {
    findings.push(confirm(
      'views.events',
      'イベントを使用する',
      'イベント画面が有効ですが、掲載するイベント情報がありません。',
      '掲載するイベントはありますか。ない場合はイベント画面を無効にします。',
    ))
  }
  if (views.home !== true && text(answers.homeExpectation)) {
    findings.push(confirm(
      'views.home',
      'Homeを使用しない',
      'Homeが無効ですが、ランキングや進捗の表示を前提とした要望があります。',
      'ランキングや目標の表示は必要ですか。必要ならHomeを有効にします。',
    ))
  }
  if (enabled.length === 0) {
    findings.push(confirm('views', '(すべて無効)', '使用する画面が一つも選ばれていません。', '公開する画面を選んでください。'))
  }
}

function buildNormalizedSpec(answers, tiers) {
  const views = answers.views ?? {}
  const enabledViews = VIEW_KEYS.filter((key) => views[key] === true)
  const normalizedTiers = tiers.map((tier) => {
    const key = normalizeTierKey(tier.key)
    const unit = text(tier.unit)
    const format = TIER_UNITS.get(unit) ?? {}
    return {
      key,
      label: text(tier.label) || key,
      showUsers: tier.showUsers === true,
      record: tier.record === true,
      ...format,
    }
  })
  // 特典管理はA列がユーザー名、獲得者表示ありのティアをアンケート順に並べ、
  // 最後をSpecialにする。columnIndexは配列位置と一致させる。
  const rightsColumns = [
    { columnIndex: 0, header: 'ユーザー名', tierKey: '' },
    ...normalizedTiers
      .filter((tier) => tier.showUsers)
      .map((tier, index) => ({ columnIndex: index + 1, header: tier.key, tierKey: tier.key })),
  ]
  rightsColumns.push({ columnIndex: rightsColumns.length, header: 'Special', tierKey: '' })

  const unresolved = []
  if (!text(answers.themeImage)) unresolved.push('テーマカラーのイメージ')
  if (!text(answers.fontImage)) unresolved.push('フォントのイメージ')
  if (!Array.isArray(answers.faq) || answers.faq.length === 0) unresolved.push('FAQ（空配列で作成）')

  return {
    slug: validateSlug(answers.urlUserName).valid ? text(answers.urlUserName) : suggestSlug(answers.urlUserName),
    siteName: text(answers.siteName),
    enabledViews,
    tiers: normalizedTiers,
    rightsColumns,
    recordTiers: normalizedTiers.filter((tier) => tier.record).map((tier) => tier.key),
    unresolved,
  }
}

// 要確認が1件でもある場合は正規化仕様を返さない。外部反映を始めさせないため。
export function reviewQuestionnaire(answers = {}) {
  const tiers = Array.isArray(answers.tiers) ? answers.tiers : []
  const findings = []
  reviewIdentity(answers, findings)
  reviewSpreadsheets(answers, findings)
  reviewTierKeys(tiers, findings)
  reviewTierOrder(tiers, findings)
  reviewTierContents(tiers, findings)
  reviewViews(answers, tiers, findings)

  const blocked = findings.some((finding) => finding.severity === 'confirm')
  return {
    findings,
    blocked,
    normalized: blocked ? null : buildNormalizedSpec(answers, tiers),
  }
}

// NEW_CUSTOMER.md が定める提示形式へ整える。
export function formatReview(review) {
  const lines = ['アンケート精査結果', '']
  const pick = (severity) => review.findings.filter((finding) => finding.severity === severity)

  lines.push('【問題なし】')
  const fine = pick('ok')
  if (fine.length === 0) lines.push('- なし')
  for (const finding of fine) lines.push(`- ${finding.detail}`)
  lines.push('')

  lines.push('【こちらで補正予定】')
  const corrections = pick('correction')
  if (corrections.length === 0) lines.push('- なし')
  for (const finding of corrections) {
    lines.push(`- 元の回答: ${finding.original}`)
    lines.push(`  補正案: ${finding.corrected}`)
    lines.push(`  理由: ${finding.reason}`)
  }
  lines.push('')

  lines.push('【確認が必要】')
  const confirms = pick('confirm')
  if (confirms.length === 0) lines.push('- なし')
  confirms.forEach((finding, index) => {
    lines.push(`${index + 1}. 対象項目: ${finding.field}`)
    lines.push(`   現在の回答: ${finding.current}`)
    lines.push(`   懸念点: ${finding.concern}`)
    lines.push(`   確認したいこと: ${finding.question}`)
  })
  lines.push('')

  lines.push('【反映予定の正規化仕様】')
  if (!review.normalized) {
    lines.push('- 確認が必要な項目があるため、外部反映は開始しない。')
    return lines.join('\n')
  }
  const spec = review.normalized
  lines.push(`- 有効画面: ${spec.enabledViews.join('、') || 'なし'}`)
  lines.push(`- ティア: ${spec.tiers.map((tier) => tier.key).join('、') || 'なし'}`)
  lines.push(`- 特典管理列: ${spec.rightsColumns.map((column) => column.header).join('、')}`)
  lines.push(`- レコード対象: ${spec.recordTiers.join('、') || 'なし'}`)
  lines.push(`- 未設定項目: ${spec.unresolved.join('、') || 'なし'}`)
  return lines.join('\n')
}
