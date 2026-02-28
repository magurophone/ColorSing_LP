// デモ用設定ファイル（スクリーンショット撮影専用）
//
// 使い方:
//   1. config.js を config.js.bak にリネーム
//   2. このファイルを config.js にリネーム
//   3. vite dev サーバーでスクリーンショットを撮る
//   4. config.js を削除 → config.js.bak を config.js に戻す
//
// spreadsheetId: "demo" → Google Sheets に一切アクセスせずモックデータを表示

window.DASHBOARD_CONFIG = {
  "brand": {
    "name": "DEMO SINGER",
    "sidebarTitle": "　color singer LP",
    "footerText": "DEMO SINGER",
    "footerSubText": "単推し・最推し様・メンシプ様募集中です",
    "footerNote": "ファンマ: 🎵",
    "pageTitle": "DEMO SINGER - 特典管理",
    "loadingEmoji": "🎵",
    "loadingText": "Loading...",
    "showHeader": false,
    "showTitle": false,
    "titleStyle": "glass",
    "titleGradient": true,
    "titleGradientDirection": "to-r",
    "titleGlow": false,
    "titlePosition": "center",
    "titleSize": "medium",
    "titleTextFill": "default",
    "titleGlassBg": 0.25,
    "titleGlassBlur": 9,
    "titlePaddingY": 6,
    "headerOverlayOpacity": 0,
    "headerImageFit": "contain",
    "headerHeight": "",
    "headerHeightMobile": "",
    "headerImageW": 0,
    "headerImageH": 0,
    "headerImageWMobile": 0,
    "headerImageHMobile": 0
  },
  "colors": {
    "deepBlue": "#08121e",
    "oceanTeal": "#183a58",
    "lightBlue": "#78a8f0",
    "amber": "#e8b870",
    "accent": "#d84030",
    "gold": "#f8c840"
  },
  "colorOverrides": {
    "headerGradientStart": "",
    "headerGradientEnd": "",
    "titleGradientStart": "",
    "titleGradientMid": "",
    "titleGradientEnd": "",
    "cardBorder": "",
    "cardBorderHover": "",
    "primaryText": "",
    "accentText": "",
    "rank1Card": "#b51a00",
    "backgroundMain": "",
    "backgroundMid": "",
    "nameText": "",
    "footerText": "",
    "contentText": "",
    "titleColor": "#8ab5f5",
    "subText": "",
    "popupOverlayColor": "",
    "popupOverlayOpacity": "",
    "menuCardLabelColor": "",
    "menuCardLabelOpacity": ""
  },
  "fonts": {
    "display": "'Sacramento', cursive",
    "displayUrl": "https://fonts.googleapis.com/css2?family=Sacramento:wght@400&display=swap",
    "body": "'Noto Sans JP', sans-serif",
    "bodyUrl": "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
  },
  "images": {
    "headerDesktop": "",
    "headerMobile": "",
    "favicon": "./customer/vite.svg"
  },
  "sheets": {
    "spreadsheetId": "demo",
    "rankingSheetName": "目標管理・ランキング",
    "benefitsSheetName": "特典管理",
    "benefitsContentSheetName": "特典内容",
    "historySheetName": "特典履歴",
    "iconSheetName": "枠内アイコン",
    "eventSheetName": "イベント",
    "ranges": {
      "ranking": "D2:G5",
      "goals": "A2:B10",
      "benefits": "A2:E20",
      "rights": "A2:I1000",
      "history": "A2:D1000"
    },
    "refreshIntervalMs": 300000,
    "dataSheetName": "data"
  },
  "views": [
    { "id": "home",   "label": "Home",     "icon": "🏠",  "enabled": true },
    { "id": "menu",   "label": "Menu",     "icon": "🍸",  "enabled": true },
    { "id": "rights", "label": "ボトルキープ", "icon": "👥", "enabled": true, "title": "ボトルキープ一覧" },
    { "id": "events", "label": "イベント",  "icon": "📖",  "enabled": true, "title": "イベント" },
    { "id": "icons",  "label": "枠内アイコン", "icon": "🖼️", "enabled": true, "title": "枠内アイコン" }
  ],
  "benefitTiers": [
    { "key": "5k",          "icon": "🎵", "columnIndex": 1, "displayTemplate": "強制リクエスト: {value}曲" },
    { "key": "10k",         "icon": "🎮", "columnIndex": 2, "displayTemplate": "権利: {value}時間分" },
    { "key": "20k",         "icon": "💬", "columnIndex": 3, "displayTemplate": "オープンチャット招待済", "isBoolean": true },
    { "key": "30k",         "icon": "🎤", "columnIndex": 4, "displayTemplate": "アカペラ音源獲得: {value}曲" },
    { "key": "50k",         "icon": "🏆", "columnIndex": 5, "displayTemplate": "ミックス音源獲得: {value}曲" },
    {
      "key": "メンバーシップA",
      "icon": "👑",
      "columnIndex": 6,
      "displayTemplate": "月内リクエスト対応中",
      "isMembership": true,
      "useKey": true,
      "accessKey": "demo1234",
      "lockedContent": {
        "text": "これはデモの限定コンテンツです！\nここに特別なメッセージや画像URLを設定できます。",
        "imageUrl": ""
      }
    }
  ],
  "home": {
    "rankingTitle": "Ranking",
    "pointsLabel": "歌推しPt",
    "pointsUnit": "k",
    "targetsTitle": "Targets",
    "targetLabels": ["今旬の目標", "今月の目標"],
    "faq": {
      "enabled": true,
      "title": "📝 FAQ・注意事項",
      "items": [
        { "question": "特典の使用方法は？", "answer": "枠内でリクエストするか、XのDMでお知らせください。" },
        { "question": "10k以上の特典について", "answer": "永続権利です。月が替わっても消えることがありません。" }
      ]
    }
  },
  "menu": { "title": "Menu" },
  "ui": {
    "errorTitle": "エラー",
    "errorMessage": "データの読み込みに失敗しました。しばらくしてから再度お試しください。",
    "retryButton": "再読み込み",
    "refreshButton": "更新",
    "lastUpdate": "最終更新",
    "iconLoading": "アイコンデータを読み込み中...",
    "iconEmpty": "アイコンデータがありません",
    "iconNoImages": "アイコンがありません",
    "userListTitle": "獲得者一覧",
    "userIconTitle": "{user} ",
    "searchPlaceholder": "🔍 名前で検索...",
    "specialRightLabel": "Special権利",
    "imageError": "画像エラー"
  },
  "effects": {
    "iconFloat": true,
    "particles": "bubble",
    "particleDirection": "up",
    "particleColor": "",
    "particleSize": 0.5,
    "particleOpacity": 1
  },
  "deploy": { "owner": "", "repo": "", "branch": "", "token": "" },
  "admin":  { "password": "", "developerKey": "" }
}
