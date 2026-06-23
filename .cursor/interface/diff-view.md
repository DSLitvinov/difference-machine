# Diff View — спецификация

Контейнер **правой колонки** History Preview: toolbar + маршрутизация контента по типу файла.

**Figma (shadcn kit):**
- Text: [4028:5655](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4028-5655)
- Image: [4030:3317](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-3317)
- Binary: [4031:3754](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4031-3754) · Blend screenshot: [4030:2796](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-2796)

**Стек:** React + shadcn/ui  
**Связанные документы:** [content-preview-history-view.md](./content-preview-history-view.md) · [text-diff-panel.md](./text-diff-panel.md) · [image-diff-panel.md](./image-diff-panel.md) · [binary-diff-stub.md](./binary-diff-stub.md) · [deleted-diff-stub.md](./deleted-diff-stub.md)

---

## 1. Назначение

Показывает diff выбранного changed file. Классифицирует файл и монтирует соответствующий atom-компонент.

---

## 2. Структура

```
┌─────────────────────────────────────────────────────────┐
│ path/to/file.ext                    [Unified] [Split]   │  Toolbar
├─────────────────────────────────────────────────────────┤
│                                                         │
│              Content (panel / stub)                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

| Token | Значение |
|-------|----------|
| Container | `flex flex-col min-h-0 flex-1 bg-background` |
| Toolbar | `flex items-center gap-2 px-3 py-2 border-b border-border` |
| Content | `flex-1 min-h-0 overflow-hidden` |

---

## 3. Классификация файла

```ts
type DiffKind = 'text' | 'image' | 'binary' | 'deleted'

type ChangedFileStatus = 'added' | 'modified' | 'deleted' | 'renamed'

interface ChangedFile {
  path: string
  oldPath?: string
  status: ChangedFileStatus
}

function classifyDiffKind(file: ChangedFile, ext: string, isBinary?: boolean): DiffKind {
  if (file.status === 'deleted') return 'deleted'
  if (isImageExt(ext)) return 'image'   // svg excluded → text
  if (isBinary || isBinaryExt(ext)) return 'binary'
  return 'text'
}
```

**Image extensions:** `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`, `tiff`, `exr`.  
**`svg`:** всегда `text`.  
**Приоритет API:** `diff.text` → `is_binary` перекрывает эвристику по расширению.

### 3.1 Маршрутизация

| `DiffKind` | Компонент |
|------------|-----------|
| `text` | [text-diff-panel.md](./text-diff-panel.md) |
| `image` | [image-diff-panel.md](./image-diff-panel.md) |
| `binary` | [binary-diff-stub.md](./binary-diff-stub.md) — для `.blend` со screenshot: preview вместо icon ([4030:2796](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-2796)) |
| `deleted` | [deleted-diff-stub.md](./deleted-diff-stub.md) |

---

## 4. Toolbar

### 4.1 Path label

- `text-sm font-medium truncate flex-1`
- Renamed: `old/path → new/path`
- Длинный путь: truncate start `…/file.ext`
- Tooltip: full path

### 4.2 Toggles по типу

| Diff kind | Controls |
|-----------|----------|
| Text (incl. svg) | `ToggleGroup`: **Unified** / **Split** |
| Image | `ToggleGroup`: **Split** / **Overlay** |
| Binary | **нет** toggles |
| Deleted | **нет** toggles |

Defaults: text → `unified`; image → `split`. Persist: см. [content-preview-history-view.md §5.2](./content-preview-history-view.md).

### 4.3 Empty / no file selected

- Toolbar скрыт.
- Content: muted centered «Select a file to view changes».

---

## 5. Состояния контента

| State | UI |
|-------|-----|
| Loading diff | `Skeleton` в content area |
| Error | inline error + Retry |
| Loaded | child panel / stub |
| No selection | empty copy (§4.3) |

---

## 6. Props

```ts
interface DiffViewProps {
  file: ChangedFile | null
  commitHash: string
  parentHash: string
  textLayout: 'unified' | 'split'
  imageLayout: 'split' | 'overlay'
  onTextLayoutChange: (v: 'unified' | 'split') => void
  onImageLayoutChange: (v: 'split' | 'overlay') => void
  loading: boolean
  error: string | null
  onRetry: () => void
}
```

---

## 7. Corner cases

| Case | Поведение |
|------|-----------|
| Быстрое переключение файлов | abort stale requests |
| `is_binary` от API для .txt | показать binary stub |
| `.blend` + commit screenshot | binary stub с preview image ([binary-diff-stub.md §3](./binary-diff-stub.md)) |
| `.blend` без screenshot | binary stub generic icon |
| Renamed + text | toolbar path `old → new`; diff на new path |
| Пустой коммит | DiffView не монтируется (empty list) |
| Initial commit | text/image/binary работают без parent blob |

---

## 8. shadcn/ui

| UI | Component |
|----|-----------|
| Layout toggles | `ToggleGroup` type `single` |
| Toolbar border | `border-border` |
| Loading | `Skeleton` |
