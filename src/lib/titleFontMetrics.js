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
  /* Sacramento は既定の -0.12em をかけると帯の上辺へ食い込む。まぐろふぉんは
   * 帯の余白が4pxしかなく、上のすき間が -1px、下が 11px になっていた。
   *
   * 字の実体（インク）で釣り合わせると、実際には上寄りに見える。下へ伸びるのは
   * G と P の細い飾りだけで、文字の重さは基準線より上にあるためである。
   * そこで見た目で中央に来る位置を、本番の実描画で選んだ。
   *
   * ただし下げすぎると飾りが帯に切られる。本番PC(48px)の実測では
   *   +0.11em → 下のすき間 0.7px（限界）
   *   +0.14em → 下のすき間 -0.7px（切れる）
   * 余裕を残して +0.08em を採る。実際にずらす量は -0.12 + 0.20 = +0.08em。
   *   PC   48px 上10.8 / 下2.2
   *   スマホ24px 上 7.4 / 下3.6
   *
   * これ以上中央へ寄せるには帯の余白（titlePaddingY 4px）を広げる必要がある。
   * それは利用者の設定なので、ここでは変えない。 */
  sacramento: 0.20,
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
