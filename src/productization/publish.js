import { deployConfigToGitHub } from '../lib/github.js'
import { importConfigFromText } from '../lib/configIO.js'

function publicError(error) {
  const message = String(error?.message || '')
  if (/401|認証/i.test(message)) return '公開サービスの認証を確認できませんでした。運営へ連絡してください。'
  if (/403|権限/i.test(message)) return '公開サービスの権限を確認できませんでした。運営へ連絡してください。'
  if (/404|見つかりません/i.test(message)) return '公開先を確認できませんでした。運営へ連絡してください。'
  return '公開処理を完了できませんでした。設定は保存されています。時間をおいて再度お試しください。'
}

export function createLegacyClientPublishAdapter(deploy = deployConfigToGitHub) {
  return {
    id: 'legacy-client-publish',
    canPublish(config) {
      const target = config?.deploy || {}
      return Boolean(target.owner && target.repo && target.branch && target.token)
    },
    async publish(config) {
      if (!this.canPublish(config)) {
        return {
          status: 'blocked',
          code: 'PUBLISH_SERVICE_UNAVAILABLE',
          message: '公開サービスの準備が完了していません。運営へ連絡してください。',
        }
      }
      try {
        await deploy(config, config.deploy)
        return {
          status: 'published',
          publishedAt: Date.now(),
          message: '公開を受け付けました。反映確認が完了するまで少しお待ちください。',
        }
      } catch (error) {
        return { status: 'failed', code: 'PUBLISH_FAILED', message: publicError(error) }
      }
    },
    async verify(config, configUrl = './customer/config.js') {
      try {
        const url = new URL(configUrl, window.location.href)
        url.searchParams.set('verify', Date.now())
        const response = await fetch(url, { cache: 'no-store' })
        if (!response.ok) throw new Error('PUBLISHED_CONFIG_UNAVAILABLE')
        const published = importConfigFromText(await response.text())
        const comparable = value => {
          const copy = structuredClone(value || {})
          if (copy.deploy) copy.deploy.token = ''
          return copy
        }
        const stable = value => {
          if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
          if (value && typeof value === 'object') {
            return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
          }
          return JSON.stringify(value)
        }
        if (stable(comparable(config)) !== stable(comparable(published))) {
          return { status: 'pending', message: '公開ページへの反映を待っています。少し待ってからもう一度確認してください。' }
        }
        return { status: 'verified', verifiedAt: Date.now(), message: '公開ページに最新設定が反映されています。' }
      } catch {
        return { status: 'pending', message: '公開状態をまだ確認できません。少し待ってからもう一度お試しください。' }
      }
    },
  }
}

export function createPublishService(adapter) {
  if (!adapter || typeof adapter.publish !== 'function' || typeof adapter.canPublish !== 'function') {
    throw new Error('A publish adapter is required')
  }
  return {
    canPublish: config => adapter.canPublish(config),
    publish: config => adapter.publish(config),
    verify: (config, configUrl) => adapter.verify
      ? adapter.verify(config, configUrl)
      : Promise.resolve({ status: 'unavailable', message: '公開確認機能はまだ利用できません。' }),
  }
}
