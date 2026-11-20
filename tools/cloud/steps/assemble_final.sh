#!/usr/bin/env bash
# Склейка частей финала со звуком-мастером (без перекодирования видео). Использование: bash tools/cloud/steps/assemble_final.sh <число частей>
# Ожидает на Диске: pb-cloud/_out/<ролик>/final/_parts/part0..N-1.mp4 (их кладут задания рендера) и pb-cloud/<ролик>/_final-in/master.m4a (мастер −14 LUFS, готовится заранее).
set -euo pipefail
N=${1:?число частей}
mkdir -p out/parts
rclone copy "gdrive_in:${OUT_DIR:-pb-cloud/_out/ch2-03-valdivia/final}/_parts" out/parts --stats-one-line
rclone copyto "gdrive_in:${VIDEO_DIR:-pb-cloud/ch2-03-valdivia}/_final-in/master.m4a" out/master.m4a
: > out/list.txt
for i in $(seq 0 $((N-1))); do
  [ -s "out/parts/part$i.mp4" ] || { echo "нет части $i"; exit 1; }
  echo "file 'parts/part$i.mp4'" >> out/list.txt
done
ffmpeg -v error -y -f concat -safe 0 -i out/list.txt -i out/master.m4a -c:v copy -c:a copy -shortest -movflags +faststart out/CH2-03-final.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 out/CH2-03-final.mp4
