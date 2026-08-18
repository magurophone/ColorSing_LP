#!/bin/bash
# =============================================================================
# テンプレート → 全顧客リポジトリ 一括同期スクリプト（allowlist方式）
#
# 使い方:
#   bash scripts/sync-all.sh --dry-run     # 変更内容だけ出す。push しない
#   bash scripts/sync-all.sh               # 実際に同期して push する
#   bash scripts/sync-all.sh --branch main # テンプレート側のブランチ指定
#   bash scripts/sync-all.sh --only magurophone --dry-run  # 1顧客だけ
#
# 配布の考え方:
#   scripts/sync-allowlist.txt に書いたものだけを配る。書いていないものは配らない。
#   「全部配って一部を除外する」形にはしない。内部ファイルを1つ増やしただけで
#   全顧客のPUBLIC repoへ漏れる構造にしないためである。
#
#   中央サービス専用（products / start / signup / fanpage-create / onboarding）と
#   開発運用専用（tests / docs / HANDOVER.md 等）は allowlist に載せない。
#   未接続のprovisioning導線を「リンクしていないから問題ない」として配らない。
#
#   public/customer/ と .github/ は allowlist に載せない。したがって同期では
#   一切触らない。顧客の config.js・画像・deploy.yml はそのまま残る。
#
#   分類の根拠は docs/productization/distribution-boundary.md。
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CUSTOMERS_FILE="$TEMPLATE_DIR/customers.json"
ALLOWLIST_FILE="$SCRIPT_DIR/sync-allowlist.txt"
WORK_DIR=$(mktemp -d)
TEMPLATE_BRANCH="main"
DRY_RUN=0
ONLY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --branch)  TEMPLATE_BRANCH="$2"; shift 2 ;;
    --only)    ONLY="$2"; shift 2 ;;
    *)         TEMPLATE_BRANCH="$1"; shift ;;
  esac
done

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;36m'; NC='\033[0m'
log()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[FAIL]${NC} $1"; }
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }

[ -f "$CUSTOMERS_FILE" ]  || { error "customers.json が見つかりません: $CUSTOMERS_FILE"; exit 1; }
[ -f "$ALLOWLIST_FILE" ] || { error "allowlist が見つかりません: $ALLOWLIST_FILE"; exit 1; }

if command -v jq &> /dev/null; then
  ORG=$(jq -r '.org' "$CUSTOMERS_FILE")
  REPOS=$(jq -r '.repos[]' "$CUSTOMERS_FILE")
elif command -v node &> /dev/null; then
  ORG=$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).org))" < "$CUSTOMERS_FILE" | tr -d '\r')
  REPOS=$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d).repos.forEach(r=>console.log(r)))" < "$CUSTOMERS_FILE" | tr -d '\r')
else
  error "jq または node が必要です"; exit 1
fi

[ -n "$REPOS" ] || { warn "customers.json に顧客リポジトリが登録されていません"; exit 0; }

# --only: 1顧客だけへ適用する。新しい配布方式は、まず1件で実証してから広げる。
if [ -n "$ONLY" ]; then
  if ! echo "$REPOS" | grep -qFx "$ONLY"; then
    error "--only $ONLY は customers.json にありません"
    exit 1
  fi
  REPOS="$ONLY"
fi

# allowlist を読む（空行と # を捨てる）
ALLOW_ENTRIES=$(grep -vE '^\s*(#|$)' "$ALLOWLIST_FILE" | sed 's/[[:space:]]*$//')

# テンプレートの該当ブランチに実在するファイルへ展開する
TEMPLATE_FILES=$(git -C "$TEMPLATE_DIR" ls-tree -r --name-only "$TEMPLATE_BRANCH")
ALLOWED_FILES=$(
  while IFS= read -r entry; do
    [ -n "$entry" ] || continue
    case "$entry" in
      */) echo "$TEMPLATE_FILES" | grep -E "^$(echo "$entry" | sed 's/[.[\*^$]/\\&/g')" || true ;;
      *)  echo "$TEMPLATE_FILES" | grep -Fx "$entry" || true ;;
    esac
  done <<< "$ALLOW_ENTRIES" | sort -u
)

# allowlist に書いたのにテンプレートに無いものは、書き間違いとして止める
MISSING=""
while IFS= read -r entry; do
  [ -n "$entry" ] || continue
  case "$entry" in
    */) echo "$TEMPLATE_FILES" | grep -qE "^$(echo "$entry" | sed 's/[.[\*^$]/\\&/g')" || MISSING="$MISSING $entry" ;;
    *)  echo "$TEMPLATE_FILES" | grep -qFx "$entry" || MISSING="$MISSING $entry" ;;
  esac
done <<< "$ALLOW_ENTRIES"
if [ -n "$MISSING" ]; then
  error "allowlist にテンプレート側で存在しない項目があります:$MISSING"
  exit 1
fi

# 公開URL契約で維持しなければならない entry point
PROTECTED_HTML="index.html admin.html manual.html setup.html promotion.html features.html monitor.html"

ALLOWED_COUNT=$(echo "$ALLOWED_FILES" | grep -c . || true)
echo "========================================"
echo " テンプレート同期（allowlist方式）"
echo " Organization : $ORG"
echo " ブランチ     : $TEMPLATE_BRANCH"
echo " 配布ファイル : ${ALLOWED_COUNT} 件"
[ "$DRY_RUN" = "1" ] && echo -e " モード       : ${YELLOW}DRY-RUN（push しない）${NC}"
echo "========================================"
echo ""

