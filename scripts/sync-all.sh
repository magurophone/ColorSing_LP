#!/bin/bash
# =============================================================================
# テンプレート → 全顧客リポジトリ 一括同期スクリプト
#
# 使い方:
#   1. テンプレートリポジトリのルートで実行
#   2. customers.json に顧客リポ名を追加しておく
#
#   bash scripts/sync-all.sh
#
# 動作:
#   - 各顧客リポをクローン → テンプレートの最新コードをマージ → プッシュ
#   - public/customer/ は顧客側を常に保持（画像・config.js 等の顧客固有ファイル）
#   - .github/workflows/deploy.yml は顧客側を常に保持（branches: [main] を維持）
#   - public/ 直下の新規ファイルはテンプレートから伝播する（正常な更新）
#   - プッシュにより各顧客リポの GitHub Actions が自動トリガー → ビルド＆デプロイ
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CUSTOMERS_FILE="$TEMPLATE_DIR/customers.json"
WORK_DIR=$(mktemp -d)
TEMPLATE_BRANCH="${1:-main}"

# 色付き出力
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[FAIL]${NC} $1"; }

# customers.json の存在チェック
if [ ! -f "$CUSTOMERS_FILE" ]; then
  error "customers.json が見つかりません: $CUSTOMERS_FILE"
  exit 1
fi

# jq / python / node のいずれかで JSON をパース
if command -v jq &> /dev/null; then
  ORG=$(jq -r '.org' "$CUSTOMERS_FILE")
  REPOS=$(jq -r '.repos[]' "$CUSTOMERS_FILE")
elif command -v python &> /dev/null || command -v python3 &> /dev/null; then
  PY=$(command -v python3 2>/dev/null || command -v python)
  ORG=$("$PY" -c "import json,sys;d=json.load(open(sys.argv[1]));print(d['org'])" "$CUSTOMERS_FILE" | tr -d '\r')
  REPOS=$("$PY" -c "import json,sys;d=json.load(open(sys.argv[1]));print('\n'.join(d['repos']))" "$CUSTOMERS_FILE" | tr -d '\r')
elif command -v node &> /dev/null; then
  ORG=$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).org))" < "$CUSTOMERS_FILE" | tr -d '\r')
  REPOS=$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d).repos.forEach(r=>console.log(r)))" < "$CUSTOMERS_FILE" | tr -d '\r')
else
  error "jq / python / node のいずれかが必要です"
  exit 1
fi

if [ -z "$REPOS" ]; then
  warn "customers.json に顧客リポジトリが登録されていません"
  exit 0
fi

echo "========================================"
echo " テンプレート同期"
echo " Organization: $ORG"
echo " ブランチ: $TEMPLATE_BRANCH"
echo "========================================"
echo ""

SUCCESS=0
FAILED=0
SKIPPED=0

