// サイト名の縦位置を、フォントごとの字面のクセだけ打ち消すための補正。
//
// brand.titleOffsetY の既定 -0.12em は、下へ伸びない書体（Noto Sans JP や
// Playfair Display など）を想定した値である。48pxで測ると、これらは字の実体が
// 上に37px・下に1px しか出ないため、行の中で下寄りに見える。-0.12em はそれを
// 引き上げて見た目の中央へ寄せている。
//
// ところが Sacramento のような装飾体は下に深く伸びる（48pxで上38px・下19px）。
// 行の中で既に上下が釣り合っているので、-0.12em をかけると今度は上へ食み出す。
// すりガラスの帯は上下の余白が小さいため、はみ出しがそのまま見える。
//
// そこで「利用者が決めた値」と「書体のクセを打ち消す値」を分ける。
//
//   実際にずらす量 = 利用者が決めた titleOffsetY + 書体ごとの補正
//
// 補正を持たない書体は 0 なので、これまでと1pxも変わらない。
// 利用者の設定値そのものは書き換えない。設定画面には利用者の値がそのまま出る。
//
// 値の決め方は勘ではない。Playwrightで実際に描画し、帯の中で字の実体（インク）の
// 上下のすき間が揃う量を測って決める。手順と結果は
// tests/title-font-metrics.spec.js に残してある。

/**
 * 書体ごとの補正量（em）。
 *
 * 足すときは必ず実描画で測ること。「装飾体だから」で入れない。
 * 同じ装飾体でも下の伸び方は書体ごとに違う。
 */
const OFFSET_CORRECTION = Object.freeze({
  /* Sacramento は大文字がほぼ下へ伸びない（48pxで実体が上38px・下2px）ため、
   * 普通の書体向けの -0.12em をかけると帯の上辺へ食い込む。
   *
   * 実描画で掃引した結果、実際にずらす量が -0.035em のとき、帯の中の上下の
   * すき間の差が PC -0.4px / スマホ +0.4px と最小になった。
   * 既定 -0.12em に対して +0.085em 足すとその位置になる。
   *   PC   48px: 上14.8 / 下15.2
   *   スマホ24px: 上10.7 / 下10.3
   * 掃引の手順は tests/title-font-metrics.spec.js。 */
  sacramento: 0.085,
})

/**
 * CSSのfont-family指定から、先頭の書体名を取り出す。
 * 例: "'Sacramento', cursive" -> "sacramento"
 */
export function primaryFontName(fontFamily) {
  if (typeof fontFamily !== 'string') return ''
  const first = fontFamily.split(',')[0]
  if (typeof first !== 'string') return ''
  return first.trim().replace(/^['"]|['"]$/g, '').trim().toLowerCase()
}

/**
 * その書体の縦位置補正（em）。知らない書体は 0。
 */
export function titleOffsetCorrection(fontFamily) {
  const name = primaryFontName(fontFamily)
  const correction = OFFSET_CORRECTION[name]
  return typeof correction === 'number' && Number.isFinite(correction) ? correction : 0
}

export const titleFontMetricsTest = Object.freeze({ OFFSET_CORRECTION })
