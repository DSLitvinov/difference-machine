# Panel / Content View

Центральная колонка превью (788×720 или 1120 при скрытом info). **Не** экран `View / Project view / …` — сборка: [../views](../views/architecture.md).

Figma-канон: [Folder - Expanded](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4318-3286) (`4318:3286`).

Код: `ContentViewPanel`.

---

## Слоты (Folder Expanded)

1. [Header Folder Action](../components/items/header-folder-action.md) 772×60, offset x=8.
2. Content: область скролла. На кадре 772×648 (center 788) или шире при collapse (center 1120). Padding **16**. Сетка — **отзывчивая** (ниже), не фиксированные 7 колонок по 106.

Порядок: сначала [FolderGridTile](../components/items/grid-folder.md), затем [FileGridTile](../components/items/grid-file.md) рядами.

Сетка **виртуализируется**: в DOM — viewport + 1–2 ряда overscan. `workdir.entries` догружается по `has_more`; `workdir.thumbnail` — только для видимых тайлов. Канон: [virtual-scroll.md](../gui_frontend/virtual-scroll.md), [thumbnails.md](../gui_backend/thumbnails.md).

---

## Отзывчивая сетка (Responsive Grid)

Кадр Figma 772 — эталон отступов и gap, не число колонок. Окно и splitter меняют ширину Content: колонки считает CSS Grid.

```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(106px, 1fr));
gap: 8px;
```

| | |
|--|--|
| `auto-fill` | столько колонок, сколько влезает; пустые треки в конце не оставлять визуальным «дырам» у короткого списка — тайлы растут через `1fr` |
| `minmax(106px, 1fr)` | трек не уже **106 px** (Figma Size=Min); лишняя ширина делится поровну |
| `gap` | **8 px** — из макета, не 4 и не `gap-4` наугад |
| Padding контейнера | **16 px** |

Не задавать `grid-template-columns: repeat(7, 106px)` и не копировать число колонок со скрина 1429×768.

Число колонок (для virtualizer, та же формула что у `auto-fill`; `minTrack` по умолчанию **106**, после Ctrl/Cmd+wheel — 106…360):

```text
nCols = max(1, floor((innerWidth + gap) / (minTrack + gap)))
```

`innerWidth` — ширина **content box** сетки (уже без padding 16). ResizeObserver на этот box; при resize пересчитать `nCols`, не сбрасывать папку и не перезапрашивать весь каталог.

Высота ряда: `previewSize` + padding тайла + gap + подпись; `align-items: start`. Папка и файл делят один `previewSize` (оба 48 на default). Не растягивать квадрат на `1fr`. Virtualizer оценивает ряд от `minTrack`, не от ширины окна.

Тайл **заполняет** трек (`width: 100%`, `min-width: 0`). По умолчанию превью файла и иконка папки — **48×48** (`FilePreview` S / `Atom / Icons / 48 / Folder`), по центру ячейки. Канон слотов — Size=Min ([grid-file](../components/items/grid-file.md)). Радиус превью 4 px (не Size L). Ctrl/Cmd+wheel увеличивает квадрат вместе с `minTrack`; не растягивать превью на всю ширину трека при default.

Не писать в UI «3 columns» / «N per row».

Масштаб сетки — **без chrome** (нет подписи «zoom»). **Ctrl** или **Cmd** + колесо мыши / жест тачпада вверх-вниз меняет `minmax` трека: меньше колонок — крупнее тайлы, больше — мельче. Диапазон **106…360** px (пол Figma Size=Min, потолок без атома L). Default **106**, превью **48×48**. Скролл без модификатора — обычная прокрутка. Не зумить окно WebView.

---

## Источник сетки

| Режим | Данные |
|-------|--------|
| Обычный | `workdir.entries` текущей папки |
| **Only changed** вкл. | все dirty path проекта (`status.get` + `workdir.entries_by_paths` / `path: "*"`), не только текущая папка |
| Поиск | [folder-action](../components/items/folder-action.md): корень — весь репо; иначе префикс папки |

Переключателя grid/list нет (позже). Не смешивать grid и list в одном кадре.

---

## Варианты (отдельные symbols)

| Figma | Node | Отличие |
|-------|------|---------|
| Folder - Expanded | `4318:3286` | сетка |
| Folder - Collapse | `4318:3476` | Collapse=yes у хедера |
| Folder - Empty | `4382:8708` | [folder-null](../components/placeholders/folder-null.md). Также центр [Stashes Null](../views/project-browse.md) `6035:12553` (body `Create stash`), даже если в workdir есть файлы |
| File - Expanded | `4318:3980` | [Header File Action](../components/items/header-file-action.md) + [content-view](../components/items/content-view.md) |
| File - Collapse | `4318:4013` | |
| History of File | `4318:4176`, `4322:4561` | история + diff items |

List-view тайлы — **нет** в 0.8.1 (будут позже). Не добавлять тумблер вида.
