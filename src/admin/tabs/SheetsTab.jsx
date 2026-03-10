import { useState } from 'react'
import { fetchSheetData } from '../../lib/sheets'
import Field from '../components/Field'

const SheetsTab = ({ config, updateConfig }) => {
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const data = await fetchSheetData(
        config.sheets.spreadsheetId,
        config.sheets.rankingSheetName,
        config.sheets.ranges.ranking
      )
      setTestResult({
        success: true,
        message: `接続成功！${data.length}行のデータを取得しました。`,
      })
    } catch (err) {
      setTestResult({
        success: false,
        message: `接続失敗: ${err.message}`,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-body text-light-blue mb-6">Google Sheets 設定</h2>
      <p className="text-sm text-gray-400 mb-6">データソースとなるGoogleスプレッドシートの接続設定です。</p>

      <Field
        label="スプレッドシートID"
        value={config.sheets.spreadsheetId}
        onChange={(v) => updateConfig('sheets.spreadsheetId', v)}
        placeholder="スプレッドシートURLの /d/ と /edit の間のID"
        description="GoogleスプレッドシートのURLから取得できます。https://docs.google.com/spreadsheets/d/[ここのID]/edit"
      />

      <button
        onClick={handleTest}
        disabled={testing || !config.sheets.spreadsheetId}
        className="mb-6 px-4 py-2 bg-light-blue/20 hover:bg-light-blue/30 border border-light-blue/50 rounded-lg transition-all text-light-blue text-sm font-body disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {testing ? '接続テスト中...' : '接続テスト'}
      </button>

      {testResult && (
        <div className={`mb-6 glass-effect px-4 py-3 rounded-lg border text-sm ${
          testResult.success
            ? 'border-green-500/50 text-green-400'
            : 'border-tuna-red/50 text-tuna-red'
        }`}>
          {testResult.message}
        </div>
      )}

      <hr className="border-light-blue/20 my-8" />
      <h3 className="text-lg font-body text-amber mb-4">シート名</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="ランキング・目標シート名"
          value={config.sheets.rankingSheetName}
          onChange={(v) => updateConfig('sheets.rankingSheetName', v)}
          placeholder="目標管理・ランキング"
          description="ランキング・目標データのシート名"
        />
        <Field
          label="権利者シート名"
          value={config.sheets.benefitsSheetName}
          onChange={(v) => updateConfig('sheets.benefitsSheetName', v)}
          placeholder="特典管理"
          description="権利者データのシート名"
        />
        <Field
          label="特典内容シート名"
          value={config.sheets.benefitsContentSheetName}
          onChange={(v) => updateConfig('sheets.benefitsContentSheetName', v)}
          placeholder="特典内容"
          description="特典説明データのシート名（特典ティア, タイトル, 簡易説明, 詳細説明, レコード機能）"
        />
        <Field
          label="特典履歴シート名"
          value={config.sheets.historySheetName}
          onChange={(v) => updateConfig('sheets.historySheetName', v)}
          placeholder="特典履歴"
          description="特典実行履歴のシート名（ユーザー名, 年月, 特典ID, 内容）"
        />
        <Field
          label="アイコンシート名"
          value={config.sheets.iconSheetName}
          onChange={(v) => updateConfig('sheets.iconSheetName', v)}
          placeholder="枠内アイコン"
          description="枠内アイコンデータのシート名"
        />
<Field
          label="イベントシート名"
          value={config.sheets.eventSheetName}
          onChange={(v) => updateConfig('sheets.eventSheetName', v)}
          placeholder="イベント"
          description="イベント履歴（A:日付yyyymmdd, B:タイトル, C:セットリスト, D:画像URL, E:備考 / 3行目:開催予定, 7行目以降:履歴）"
        />
      </div>

      <hr className="border-light-blue/20 my-8" />

      <h3 className="text-lg font-body text-amber mb-4">セル範囲</h3>
      <p className="text-xs text-gray-500 mb-4">各データが配置されているセル範囲を指定します。権利者データと特典履歴は自動取得されます。</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="ランキングデータ"
          value={config.sheets.ranges.ranking}
          onChange={(v) => updateConfig('sheets.ranges.ranking', v)}
          placeholder="D2:G5"
        />
        <Field
          label="目標データ"
          value={config.sheets.ranges.goals}
          onChange={(v) => updateConfig('sheets.ranges.goals', v)}
          placeholder="A2:B10"
        />
        <Field
          label="特典説明データ"
          value={config.sheets.ranges.benefits}
          onChange={(v) => updateConfig('sheets.ranges.benefits', v)}
          placeholder="A3:E20"
        />
      </div>

      <hr className="border-light-blue/20 my-8" />
      <h3 className="text-lg font-body text-amber mb-4">自動更新</h3>

      <div className="mb-5">
        <label className="block text-sm font-body text-light-blue mb-1">更新間隔（分）</label>
        <input
          type="number"
          min="1"
          max="60"
          value={Math.round((config.sheets.refreshIntervalMs || 300000) / 60000)}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v > 0) updateConfig('sheets.refreshIntervalMs', v * 60000)
          }}
          className="w-32 px-4 py-2 glass-effect border border-light-blue/30 rounded-lg text-white focus:outline-none focus:border-amber transition-all text-sm"
        />
      </div>
    </div>
  )
}

export default SheetsTab
