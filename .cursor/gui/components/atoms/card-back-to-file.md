# Back to File / Current preview

Строка возврата к текущему превью файла. Figma: `Atom  / Cards / Back to file` (двойной пробел).

Figma: [Atom / Cards / Back to file](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4279-11427) (`4279:11427`).  
Код: `BackToFileRow`.

Ширина 277 px. Ряд: иконка **20×20** `file-check-2` (экспорт Figma) + текст `Current preview`, Inter Semi Bold 14/20 `#09090b`, gap 8.

Рамка / заливка — у родителя [SidebarCard](../items/sidebar-card.md), не у атома. Состояния оболочки — [file-view](../../panels/file-view.md): Selected dashed (есть история, смотрим workdir) или Disable dashed (History Null). Не рисовать вторую подложку внутри атома.

Нет hover-набора у строки. Клик — колбэк панели: из File View → [project-browse](../../views/project-browse.md) текущей папки; из History of File — сброс выбранного коммита.

Не вызывать API.

---

## Запрещено

- Подпись «Back» / «← File», если макет говорит `Current preview`.
- Lucide `FileCheck` при несовпадении глифа.
