# Uncommitted Files Card

Блок «грязная» рабочая копия в сайдбаре проекта. Figma name: `Atom / Cards / Dirrectory` (опечатка Directory).

Живёт внутри [Item / Card Directory](../items/sidebar-card-directory.md) под селектором ветки в [Panel / Project view](../../panels/project-view.md). Не класть в [Item / Card](../items/sidebar-card.md).

Figma: [Atom / Cards / Directory](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-9126) (`4309:9126`).  
Код: `UncommittedFilesCard`. Properties: `state` (`1) Un Changed` \| `2) Changed`), `Selected` (yes/no).

Ширина 277 px. **Selected в наборе не меняет заливку карточки** — слоты те же. Не красить карточку accent из‑за Selected, пока макет не разъедется.

---

## Общее

Заголовок `Uncommitted files` — Inter Semi Bold 14/20.  
Справа: shadcn `Switch` + подпись `Changed` (14/20 `#09090b`).

| `state` | Заголовок | Switch | Под заголовком | Кнопка |
|---------|-----------|--------|----------------|--------|
| Un Changed | `#71717a` muted | off, opacity 50% у ряда | `No changed files` 12/16 `#71717a` | `Сommit All Files` disabled: opacity 50%, border, без shadow |
| Changed | `#09090b` | off в кадре (фильтр «Changed»), ряд opacity 100% | счётчики | та же подпись, enabled: white, border, shadow-sm |

Копирайт кнопки в макете — `Сommit All Files` (кириллическая **С**). Не «исправлять» на `Commit`, пока не сменят макет.

---

## Счётчики (Changed)

Gap 4 px, Inter Regular 12/16, одна строка:

| Текст | Цвет |
|-------|------|
| `12 append` | `#047857` |
| `7 new` | `#2563eb` |
| `3 modified` | `#f97316` |
| `3 deleted` | `#ef4444` |

Смысл = [FileStatusBadge](../badge-file-status.md) (`appended` / `new` / `modified` / `delete`). Цифры — агрегаты `status.get`. Нет `renamed`.

Switch «Changed» — UI-фильтр списка, не мутация Forester.

Кнопка: outline, radius 8, height как Button, full width. Колбэк → сценарий commit all (`index.add` + открыть Create Commit), не commit внутри атома.

---

## Запрещено

- Четвёртый цвет «renamed».
- Enabled кнопка при Un Changed.
- Свой copy «Commit all».
