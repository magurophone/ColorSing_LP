#!/bin/bash
# =============================================================================
# 既存顧客リポジトリを public/customer/ 構造に一括移行するスクリプト
#
# 使い方:
#   bash scripts/migrate-to-customer-dir.sh
#
# 対象: customers.json に登録された全リポジトリ
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CUSTOMERS_FILE="$TEMPLATE_DIR/customers.json"
WORK_DIR=$(mktemp -d)

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[FAIL]${NC} $1"; }

if ! command -v jq &> /dev/null; then
  error "jq が必要です: https://jqlang.github.io/jq/download/"
  exit 1
fi

ORG=$(jq -r '.org' "$CUSTOMERS_FILE")
REPOS=$(jq -r '.repos[]' "$CUSTOMERS_FILE")

echo "========================================"
echo " public/customer/ 移行スクリプト"
echo " Organization: $ORG"
echo "========================================"

SUCCESS=0; SKIPPED=0; FAILED=0

for repo in $REPOS; do
  echo "--- $repo ---"
  REPO_DIR="$WORK_DIR/$repo"

  if ! git clone "https://github.com/$ORG/$repo.git" "$REPO_DIR" 2>/dev/null; then
    error "$repo: クローン失敗"; FAILED=$((FAILED+1)); continue
  fi

  cd "$REPO_DIR"

  # すでに移行済みならスキップ
  if [ -d "public/customer" ] && [ ! -f "public/config.js" ]; then
    warn "$repo: 移行済みのためスキップ"; SKIPPED=$((SKIPPED+1))
    cd "$TEMPLATE_DIR"; continue
  fi

  mkdir -p public/customer

  # config.js を移動（画像パスを更新しながら）
  if [ -f "public/config.js" ]; then
    sed 's|"./header\.png"|"./customer/header.png"|g;
         s|"./header-mobile\.png"|"./customer/header-mobile.png"|g;
         s|"./vite\.svg"|"./customer/vite.svg"|g' \
      public/config.js > public/customer/config.js
    git rm public/config.js
    git add public/customer/config.js
  fi

  # 画像ファイルを移動
  for img in header.png header-mobile.png vite.svg; do
    if [ -f "public/$img" ]; then
      cp "public/$img" "public/customer/$img"
      git rm "public/$img"
      git add "public/customer/$img"
    fi
  done

  # その他の画像拡張子も対象
  for ext in jpg jpeg gif webp ico; do
    for f in public/*."$ext"; do
      [ -f "$f" ] || continue
      fname=$(basename "$f")
      cp "$f" "public/customer/$fname"
      git rm "$f"
      git add "public/customer/$fname"
    done
  done

  git commit -m "migrate: public/customer/ 構造に移行"

  if git push origin main 2>/dev/null; then
    log "$repo: 移行完了"
    SUCCESS=$((SUCCESS+1))
  else
    error "$repo: プッシュ失敗"; FAILED=$((FAILED+1))
  fi

  cd "$TEMPLATE_DIR"
done

rm -rf "$WORK_DIR"

echo ""
echo "========================================"
echo " 結果: 成功=$SUCCESS  スキップ=$SKIPPED  失敗=$FAILED"
echo "========================================"
[ $FAILED -gt 0 ] && exit 1 || exit 0
