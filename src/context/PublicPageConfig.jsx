import { useEffect, useState } from 'react'
import { ConfigProvider } from './ConfigContext'
import { applyPageSettings } from '../lib/pageSettings'
import { resolveLpRuntime } from '../lib/platformData'
import { resolveTenantSlug } from '../productization/tenant'

/**
 * 公開ページの設定をD1から受け取って適用する。
 *
 * 初期描画は配布物の customer/config.js（写し）で行い、runtime-config が届いたら
 * そちらへ差し替える。写しは速く出すためだけのもので、正本ではない。届かない顧客
 * （platform未設定のlegacy）は写しのまま動き続ける。
 */
export function PublicPageConfig({ initialConfig, children }) {
  const [config, setConfig] = useState(initialConfig)

  useEffect(() => {
    let cancelled = false
    const platformConfig = {
      ...initialConfig.platform,
      tenantSlug: resolveTenantSlug(initialConfig, window.location.pathname),
    }
    resolveLpRuntime(platformConfig).then(runtime => {
      if (cancelled) return
      setConfig(current => applyPageSettings(current, runtime.pageSettings))
    })
    return () => { cancelled = true }
  }, [initialConfig])

  return <ConfigProvider config={config}>{children}</ConfigProvider>
}
