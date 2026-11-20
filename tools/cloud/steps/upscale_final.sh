#!/usr/bin/env bash
# CH2-03 · финал 1080p: кадры и клипы из public/ch2-03 → public/ch2-03-final (оригиналы не трогаем).
# Кадры (< 1920 по ширине): Lanczos до 2560 по длинной стороне (портрет — 1600 по высоте) + лёгкая резкость, PNG. Клипы Veo 1280×720: Lanczos до 1920×1080 + резкость, h264 crf 12.
# P01, P08, S01 (≥ 1920) копируются как есть. ИИ-апскейл (Real-ESRGAN, Kaggle) подставляется в public/ch2-03-final позже, если успеет.
# Использование: bash tools/cloud/steps/upscale_final.sh   (из корня pb-montage; нужен public/ch2-03/props.json от ch203-build.mjs)
set -euo pipefail
SRC=public/ch2-03; DST=public/ch2-03-final
mkdir -p "$DST/sfx"
cp "$SRC/vo.mp3" "$DST/vo.mp3"; cp -r "$SRC/sfx/." "$DST/sfx/"
FILES=$(node -e '
const p=JSON.parse(require("fs").readFileSync("public/ch2-03/props.json","utf8"));const s=new Set();
const w=o=>{if(Array.isArray(o))o.forEach(w);else if(o&&typeof o==="object")for(const [k,v] of Object.entries(o)){if((k==="src"||k==="bg")&&typeof v==="string"&&/\.(webp|png|jpg|jpeg|mp4)$/i.test(v))s.add(v);else w(v)}};
w(p.clips);w(p.overlays);console.log([...s].join("\n"))')
n=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  base="${f%.*}"; ext="${f##*.}"
  if [ "$ext" = "mp4" ]; then
    [ -s "$DST/$f" ] || ffmpeg -nostdin -v error -y -i "$SRC/$f" -an -vf "scale=1920:1080:flags=lanczos,unsharp=5:5:0.6:5:5:0.0" -c:v libx264 -preset medium -crf 12 -g 15 -pix_fmt yuv420p "$DST/$f"
  elif [[ "$f" =~ ^(P01|P08|S01)\. ]]; then
    cp "$SRC/$f" "$DST/$f"
  else
    [ -s "$DST/$base.png" ] && continue
    dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$SRC/$f")
    w=${dims%,*}; h=${dims#*,}
    if [ "$w" -ge "$h" ]; then vf="scale=2560:-2:flags=lanczos"; else vf="scale=-2:1600:flags=lanczos"; fi
    ffmpeg -nostdin -v error -y -i "$SRC/$f" -vf "$vf,unsharp=5:5:0.5:5:5:0.0" "$DST/$base.png"
  fi
  n=$((n+1))
done <<< "$FILES"
echo "обработано файлов: $n"
