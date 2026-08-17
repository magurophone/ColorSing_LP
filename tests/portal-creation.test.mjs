import assert from 'node:assert/strict'
import test from 'node:test'
import {
  beginPortalCreation,
  clearPortalCreation,
  describePortalCreation,
  loadPortalCreation,
  runPortalCreation,
  toPortalStatus,
} from '../src/productization/portalCreation.js'
import { PROVISIONING_STEPS } from '../src/productization/provisioning.js'

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  }
}

// 指定した工程で失敗し、以降の再実行では成功するadapter。実行回数を数える。
function countingAdapter({ failAt = null } = {}) {
  const calls = []
  let shouldFail = Boolean(failAt)
  return {
    calls,
    async executeStep(stepId) {
      calls.push(stepId)
      if (shouldFail && stepId === failAt) {
        shouldFail = false
        const error = new Error('failed')
        error.code = 'HOSTING_FAILED'
        throw error
      }
      return { resource: `${stepId}-resource` }
    },
  }
}

test('作成要求はページ名と公開URLを保持し、保存される', () => {
  const storage = memoryStorage()
  const record = beginPortalCreation({ pageName: 'まぐろふぉん 歌推しページ', publicAddress: 'MaguroPhone', storage })
  assert.equal(record.pageName, 'まぐろふぉん 歌推しページ')
  assert.equal(record.publicAddress, 'magurophone')
  assert.equal(loadPortalCreation(storage).publicAddress, 'magurophone')
})

test('再読み込みしても進行中の状態が消えない', async () => {
  const storage = memoryStorage()
  const record = beginPortalCreation({ pageName: 'ページ', publicAddress: 'reload-test', storage })
  await runPortalCreation({ record, adapter: countingAdapter({ failAt: 'hosting' }), storage })

  // 別のセッションが読み直したのと同じこと。
  const restored = loadPortalCreation(storage)
  assert.equal(restored.publicAddress, 'reload-test')
  assert.equal(restored.provisioning.status, 'failed')
  assert.equal(restored.provisioning.steps.repository.status, 'complete')
})

test('作成要求を繰り返しても新しい操作を始めない', () => {
  const storage = memoryStorage()
  const first = beginPortalCreation({ pageName: 'ページ', publicAddress: 'same-op', storage })
  const second = beginPortalCreation({ pageName: '別の名前', publicAddress: 'other-name', storage })
  assert.equal(second.provisioning.operationId, first.provisioning.operationId)
  assert.equal(second.publicAddress, 'same-op')
})

test('もう一度試すが完了済みの工程をやり直さない', async () => {
  const storage = memoryStorage()
  const record = beginPortalCreation({ pageName: 'ページ', publicAddress: 'retry-test', storage })
  const adapter = countingAdapter({ failAt: 'hosting' })

  const failed = await runPortalCreation({ record, adapter, storage })
  assert.equal(failed.provisioning.status, 'failed')
  const beforeRetry = [...adapter.calls]
  assert.equal(beforeRetry.filter(step => step === 'repository').length, 1)

  const retried = await runPortalCreation({ record: loadPortalCreation(storage), adapter, storage })
  assert.equal(retried.provisioning.status, 'complete')

  // repositoryは一度しか実行されない。二重作成が起きないことの担保。
  assert.equal(adapter.calls.filter(step => step === 'repository').length, 1)
  assert.equal(adapter.calls.filter(step => step === 'tenant_record').length, 1)
  assert.equal(adapter.calls.filter(step => step === 'hosting').length, 2)
  for (const stepId of PROVISIONING_STEPS) {
    assert.equal(retried.provisioning.steps[stepId].status, 'complete', stepId)
  }
})

test('retryは同じ操作IDを使い続ける', async () => {
  const storage = memoryStorage()
  const record = beginPortalCreation({ pageName: 'ページ', publicAddress: 'op-id', storage })
  const operationId = record.provisioning.operationId
  const adapter = countingAdapter({ failAt: 'template' })
  await runPortalCreation({ record, adapter, storage })
  const retried = await runPortalCreation({ record: loadPortalCreation(storage), adapter, storage })
  assert.equal(retried.provisioning.operationId, operationId)
})

test('acquisitionが読む状態へ変換する', async () => {
  const storage = memoryStorage()
  assert.equal(toPortalStatus(null), null)
  const record = beginPortalCreation({ pageName: 'ページ', publicAddress: 'status-test', storage })
  assert.equal(toPortalStatus(record).status, 'provisioning')
  const done = await runPortalCreation({ record, adapter: countingAdapter(), storage })
  assert.equal(toPortalStatus(done).status, 'ready')
})

test('顧客向け表示に内部工程名を出さない', async () => {
  const storage = memoryStorage()
  const record = beginPortalCreation({ pageName: 'ページ', publicAddress: 'copy-test', storage })
  const failed = await runPortalCreation({ record, adapter: countingAdapter({ failAt: 'hosting' }), storage })

  const waiting = describePortalCreation(record)
  assert.equal(waiting.headline, '公開ページを準備しています')
  const failure = describePortalCreation(failed)
  assert.equal(failure.tone, 'failed')
  assert.equal(failure.canRetry, true)

  const text = [waiting, failure, describePortalCreation(null)]
    .flatMap(view => [view.headline, view.detail]).join(' ')
  for (const word of [...PROVISIONING_STEPS, 'repository', 'hosting', 'config', 'slug', 'tenant', 'verification']) {
    assert.equal(text.toLowerCase().includes(word.toLowerCase()), false, `${word} が顧客向け文言に残っている`)
  }
})

test('完了後は記録を消して次の作成を始められる', async () => {
  const storage = memoryStorage()
  const record = beginPortalCreation({ pageName: 'ページ', publicAddress: 'done-test', storage })
  await runPortalCreation({ record, adapter: countingAdapter(), storage })
  clearPortalCreation(storage)
  assert.equal(loadPortalCreation(storage), null)
})
