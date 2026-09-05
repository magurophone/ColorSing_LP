import { useConfig } from '../context/ConfigContext'
import PreviewGhost from './PreviewGhost'

const Footer = () => {
  const config = useConfig()

  return (
    <footer className="text-center py-8 border-t border-card-border/30">
      <p data-page-setting-target="brand.footerText" className="text-xl font-body mb-4 text-footer-text">{config.brand.footerText}</p>
      <p data-page-setting-target="brand.footerSubText" className="text-sub-text">{config.brand.footerSubText}</p>
      {config.brand.footerNote ? (
        <p data-page-setting-target="brand.footerNote" className="text-sm text-sub-text mt-4">{config.brand.footerNote}</p>
      ) : (
        /* 空の行は画面に何も無いので押せない。編集中だけ枠を置く。 */
        <PreviewGhost target="brand.footerNote" label="フッターの注記（空）" />
      )}
    </footer>
  )
}

export default Footer
