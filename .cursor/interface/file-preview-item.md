# File Preview Item — спецификация

Компонент карточки **файла** в **Content Preview → Project view** (секция `Files`).

**Figma (shadcn kit):** [4026:5023](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5023) · legacy [7310:16038](https://www.figma.com/design/GTu6s7FMr4Tn1NWrYeGpIF/?node-id=7310-16038)

**Стек:** React + shadcn/ui (`Badge` для lock only; VCS — `<span>` + `vcsStatusBadgeClass`)  
**Связанные документы:** [content-preview-project-view.md](./content-preview-project-view.md) · [content-info-project-view.md](./content-info-project-view.md) · [design-tokens.md](./design-tokens.md) · [architecture.md](./architecture.md)

---

## 1. Назначение

Thumbnail + имя файла + optional VCS status badge + optional lock badge. Поддерживает **multiselect** (Ctrl/Cmd, Shift, marquee). Один или несколько selected files → сигнал в Content Info.

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
| Badge group (VCS + lock) | centered bottom, `gap-1` (4px) | то же |
| Badge position (Min) | `-bottom-1`, `left-1/2 -translate-x-1/2` | — |
| Badge position (Max) | `bottom-0`, centered | — |

### 2.1 Thumbnail content

| Тип файла | Min | Max |
|-----------|-----|-----|
| Image | scaled `object-cover` | scaled `object-cover` |
| `.blend` | PNG from `workdir.thumbnail`, `object-contain` | то же |
| 3D / unknown | placeholder border box | placeholder + dot grid pattern (Figma Max) |
| Loading | `Skeleton` square | то же |

Thumbnail async через `workdir.thumbnail` ([api-contract.md §4.3](./api-contract.md)).

**Загрузка thumbnail в grid:** `isThumbnailPreviewPath` — raster images + `.blend` (`useWorkdirPreview`).

**Blend:** превью появляется после сохранения файла в Blender (кэш ОС или embedded preview). Нет превью → generic file icon.

### 2.2 Status badge

Показывается **только** если файл имеет VCS-статус ≠ clean.

| `VcsFileStatus` | Badge text | Visible |
|-----------------|------------|---------|
| `staged-new` | `A` | ✓ |
| `staged-modified` | `M` | ✓ |
| `staged-deleted` | `D` | ✓ |
| `modified` | `M` | ✓ |
| `deleted` | `D` | ✓ |
| `untracked` | `N` | ✓ |
| clean / none | — | **скрыть** (`status={false}` в Figma) |

Стиль badge: `<span>` + `vcsStatusBadgeClass` из `@/lib/vcsBadge` — [design-tokens.md §3.5](./design-tokens.md): `A` emerald, `M` amber, `D` destructive, `N` blue. **Не** `Badge variant="outline"` / `default`.

### 2.3 Lock badge

Показывается **только** если файл присутствует в `lock.list` (`lockedByPath` в project store).

| Поле | Значение |
|------|----------|
| Badge text | `lock` |
| Tooltip | `Locked by {user}` |
| Стиль | `variant="secondary"`, `h-[22px]`, `rounded-full`, `text-xs font-semibold` |
| Позиция | По центру снизу thumbnail (Min: `-bottom-1`, Max: `bottom-0`) |
| Группа | VCS + lock в одном ряду: `flex items-center gap-1` (4px между бейджами), `left-1/2 -translate-x-1/2` |

VCS badge и lock badge независимы: оба могут отображаться одновременно в одной центрированной группе.

Источник данных: `lock.list` при загрузке проекта и в polling (`useProjectStatusPolling`, интервал как у `status.get`).

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

Figma tokens: [design-tokens.md §3.3](./design-tokens.md). Tailwind states: §4 `itemStateClasses`.

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
| **Locked file** | Lock badge `lock` (§2.3); независимо от VCS |

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

См. [design-tokens.md §4](./design-tokens.md) — `itemStateClasses`.

---

## 4. Поведение (input)

| Жест | Действие |
|------|----------|
| **Click** | Single-select: снять остальные, выбрать этот; emit `onFileSelectionChange` |
| **Ctrl/Cmd+Click** | Toggle файл в selection set; не снимать остальные |
| **Shift+Click** | Range-select от `anchorIndex` до текущего в **отсортированном flat list файлов** (только секция Files) |
| **Click empty area** | Clear selection |
| **Double-click** | Открыть в **приложении по умолчанию ОС** (`workdir.open`, §4.4 в [content-preview-project-view.md](./content-preview-project-view.md)) |
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
| No VCS status | Hide VCS badge |
| Not locked | Hide lock badge |
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
  onDoubleClick: () => void   // → workdir.open
}
```

---

## 9. a11y

- `aria-selected={isSelected}`.
- `aria-label="{name}{, status A if present}"`.
- Multiselect: `aria-multiselectable="true"` на grid container.
- Screen reader announcement: «{n} files selected» on change.
