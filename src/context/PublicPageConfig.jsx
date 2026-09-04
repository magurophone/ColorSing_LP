import { useEffect, useMemo, useState } from 'react'
import { ConfigProvider } from './ConfigContext'
import { applyPageSettings } from '../lib/pageSettings'
import { resolveLpRuntime } from '../lib/platformData'
import { resolveTenantSlug } from '../productization/tenant'
import { installPagePreviewBridge } from '../lib/pagePreviewBridge'

/**
 * 公開ページの設定をD1から受け取って適用する。
 *
 * 初期描画は配布物の customer/config.js（写し）で行い、runtime-config が届いたら
 * そちらへ差し替える。写しは速く出すためだけのもので、正本ではない。届かない顧客
 * （platform未設定のlegacy）は写しのまま動き続ける。
 */
export function PublicPageConfig({ initialConfig, children }) {
  const [runtime, setRuntime] = useState(null)
  const [previewDraft, setPreviewDraft] = useState(null)

  useEffect(() => {
    let cancelled = false
    const platformConfig = {
      ...initialConfig.platform,
      tenantSlug: resolveTenantSlug(initialConfig, window.location.pathname),
    }
    resolveLpRuntime(platformConfig).then(runtime => {
      if (cancelled) return
      setRuntime(runtime)
    })
    return () => { cancelled = true }
  }, [initialConfig])

  useEffect(() => installPagePreviewBridge({
    initialConfig,
    onState: ({ draft }) => setPreviewDraft(draft),
  }) || undefined, [initialConfig])

  const config = useMemo(() => {
    // preview draftは毎回immutableな初期configへ適用する。現在表示中configへ累積しない。
    const pageSettings = previewDraft ?? runtime?.pageSettings
    const next = applyPageSettings(initialConfig, pageSettings)
    /* 特典の名前と単位は写しへ混ぜず別に持つ。権利者一覧へ出すかどうかだけは
     * tier単位の表示設定なので、配布物のtierへ重ねる。どちらも届かなければ
     * 配布物の値のままにする。 */
    if (!runtime?.benefitDisplays) return next
    const benefitTiers = (next.benefitTiers || []).map(tier => {
      const display = runtime.benefitDisplays?.[tier.key]
      return typeof display?.showUsers === 'boolean'
        ? { ...tier, showUsers: display.showUsers }
        : tier
    })
    return { ...next, benefitDisplays: runtime.benefitDisplays, benefitTiers }
  }, [initialConfig, previewDraft, runtime])

  return <ConfigProvider config={config}>{children}</ConfigProvider>
}
