import { generateConfigJS, importConfigFromText } from './configIO.js'

async function gh(token, method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }

  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status} ${method} ${path}`)
    err.status = res.status
    err.data = json
    throw err
  }
  return json
}

async function pushFileCommit(token, owner, repo, branch, filePath, contentUtf8, message) {
  // 1. head
  const ref = await gh(token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`)
  const headSha = ref.object.sha

  // 2. base tree
  const headCommit = await gh(token, 'GET', `/repos/${owner}/${repo}/git/commits/${headSha}`)
  const baseTreeSha = headCommit.tree.sha

  // 3. blob（utf-8）
  const blob = await gh(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, {
    content: contentUtf8,
    encoding: 'utf-8',
  })

  // 4. tree
  const tree = await gh(token, 'POST', `/repos/${owner}/${repo}/git/trees`, {
    base_tree: baseTreeSha,
    tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }],
  })

  // 5. commit
  const newCommit = await gh(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
    message,
    tree: tree.sha,
    parents: [headSha],
  })

  // 6. fast-forward ref update
  await gh(token, 'PATCH', `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    sha: newCommit.sha,
    force: false,
  })
}

export async function deployConfigToGitHub(config, { owner, repo, branch, token }) {
  const content = generateConfigJS(config)
  const maxRetries = 3

  for (let i = 0; i < maxRetries; i++) {
    try {
      await pushFileCommit(token, owner, repo, branch, 'public/customer/config.js', content, '管理画面から設定を更新')
      return
    } catch (err) {
      if ((err.status === 409 || err.status === 422) && i < maxRetries - 1) continue
      const detail = err.data ? JSON.stringify(err.data, null, 2) : 'なし'
      if (err.status === 401) throw new Error('認証エラー: トークンが無効です')
      if (err.status === 403) throw new Error('権限エラー: トークンに Contents の書き込み権限（Read and write）がありません。トークンを再作成してください')
      if (err.status === 404) throw new Error('リポジトリまたはブランチが見つかりません')
      throw new Error(`デプロイエラー: ${err.message}\n\n詳細:\n${detail}`)
    }
  }

  throw new Error('デプロイ失敗: ブランチが高速で更新されています。しばらく待ってから再試行してください')
}

// GitHubから最新のconfig.jsを取得
export async function fetchConfigFromGitHub({ owner, repo, branch, token }) {
  const data = await gh(token, 'GET',
    `/repos/${owner}/${repo}/contents/public/customer/config.js?ref=${encodeURIComponent(branch)}`)
  const content = decodeURIComponent(escape(atob(data.content)))
  return importConfigFromText(content)
}
