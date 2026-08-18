import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createSupporter,
  isSupportersApiConfigured,
  updateSupporter,
} from '../../productization/supportersApi'
import { loadBenefitGrid, saveSupporterCells } from '../../productization/benefitGridApi'

// リスナー情報。実体はCentral DBにあり、ここはその管理画面。
//
// 二層にする。
//  - 表: 毎月の一括更新。スプレッドシートの操作感を残す
//  - 詳細: 名前を押して開く。1人ぶんの確認と例外的な編集
//
// 内部名は supporter だが、配信者から見た相手はリスナーなので画面ではそう呼ぶ。
// 列は特典段階に対応する。列番号というシート固有の概念は持ち込まない。

function CellInput({ value, onCommit, label, boolean: isBoolean = false }) {
  const [draft, setDraft] = useState(String(value || ''))
  useEffect(() => { setDraft(String(value || '')) }, [value])


  // 数を持たない特典に数字を入れさせない。持つか持たないかだけを聞く。
  // 保存の往復を待ってから反映すると、押しても戻ったように見える。手元の状態を
  // 先に変え、保存はそのあとで追いつかせる。
  if (isBoolean) {
    return (
      <input
        type="checkbox"
        checked={draft === '1'}
        aria-label={label}
        onChange={(e) => {
          const next = e.target.checked ? 1 : 0
          setDraft(String(next))
          onCommit(next)
        }}
        data-testid="grid-cell"
        className="h-4 w-4 accent-amber"
      />
    )
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim() === '' ? 0 : Number(draft)
        if (!Number.isFinite(next) || next < 0) { setDraft(String(value || '')); return }
        if (next !== value) onCommit(next)
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      data-testid="grid-cell"
      className="w-14 rounded border border-transparent bg-transparent px-1 py-1 text-center text-sm text-white focus:border-light-blue/50 focus:bg-black/30"
    />
  )
}

