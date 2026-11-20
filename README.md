# pb-montage

Код монтажа канала «Pueblos Borrados» (Remotion 4). **Публичный репозиторий — здесь нет ни одного медиафайла, шрифта, озвучки, субтитров и ключей.**
Материалы, озвучка, музыка, шрифты и рендеры живут на Google Диске (`pb-cloud/`); токены — только в Codespace.

- `src/` — композиции и элементы (токены, субтитры, карты, графика)
- `scripts/` — сборка раскладки, озвучки, музыки, мастер-звука
- `.devcontainer/` — Codespace (4 ядра): Node, Remotion, ffmpeg, Python-venv, whisper.cpp, rclone
- `tools/cloud/` — запуск облачных шагов (`cloud_run.sh`), проверка перед push (`check_public.sh`), README
- общие проверки (`preflight`, `viewer_check`, `sync_check`, `loudness`, `upload_lint`) — в отдельном репозитории `video-tools`

Установка: `npm ci`, затем `npm run dev` (Studio) или `npm run lint` (tsc). Подробности облака — `tools/cloud/README.md`.
