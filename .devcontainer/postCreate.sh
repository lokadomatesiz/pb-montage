#!/usr/bin/env bash
# postCreate.sh — установка окружения канала 2 в Codespace (4 ядра / 16 ГБ). Выполняется один раз при создании.
# Ставит: ffmpeg, Node-зависимости Remotion (npm ci), Python-venv (numpy, soundfile), whisper.cpp + модель small, rclone, video-tools.
# НЕ кладёт: конфиг rclone (копируется с ПК командой `gh codespace cp`, права 600), материалы и шрифты (берутся с Диска при запуске шага).
# Тайм-аут простоя 10 минут задаётся при создании Codespace (`--idle-timeout 10m`) — см. tools/cloud/README.md.
set -uo pipefail
T0=$(date +%s)
RCLONE_V="v1.76.0"
WHISPER_TAG="v1.9.5"
LOG="$HOME/postCreate.log"
exec > >(tee -a "$LOG") 2>&1
step() { echo "[$(( $(date +%s) - T0 )) с] $*"; }

step "apt: ffmpeg, сборка, зависимости Chromium для Remotion"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq --no-install-recommends \
  ffmpeg python3-venv python3-pip cmake build-essential unzip curl jq libsndfile1 \
  libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2t64 libxrandr2 libxkbcommon-x11-0 \
  libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libcups2 libpango-1.0-0 libcairo2 fonts-liberation

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# --- параллельно: npm, venv, rclone, video-tools, whisper.cpp ---
# ждём ТОЛЬКО свои задачи по PID: голый `wait` зависает на tee из exec > >(tee …)
PIDS=()
( cd "$REPO_DIR" && npm ci --no-audit --no-fund --loglevel=error && step "npm ci готово" ) &
PIDS+=($!)
( python3 -m venv "$HOME/venv" && "$HOME/venv/bin/pip" install -q numpy soundfile && step "venv готово" ) &
PIDS+=($!)
(
  curl -fsSL "https://downloads.rclone.org/$RCLONE_V/rclone-$RCLONE_V-linux-amd64.zip" -o /tmp/rclone.zip \
    && unzip -q -o /tmp/rclone.zip -d /tmp/rclone-x && sudo install -m 755 /tmp/rclone-x/rclone-*/rclone /usr/local/bin/rclone \
    && mkdir -p "$HOME/.config/rclone" && step "rclone $(rclone version | head -1)"
) &
PIDS+=($!)
(
  GIT_TERMINAL_PROMPT=0 git clone -q https://github.com/lokadomatesiz/video-tools "$HOME/video-tools" \
    && step "video-tools клонирован" || echo "!!! video-tools не склонирован (нет прав?) — cloud_run.sh с ПК положит копию сам (gh codespace cp)"
) &
PIDS+=($!)
(
  git clone -q --depth 1 --branch "$WHISPER_TAG" https://github.com/ggml-org/whisper.cpp "$HOME/whisper.cpp" \
    && cd "$HOME/whisper.cpp" && cmake -B build -DCMAKE_BUILD_TYPE=Release >/dev/null \
    && cmake --build build -j4 --target whisper-cli >/dev/null \
    && bash models/download-ggml-model.sh small >/dev/null \
    && step "whisper.cpp $WHISPER_TAG + модель small готовы" || echo "!!! whisper.cpp не собран"
) &
PIDS+=($!)
wait "${PIDS[@]}"

# PATH для whisper и venv
grep -q 'whisper.cpp/build/bin' "$HOME/.bashrc" 2>/dev/null || echo 'export PATH="$HOME/whisper.cpp/build/bin:$HOME/venv/bin:$PATH"' >> "$HOME/.bashrc"
step "ГОТОВО. Дальше: gh codespace cp rclone.conf (права 600) — см. tools/cloud/README.md"
