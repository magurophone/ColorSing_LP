import IconRenderer from '../../components/IconRenderer'

const Field = ({ label, value, onChange, placeholder }) => (
  <div className="mb-4">
    <label className="block text-xs text-gray-500 mb-1">{label}</label>
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber transition-all"
    />
  </div>
)

const ContentTab = ({ config, updateConfig }) => {
  const faqItems = config.home?.faq?.items || []

  const updateFaqItem = (index, field, value) => {
    const next = faqItems.map((item, i) => i === index ? { ...item, [field]: value } : item)
    updateConfig('home.faq.items', next)
  }

  const addFaqItem = () => {
    updateConfig('home.faq.items', [...faqItems, { question: '', answer: '' }])
  }

  const removeFaqItem = (index) => {
    updateConfig('home.faq.items', faqItems.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h2 className="text-2xl font-body text-light-blue mb-6">コンテンツ設定</h2>

      {/* Home セクション */}
      <h3 className="text-lg font-body text-amber mb-4">Home ビュー</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Field
          label="ランキングタイトル"
          value={config.home?.rankingTitle}
          onChange={(v) => updateConfig('home.rankingTitle', v)}
          placeholder="Ranking"
        />
        <Field
          label="ポイント単位ラベル"
          value={config.home?.pointsLabel}
          onChange={(v) => updateConfig('home.pointsLabel', v)}
          placeholder="ポイントの単位名を入力"
        />
        <Field
          label="ポイント数値の単位（数字の直後）"
          value={config.home?.pointsUnit}
          onChange={(v) => updateConfig('home.pointsUnit', v)}
          placeholder="k"
        />
        <Field
          label="目標タイトル"
          value={config.home?.targetsTitle}
          onChange={(v) => updateConfig('home.targetsTitle', v)}
          placeholder="Targets"
        />
      </div>

      <div className="mb-6">
        <label className="block text-xs text-gray-500 mb-2">目標ラベル（左列、右列）</label>
        <div className="grid grid-cols-2 gap-4">
          {(config.home?.targetLabels || []).map((label, i) => (
            <input
              key={i}
              type="text"
              value={label || ''}
              onChange={(e) => {
                const next = [...(config.home?.targetLabels || [])]
                next[i] = e.target.value
                updateConfig('home.targetLabels', next)
              }}
              placeholder={`ラベル${i + 1}`}
              className="px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber"
            />
          ))}
        </div>
      </div>

      {/* FAQ */}
      <hr className="border-light-blue/20 my-8" />
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-body text-amber">FAQ・注意事項</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-500">折りたたむ</span>
            <div
              onClick={() => updateConfig('home.faq.accordion', config.home?.faq?.accordion === false)}
              className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${config.home?.faq?.accordion !== false ? 'bg-amber/70' : 'bg-gray-600'}`}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: config.home?.faq?.accordion !== false ? '1.25rem' : '0.125rem' }}
              />
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-500">表示</span>
            <div
              onClick={() => updateConfig('home.faq.enabled', config.home?.faq?.enabled === false)}
              className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${config.home?.faq?.enabled !== false ? 'bg-amber/70' : 'bg-gray-600'}`}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: config.home?.faq?.enabled !== false ? '1.25rem' : '0.125rem' }}
              />
            </div>
          </label>
        </div>
      </div>
      <Field
        label="FAQセクションタイトル"
        value={config.home?.faq?.title}
        onChange={(v) => updateConfig('home.faq.title', v)}
        placeholder="📝 FAQ・注意事項"
      />

      <div className="space-y-4 mb-4">
        {faqItems.map((item, index) => (
          <div key={index} className="glass-effect rounded-lg p-4 border border-light-blue/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">FAQ #{index + 1}</span>
              <button
                onClick={() => removeFaqItem(index)}
                className="text-xs px-2 py-0.5 rounded bg-tuna-red/10 hover:bg-tuna-red/20 text-tuna-red transition-all"
              >
                削除
              </button>
            </div>
            <Field
              label="質問"
              value={item.question}
              onChange={(v) => updateFaqItem(index, 'question', v)}
              placeholder="質問を入力"
            />
            <div className="mb-0">
              <label className="block text-xs text-gray-500 mb-1">回答</label>
              <textarea
                value={item.answer || ''}
                onChange={(e) => updateFaqItem(index, 'answer', e.target.value)}
                placeholder="回答を入力"
                rows={2}
                className="w-full px-3 py-1.5 glass-effect border border-light-blue/30 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber transition-all resize-y"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addFaqItem}
        className="px-4 py-2 bg-amber/20 hover:bg-amber/30 border border-amber/50 rounded-lg transition-all text-amber text-sm font-body mb-8"
      >
        + FAQ を追加
      </button>

      {/* Menu */}
      <hr className="border-light-blue/20 my-8" />
      <h3 className="text-lg font-body text-amber mb-4">Menu ビュー</h3>
      <Field
        label="メニュータイトル"
        value={config.menu?.title}
        onChange={(v) => updateConfig('menu.title', v)}
        placeholder="Menu"
      />

      {(config.benefitTiers || []).length > 0 && (
        <div className="mt-4 glass-effect rounded-lg p-4 border border-light-blue/20">
          <label className="block text-xs text-gray-500 mb-3">Menu アイコンプレビュー</label>
          <div className="flex flex-wrap gap-3">
            {(config.benefitTiers || []).map((tier) => (
              <div key={tier.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-light-blue/5 border border-light-blue/10">
                <IconRenderer icon={tier.icon} size={18} className="text-amber" />
                <span className="text-xs text-gray-300">{tier.key}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">※ アイコンの変更は「特典ティア設定」タブで行えます</p>
        </div>
      )}

      {/* UI テキスト */}
      <hr className="border-light-blue/20 my-8" />
      <h3 className="text-lg font-body text-amber mb-4">UIテキスト</h3>
      <p className="text-xs text-gray-500 mb-4">エラー画面やボタンなどのテキストを変更できます。</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="エラータイトル" value={config.ui?.errorTitle} onChange={(v) => updateConfig('ui.errorTitle', v)} />
        <Field label="リトライボタン" value={config.ui?.retryButton} onChange={(v) => updateConfig('ui.retryButton', v)} />
        <Field label="更新ボタン" value={config.ui?.refreshButton} onChange={(v) => updateConfig('ui.refreshButton', v)} />
        <Field label="最終更新ラベル" value={config.ui?.lastUpdate} onChange={(v) => updateConfig('ui.lastUpdate', v)} />
        <Field label="検索プレースホルダー" value={config.ui?.searchPlaceholder} onChange={(v) => updateConfig('ui.searchPlaceholder', v)} />
        <Field label="Special権利ラベル" value={config.ui?.specialRightLabel} onChange={(v) => updateConfig('ui.specialRightLabel', v)} />
        <Field label="獲得者一覧タイトル" value={config.ui?.userListTitle} onChange={(v) => updateConfig('ui.userListTitle', v)} />
        <Field label="ユーザーアイコンタイトル" value={config.ui?.userIconTitle} onChange={(v) => updateConfig('ui.userIconTitle', v)} />
        <Field label="アイコン読み込み中テキスト" value={config.ui?.iconLoading} onChange={(v) => updateConfig('ui.iconLoading', v)} placeholder="アイコンデータを読み込み中..." />
        <Field label="アイコンデータなしテキスト" value={config.ui?.iconEmpty} onChange={(v) => updateConfig('ui.iconEmpty', v)} placeholder="アイコンデータがありません" />
        <Field label="アイコンなしテキスト" value={config.ui?.iconNoImages} onChange={(v) => updateConfig('ui.iconNoImages', v)} placeholder="アイコンがありません" />
      </div>

      <div className="mt-4">
        <Field
          label="エラーメッセージ"
          value={config.ui?.errorMessage}
          onChange={(v) => updateConfig('ui.errorMessage', v)}
        />
      </div>
    </div>
  )
}

export default ContentTab
