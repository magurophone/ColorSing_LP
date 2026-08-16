import { fetchSheetData } from './sheets.js'

const ID_PATTERN = /^[a-zA-Z0-9_-]{10,}$/
const URL_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i

export function extractSpreadsheetId(value) {
  const input = String(value || '').trim()
  if (!input) return ''
  if (input === 'demo') return 'demo'

  const urlMatch = input.match(URL_PATTERN)
  if (urlMatch?.[1]) return urlMatch[1]

  return ID_PATTERN.test(input) ? input : ''
}

export function normalizeSpreadsheetInput(value) {
  return extractSpreadsheetId(value) || String(value || '').trim()
}

function friendlyConnectionError(error) {
  if (error?.name === 'AbortError') {
    return '確認がタイムアウトしました。通信状態を確認して、もう一度お試しください。'
  }
  const message = String(error?.message || '')
  if (/status:\s*(401|403)/i.test(message)) {
    return 'このスプレッドシートを公開状態で読み取れませんでした。閲覧範囲を確認してください。'
  }
  if (/status:\s*404/i.test(message)) {
    return 'スプレッドシートまたは指定したシートが見つかりませんでした。'
  }
  if (/invalid response|invalid data structure/i.test(message)) {
    return '公開データとして読み取れませんでした。URL、共有設定、シート名を確認してください。'
  }
  return 'データを読み取れませんでした。URL、共有設定、シート名を確認してください。'
}

function check(id, label, status, message, fix = '') {
  return { id, label, status, message, fix }
}

export async function validateSpreadsheetConnection(sheetsConfig, options = {}) {
  const spreadsheetId = extractSpreadsheetId(sheetsConfig?.spreadsheetId)
  const fetcher = options.fetcher || fetchSheetData

  if (!spreadsheetId) {
    return {
      status: 'error',
      spreadsheetId: '',
      checks: [check(
        'format',
        'URL形式',
        'error',
        'GoogleスプレッドシートのURLまたはIDとして認識できません。',
        'スプレッドシートを開いたときのURL全体を貼り付けてください。',
      )],
    }
  }

  if (spreadsheetId === 'demo') {
    return {
      status: 'success',
      spreadsheetId,
      checks: [
        check('format', 'URL形式', 'success', 'デモデータを使用します。'),
        check('ranking', 'ランキング・目標', 'success', 'デモデータを確認しました。'),
        check('benefits', '特典内容', 'success', 'デモデータを確認しました。'),
        check('rights', '特典管理', 'success', 'Special列を確認しました。'),
      ],
    }
  }

  const sheets = sheetsConfig || {}
  const ranges = sheets.ranges || {}
  const checks = [check('format', 'URL形式', 'success', 'スプレッドシートを認識しました。')]

  const probes = [
    {
      id: 'ranking',
      label: 'ランキング・目標',
      sheetName: sheets.rankingSheetName,
      range: ranges.ranking,
    },
    {
      id: 'benefits',
      label: '特典内容',
      sheetName: sheets.benefitsContentSheetName,
      range: ranges.benefits,
    },
    {
      id: 'rights',
      label: '特典管理',
      sheetName: sheets.benefitsSheetName,
      range: null,
      fetchOptions: { allRows: true },
      validate: rows => rows.some(row => row.some(
        cell => String(cell || '').trim().toLowerCase() === 'special',
      )),
      invalidMessage: '「特典管理」シートに必要な「Special」列が見つかりません。',
      invalidFix: 'テンプレートのSpecial列を削除・変更していないか確認してください。',
    },
  ]

  for (const probe of probes) {
    if (!probe.sheetName) {
      checks.push(check(
        probe.id,
        probe.label,
        'error',
        `${probe.label}のシート名が設定されていません。`,
        '管理画面でシート名を設定してください。',
      ))
      continue
    }

    try {
      const rows = await fetcher(
        spreadsheetId,
        probe.sheetName,
        probe.range,
        1,
        probe.fetchOptions || {},
      )
      if (probe.validate && !probe.validate(rows)) {
        checks.push(check(
          probe.id,
          probe.label,
          'error',
          probe.invalidMessage,
          probe.invalidFix,
        ))
      } else {
        checks.push(check(
          probe.id,
          probe.label,
          'success',
          `「${probe.sheetName}」を読み取りました（${rows.length}行）。`,
        ))
      }
    } catch (error) {
      checks.push(check(
        probe.id,
        probe.label,
        'error',
        `「${probe.sheetName}」を確認できませんでした。${friendlyConnectionError(error)}`,
        `シート名が「${probe.sheetName}」と一致し、公開閲覧できることを確認してください。`,
      ))
    }
  }

  return {
    status: checks.every(item => item.status === 'success') ? 'success' : 'error',
    spreadsheetId,
    checks,
  }
}
