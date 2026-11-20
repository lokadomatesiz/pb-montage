# Облако канала «Pueblos Borrados» (Codespace + Google Диск)

Репозиторий **публичный**: только код. Материалы, озвучка, музыка, шрифты, рендеры — на Диске (`pb-cloud/`), токены — только в Codespace (`~/.config/rclone/rclone.conf`, права 600).
Перед каждым push: `bash tools/cloud/check_public.sh` (hook `pre-push` вызывает его сам: `bash tools/cloud/check_public.sh --install-hook`).

## Диск
```
pb-cloud/
  <ролик>/            материалы (кладёт автор через зеркало D:), MANIFEST.txt — необязательный список файлов
  _brand/             шрифты и зерно канала (public/_brand) — подтягиваются в Codespace
  _out/<ролик>/review-N/   результаты шагов (кладёт cloud_run), финал — _out/<ролик>/final/
  _archive/
```
Доступ — общий с каналом 1: `gdrive_in` (чтение), `gdrive_out` (запись, `drive.file`).

## Создание Codespace (один раз)
```
gh codespace create --repo lokadomatesiz/pb-montage --machine standardLinux32gb --idle-timeout 10m --default-permissions
```
Конфиг rclone (только секции `gdrive_in` и `gdrive_out`) — на сервер, права 600:
```
gh codespace cp -c <имя> -e <локальный rclone.conf из двух секций> remote:~/.config/rclone/rclone.conf
gh codespace ssh -c <имя> -- chmod 600 ~/.config/rclone/rclone.conf
```
Имя Codespace можно записать в `tools/cloud/.codespace-name` (в `.gitignore`).

## Запуск шага
```
bash tools/cloud/cloud_run.sh ch2-01 preflight
bash tools/cloud/cloud_run.sh ch2-01 lint
```
Сводка ≤ 30 строк; полный отчёт — на Диске в `pb-cloud/_out/<ролик>/review-N/`. Codespace останавливается всегда (trap) + тайм-аут простоя 10 мин.
Расход: ≈ время сеанса × 4 ядра; на запуск/остановку закладывать +0,3 core-ч; стоп-порог — 1,0 core-ч на задачу (дальше — вопрос автору).

## Свои шаги
`tools/cloud/steps/<шаг>.sh` — получает `MAT` (материалы), `REV` (куда класть результат), `CLIP`, `REPO_DIR`, `VT` (video-tools); stdout → сводка.
Шаги `render*` перед работой выполняют `bash tools/cloud/pull_brand.sh` (шрифты и зерно с Диска в `public/_brand`). **Финальный рендер — только по команде автора «рендери».**

## Данные сборки на Диске (не в репозитории)
`scripts/long-board.json` (раскладка длинного ролика, цитаты озвучки) в репозитории не хранится — лежит в `pb-cloud/<ролик>/long-board.json` (для CH2-01 — `pb-cloud/ch2-01/long-board.json`). Перед `node scripts/long-build.mjs`: `rclone copyto gdrive_in:pb-cloud/ch2-01/long-board.json scripts/long-board.json`. Файл в `.gitignore`.
