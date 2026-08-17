import assert from 'node:assert/strict'
import test from 'node:test'
import {
  describeAddressChange,
  normalizePublicAddress,
  publicAddressPreview,
  suggestPublicAddress,
  validatePublicAddress,
} from '../src/productization/publicAddress.js'

function codes(result) {
  return result.issues.map(issue => issue.code)
}

test('大文字小文字と全角は同じ住所として揃える', () => {
  assert.equal(normalizePublicAddress('  MaguroPhone  '), 'magurophone')
  assert.equal(normalizePublicAddress('ＭＡＧＵＲＯ'), 'maguro')
  assert.equal(validatePublicAddress('MaguroPhone').normalized, 'magurophone')
  assert.equal(validatePublicAddress('MaguroPhone').normalizedFromInput, true)
  assert.equal(validatePublicAddress('magurophone').normalizedFromInput, false)
})

test('ページ名から公開URLの候補を機械的に作る', () => {
  assert.equal(suggestPublicAddress('まぐろふぉん 歌推しページ'), '')
  assert.equal(suggestPublicAddress('Maguro Phone'), 'maguro-phone')
  assert.equal(suggestPublicAddress('--Maguro--Phone--'), 'maguro-phone')
})

test('使用可能文字と長さを検証する', () => {
  assert.deepEqual(codes(validatePublicAddress('')), ['empty'])
  assert.deepEqual(codes(validatePublicAddress('ab')), ['too_short'])
  assert.equal(codes(validatePublicAddress('a'.repeat(31))).includes('too_long'), true)
  assert.equal(codes(validatePublicAddress('まぐろ')).includes('unsupported_characters'), true)
  assert.equal(codes(validatePublicAddress('-maguro')).includes('unsupported_characters'), true)
  assert.equal(codes(validatePublicAddress('maguro-')).includes('unsupported_characters'), true)
  assert.equal(validatePublicAddress('maguro-phone-2').valid, true)
})

test('既存の入口と衝突する予約語を拒否する', () => {
  for (const reserved of ['admin', 'setup', 'manual', 'monitor', 'onboarding', 'customer', 'portal']) {
    assert.deepEqual(codes(validatePublicAddress(reserved)), ['reserved'], reserved)
  }
})

test('重複確認は注入されたときだけ行い、確認したかどうかを返す', () => {
  const unchecked = validatePublicAddress('magurophone')
  assert.equal(unchecked.valid, true)
  assert.equal(unchecked.duplicateChecked, false)

  const taken = validatePublicAddress('magurophone', { isTaken: (value) => value === 'magurophone' })
  assert.equal(taken.valid, false)
  assert.equal(taken.duplicateChecked, true)
  assert.deepEqual(codes(taken), ['taken'])

  const free = validatePublicAddress('otofu', { isTaken: () => false })
  assert.equal(free.valid, true)
  assert.equal(free.duplicateChecked, true)
})

test('公開前と公開後で変更の伝え方を変える', () => {
  assert.equal(describeAddressChange({ current: 'a-name', next: 'a-name' }).changed, false)
  assert.equal(describeAddressChange({ current: 'old-name', next: 'new-name' }).severity, 'notice')
  const afterPublish = describeAddressChange({ current: 'old-name', next: 'new-name', published: true })
  assert.equal(afterPublish.severity, 'warning')
  assert.match(afterPublish.message, /リンクが開けなくなります/)
})

test('確定前に実際の公開URLを見せられる', () => {
  assert.equal(publicAddressPreview('https://service.example.com/', 'MaguroPhone'), 'https://service.example.com/magurophone')
})

test('利用者向けの文言にシステム語彙を出さない', () => {
  const samples = [
    validatePublicAddress(''),
    validatePublicAddress('ab'),
    validatePublicAddress('まぐろ'),
    validatePublicAddress('admin'),
    validatePublicAddress('taken-name', { isTaken: () => true }),
  ]
  const text = samples.flatMap(result => result.issues.map(issue => issue.message))
    .concat(describeAddressChange({ current: 'a', next: 'b', published: true }).message)
    .join(' ')
  for (const word of ['slug', 'repository', 'repo', 'tenant', 'config', 'commit', 'branch', '識別子']) {
    assert.equal(text.toLowerCase().includes(word.toLowerCase()), false, `${word} が利用者向け文言に残っている`)
  }
})
