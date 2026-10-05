# Uncommitted Files Card

Блок «грязная» рабочая копия в сайдбаре проекта. Figma name: `Atom / Cards / Dirrectory` (опечатка Directory).

Живёт внутри [Item / Card Directory](../items/sidebar-card-directory.md) под селектором ветки в [Panel / Project view](../../panels/project-view.md). Не класть в [Item / Card](../items/sidebar-card.md).

Figma: [Atom / Cards / Directory](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-9126) (`4309:9126`), Load [`6044:13670`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6044-13670).  
Код: `UncommittedFilesCard`. Properties: `state` (`1) Un Changed` \| `2) Changed` \| `3) Load`), `Selected` (yes/no).

Ширина 277 px. **Selected в наборе не меняет заливку карточки** — слоты те же. Не красить карточку accent из‑за Selected, пока макет не разъедется.

---

## Общее

Заголовок `Worked directory` — Inter Semi Bold 14/20.

| `state` | Заголовок | Под заголовком | Кнопка |
|---------|-----------|----------------|--------|
| Un Changed | `#71717a` muted | `No changed files` 12/16 `#71717a` | нет: Take snapshot скрыт |
| Changed | `#09090b` | счётчики | `Take snapshot`, primary `#18181b` / `#fafafa` |
| Load | muted | `Please wait` 12/16 `#71717a` | `Take snapshot` disabled, spinner (Lucide `Loader2`) |

**Load** показывается пока идёт `index.add` перед диалогом Create Commit. Карточка остаётся на месте. Форма коммита — [диалоги](../../dialogs/commit.md), не замена этого атома.

Take snapshot на этой карточке открывает Append, затем Create Commit, на все dirty path. Скрывать кнопку, когда изменённых файлов нет, в том числе на Stashes Null.

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

Кнопка `Take snapshot`: primary `#18181b`, текст `#fafafa`, radius 8, height 40, full width. Открывает [Append files](../../dialogs/commit.md), затем Create Commit, на все dirty path (`status.get`, не только видимые в сетке и не только текущая папка). Скрыта, когда dirty path нет.

---

## Запрещено

- Четвёртый цвет «renamed».
- Enabled кнопка при Un Changed.
- Switch «Changed» на карточке.
- Свой copy «Commit all». Кнопка называется Take snapshot.
