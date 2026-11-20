#!/usr/bin/env bash
# pull_brand.sh — шрифты и зерно канала с Диска (pb-cloud/_brand) в public/_brand. Репозиторий их не хранит.
set -euo pipefail
REPO_DIR="${REPO_DIR:-$(git rev-parse --show-toplevel)}"
. "$REPO_DIR/tools/cloud/cloud.conf"
mkdir -p "$REPO_DIR/public/_brand"
rclone copy "$IN_REMOTE:$CLOUD_DIR/_brand" "$REPO_DIR/public/_brand" -q
ls "$REPO_DIR/public/_brand/fonts" | sed 's/^/шрифт: /'
