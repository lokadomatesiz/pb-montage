#!/usr/bin/env bash
# check_public.sh — проверка перед КАЖДЫМ push публичного репозитория: нет медиа, шрифтов, секретов, больших файлов.
# Запускается из .git/hooks/pre-push (установить: bash tools/cloud/check_public.sh --install-hook) и вручную.
# Код возврата 1 — push нельзя.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 2
if [ "${1:-}" = "--install-hook" ]; then
  printf '#!/usr/bin/env bash\nexec bash "$(git rev-parse --show-toplevel)/tools/cloud/check_public.sh"\n' > .git/hooks/pre-push
  chmod +x .git/hooks/pre-push; echo "pre-push hook установлен"; exit 0
fi
bad=0
# что реально уйдёт: все отслеживаемые файлы (из индекса) + то, что в HEAD
files=$( { git ls-files; git ls-tree -r --name-only HEAD 2>/dev/null; } | sort -u )
echo "файлов в репозитории: $(echo "$files" | grep -c .)"

media=$(echo "$files" | grep -iE '\.(mp4|mov|webm|mkv|avi|mp3|wav|flac|m4a|ogg|aac|jpe?g|png|webp|gif|tiff?|psd|ttf|otf|woff2?|srt|vtt|zip|7z|pdf)$' || true)
[ -n "$media" ] && { echo "✘ МЕДИА/шрифты/субтитры/архивы в репозитории:"; echo "$media" | sed 's/^/   /'; bad=1; }

forbidden=$(echo "$files" | grep -E '(^|/)(rclone\.conf|\.env(\..*)?|.*\.(pem|key|token))$|^(out|tmp|work|public|node_modules)/' || true)
[ -n "$forbidden" ] && { echo "✘ запрещённые пути (конфиги, ключи, out/tmp/work/public/node_modules):"; echo "$forbidden" | sed 's/^/   /'; bad=1; }

big=$(echo "$files" | while read -r f; do [ -f "$f" ] && [ "$(wc -c < "$f")" -gt 1048576 ] && echo "$f"; done)
[ -n "$big" ] && { echo "✘ файлы больше 1 МБ:"; echo "$big" | sed 's/^/   /'; bad=1; }

pat='refresh_token|client_secret|"access_token"|gho_[A-Za-z0-9]{20}|ghp_[A-Za-z0-9]{20}|github_pat_|-----BEGIN [A-Z ]*PRIVATE KEY|AIza[0-9A-Za-z_-]{30}|sk-[A-Za-z0-9]{24,}|xi-api-key|^\[gdrive|^token *= *\{'
sec=$(echo "$files" | grep -v '^tools/cloud/check_public.sh$' | while read -r f; do [ -f "$f" ] && grep -InE "$pat" "$f" 2>/dev/null | sed "s#^#$f:#"; done)
[ -n "$sec" ] && { echo "✘ похоже на секрет:"; echo "$sec" | cut -c1-120 | sed 's/^/   /'; bad=1; }

if [ "$bad" = 0 ]; then echo "✔ публичный репозиторий чист: медиа и секретов нет"; else echo "PUSH ЗАПРЕЩЁН"; fi
exit $bad
