#!/usr/bin/env bash
# cloud_run.sh <ролик> <шаг> [аргументы шага…] — запуск облачного шага канала 2 С ПК (Git Bash / WSL, нужен `gh`).
# Цепочка: старт Codespace (gh codespace ssh поднимает сам) → манифест → скачивание из pb-cloud/<ролик>/ → шаг →
#          выгрузка в pb-cloud/_out/<ролик>/review-N/ → сводка ≤ 30 строк → ОСТАНОВКА Codespace (всегда, даже при ошибке).
# Шаги: preflight | lint | viewer [файл] | loudness [файл] | sync <мастер> [файл] | свой из tools/cloud/steps/<шаг>.sh
# Пример: bash tools/cloud/cloud_run.sh ch2-01 preflight
# Какой Codespace: $PB_CODESPACE, иначе файл tools/cloud/.codespace-name, иначе первый Codespace репозитория.
set -uo pipefail
REPO="lokadomatesiz/pb-montage"
CLIP="${1:?usage: cloud_run.sh <ролик> <шаг> [аргументы]}"; STEP="${2:?usage: cloud_run.sh <ролик> <шаг> [аргументы]}"; shift 2
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CS="${PB_CODESPACE:-}"
[ -z "$CS" ] && [ -f "$HERE/.codespace-name" ] && CS="$(tr -d '\r\n' < "$HERE/.codespace-name")"
[ -z "$CS" ] && CS="$(gh codespace list --repo "$REPO" --json name -q '.[0].name' 2>/dev/null | tr -d '\r')"
[ -n "$CS" ] || { echo "Нет Codespace репозитория $REPO — создать: см. tools/cloud/README.md"; exit 2; }

STOPPED=0
stop_cs() {
  [ "$STOPPED" = 1 ] && return; STOPPED=1
  if gh codespace stop -c "$CS" >/dev/null 2>&1; then echo "Codespace остановлен: $CS"
  else echo "!!! НЕ УДАЛОСЬ остановить $CS — остановить вручную: gh codespace stop -c $CS"; fi
}
trap stop_cs EXIT
trap 'exit 130' INT TERM

args=""; for x in "$@"; do args="$args '${x//\'/}'"; done
T0=$(date +%s)
gh codespace ssh -c "$CS" -- "cd /workspaces/pb-montage && { git pull -q --ff-only 2>/dev/null; git -C \$HOME/video-tools pull -q --ff-only 2>/dev/null; true; } && REPO_DIR=/workspaces/pb-montage bash \$HOME/video-tools/cloud/remote_run.sh '${CLIP//\'/}' '${STEP//\'/}'$args"
rc=$?
dt=$(( $(date +%s) - T0 ))
# оценка расхода квоты: 4 ядра × время сеанса + 0,3 на запуск/остановку (правило из уроков канала 1)
awk -v s="$dt" 'BEGIN{printf "ssh-сеанс: %d с ≈ %.2f core-ч (+0,3 на запуск/остановку)\n", s, s*4/3600}'
echo "$(date -Iseconds),$CLIP,$STEP,$dt,$rc" >> "$HERE/usage.csv"
exit $rc
