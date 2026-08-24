# Back to File / Current preview

Строка возврата к текущему превью файла. Figma: `Atom  / Cards / Back to file` (двойной пробел).

Figma: [Atom / Cards / Back to file](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4279-11427) (`4279:11427`).  
Код: `BackToFileRow`.

Ширина 277 px. Ряд: иконка **20×20** `file-check-2` (экспорт Figma) + текст `Current preview`, Inter Semi Bold 14/20 `#09090b`, gap 8.

Нет hover-набора. Если кликабельно — ghost row без выдуманной подложки, либо как list Default.

Не вызывать API. Колбэк панели сбрасывает выбор коммита в истории файла.

---

## Запрещено

- Подпись «Back» / «← File», если макет говорит `Current preview`.
- Lucide `FileCheck` при несовпадении глифа.
