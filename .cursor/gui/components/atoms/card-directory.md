# Uncommitted Files Card

Блок «грязная» рабочая копия в сайдбаре проекта. Figma name: `Atom / Cards / Dirrectory` (опечатка Directory).

Живёт внутри [Item / Card Directory](../items/sidebar-card-directory.md) под селектором ветки в [Panel / Project view](../../panels/project-view.md). Не класть в [Item / Card](../items/sidebar-card.md).

Figma: [Atom / Cards / Directory](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-9126) (`4309:9126`), Load [`6044:13670`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6044-13670).  
Код: `UncommittedFilesCard`. Properties: `state` (`1) Un Changed` \| `2) Changed` \| `3) Load`), `Selected` (yes/no).

Ширина 277 px. **Selected в наборе не меняет заливку карточки** — слоты те же. Не красить карточку accent из‑за Selected, пока макет не разъедется.

---

## Общее

Заголовок `Uncommitted files` — Inter Semi Bold 14/20.

| `state` | Заголовок | Под заголовком | Кнопка |
|---------|-----------|----------------|--------|
| Un Changed | `#71717a` muted | `No changed files` 12/16 `#71717a` | `Сommit all files` disabled: opacity 50%, border, без shadow |
| Changed | `#09090b` | счётчики | та же подпись, enabled: white, border, shadow-sm |
| Load | `Append files` `#71717a` | `Please wait` 12/16 `#71717a` | disabled, opacity 50%, spinner (Lucide `Loader2`) + `Сommit all files` |

Копирайт кнопки в макете — `Сommit all files` (кириллическая **С**). Не «исправлять» на `Commit`, пока не сменят макет.

**Load** показывается пока идёт `index.add` после **Сommit all files** (или staging выбранных path перед композером). Оболочка Card Directory остаётся Selected.

После **Сommit all files**: слот меняется на [CreateCommitCard](./card-create-commit.md), кадр [Create Commit all files](../../views/project-browse.md). Атом Directory в этом кадре **нет**.

После Create commit из File Info / Select More Files: атом Directory остаётся Changed / Un Changed, кнопка `Сommit all files` **inactive** (как Un Changed: opacity 50%, без shadow). Оболочка — Card Directory Disable.

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

Фильтры **Only changed** и **View ignored** живут в [Popover Filters](../popovers/filters.md), не на карточке. Only changed **вкл.**: в Content View показать все изменённые и незакоммиченные файлы **всего проекта** (пересечение `status.get` со всеми path, не только текущая папка). Выкл.: обычная сетка `workdir.entries` текущей папки. Не мутация Forester.

Кнопка: outline, radius 8, height как Button, full width. Колбэк → `index.add` **всех dirty path** (staged + unstaged + untracked + renamed из `status.get`) → открыть [Create Commit all files](../../views/project-browse.md) (`6076:15959`). Не Create Commit / single file, даже если в сетке выбран файл. Не только видимые в сетке и не только текущая папка.

---

## Запрещено

- Четвёртый цвет «renamed».
- Enabled кнопка при Un Changed.
- Switch «Changed» на карточке.
- Свой copy «Commit all».
