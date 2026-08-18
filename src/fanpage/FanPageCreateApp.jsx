import { useEffect } from 'react'

// 歌推しページの作成は、設定（onboarding.html）の最初の手順へ移した。
// 別画面にしていたときは、そこで名前を聞き、設定でもう一度名前を聞いていた。
// 配ってしまったリンクを切らないよう、この入口は設定へ送るだけにする。
const DESTINATION = './onboarding.html'

export default function FanPageCreateApp() {
  useEffect(() => {
    window.location.replace(DESTINATION)
  }, [])

  return (
    <main className="min-h-screen bg-deep-blue px-4 py-10 text-gray-100" data-testid="fanpage-create-moved">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-xl font-bold text-highlight">設定の画面へ移動します</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          歌推しページの作成は、設定の最初の手順になりました。
        </p>
        <a href={DESTINATION} className="mt-6 inline-block text-sm text-light-blue underline" data-testid="fanpage-create-moved-link">
          設定を開く
        </a>
      </div>
    </main>
  )
}