for repo in $REPOS; do
  echo "--- $repo ---"
  REPO_DIR="$WORK_DIR/$repo"
  BACKUP_DIR="$WORK_DIR/${repo}_backup"

  # 1. 顧客リポをクローン
  if ! git clone "https://github.com/$ORG/$repo.git" "$REPO_DIR" 2>/dev/null; then
    error "$repo: クローン失敗（リポジトリが存在しないか、アクセス権がありません）"
    FAILED=$((FAILED + 1))
    continue
  fi

  cd "$REPO_DIR"

  # 2. テンプレートをリモートとして追加
  git remote add template "$TEMPLATE_DIR"
  git fetch template "$TEMPLATE_BRANCH" 2>/dev/null

  # 3. 顧客固有ファイルをバックアップ
  mkdir -p "$BACKUP_DIR"

  # public/customer/（顧客の画像・config.js 等をサンドボックス化）
  if [ -d "public/customer" ]; then
    cp -r public/customer/ "$BACKUP_DIR/customer/"
  fi

  # .github/workflows/deploy.yml（branches: [main] を維持するため）
  if [ -f ".github/workflows/deploy.yml" ]; then
    mkdir -p "$BACKUP_DIR/.github/workflows"
    cp .github/workflows/deploy.yml "$BACKUP_DIR/.github/workflows/deploy.yml"
  fi

  # 4. テンプレートのコードをマージ
  if ! git merge "template/$TEMPLATE_BRANCH" --no-edit -m "テンプレート同期: $(git -C "$TEMPLATE_DIR" log -1 --pretty=%s)" 2>/dev/null; then
    # コンフリクト発生時: public/ と .github/ は顧客側で解消
    CONFLICTED=$(git diff --name-only --diff-filter=U 2>/dev/null || true)

    if [ -n "$CONFLICTED" ]; then
      while IFS= read -r f; do
        case "$f" in
          public/customer/*|.github/*)
            git checkout --ours "$f" 2>/dev/null && git add "$f"
            ;;
        esac
      done <<< "$CONFLICTED"
    fi

    # 残存するコンフリクトがあれば中断
    REMAINING=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
    if [ -n "$REMAINING" ]; then
      error "$repo: コンフリクトが解消できません。手動対応が必要です:"
      echo "$REMAINING"
      git merge --abort
      FAILED=$((FAILED + 1))
      cd "$TEMPLATE_DIR"
      continue
    fi

    git commit --no-edit 2>/dev/null
  fi

  # 5. バックアップから顧客固有ファイルを復元
  # public/customer/（顧客の画像・config.js を元に戻す）
  if [ -d "$BACKUP_DIR/customer" ]; then
    while IFS= read -r -d '' backup_file; do
      rel_path="public/customer/${backup_file#$BACKUP_DIR/customer/}"
      if ! cmp -s "$backup_file" "$rel_path" 2>/dev/null; then
        mkdir -p "$(dirname "$rel_path")"
        cp "$backup_file" "$rel_path"
        git add "$rel_path"
      fi
    done < <(find "$BACKUP_DIR/customer" -type f -print0)
  fi

  # deploy.yml を復元（既存リポジトリのみ: 顧客固有の branches 設定を維持）
  if [ -f "$BACKUP_DIR/.github/workflows/deploy.yml" ]; then
    if ! cmp -s "$BACKUP_DIR/.github/workflows/deploy.yml" ".github/workflows/deploy.yml" 2>/dev/null; then
      cp "$BACKUP_DIR/.github/workflows/deploy.yml" ".github/workflows/deploy.yml"
      git add ".github/workflows/deploy.yml"
    fi
  fi

  # deploy.yml のトリガーブランチを顧客リポ用に強制修正（新規・既存共通）
  # テンプレートは magurophone ブランチをトリガーとするが、顧客リポは常に main
  if [ -f ".github/workflows/deploy.yml" ]; then
    if grep -q 'branches: \[magurophone\]' ".github/workflows/deploy.yml"; then
      sed -i 's/branches: \[magurophone\]/branches: [main]/' ".github/workflows/deploy.yml"
      git add ".github/workflows/deploy.yml"
    fi
  fi

  # 復元した差分をコミット
  if ! git diff --cached --quiet; then
    git commit -m "顧客固有ファイルを復元 (public/customer/, deploy.yml)" 2>/dev/null
  fi

  # 6. 変更があればプッシュ
  if git diff --quiet origin/main..HEAD 2>/dev/null; then
    warn "$repo: 変更なし（スキップ）"
    SKIPPED=$((SKIPPED + 1))
  else
    if git push origin main 2>/dev/null; then
      log "$repo: 同期完了 → GitHub Actions が自動デプロイします"
      SUCCESS=$((SUCCESS + 1))
    else
      error "$repo: プッシュ失敗"
      FAILED=$((FAILED + 1))
    fi
  fi

  cd "$TEMPLATE_DIR"
done

# クリーンアップ
rm -rf "$WORK_DIR"

echo ""
echo "========================================"
echo " 結果: 成功=$SUCCESS  スキップ=$SKIPPED  失敗=$FAILED"
echo "========================================"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
