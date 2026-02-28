// 本文フォントプリセット（可読性重視）
export const BODY_FONT_PRESETS = [
  {
    name: 'Yu Gothic',
    category: 'ゴシック',
    body: "'Yu Gothic Medium', 'YuGothic', 'Inter', sans-serif",
    googleFontsUrl: null,
  },
  {
    name: 'Noto Sans JP',
    category: 'ゴシック',
    body: "'Noto Sans JP', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',
  },
  {
    name: 'M PLUS 2',
    category: '丸ゴシック',
    body: "'M PLUS 2', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=M+PLUS+2:wght@400;500;700&display=swap',
  },
  {
    name: 'Noto Serif JP',
    category: '明朝',
    body: "'Noto Serif JP', serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;700&display=swap',
  },
  {
    name: 'BIZ UDGothic',
    category: 'UD',
    body: "'BIZ UDGothic', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@400;700&display=swap',
  },
  {
    name: 'Zen Kaku Gothic New',
    category: 'すっきり',
    body: "'Zen Kaku Gothic New', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
  },
]

// タイトルフォントプリセット
export const FONT_PRESETS = [
  {
    name: 'Playfair Display',
    category: 'エレガント',
    fonts: {
      display: "'Playfair Display', serif",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap',
    },
  },
  {
    name: 'Cinzel',
    category: 'クラシック',
    fonts: {
      display: "'Cinzel', serif",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap',
    },
  },
  {
    name: 'Orbitron',
    category: 'サイバー',
    fonts: {
      display: "'Orbitron', sans-serif",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap',
    },
  },
  {
    name: 'Raleway',
    category: 'モダン',
    fonts: {
      display: "'Raleway', sans-serif",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;700;900&display=swap',
    },
  },
  {
    name: 'Bebas Neue',
    category: 'インパクト',
    fonts: {
      display: "'Bebas Neue', sans-serif",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
    },
  },
  {
    name: 'Montserrat',
    category: 'クリーン',
    fonts: {
      display: "'Montserrat', sans-serif",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap',
    },
  },
  {
    name: 'Poppins',
    category: 'ポップ',
    fonts: {
      display: "'Poppins', sans-serif",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;900&display=swap',
    },
  },
  {
    name: 'Dancing Script',
    category: '手書き風',
    fonts: {
      display: "'Dancing Script', cursive",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap',
    },
  },
  {
    name: 'Noto Serif JP',
    category: '和風・明朝',
    fonts: {
      display: "'Noto Serif JP', serif",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700;900&display=swap',
    },
  },
  {
    name: 'Noto Sans JP',
    category: '和風・ゴシック',
    fonts: {
      display: "'Noto Sans JP', sans-serif",
      displayUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap',
    },
  },
]

export const COLOR_PRESETS = [
  {
    // 深海の底から光が差すような落ち着いたネイビー
    name: '深海ブルー',
    brightness: 'dark',
    colors: {
      deepBlue: '#08121e',
      oceanTeal: '#183a58',
      lightBlue: '#78a8f0',
      amber: '#e8b870',
      accent: '#d84030',
      gold: '#f8c840',
    },
  },
  {
    // 夜の桜をイメージした深みのある紫×ピンク
    name: '夜桜',
    brightness: 'dark',
    colors: {
      deepBlue: '#100818',
      oceanTeal: '#281440',
      lightBlue: '#e898bc',
      amber: '#f0d0e8',
      accent: '#d84080',
      gold: '#f8d8b0',
    },
  },
  {
    // 深紫水晶×黄金コントラスト、神秘的でリッチ
    name: 'アメジストナイト',
    brightness: 'dark',
    colors: {
      deepBlue: '#0a0818',
      oceanTeal: '#1c1248',
      lightBlue: '#9878e8',
      amber: '#e8c040',
      accent: '#e040c0',
      gold: '#f8d840',
    },
  },
  {
    // 深い森×生命力、緑×金の自然なコントラスト
    name: 'エメラルドフォレスト',
    brightness: 'dark',
    colors: {
      deepBlue: '#06100a',
      oceanTeal: '#0e2c18',
      lightBlue: '#48c870',
      amber: '#d4b840',
      accent: '#d04840',
      gold: '#f0d840',
    },
  },
  {
    // 漆黒×ゴールドの高級感、プレミアムな特別感
    name: 'ミッドナイトゴールド',
    brightness: 'dark',
    colors: {
      deepBlue: '#0c0a04',
      oceanTeal: '#1e1808',
      lightBlue: '#c89828',
      amber: '#e8d080',
      accent: '#c06020',
      gold: '#ffd700',
    },
  },
  {
    // サイバーパンクな近未来感、黒×シアン×オレンジ
    name: 'ネオンシアン',
    brightness: 'dark',
    colors: {
      deepBlue: '#040810',
      oceanTeal: '#081220',
      lightBlue: '#00c8e0',
      amber: '#f09820',
      accent: '#e02860',
      gold: '#ffd700',
    },
  },
  {
    // 夕焼けの温かみと情熱、コーラル×ゴールデン
    name: 'サンセットドリーム',
    brightness: 'dark',
    colors: {
      deepBlue: '#100808',
      oceanTeal: '#241010',
      lightBlue: '#e07040',
      amber: '#f0c048',
      accent: '#c83040',
      gold: '#ffd700',
    },
  },
  {
    // 北極の澄み切った氷と空、清潔感のあるクールブルー
    name: 'アークティックブルー',
    brightness: 'dark',
    colors: {
      deepBlue: '#06080e',
      oceanTeal: '#0c1428',
      lightBlue: '#58c0e0',
      amber: '#c0b8f0',
      accent: '#4080d8',
      gold: '#e8f4ff',
    },
  },
  {
    // promotion.html の配色 — ウォームオレンジ×クリーム白
    name: 'ウォームサンシャイン',
    brightness: 'light',
    colors: {
      deepBlue: '#FFFBF6',
      oceanTeal: '#F0EAD6',
      lightBlue: '#E87C35',
      amber: '#C96A12',
      accent: '#C84B2A',
      gold: '#B8860B',
    },
  },
  {
    // 清涼感のある緑×白、自然・フレッシュ系
    name: 'フレッシュミント',
    brightness: 'light',
    colors: {
      deepBlue: '#F0FBF8',
      oceanTeal: '#E0F4EE',
      lightBlue: '#2A9D6A',
      amber: '#E88C28',
      accent: '#D44830',
      gold: '#B8860B',
    },
  },
  {
    // やわらかな紫×白、エレガント・ドリーミー系
    name: 'ラベンダードリーム',
    brightness: 'light',
    colors: {
      deepBlue: '#FAF8FF',
      oceanTeal: '#F0EAF8',
      lightBlue: '#7C5CC8',
      amber: '#D4845A',
      accent: '#C84B7A',
      gold: '#B8860B',
    },
  },
]
