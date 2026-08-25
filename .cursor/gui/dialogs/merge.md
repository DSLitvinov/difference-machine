# Dialog / Merge

Figma: [Dialog / Merge](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4158-7621) (`4158:7621`).  
Код: `MergeDialog`. Property: `step`.

| step | Node | |
|------|------|--|
| select branch | [`6036:12554`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6036-12554) (`4039:1093`) | 796×232. Cancel / **Next** |
| view objects | [`6036:12590`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6036-12590) (`4158:7622`) | 796×374. Cancel / **Merge** |
| wait | нет кадра в variant-set | тот же shell 796; заголовок + автор; текст «подождите»; без footer; close disabled |

Заготовки: `Components / Dialog / Merge` (`4039:1041`) — внутренние states `View Objects` / `Select Branch`, не отдельный продукт.

На view objects: [ObjectStatusBadge](../components/badge-object-status.md) если объекты есть; иначе «Objects not detected». Бейджи статуса файла в этом кадре выключены.

Последовательность:

1. Next на select branch **не** вызывает `merge.start`. Показать view objects.
2. Файлы до старта: `diff.name_status` (`from`: `HEAD`, `to`: `commit_hash` выбранной ветки). Объекты выбранного `.blend`: `object.list_by_file` (`commit_hash` = хеш вливаемой ветки).
3. Merge → step wait (дать кадру отрисоваться), затем `merge.start`. Forester запускает `merge_apply_background.py` в background Blender по тегам MERGE/DELETE/RENAME. Теги ищутся по всем commit-манифестам файла, не только HEAD. Fast-forward после checkout тоже прогоняет скрипт. Если диалог открыт по `in_progress` (баннер) — сразу view objects, Merge → wait → `merge.continue`.
4. Успех без `in_progress` — закрыть. Конфликты или ошибка — вернуться на view objects. Abort — `merge.abort`.
