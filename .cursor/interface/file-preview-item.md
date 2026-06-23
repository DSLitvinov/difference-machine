# File Preview Item — спецификация

Компонент карточки **файла** в **Content Preview → Project view** (секция `Files`).

**Figma (shadcn kit):** [4026:5023](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5023) · legacy [7310:16038](https://www.figma.com/design/GTu6s7FMr4Tn1NWrYeGpIF/?node-id=7310-16038)

**Стек:** React + shadcn/ui (`Badge`)  
**Связанные документы:** [content-preview-project-view.md](./content-preview-project-view.md) · [content-info-project-view.md](./content-info-project-view.md) · [design-tokens.md](./design-tokens.md) · [architecture.md](./architecture.md)

---

## 1. Назначение

Thumbnail + имя файла + optional VCS status badge. Поддерживает **multiselect** (Ctrl/Cmd, Shift, marquee). Один или несколько selected files → сигнал в Content Info.

---

## 2. Размеры и структура

```
┌─────────────────┐
│  ┌───────────┐  │
│  │ thumbnail │  │  48×48 (Min) or 128×128 (Max)
│  │  [badge]  │  │  status pill, bottom overlap
│  └───────────┘  │
│    File name    │  text-xs, truncate, center
└─────────────────┘
```

| Token | Min | Max |
|-------|-----|-----|
| Thumbnail | `48×48` | `128×128` |
| Thumbnail border | `1px border-border`, `rounded-md` | то же |
| Container padding | `8px` | `8px` |
| Gap thumbnail ↔ name | `8px` | `8px` |
| Status badge height | `22px` | `22px` |
| Badge position (Min) | `left: -6.5px`, `top: 26px` (overlap bottom-left) | — |
| Badge position (Max) | — | `left: 50%`, `top: 98px`, centered |

### 2.1 Thumbnail content

| Тип файла | Min | Max |
|-----------|-----|-----|
| Image | scaled cover | scaled cover |
| 3D / blend / unknown | placeholder border box | placeholder + dot grid pattern (Figma Max) |
| Loading | `Skeleton` square | то же |

Thumbnail генерируется async через Wails (`GetFileThumbnail` — **новый** API, v1 может быть placeholder).

### 2.2 Status badge

Показывается **только** если файл имеет VCS-статус ≠ clean.

| `VcsFileStatus` | Badge text | Visible |
|-----------------|------------|---------|
| `staged-new` | `A` | ✓ |
| `staged-modified` | `M` | ✓ |
| `staged-deleted` | `D` | ✓ |
| `modified` | `M` | ✓ |
| `deleted` | `D` | ✓ |
| `untracked` | `??` | ✓ |
| clean / none | — | **скрыть** (`status={false}` в Figma) |

Стиль badge: `bg-primary text-primary-foreground text-xs font-semibold rounded-full px-3 h-[22px]`.

---

## 3. Состояния

Матрица: **3 visual states** × **2 sizes** = 6 Figma variants.

### 3.1 Матрица стилей (контейнер)

| Property | Default | Hover | Selected |
|----------|---------|-------|----------|
| **Background** | transparent | `bg-accent` | `bg-accent` |
| **Border** | none | none | `border border-ring` |
| **Border radius** | — | `rounded-md` | `rounded-md` |
| **Cursor** | `pointer` | `pointer` | `pointer` |

Figma tokens: см. [design-tokens.md §3.3](./design-tokens.md).

### 3.2 Multiselect visual

| Selection | Визуал |
|-----------|--------|
| Single selected | `Selected` state |
| Multiple selected | Все selected items → `Selected` state |
| Selected + anchor для Shift | То же; `lastClickedIndex` в store |
| Marquee preview | Items под rect → temporary `Selected` until mouseup |

### 3.3 Комбинированные состояния

| Комбинация | Стили |
|------------|-------|
| **Selected + Hover** | `bg-accent border-ring` |
| **Selected in multiselect group** | Идентично single selected |
| **Focus (keyboard)** | `ring-2 ring-ring ring-offset-2` |
| **Deleted file** | Thumbnail dimmed `opacity-50`; badge `D` |

### 3.4 Диаграмма (single item)

```mermaid
stateDiagram-v2
  [*] --> Default
  Default --> Hover: mouseenter
  Hover --> Default: mouseleave
  Default --> Selected: click
  Hover --> Selected: click
  Selected --> Default: click again with Ctrl (toggle off)
  Selected --> Selected: Ctrl+click other files (add)
```

### 3.5 Tailwind mapping

```tsx
const fileItemClasses = {
  default: '',
  hover: 'bg-accent rounded-md',
  selected: 'bg-accent border border-ring rounded-md',
  selectedHover: 'bg-accent border border-ring rounded-md',
}
```

---

## 4. Поведение (input)

| Жест | Действие |
|------|----------|
| **Click** | Single-select: снять остальные, выбрать этот; emit `onFileSelectionChange` |
| **Ctrl/Cmd+Click** | Toggle файл в selection set; не снимать остальные |
| **Shift+Click** | Range-select от `anchorIndex` до текущего в **отсортированном flat list файлов** (только секция Files) |
| **Click empty area** | Clear selection |
| **Double-click** | Открыть в **приложении по умолчанию ОС** (`OpenWithDefaultApp`, §4.4 в [content-preview-project-view.md](./content-preview-project-view.md)) |
| **Enter** (фокус на item) | = double-click |
| **Marquee** | См. [content-preview.md](./content-preview.md) §6 |

### 4.1 Anchor index rules

- Первый click без modifier → `anchorIndex = index`, selection = `[file]`.
- Shift+click без prior anchor → anchor = `0`.
- Ctrl+click не меняет anchor.
- Сортировка меняется → сохранить selection by **path**, не by index.

---

## 5. Slider scale (Min / Max)

Управляется глобальным `thumbnailScalePx` в Preview store (slider в toolbar).

| Slider | Thumbnail | Item cell width (approx) |
|--------|-----------|--------------------------|
| **Min** (48px) | 48×48 | ~64px + padding |
| **Max** (128px) | 128×128 | ~144px + padding |

### 5.1 Дискретные позиции (шаг 18px)

```
48 → 66 → 84 → 102 → 120 → 128
```

| px | Визуал |
|----|--------|
| 48, 66, 84 | **Min** — plain border box |
| 102, 120, 128 | **Max** — dot-grid placeholder |

- Порог Min↔Max: **`>= 102px`**.
- Slider: shadcn `Slider`, track `120px` (Figma), height `8px`, **6 тиков**.
- Значение персистить: `localStorage` `dfm.preview.thumbScale` (px: `48`…`128`).
- При смене scale — пересчитать grid; folder icons тоже масштабируются ([content-preview-project-view.md](./content-preview-project-view.md) §5).

---

## 6. Данные

```ts
interface FilePreviewItemData {
  name: string
  path: string              // relative
  extension?: string
  vcsStatus?: VcsFileStatus
  thumbnailUrl?: string     // blob URL or cached path
}

type VcsFileStatus =
  | 'staged-new'
  | 'staged-modified'
  | 'staged-deleted'
  | 'modified'
  | 'deleted'
  | 'untracked'
```

---

## 7. Corner cases

| Case | UI |
|------|-----|
| No VCS status | Hide badge |
| Thumbnail fail | Placeholder, retry on visible |
| Very long name | `truncate` + tooltip full name |
| `deleted` in status | Strikethrough name optional v1.1; badge `D` |
| File removed from disk | Remove from grid; drop from selection |
| Binary huge file | Placeholder icon by mime |
| Shift+click across filtered list | Range only among **visible** (post-search) items |
| All files filtered out | Parent empty state |
| Marquee starts on folder item | Ignore — marquee только по background Files grid |
| Touch devices | Long-press → context menu v2; tap = select |
| Double-click, файл удалён | Toast «File not found» |
| Double-click, нет OS handler | Toast с ошибкой платформы |
| `deleted` / `staged-deleted` | Double-click → toast, не открывать |

---

## 8. Компоненты (файлы)

```
components/preview/project/
  FilePreviewItem.tsx
  FilePreviewThumbnail.tsx
  FileStatusBadge.tsx
  FilePreviewItemSkeleton.tsx
```

### Props

```ts
interface FilePreviewItemProps {
  data: FilePreviewItemData
  state: 'default' | 'hover' | 'selected' | 'selected-hover'
  scale: 'min' | 'max'
  index: number
  onSelect: (e: React.MouseEvent) => void
  onDoubleClick: () => void   // → OpenWithDefaultApp
}
```

---

## 9. a11y

- `aria-selected={isSelected}`.
- `aria-label="{name}{, status A if present}"`.
- Multiselect: `aria-multiselectable="true"` на grid container.
- Screen reader announcement: «{n} files selected» on change.
