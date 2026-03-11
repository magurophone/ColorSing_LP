// デフォルト設定値（config.js が未設定・不完全でもアプリが動作するように）
const DEFAULT_CONFIG = {
  brand: {
    name: '',
    sidebarTitle: 'color singer LP',
    footerText: '',
    footerSubText: '',
    footerNote: '',
    pageTitle: 'ColorSing LP - 特典管理',
    loadingEmoji: '🎵',
    loadingText: 'Loading...',
    showHeader: true,
    showTitle: true,
    titleStyle: 'glass',
    titleGradient: true,
    titleGradientDirection: 'to-r',
    titleGlow: true,
    titlePosition: 'center',
    titleSize: 'large',
    titleTextFill: 'default',
    titleGlassBg: 0.35,
    titleGlassBlur: 12,
    titlePaddingY: 12,
    headerOverlayOpacity: 0.3,
    headerImageFit: 'contain',
    headerHeight: '',
    headerHeightMobile: '',
    headerImageW: 0,
    headerImageH: 0,
    headerImageWMobile: 0,
    headerImageHMobile: 0,
  },

  colors: {
    deepBlue: '#0a1628',
    oceanTeal: '#1b4965',
    lightBlue: '#8ab4f8',
    amber: '#d4a574',
    accent: '#c1121f',
    gold: '#ffd700',
    brightness: 'dark',
  },

  colorOverrides: {
    headerGradientStart: '',
    headerGradientEnd: '',
    titleGradientStart: '',
    titleGradientMid: '',
    titleGradientEnd: '',
    cardBorder: '',
    cardBorderHover: '',
    primaryText: '',
    accentText: '',
    rank1Card: '',
    backgroundMain: '',
    backgroundMid: '',
    nameText: '',
    footerText: '',
    contentText: '',
    titleColor: '',
    subText: '',
    popupOverlayColor: '',
    popupOverlayOpacity: '',
    menuCardLabelColor: '',
    menuCardLabelOpacity: '',
  },

  fonts: {
    display: "'Playfair Display', serif",
    displayUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap',
    body: "'Yu Gothic Medium', 'YuGothic', sans-serif",
    bodyUrl: '',
  },

  images: {
    headerDesktop: './customer/header.png',
    headerMobile: './customer/header-mobile.png',
    favicon: './customer/vite.svg',
  },

  sheets: {
    spreadsheetId: '',
    rankingSheetName: '目標管理・ランキング',
    benefitsSheetName: '特典管理',
    benefitsContentSheetName: '特典内容',
    historySheetName: '特典履歴',
    iconSheetName: '枠内アイコン',
    eventSheetName: 'イベント',
    ranges: {
      ranking: 'D2:G5',
      goals: 'A2:B10',
      benefits: 'A3:E20',
    },
    refreshIntervalMs: 300000,
  },

  views: [
    { id: 'home', label: 'Home', icon: '🏠', enabled: true },
    { id: 'menu', label: 'Menu', icon: '🍾', enabled: true },
    { id: 'rights', label: 'ボトルキープ', icon: '👥', enabled: true, title: '🍾 ボトルキープ一覧' },
    { id: 'icons', label: '枠内アイコン', icon: '🖼️', enabled: true, title: '🖼️ 枠内アイコン' },
    { id: 'events', label: 'イベント', icon: '📖', enabled: false, title: 'イベント' },
  ],

  benefitTiers: [
    { key: '5k', icon: '🎵', columnIndex: 1, displayTemplate: '強制リクエスト: {value}曲', lockedContent: { text: '', imageUrl: '' } },
    { key: '10k', icon: '🎮', columnIndex: 2, displayTemplate: '権利: {value}時間分', lockedContent: { text: '', imageUrl: '' } },
    { key: '20k', icon: '💬', columnIndex: 3, displayTemplate: 'オープンチャット招待済', isBoolean: true, lockedContent: { text: '', imageUrl: '' } },
    { key: '30k', icon: '🎤', columnIndex: 4, displayTemplate: 'アカペラ音源獲得: {value}曲', lockedContent: { text: '', imageUrl: '' } },
    { key: '40k', icon: '⚡', columnIndex: 5, displayTemplate: '強制リクエスト: {value}曲', lockedContent: { text: '', imageUrl: '' } },
    { key: '50k', icon: '🏆', columnIndex: 6, displayTemplate: 'ミックス音源獲得: {value}曲', lockedContent: { text: '', imageUrl: '' } },
    { key: 'メンバーシップ', icon: '👑', columnIndex: 7, displayTemplate: '月内リクエスト対応中', isMembership: true, lockedContent: { text: '', imageUrl: '' } },
  ],

  home: {
    rankingTitle: 'Ranking',
    pointsLabel: '歌推しPt',
    pointsUnit: 'k',
    targetsTitle: 'Targets',
    targetLabels: ['今旬の目標', '今月の目標'],
    faq: {
      enabled: true,
      accordion: true,
      title: '📝 FAQ・注意事項',
      items: [
        { question: '特典の使用方法は？', answer: '枠内でリクエストするか、XのDMでお知らせください。' },
        { question: '10k以上の特典について', answer: '永続権利です。月が替わっても消えることがありません。' },
        { question: 'メンバーシップ特典について', answer: 'メンバーシップ特典で得られた10ｋ及び20ｋ特典は、それぞれの箇所に合算して記載しています。' },
      ],
    },
  },

  menu: {
    title: 'Menu',
  },

  ui: {
    errorTitle: 'エラー',
    errorMessage: 'データの読み込みに失敗しました。しばらくしてから再度お試しください。',
    retryButton: '再読み込み',
    refreshButton: '更新',
    lastUpdate: '最終更新',
    iconLoading: 'アイコンデータを読み込み中...',
    iconEmpty: 'アイコンデータがありません',
    iconNoImages: 'アイコンがありません',
    userListTitle: '獲得者一覧',
    userIconTitle: '{user} のアイコン',
    searchPlaceholder: '🔍 名前で検索...',
    specialRightLabel: 'Special権利',
    imageError: '画像エラー',
  },

  effects: {
    iconFloat: true,
    particles: 'bubble',
    particleDirection: 'up',
    particleColor: '',
    particleSize: 1,
    particleOpacity: 1,
  },

  deploy: {
    owner: '',
    repo: '',
    branch: '',
    token: '',
  },

  admin: {
    password: '',
    developerKey: '',
  },

}

export default DEFAULT_CONFIG
