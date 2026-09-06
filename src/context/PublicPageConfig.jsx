import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ConfigProvider } from './ConfigContext'
import { applyPageSettings } from '../lib/pageSettings'
import { resolveLpRuntime } from '../lib/platformData'
import { resolveTenantSlug } from '../productization/tenant'
import { installPagePreviewBridge } from '../lib/pagePreviewBridge'

/* Control Planeのpreviewが選んだ表示状態。一般公開では常に 'normal'。 */
const PreviewStateContext = createContext('normal')

/* Control Planeのpreviewの操作モード。一般公開ではbridge自体が入らないので
 * 常に 'off'。'edit' のときだけ、編集用の薄い枠を出してよい。 */
const PreviewModeContext = createContext('off')

export function usePreviewState() {
  return useContext(PreviewStateContext)
}

export function usePreviewMode() {
  return useContext(PreviewModeContext)
}

/** 編集モードのときだけ true。公開ページの通常表示では必ず false。 */
export function useEditingPreview() {
  return useContext(PreviewModeContext) === 'edit'
}

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
  /* Control Planeが選んだ表示状態。普段は出ない画面の文字を実物で直すためのもの。 */
  const [previewState, setPreviewState] = useState('normal')
  const [previewMode, setPreviewMode] = useState('off')

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
    onState: ({ draft, mode, previewState: next }) => {
      setPreviewDraft(draft)
      setPreviewState(next ?? 'normal')
      setPreviewMode(mode ?? 'off')
    },
  }) || undefined, [initialConfig])

  const config = useMemo(() => {
    // preview draftは毎回immutableな初期configへ適用する。現在表示中configへ累積しない。
    const pageSettings = previewDraft ?? runtime?.pageSettings
    const next = applyPageSettings(initialConfig, pageSettings)
    /* 特典の名前と単位は写しへ混ぜず別に持つ。tier単位の表示設定は、配布物のtierへ
     * 項目ごとに重ねる。届かなかった項目は配布物の値のままにする。
     *
     * 判定は必ず「型かどうか」で行う。値の有無で判定すると、空文字で保存した
     * 「絵文字なし」「合言葉なし」が未設定に化けて、配布物の値が復活する。
     * 同じ理由で `||` を使わない。 */
    const perKeyIcon = next.benefitTierDisplay || {}
    const overlay = tier => {
      let merged = tier
      const icon = perKeyIcon[tier.key]?.icon
      if (typeof icon === 'string') merged = { ...merged, icon }
      const display = runtime?.benefitDisplays?.[tier.key]
      if (!display) return merged
      if (typeof display.showUsers === 'boolean') merged = { ...merged, showUsers: display.showUsers }
      if (typeof display.template === 'string') merged = { ...merged, displayTemplate: display.template }
      /* キーごとの絵文字（benefitTierDisplay）のほうが細かいので、そちらを優先する。
       * まとめて見せている特典は、定義側の絵文字がまとめた全キーへ同じように配られる。 */
      if (typeof display.icon === 'string' && typeof icon !== 'string') {
        merged = { ...merged, icon: display.icon }
      }
      if (typeof display.membershipCard === 'boolean') merged = { ...merged, isMembership: display.membershipCard }
      if (typeof display.locked === 'boolean') merged = { ...merged, useKey: display.locked }
      if (typeof display.accessKey === 'string') merged = { ...merged, accessKey: display.accessKey }
      if (typeof display.lockedText === 'string' || typeof display.lockedImageUrl === 'string') {
        merged = {
          ...merged,
          lockedContent: {
            ...(merged.lockedContent || {}),
            ...(typeof display.lockedText === 'string' ? { text: display.lockedText } : {}),
            ...(typeof display.lockedImageUrl === 'string' ? { imageUrl: display.lockedImageUrl } : {}),
          },
        }
      }
      /* D1の表示文が届いた特典では、配布物の isBoolean を使わない。値を出すかどうかは
       * 表示文に {value} があるかで決まる。届いていない特典は今までどおり。 */
      if (typeof display.template === 'string') merged = { ...merged, templateFromControlPlane: true }
      return merged
    }
    const benefitTiers = (next.benefitTiers || []).map(overlay)
    return {
      ...next,
      ...(runtime?.benefitDisplays ? { benefitDisplays: runtime.benefitDisplays } : {}),
      benefitTiers,
    }
  }, [initialConfig, previewDraft, runtime])

  /* 表示状態はconfigとは別に配る。configへ混ぜると、保存される設定と
   * 見分けがつかなくなる。 */
  return (
    <PreviewModeContext.Provider value={previewMode}>
    <PreviewStateContext.Provider value={previewState}>
      <ConfigProvider config={config}>{children}</ConfigProvider>
    </PreviewStateContext.Provider>
    </PreviewModeContext.Provider>
  )
}
