import { useEditingPreview } from '../context/PublicPageConfig'

/* Control Planeの「ページ上で編集」でだけ出る、薄い枠。
 *
 * 出していない要素・中身が空の要素は、そのままでは画面に何も無いので押せない。
 * 押せないと設定へたどり着けない。そこで編集中だけ、その場所に薄い枠を置く。
 *
 * 公開ページの通常表示では useEditingPreview() が必ず false になる。bridgeは
 * control_plane かつ iframe の中でしか入らないので、一般の閲覧者には
 * この枠は存在しない（DOMにも出ない）。 */
export function PreviewGhost({ target, label, className = '' }) {
  if (!useEditingPreview()) return null
  return (
    <div
      data-page-setting-target={target}
      data-preview-ghost="true"
      className={`my-3 rounded-xl border border-dashed border-highlight/40 bg-highlight/5 px-4 py-3 text-center text-sm text-sub-text ${className}`}
    >
      {label}
    </div>
  )
}

export default PreviewGhost
