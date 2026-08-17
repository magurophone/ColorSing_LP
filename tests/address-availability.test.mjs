import assert from 'node:assert/strict'
import test from 'node:test'
import { AVAILABILITY, createAddressAvailability } from '../src/productization/addressAvailability.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

test('確認していない間は作成を確定できない', () => {
  const availability = createAddressAvailability({ checkAvailability: async () => true })
  assert.equal(availability.state.status, AVAILABILITY.UNCHECKED)
  assert.equal(availability.state.canCreate, false)
  availability.setInput('magurophone')
  assert.equal(availability.state.status, AVAILABILITY.UNCHECKED)
  assert.equal(availability.state.canCreate, false)
})

test('確認中も作成を確定できない', async () => {
  const pending = deferred()
  const availability = createAddressAvailability({ checkAvailability: () => pending.promise })
  availability.setInput('magurophone')
  const running = availability.check()
  assert.equal(availability.state.status, AVAILABILITY.CHECKING)
  assert.equal(availability.state.canCreate, false)
  pending.resolve(true)
  await running
  assert.equal(availability.state.canCreate, true)
})

test('確認に失敗したときは空きとみなさない', async () => {
  const availability = createAddressAvailability({ checkAvailability: async () => { throw new Error('network') } })
  availability.setInput('magurophone')
  await availability.check()
  assert.equal(availability.state.status, AVAILABILITY.CHECK_FAILED)
  assert.equal(availability.state.canCreate, false)
})

test('使用済みなら作成を確定できない', async () => {
  const availability = createAddressAvailability({ checkAvailability: async () => false })
  availability.setInput('magurophone')
  await availability.check()
  assert.equal(availability.state.status, AVAILABILITY.UNAVAILABLE)
  assert.equal(availability.state.canCreate, false)
})

test('確認処理が未接続なら未確認のままにし、確定させない', async () => {
  const availability = createAddressAvailability()
  availability.setInput('magurophone')
  await availability.check()
  assert.equal(availability.state.status, AVAILABILITY.UNCHECKED)
  assert.equal(availability.state.canCreate, false)
})

test('形式が不正な入力では確認へ進まない', async () => {
  const availability = createAddressAvailability({ checkAvailability: async () => true })
  availability.setInput('ab')
  await availability.check()
  assert.equal(availability.state.status, AVAILABILITY.UNCHECKED)
  assert.equal(availability.state.canCreate, false)
  assert.equal(availability.state.issues[0].code, 'too_short')
})

test('古い問い合わせの結果が後から返っても現在の入力を上書きしない', async () => {
  const pending = new Map()
  const availability = createAddressAvailability({
    checkAvailability: (address) => {
      const slot = deferred()
      pending.set(address, slot)
      return slot.promise
    },
  })

  // maguroph を確認開始（この結果は遅れて返る）。
  availability.setInput('maguroph')
  const stale = availability.check()

  // 入力が進み、magurophone を確認開始して先に完了する。
  availability.setInput('magurophone')
  const fresh = availability.check()
  pending.get('magurophone').resolve(true)
  await fresh
  assert.equal(availability.state.address, 'magurophone')
  assert.equal(availability.state.status, AVAILABILITY.AVAILABLE)

  // 後から古い結果が「使用済み」で返ってきても、現在値の判定を壊さない。
  pending.get('maguroph').resolve(false)
  await stale
  assert.equal(availability.state.address, 'magurophone')
  assert.equal(availability.state.status, AVAILABILITY.AVAILABLE)
  assert.equal(availability.state.canCreate, true)
})

test('古い問い合わせの失敗も現在の判定を壊さない', async () => {
  const pending = new Map()
  const availability = createAddressAvailability({
    checkAvailability: (address) => {
      const slot = deferred()
      pending.set(address, slot)
      return slot.promise
    },
  })

  availability.setInput('maguroph')
  const stale = availability.check()
  availability.setInput('magurophone')
  const fresh = availability.check()
  pending.get('magurophone').resolve(true)
  await fresh

  pending.get('maguroph').reject(new Error('network'))
  await stale
  assert.equal(availability.state.status, AVAILABILITY.AVAILABLE)
  assert.equal(availability.state.canCreate, true)
})

test('入力が変わったら前の判定を持ち越さない', async () => {
  const availability = createAddressAvailability({ checkAvailability: async () => true })
  availability.setInput('magurophone')
  await availability.check()
  assert.equal(availability.state.canCreate, true)

  availability.setInput('magurophone2')
  assert.equal(availability.state.status, AVAILABILITY.UNCHECKED)
  assert.equal(availability.state.canCreate, false)
})
