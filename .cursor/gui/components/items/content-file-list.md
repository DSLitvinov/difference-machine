# Content File list

Список файлов коммита (не workdir tree).

Figma: [Content / File list](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-11329) (`4272:11329`).  
Код: `CommitFileList`. 342×124 в наборе. На [Panel / Content View / History of File](https://www.figma.com/design/UdzVpYkngLCGzVXFWwq8TJ/Difference-MAchine?node-id=4322-4561) (`4322:4561`): колонка с padding 16, список шириной 276, справа separator.

Строки: [CommitFileItem](../atoms/commit-file-item.md). Данные: один `diff.name_status` на выбранный hash (memory). Item не вызывает `diff.text` / `blob.get` — payload только у выбранной строки ([revision-cache.md](../../gui_frontend/revision-cache.md)). Длинный список — virtualizer. Empty: [placeholders/diff-file-list](../placeholders/diff-file-list.md).
