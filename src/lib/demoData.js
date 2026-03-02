// =====================================================================
// DEMO MODE — spreadsheetId === 'demo' のときにモックデータを返す
// =====================================================================

export const DEMO_RANKING = [
  [1, '星空リスナー☆', 70, './customer/demo-icons/user1.png'],
  [2, '音符ちゃん♪', 49, './customer/demo-icons/user2.png'],
  [3, '深海の歌姫', 30, './customer/demo-icons/user3.png'],
]

export const DEMO_GOALS = [
  ['300k', '400k'],
  ['歌推し40人', '歌推し50人'],
]

// BENEFIT_FIELDS: TITLE=0, LABEL=1, NAME=2, DESCRIPTION=3, TRACK_HISTORY=4
export const DEMO_BENEFITS = [
  ['5k',          'Bronze',   '強制リクエスト権',    '枠内で好きな曲を1曲リクエストできます。',              ''],
  ['10k',         'Silver',   '歌枠チケット',        '2時間分の歌枠チケットとして使用できます。',            ''],
  ['20k',         'Gold',     'オープンチャット招待', '限定オープンチャットに招待されます。',                  ''],
  ['30k',         'Platinum', 'アカペラ音源',        '1曲分のアカペラ音源をプレゼントします。',              ''],
  ['50k',         'Diamond',  'ミックス音源',        '1曲分のミックス音源をプレゼントします。',              ''],
  ['メンバーシップA', 'Member', '月内リクエスト対応', 'メンシプ期間中に好きな曲をリクエストできます。',       ''],
]

// 権利保有者データ: [name, col1=5k, col2=10k, col3=20k, col4=30k, col5=50k, col6=membership]
export const DEMO_RIGHTS = [
  ['星空リスナー☆',  '2', '3', 'TRUE', '1', '',  'TRUE'],
  ['音符ちゃん♪',   '1', '1', '',     '',  '',  'TRUE'],
  ['深海の歌姫',    '3', '2', 'TRUE', '2', '1', ''],
  ['サクラ音楽隊',  '1', '',  '',     '',  '',  ''],
  ['月光セレナーデ', '2', '1', 'TRUE', '',  '',  ''],
  ['波音コーラス',  '1', '',  '',     '',  '',  ''],
  ['夜明けの歌声',  '1', '1', '',     '',  '',  'TRUE'],
  ['虹色ハーモニー', '2', '',  '',     '',  '',  ''],
]

export const DEMO_HISTORY = [
  { month: '202602', userName: '星空リスナー☆',  tierKey: '5k',          content: '強制リクエスト1曲' },
  { month: '202602', userName: '音符ちゃん♪',   tierKey: 'メンバーシップA', content: '月内リクエスト' },
  { month: '202601', userName: '深海の歌姫',    tierKey: '10k',         content: '歌枠チケット 2時間' },
]

const DEMO_EVENT_POSTER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <rect width="900" height="1200" fill="#08121e"/>
  <rect x="16" y="16" width="868" height="1168" rx="4" fill="none" stroke="#183a58" stroke-width="2" stroke-dasharray="16 8"/>
  <text x="450" y="560" font-family="sans-serif" font-size="56" fill="#2a4a68" text-anchor="middle">📸</text>
  <text x="450" y="630" font-family="'Noto Sans JP',sans-serif" font-size="26" fill="#3a6a98" text-anchor="middle">イベントポスターをここに表示できます</text>
  <text x="450" y="676" font-family="sans-serif" font-size="16" fill="#1e3a54" text-anchor="middle">Google Drive の画像 URL を設定すると表示されます</text>
</svg>`)

export const DEMO_EVENTS = {
  upcoming: {
    date: '20260315',
    title: 'Chill Night Festival 2026',
    setlist: '変態紳士クラブ  - YOKAZE\niri             - Wonderland\nChilldspot      - ネオンを消して',
    imageUrl: DEMO_EVENT_POSTER,
    notes: '',
  },
  past: [],
}

export const DEMO_ICONS = {
  '202501': [
    { label: '星空リスナー☆', thumbnailUrl: './customer/demo-icons/user1.png', originalUrl: './customer/demo-icons/user1.png' },
    { label: '音符ちゃん♪',   thumbnailUrl: './customer/demo-icons/user2.png', originalUrl: './customer/demo-icons/user2.png' },
    { label: '深海の歌姫',    thumbnailUrl: './customer/demo-icons/user3.png', originalUrl: './customer/demo-icons/user3.png' },
  ],
  _orderedKeys: ['202501'],
}
