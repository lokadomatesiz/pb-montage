#!/usr/bin/env bash
# align.sh — слова озвучки через whisper.cpp (small, es), по одному JSON на файл главы: $REV/words/<имя>.json
# Вход: $MAT/vo-raw/*.mp3 (главы озвучки). Выход — слово = одна запись с offsets в мс (-ml 1 -sow).
set -euo pipefail
WH="$HOME/whisper.cpp"; BIN="$WH/build/bin/whisper-cli"; MODEL="$WH/models/ggml-small.bin"
[ -x "$BIN" ] && [ -f "$MODEL" ] || { echo "нет whisper-cli / модели small"; exit 2; }
export LD_LIBRARY_PATH="$WH/build/bin:${LD_LIBRARY_PATH:-}"
mkdir -p "$REV/words" /tmp/wav
for f in "$MAT"/vo-raw/*.mp3; do
  n=$(basename "$f" .mp3)
  ffmpeg -v error -y -i "$f" -ar 16000 -ac 1 "/tmp/wav/$n.wav"
  "$BIN" -m "$MODEL" -l es -ml 1 -sow -oj -of "$REV/words/$n" -f "/tmp/wav/$n.wav" -t 4 >/dev/null 2>&1 || echo "!!! whisper упал на $n"
  k=$(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1]))['transcription']))" "$REV/words/$n.json" 2>/dev/null || echo 0)
  echo "$n: записей $k"
done