export default function SupportersTab({ config }) {
  const configured = isSupportersApiConfigured(config)
  const [grid, setGrid] = useState(null)
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [openId, setOpenId] = useState(null)

  const reload = useCallback(async () => {
    if (!configured) return
    setLoading(true)
    setError(null)
    try {
      setGrid(await loadBenefitGrid(config, { includeArchived }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [config, configured, includeArchived])

  useEffect(() => { reload() }, [reload])

  const add = useCallback(async () => {
    const displayName = name.trim()
    if (!displayName) return
    setSaving(true)
    setError(null)
    try {
      await createSupporter(config, { displayName })
      setName('')
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [config, name, reload])

  const commitCell = useCallback(async (supporterId, definitionId, quantity) => {
    setError(null)
    try {
      await saveSupporterCells(config, supporterId, [{ benefitDefinitionId: definitionId, quantity }])
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }, [config, reload])

  const rename = useCallback(async (supporterId, displayName) => {
    setError(null)
    try {
      await updateSupporter(config, supporterId, { displayName })
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }, [config, reload])

  const setArchived = useCallback(async (supporterId, archived) => {
    setError(null)
    try {
      await updateSupporter(config, supporterId, { archived })
      setOpenId(null)
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }, [config, reload])

  const openRow = useMemo(
    () => (grid?.rows ?? []).find(row => row.id === openId) ?? null,
    [grid, openId],
  )

  if (!configured) {
    // 未接続で偽の一覧を出さない。何が足りないかだけ伝える。
    return (
      <div data-testid="supporters-tab">
        <h2 className="text-2xl font-body text-light-blue mb-6">リスナー情報</h2>
        <div className="glass-effect rounded-xl border border-light-blue/20 p-6" data-testid="supporters-not-configured">
          <p className="text-sm text-gray-300">リスナー情報の保存先がまだ設定されていません。</p>
          <p className="mt-2 text-sm text-gray-400">
            運営が接続すると、この画面からリスナーを追加・編集できるようになります。
            ここまでに設定した内容はそのまま残ります。
          </p>
        </div>
      </div>
    )
  }

  // ─── 詳細（1人ぶん） ───
  if (openRow) {
    return (
      <div data-testid="supporter-detail">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          data-testid="supporter-detail-back"
          className="text-sm text-light-blue underline"
        >
          ← リスナー一覧へ戻る
        </button>

        <h2 className="mt-4 text-2xl font-body text-light-blue">{openRow.displayName}</h2>

        {error && (
          <p className="mt-4 rounded-lg border border-tuna-red/40 bg-tuna-red/10 p-3 text-sm text-tuna-red" role="alert" data-testid="supporters-error">
            {error}
          </p>
        )}

        <div className="mt-6 glass-effect rounded-xl border border-light-blue/20 p-5">
          <label className="block text-xs text-gray-500">名前</label>
          <input
            type="text"
            defaultValue={openRow.displayName}
            onBlur={(e) => {
              const next = e.target.value.trim()
              if (next && next !== openRow.displayName) rename(openRow.id, next)
            }}
            data-testid="supporter-detail-name"
            className="mt-2 w-full rounded-lg border border-light-blue/30 bg-black/20 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="mt-5 glass-effect rounded-xl border border-light-blue/20 p-5">
          <p className="text-xs font-bold text-gray-400">受け取っている特典</p>
          {grid.definitions.length === 0
            ? <p className="mt-3 text-sm text-gray-400">特典の段階がまだありません。「特典の段階」で追加してください。</p>
            : (
              <ul className="mt-3 space-y-2">
                {grid.definitions.map(definition => (
                  <li key={definition.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-200">{definition.title}</span>
                    <CellInput
                      label={`${openRow.displayName} の ${definition.title}`}
                      boolean={definition.boolean}
                      value={grid.valueOf(openRow.id, definition.id)}
                      onCommit={(quantity) => commitCell(openRow.id, definition.id, quantity)}
                    />
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setArchived(openRow.id, !openRow.archived)}
            data-testid="supporter-archive"
            className="text-sm text-gray-400 underline"
          >
            {openRow.archived ? '一覧へ戻す' : '一覧から外す'}
          </button>
        </div>
      </div>
    )
  }

  // ─── 表（毎月の一括更新） ───
  return (
    <div data-testid="supporters-tab">
      <h2 className="text-2xl font-body text-light-blue mb-2">リスナー情報</h2>
      <p className="text-sm text-gray-400 mb-6">
        応援してくれている人と、受け取っている特典の一覧です。数を入れると保存されます。
        名前を押すと、その人の詳細を開けます。
      </p>

      <div className="glass-effect rounded-xl border border-light-blue/20 p-5">
        <label className="block text-xs text-gray-500">リスナーの名前</label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            placeholder="配信で呼んでいる名前"
            data-testid="supporter-name-input"
            className="min-w-0 flex-1 rounded-lg border border-light-blue/30 bg-black/20 px-3 py-2 text-sm text-white placeholder-gray-600"
          />
          <button
            type="button"
            onClick={add}
            disabled={saving || !name.trim()}
            data-testid="supporter-add"
            className="rounded-lg bg-amber px-4 py-2 text-sm font-bold text-deep-blue disabled:opacity-40"
          >
            追加する
          </button>
        </div>
      </div>

      <label className="mt-5 flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          data-testid="supporter-include-archived"
          className="accent-amber"
        />
        休止中の人も表示する
      </label>

      {error && (
        <p className="mt-4 rounded-lg border border-tuna-red/40 bg-tuna-red/10 p-3 text-sm text-tuna-red" role="alert" data-testid="supporters-error">
          {error}
        </p>
      )}

      {loading && <p className="mt-5 text-sm text-gray-400" data-testid="supporters-loading">読み込み中...</p>}

      {!loading && grid && grid.rows.length === 0 && !error && (
        <div className="mt-5 glass-effect rounded-xl border border-light-blue/20 p-6" data-testid="supporters-empty">
          <p className="text-sm text-gray-300">まだ登録がありません。</p>
          <p className="mt-2 text-sm text-gray-400">上の欄から追加してください。0人のままでも公開はできます。</p>
        </div>
      )}

      {!loading && grid && grid.rows.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm" data-testid="supporters-grid">
            <thead>
              <tr className="border-b border-light-blue/20">
                <th scope="col" className="px-2 py-2 text-left text-xs font-bold text-gray-400">リスナー</th>
                {grid.definitions.map(definition => (
                  <th key={definition.id} scope="col" className="px-2 py-2 text-center text-xs font-bold text-amber">
                    {definition.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map(row => (
                <tr key={row.id} className="border-b border-light-blue/10" data-testid="grid-row">
                  <th scope="row" className="px-2 py-1 text-left font-normal">
                    <button
                      type="button"
                      onClick={() => setOpenId(row.id)}
                      data-testid="grid-row-name"
                      className="text-sm text-light-blue underline"
                    >
                      {row.displayName}
                    </button>
                    {row.archived && <span className="ml-2 text-xs text-gray-500">休止中</span>}
                  </th>
                  {grid.definitions.map(definition => (
                    <td key={definition.id} className="px-1 py-1 text-center">
                      <CellInput
                        label={`${row.displayName} の ${definition.title}`}
                        boolean={definition.boolean}
                        value={grid.valueOf(row.id, definition.id)}
                        onCommit={(quantity) => commitCell(row.id, definition.id, quantity)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {grid.definitions.length === 0 && (
            <p className="mt-3 text-sm text-gray-400" data-testid="grid-no-definitions">
              特典の段階がまだありません。「特典の段階」で追加すると、ここに列として出ます。
            </p>
          )}
        </div>
      )}
    </div>
  )
}