SUCCESS=0; FAILED=0; SKIPPED=0

for repo in $REPOS; do
  echo "--- $repo ---"
  REPO_DIR="$WORK_DIR/$repo"

  if ! git clone --quiet "https://github.com/$ORG/$repo.git" "$REPO_DIR" 2>/dev/null; then
    error "$repo: クローン失敗（存在しないか、アクセス権がありません）"
    FAILED=$((FAILED + 1)); continue
  fi

  cd "$REPO_DIR"

  # 同期前の public/customer/ を記録する。触っていないことを後で確かめる。
  CUSTOMER_BEFORE=$(git ls-tree -r --name-only HEAD -- public/customer 2>/dev/null | while IFS= read -r f; do
    [ -n "$f" ] && echo "$f $(git hash-object "$f" 2>/dev/null || echo MISSING)"
  done)

  git remote add template "$TEMPLATE_DIR"
  git fetch --quiet template "$TEMPLATE_BRANCH" 2>/dev/null

  # allowlist のファイルだけをテンプレートから取り出す
  echo "$ALLOWED_FILES" | while IFS= read -r f; do
    [ -n "$f" ] && echo "$f"
  done > "$WORK_DIR/${repo}_allow.txt"

  git checkout "template/$TEMPLATE_BRANCH" -- $(tr '\n' ' ' < "$WORK_DIR/${repo}_allow.txt") 2>/dev/null || {
    error "$repo: allowlist ファイルの取り出しに失敗"
    FAILED=$((FAILED + 1)); cd "$TEMPLATE_DIR"; continue
  }

  ADDED=$(git diff --cached --name-only --diff-filter=A)
  MODIFIED=$(git diff --cached --name-only --diff-filter=M)

  # 配布対象外なのに顧客リポに存在するもの＝過去の全体マージで入ったもの。
  # 自動では消さない。判断のために候補として出すだけにする。
  TRACKED=$(git ls-tree -r --name-only HEAD)
  DELETE_CANDIDATES=$(comm -23 \
    <(echo "$TRACKED" | grep -vE '^(public/customer/|\.github/)' | sort) \
    <(sort "$WORK_DIR/${repo}_allow.txt"))

  # public/customer/ が変わっていないことを確認する
  CUSTOMER_AFTER=$(git ls-tree -r --name-only HEAD -- public/customer 2>/dev/null | while IFS= read -r f; do
    [ -n "$f" ] && echo "$f $(git hash-object "$f" 2>/dev/null || echo MISSING)"
  done)
  if [ "$CUSTOMER_BEFORE" = "$CUSTOMER_AFTER" ]; then
    CUSTOMER_STATE="保持"
  else
    CUSTOMER_STATE="変化あり（異常）"
  fi

  # 保護URLのHTMLが揃っているか
  MISSING_PROTECTED=""
  for h in $PROTECTED_HTML; do
    [ -f "$h" ] || MISSING_PROTECTED="$MISSING_PROTECTED $h"
  done

  echo "  新規追加       : $(echo "$ADDED"    | grep -c . || true) 件"
  echo "$ADDED"    | grep . | sed 's/^/                   + /' || true
  echo "  更新           : $(echo "$MODIFIED" | grep -c . || true) 件"
  echo "$MODIFIED" | grep . | sed 's/^/                   ~ /' || true
  echo "  削除候補       : $(echo "$DELETE_CANDIDATES" | grep -c . || true) 件（自動削除しない）"
  echo "$DELETE_CANDIDATES" | grep . | sed 's/^/                   ? /' || true
  echo "  public/customer: $CUSTOMER_STATE"
  if [ -n "$MISSING_PROTECTED" ]; then
    error "  保護URL不足    :$MISSING_PROTECTED"
  else
    echo "  保護URL        : 7件すべて存在"
  fi

  if [ "$CUSTOMER_STATE" != "保持" ] || [ -n "$MISSING_PROTECTED" ]; then
    error "$repo: 安全条件を満たさないため中断"
    FAILED=$((FAILED + 1)); cd "$TEMPLATE_DIR"; continue
  fi

  if [ "$DRY_RUN" = "1" ]; then
    info "$repo: dry-run のため commit / push しない"
    SKIPPED=$((SKIPPED + 1)); cd "$TEMPLATE_DIR"; continue
  fi

  if git diff --cached --quiet; then
    warn "$repo: 変更なし（スキップ）"
    SKIPPED=$((SKIPPED + 1)); cd "$TEMPLATE_DIR"; continue
  fi

  git commit --quiet -m "テンプレート同期: $(git -C "$TEMPLATE_DIR" log -1 --pretty=%s "$TEMPLATE_BRANCH")"
  if git push --quiet origin HEAD:main 2>/dev/null; then
    log "$repo: 同期して push した"
    SUCCESS=$((SUCCESS + 1))
  else
    error "$repo: push 失敗"
    FAILED=$((FAILED + 1))
  fi

  cd "$TEMPLATE_DIR"
done

echo ""
echo "========================================"
echo " 成功 $SUCCESS / 失敗 $FAILED / スキップ $SKIPPED"
echo "========================================"
rm -rf "$WORK_DIR"
[ "$FAILED" -eq 0 ]
