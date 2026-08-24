# Panel / File view

Левая колонка **истории файла** (не проекта). Экраны: [../views/file-preview.md](../views/file-preview.md), [../views/file-history.md](../views/file-history.md).

Figma: [Panel / File view](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-7530) (`4309:7530`).  
Код: `FileViewPanel`. 309×720.

---

## Слоты

1. Header Select Branch 64.
2. Item / Card 285×44 — [BackToFileRow](../components/atoms/card-back-to-file.md).
3. Заголовок секции (текст в Content 24 px) — copy из Figma.
4. Commit List: карточки [CommitFileCard](../components/atoms/card-commit-file.md).
5. Header Settings снизу.

Вариант **File view - History Null** (`4309:9019`): [NoHistoryFile](../components/atoms/card-no-history-file.md).

`log.get` с `path`. Не дерево workdir. Список виртуализировать; `diff.stat` карточки — visible + overscan ([revision-cache.md](../gui_frontend/revision-cache.md)).
