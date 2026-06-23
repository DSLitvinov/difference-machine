# Folder Preview Item — спецификация

Компонент карточки **подпапки** в **Content Preview → Project view** (секция `Folders`).

**Figma (shadcn kit):** [4026:5059](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5059) · legacy [7310:16074](https://www.figma.com/design/GTu6s7FMr4Tn1NWrYeGpIF/?node-id=7310-16074)

**Стек:** React + shadcn/ui  
**Связанные документы:** [content-preview-project-view.md](./content-preview-project-view.md) · [design-tokens.md](./design-tokens.md) · [architecture.md](./architecture.md)

---

## 1. Назначение

Отображает **immediate child folder** текущей директории в Content Preview. **Single click** — подсветка Selected; **double click** — drill-down + синхронизация с Sidebar ([content-preview-project-view.md](./content-preview-project-view.md) §4).

---

## 2. Размеры и структура

```
┌─────────────────┐
│    [folder]     │  48×48 icon
│   Folder name   │  text-xs, foreground
│    5 Files      │  text-xs, muted
└─────────────────┘
```

| Token | Значение |
|-------|----------|
| Container padding | `8px` (`p-2`) |
| Gap icon ↔ labels | `8px` |
| Gap name ↔ count | `2px` |
| Border radius (hover/selected) | `8px` (`rounded-md`) |
| Icon size | `48×48` |
| Name | `text-xs`, `text-foreground`, `truncate`, center |
| Count | `text-xs`, `text-muted-foreground`, center |

### 2.1 Count label (`item_count`)

- Формат: `{n} File` / `{n} Files` (i18n plural).
- Семантика: **recursive file count** — см. [architecture.md §4.2](./architecture.md) (только файлы; папки не считаются).
- Источник: поле `item_count` из `workdir.entries` / `DirEntry`.

---

## 3. Состояния (Default · Hover · Selected)

### 3.1 Матрица стилей

| Property | Default | Hover | Selected |
|----------|---------|-------|----------|
| **Background** | transparent | `bg-accent` | `bg-accent` |
| **Border** | none | none | `border border-ring` |
| **Border radius** | — | `rounded-md` | `rounded-md` |
| **Cursor** | `pointer` | `pointer` | `pointer` |

Figma: Hover → `background/primary/light-hover`; Selected → `background/accent` + `border/primary/default`. Канон Tailwind: [design-tokens.md §4](./design-tokens.md).

### 3.2 Комбинированные состояния

| Комбинация | Стили |
|------------|-------|
| **Selected + Hover** | `bg-accent border-ring` |
| **Focus (keyboard)** | `ring-2 ring-ring ring-offset-2` поверх текущего визуала |
| **Focus + Selected** | Selected styles + focus ring |

### 3.3 Диаграмма переходов

```mermaid
stateDiagram-v2
  [*] --> Default
  Default --> Hover: mouseenter
  Hover --> Default: mouseleave
  Default --> Selected: click (single select folder)
  Hover --> Selected: click
  Selected --> Hover: mouseenter
  Selected --> Default: mouseleave (остаётся Selected)
  Selected --> Selected: click other folder
```

### 3.4 Tailwind mapping

См. [design-tokens.md §4](./design-tokens.md) — `itemStateClasses`.

Transition: `transition-colors duration-150`.

---

## 4. Поведение

| Жест | Действие |
|------|----------|
| **Single click** | Подсветка `Selected`; не входит внутрь |
| **Double click** | Drill-down; sync `selectedFolderPath` в Sidebar |
| **Enter** | = double click |
| **Ctrl/Cmd+Click** | Не multiselect |
| **Shift+Click** | Не range-select |
| **Marquee** | Не захватывается (только files) |

### 4.1 Связь с Sidebar

| Событие | Sidebar |
|---------|---------|
| Double-click / drill-down в Preview | Обновить `selectedFolderPath`, scroll-to узел |
| Back/Forward в Preview | Sync Sidebar selection |
| Выбор папки в Sidebar | Preview сбрасывает `previewFolderPath` на неё |
| Changed ON | Секция Folders **скрыта** целиком (не фильтруется) |

---

## 5. Данные

```ts
interface FolderPreviewItemData {
  name: string
  path: string           // relative, e.g. "assets/References"
  fileCount: number      // item_count — recursive files (architecture.md §4.2)
}
```

| Поле | Источник |
|------|----------|
| `name` | basename `path` |
| `path` | `workdir.entries` / tree child |
| `fileCount` | `item_count` из backend — recursive files ([architecture.md §4.2](./architecture.md)) |

---

## 6. Changed mode (Sidebar toggle)

При `showChangedOnly = true` секция **Folders скрывается** в Preview ([content-preview-project-view.md](./content-preview-project-view.md) §8). Компонент не рендерится.

---

## 7. Corner cases

| Case | UI |
|------|-----|
| `fileCount === 0` | Показать `0 Files`; папка кликабельна (может содержать только подпапки) |
| `fileCount === 1` | `1 File` |
| Длинное имя | `truncate` + `title` tooltip |
| Unicode / emoji в имени | Отображать as-is; сортировка — [content-preview.md](./content-preview.md) §7 |
| Папка удалена на диске | После refresh — исчезает; если была current path → back в parent |
| `.DFM/`, ignored | Не показывать |
| Пустая секция Folders | Скрыть заголовок `Folders` + секцию целиком |
| Loading | `FolderPreviewItemSkeleton` × 4 |
| Search active | Скрыть если имя не match query |

---

## 8. Компоненты (файлы)

```
components/preview/project/
  FolderPreviewItem.tsx
  FolderPreviewItemSkeleton.tsx
  FolderIcon.tsx              # 48×48, shared asset
```

### Props

```ts
interface FolderPreviewItemProps {
  data: FolderPreviewItemData
  state: 'default' | 'hover' | 'selected' | 'selected-hover'
  thumbnailScalePx: number   // 48 | 66 | 84 | 102 | 120 | 128 — иконка масштабируется вместе со слайдером
  onNavigate: (path: string) => void
  onHoverChange?: (hovering: boolean) => void
}
```

> Иконка папки масштабируется пропорционально слайдеру (шаг **18px**, диапазон **48→128**), как и file thumbnail. См. [content-preview-project-view.md §5.1](./content-preview-project-view.md).

---

## 9. a11y

- `role="button"` или `<button>` wrapper.
- `aria-label="{name}, {n} files"`.
- `aria-current="true"` когда `selected`.
- Roving tabindex в grid вместе с file items (folders first in tab order per row).
