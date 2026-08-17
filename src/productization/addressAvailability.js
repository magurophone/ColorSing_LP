// 公開URLの重複確認。
//
// 作成を確定してよいのは available のときだけ。未確認、確認中、確認失敗、
// 使用済みのいずれでも確定させない。「確認できなかった」を「空いている」と
// 同じに扱わないための状態分けである。
//
// 入力は1文字ずつ変わるため、古い問い合わせの結果が後から返ることがある。
// 各問い合わせに通し番号を持たせ、最新でなくなった結果は捨てる。

import { normalizePublicAddress, validatePublicAddress } from './publicAddress.js'

export const AVAILABILITY = Object.freeze({
  UNCHECKED: 'unchecked',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  CHECK_FAILED: 'check_failed',
})

function snapshot(status, address, { issues = [], message = '' } = {}) {
  return {
    status,
    address,
    issues,
    message,
    // 作成を確定してよいのは available のときだけ。
    canCreate: status === AVAILABILITY.AVAILABLE,
  }
}

const MESSAGES = {
  [AVAILABILITY.UNCHECKED]: '公開URLが使えるか確認します。',
  [AVAILABILITY.CHECKING]: '公開URLが使えるか確認しています。',
  [AVAILABILITY.AVAILABLE]: 'この公開URLは使えます。',
  [AVAILABILITY.UNAVAILABLE]: 'この公開URLはすでに使われています。別の名前を入力してください。',
  [AVAILABILITY.CHECK_FAILED]: '公開URLを確認できませんでした。通信状況を確かめて、もう一度お試しください。',
}

// checkAvailability: async (address) => boolean。trueなら使える。
// 未注入なら確認を行わず unchecked のままにし、確定させない。
export function createAddressAvailability({ checkAvailability = null } = {}) {
  let requestSequence = 0
  let latestSequence = 0
  let current = snapshot(AVAILABILITY.UNCHECKED, '', { message: MESSAGES[AVAILABILITY.UNCHECKED] })

  function setState(next) {
    current = next
    return current
  }

  return {
    get state() {
      return current
    },

    // 入力が変わったら必ず未確認へ戻す。前の判定を新しい文字列へ持ち越さない。
    setInput(value) {
      const address = normalizePublicAddress(value)
      const validation = validatePublicAddress(address)
      // 入力が変わった時点で、進行中の結果はすべて対象外にする。
      latestSequence = ++requestSequence
      if (!validation.valid) {
        return setState(snapshot(AVAILABILITY.UNCHECKED, address, {
          issues: validation.issues,
          message: validation.issues[0]?.message ?? MESSAGES[AVAILABILITY.UNCHECKED],
        }))
      }
      return setState(snapshot(AVAILABILITY.UNCHECKED, address, { message: MESSAGES[AVAILABILITY.UNCHECKED] }))
    },

    async check() {
      const address = current.address
      const validation = validatePublicAddress(address)
      if (!validation.valid) return current
      if (typeof checkAvailability !== 'function') return current

      const sequence = ++requestSequence
      latestSequence = sequence
      setState(snapshot(AVAILABILITY.CHECKING, address, { message: MESSAGES[AVAILABILITY.CHECKING] }))

      let available
      try {
        available = await checkAvailability(address)
      } catch {
        // 遅れて返ってきた失敗も、現在の入力の判定を上書きしない。
        if (sequence !== latestSequence) return current
        return setState(snapshot(AVAILABILITY.CHECK_FAILED, address, { message: MESSAGES[AVAILABILITY.CHECK_FAILED] }))
      }

      // 古い問い合わせの結果は捨てる。入力が進んでいる場合に現在値を壊さない。
      if (sequence !== latestSequence) return current

      const status = available === true ? AVAILABILITY.AVAILABLE : AVAILABILITY.UNAVAILABLE
      return setState(snapshot(status, address, { message: MESSAGES[status] }))
    },
  }
}
